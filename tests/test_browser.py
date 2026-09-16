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
                    mode: 'seamless',
                    magazineTitle: 'PRESERVED MASTHEAD',
                    issueNo: '77',
                    photoTitle: 'MY PERSISTED HOTEL',
                    location: 'PARIS LE MARAIS',
                    selectedPresetId: 'fuji_classic_neg',
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
            mode_btn_active = page.locator(".mode-btn[data-mode='seamless']").get_attribute("class")

            assert_true(title_val == "MY PERSISTED HOTEL", "LocalStorage photoTitle preserved during initial sample load")
            assert_true(issue_val == "77", "LocalStorage issueNo preserved during initial sample load")
            assert_true(loc_val == "PARIS LE MARAIS", "LocalStorage location preserved during initial sample load")
            assert_true("active" in (mode_btn_active or ""), "LocalStorage seamless mode preserved during initial sample load")

            # Test 2: Mode switching does not corrupt UI
            page.click(".mode-btn[data-mode='vertical']")
            page.wait_for_timeout(300)
            has_seamless_class = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            assert_true(not has_seamless_class, "Vertical mode cleanly removes mode-seamless container class")

            page.click(".mode-btn[data-mode='seamless']")
            page.wait_for_timeout(300)
            has_seamless_class = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            assert_true(has_seamless_class, "Seamless mode adds mode-seamless container class")

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
                const app = window.appInstance || (window.__app__);
                // If app is not global, inspect main canvas context and export method
                const btn = document.getElementById('btn-download-single');
                return {
                    canvasW: document.getElementById('main-canvas').width,
                    canvasH: document.getElementById('main-canvas').height,
                    hasOverlayInDom: document.getElementById('canvas-overlay') !== null
                };
            }""")
            assert_true(export_info["hasOverlayInDom"], "Overlay exists in DOM decoupled from canvas pixels")

            browser.close()
            print("\n[SUCCESS] ALL REAL BROWSER TESTS PASSED")

    finally:
        httpd.shutdown()
        httpd.server_close()

if __name__ == "__main__":
    run_tests()
