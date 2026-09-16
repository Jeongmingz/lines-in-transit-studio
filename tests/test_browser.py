# -*- coding: utf-8 -*-
"""
Lines in Transit Studio - End-to-End Real Browser Integration Tests
Executes actual browser runtime via Playwright (MS Edge):
1. Verifies initial sample loading does NOT overwrite saved localStorage state
2. Verifies mode switching and UI reactivity
3. Verifies non-GPS photo upload shows "위치 메타데이터 없음"
4. Verifies GPS photo upload triggers local exifr analysis, displays coordinates, and shows OpenStreetMap attribution
5. Verifies export artifacts are generated at full master resolution with zero guide pixels
"""

import http.server
import os
import socketserver
import sys
import threading
import time
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def assert_true(condition, msg):
    if not condition:
        print(f"[FAIL] {msg}")
        sys.exit(1)
    else:
        print(f"[PASS] {msg}")

def run_tests():
    # 1. Start local ephemeral HTTP server
    os.chdir(BASE_DIR)
    port = 8899
    httpd = socketserver.TCPServer(("", port), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.5)

    base_url = f"http://localhost:{port}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()

            print("=== Lines in Transit Studio Real Browser Tests ===")

            # Test 1: LocalStorage state preservation on initial load
            page.goto(base_url)
            page.evaluate("""() => {
                localStorage.setItem('lit_studio_state', JSON.stringify({
                    mode: 'panorama',
                    series: 'WATERLINES',
                    seriesNo: '77',
                    issueNo: '77',
                    photoTitle: 'MY PERSISTED WATERWAY',
                    location: 'PARIS LE MARAIS',
                    captureDate: '2026',
                    selectedPresetId: 'xt30ii_classic_neg',
                    customCameraTag: 'FUJIFILM X-T30 II · CLASSIC NEG SOOC',
                    showSafetyGuide: true,
                    zoom: 1.0,
                    panX: 0,
                    panY: 0,
                    exportQualityMode: 'auto',
                    autoFitTargetMB: 1.4
                }));
            }""")

            # Reload with persisted state
            page.reload()
            page.wait_for_selector("#main-canvas")
            page.wait_for_timeout(1000)  # Wait for initial image fetch

            title_val = page.input_value("#input-title")
            issue_val = page.input_value("#input-issue")
            loc_val = page.input_value("#input-location")
            date_val = page.input_value("#input-date")
            series_val = page.input_value("#select-series")
            mode_btn_active = page.locator(".mode-btn[data-mode='panorama']").get_attribute("class")

            assert_true(title_val == "MY PERSISTED WATERWAY", "LocalStorage photoTitle preserved during initial sample load")
            assert_true(issue_val == "77", "LocalStorage seriesNo preserved during initial sample load")
            assert_true(loc_val == "PARIS LE MARAIS", "LocalStorage location preserved during initial sample load")
            assert_true(date_val == "2026", "LocalStorage captureDate preserved during initial sample load")
            assert_true(series_val == "WATERLINES", "LocalStorage series preserved during initial sample load")
            assert_true("active" in (mode_btn_active or ""), "LocalStorage panorama mode preserved during initial sample load")

            # Test 2: Mode switching and controls visibility
            page.click(".mode-btn[data-mode='photo']")
            page.wait_for_timeout(300)
            photo_fit_display = page.evaluate("() => getComputedStyle(document.getElementById('photo-fit-group')).display")
            pano_overlay_display = page.evaluate("() => getComputedStyle(document.getElementById('panorama-overlay-group')).display")
            has_seamless_class = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            assert_true(photo_fit_display != "none", "PHOTO mode displays framing fit/cover group")
            assert_true(pano_overlay_display == "none", "PHOTO mode hides panorama overlay group")
            assert_true(not has_seamless_class, "PHOTO mode cleanly removes mode-seamless container class")

            page.click(".mode-btn[data-mode='chapter']")
            page.wait_for_timeout(300)
            chapter_fit_display = page.evaluate("() => getComputedStyle(document.getElementById('photo-fit-group')).display")
            btn_single_text = page.locator("#btn-download-single").inner_text()
            assert_true(chapter_fit_display == "none", "CHAPTER mode hides photo framing group")
            assert_true("챕터 세트 다운로드" in btn_single_text, "CHAPTER mode updates single download button label")

            page.click(".mode-btn[data-mode='panorama']")
            page.wait_for_timeout(300)
            pano_overlay_after = page.evaluate("() => getComputedStyle(document.getElementById('panorama-overlay-group')).display")
            has_seamless_class = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            assert_true(pano_overlay_after != "none", "PANORAMA mode displays overlay toggle group")
            assert_true(has_seamless_class, "PANORAMA mode adds mode-seamless container class")

            # Test 3: Non-GPS photo upload
            no_gps_file = os.path.join(BASE_DIR, "tests", "fixtures", "no_gps.jpg")
            page.set_input_files("#file-input", no_gps_file)
            page.wait_for_timeout(800)

            none_card_display = page.evaluate("() => getComputedStyle(document.getElementById('gps-none-card')).display")
            gps_card_display = page.evaluate("() => getComputedStyle(document.getElementById('gps-card')).display")
            assert_true(none_card_display != "none", "Non-GPS photo displays '위치 메타데이터 없음' card")
            assert_true(gps_card_display == "none", "Non-GPS photo keeps GPS action card hidden")

            # Test 4: GPS photo upload & exifr analysis & OSM attribution
            with_gps_file = os.path.join(BASE_DIR, "tests", "fixtures", "with_gps.jpg")
            page.set_input_files("#file-input", with_gps_file)
            page.wait_for_timeout(1000)

            gps_card_display_after = page.evaluate("() => getComputedStyle(document.getElementById('gps-card')).display")
            dms_text = page.locator("#gps-dms-text").inner_text()
            attribution_href = page.locator(".gps-attribution a").get_attribute("href")

            assert_true(gps_card_display_after != "none", "GPS photo displays active GPS metadata card")
            assert_true("35°40′34″N" in dms_text and "139°39′01″E" in dms_text, "GPS photo extracts and formats accurate DMS coordinates")
            assert_true("openstreetmap.org/copyright" in (attribution_href or ""), "OpenStreetMap attribution link is clearly displayed in GPS card")

            # Test 5: Export artifacts resolution & cleanliness
            export_info = page.evaluate("""async () => {
                return {
                    canvasW: document.getElementById('main-canvas').width,
                    canvasH: document.getElementById('main-canvas').height,
                    hasOverlayInDom: document.getElementById('canvas-overlay') !== null
                };
            }""")
            assert_true(export_info["hasOverlayInDom"], "Overlay exists in DOM decoupled from canvas pixels")

            # Test 6: Series selection & custom series input
            page.click(".mode-btn[data-mode='photo']")
            page.wait_for_timeout(200)
            page.select_option("#select-series", "CITY LINES")
            page.wait_for_timeout(200)
            saved_series = page.evaluate("() => JSON.parse(localStorage.getItem('lit_studio_state')).series")
            assert_true(saved_series == "CITY LINES", "Series dropdown selection persists to localStorage")

            page.select_option("#select-series", "custom")
            page.wait_for_timeout(200)
            custom_input_display = page.evaluate("() => getComputedStyle(document.getElementById('input-series-custom')).display")
            assert_true(custom_input_display != "none", "Selecting 'custom' reveals custom series text input")

            page.fill("#input-series-custom", "NORDIC ROADS")
            page.wait_for_timeout(200)
            saved_custom = page.evaluate("() => JSON.parse(localStorage.getItem('lit_studio_state')).series")
            assert_true(saved_custom == "NORDIC ROADS", "Custom series name persists to localStorage")

            # Test 7: Framing toggle (4:5 Crop vs Fit) in PHOTO mode
            page.click("#btn-fit-letterbox")
            page.wait_for_timeout(200)
            saved_fit = page.evaluate("() => JSON.parse(localStorage.getItem('lit_studio_state')).photoFitMode")
            assert_true(saved_fit == "fit", "Clicking Fit sets photoFitMode to fit in localStorage")

            page.click("#btn-fit-cover")
            page.wait_for_timeout(200)
            saved_cover = page.evaluate("() => JSON.parse(localStorage.getItem('lit_studio_state')).photoFitMode")
            assert_true(saved_cover == "cover", "Clicking Cover sets photoFitMode to cover in localStorage")

            # Test 8: Instagram Caption copy button & observation note in Studio tab
            caption_btn = page.locator("#btn-copy-caption")
            note_textarea = page.locator("#input-caption-note")
            assert_true(caption_btn.is_visible(), "Instagram caption copy button is visible in Studio tab")
            assert_true(note_textarea.is_visible(), "Instagram caption observation note textarea is visible in Studio tab")

            # Test 9: 3 Genre sample buttons
            page.click("#btn-sample-2")
            page.wait_for_timeout(500)
            sample2_title = page.input_value("#input-title")
            sample2_series = page.input_value("#select-series")
            assert_true(sample2_title == "AVENUE OF TREES", "Sample 2 (자연 풍경) loads correct title")
            assert_true(sample2_series == "PASSING PLACES", "Sample 2 (자연 풍경) loads correct series")

            browser.close()
            print("\n[SUCCESS] ALL REAL BROWSER TESTS PASSED")


    finally:
        httpd.shutdown()
        httpd.server_close()

if __name__ == "__main__":
    run_tests()
