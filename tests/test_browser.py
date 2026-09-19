# -*- coding: utf-8 -*-
"""
Lines in Transit Studio - End-to-End Real Browser Integration Tests
Executes actual browser runtime via Playwright (MS Edge / Chromium Desktop standard):
1. Verifies zero external font network requests (pure local offline bundling)
2. Verifies initial sample loading does NOT overwrite saved localStorage state
3. Verifies mode-adaptive UI (PHOTO collapsed details, CHAPTER expanded with title, PANORAMA overlay)
4. Verifies non-GPS photo upload shows "위치 메타데이터 없음"
5. Verifies GPS photo upload triggers local exifr analysis, displays coordinates, and shows OpenStreetMap attribution
6. Verifies series selection & custom series input
7. Verifies framing toggle (4:5 Crop vs Fit) in PHOTO mode
8. Verifies Instagram Caption copy button & observation note in Studio tab
9. Verifies 3 Genre sample buttons
10. Verifies pre-compression Canvas ImageData seam comparison for PANORAMA (100% pixel match)
11. Verifies PHOTO export download via PIL (1080x1350)
12. Verifies CHAPTER multi-slide export downloads via PIL (2 files, each 1080x1350)
13. Verifies PANORAMA slide downloads and ZIP export via PIL & zipfile (each 1080x1350)
"""

import http.server
import io
import os
import shutil
import socketserver
import sys
import tempfile
import threading
import time
import zipfile
from PIL import Image
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
    os.chdir(BASE_DIR)
    port = 8899
    httpd = socketserver.TCPServer(("", port), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.5)

    base_url = f"http://localhost:{port}"
    temp_dir = tempfile.mkdtemp(prefix="lit_test_")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 800}, accept_downloads=True)
            page = context.new_page()

            # Track network requests to verify 0 external font calls
            external_font_requests = []
            def on_request(req):
                url = req.url.lower()
                if "fonts.googleapis.com" in url or "fonts.gstatic.com" in url or "jsdelivr.net" in url:
                    external_font_requests.append(url)
            page.on("request", on_request)

            print("=== Lines in Transit Studio Real Browser Tests (Chromium Desktop Standard) ===")

            # Test 1: LocalStorage state preservation on initial load
            page.goto(base_url)
            preview_top = page.locator(".preview-pane").bounding_box()["y"]
            sidebar_scrollable = page.locator(".control-sidebar").evaluate(
                "el => el.scrollHeight > el.clientHeight"
            )
            assert_true(sidebar_scrollable, "Desktop control sidebar has its own scroll range")
            page.locator(".control-sidebar").evaluate("el => el.scrollTop = 320")
            assert_true(page.evaluate("window.scrollY") == 0, "Desktop page remains locked while controls scroll")
            assert_true(
                page.locator(".preview-pane").bounding_box()["y"] == preview_top,
                "Left preview stays fixed while the right sidebar scrolls",
            )
            page.locator(".control-sidebar").evaluate("el => el.scrollTop = 0")
            page.set_viewport_size({"width": 800, "height": 900})
            mobile_overflow = page.evaluate("getComputedStyle(document.body).overflowY")
            assert_true(mobile_overflow == "auto", "Mobile layout restores normal page scrolling")
            page.set_viewport_size({"width": 1280, "height": 800})
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

            # Test 2: Mode-adaptive UI assertions
            # PHOTO mode: collapsed details, fit visible, panorama overlay hidden
            page.click(".mode-btn[data-mode='photo']")
            page.wait_for_timeout(300)
            photo_fit_display = page.evaluate("() => getComputedStyle(document.getElementById('photo-fit-group')).display")
            pano_overlay_display = page.evaluate("() => getComputedStyle(document.getElementById('panorama-overlay-group')).display")
            has_seamless_class = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            details_open_photo = page.evaluate("() => document.getElementById('journal-details').open")
            btn_single_text_photo = page.locator("#btn-download-single").inner_text()

            assert_true(photo_fit_display != "none", "PHOTO mode displays framing fit/cover group")
            assert_true(pano_overlay_display == "none", "PHOTO mode hides panorama overlay group")
            assert_true(not has_seamless_class, "PHOTO mode cleanly removes mode-seamless container class")
            assert_true(not details_open_photo, "PHOTO mode keeps journal-details collapsed by default")
            assert_true("클린 사진 다운로드" in btn_single_text_photo, "PHOTO mode shows clean photo download button label")

            # CHAPTER mode: expanded details, fit hidden, photo title visible, series no visible
            page.click(".mode-btn[data-mode='chapter']")
            page.wait_for_timeout(300)
            chapter_fit_display = page.evaluate("() => getComputedStyle(document.getElementById('photo-fit-group')).display")
            btn_single_text_chapter = page.locator("#btn-download-single").inner_text()
            details_open_chapter = page.evaluate("() => document.getElementById('journal-details').open")
            title_display_chapter = page.evaluate("() => getComputedStyle(document.getElementById('group-photo-title')).display")
            series_no_display_chapter = page.evaluate("() => getComputedStyle(document.getElementById('group-series-no')).display")

            assert_true(chapter_fit_display == "none", "CHAPTER mode hides photo framing group")
            assert_true("챕터 세트 다운로드" in btn_single_text_chapter, "CHAPTER mode updates single download button label")
            assert_true(details_open_chapter, "CHAPTER mode automatically expands journal-details")
            assert_true(title_display_chapter != "none", "CHAPTER mode displays photo title group")
            assert_true(series_no_display_chapter != "none", "CHAPTER mode displays series & No group")

            # PANORAMA mode: collapsed details, photo title hidden, series no hidden, overlay visible
            page.click(".mode-btn[data-mode='panorama']")
            page.wait_for_timeout(300)
            pano_overlay_after = page.evaluate("() => getComputedStyle(document.getElementById('panorama-overlay-group')).display")
            has_seamless_class_pano = "mode-seamless" in (page.locator("#canvas-container").get_attribute("class") or "")
            details_open_pano = page.evaluate("() => document.getElementById('journal-details').open")
            title_display_pano = page.evaluate("() => getComputedStyle(document.getElementById('group-photo-title')).display")
            series_no_display_pano = page.evaluate("() => getComputedStyle(document.getElementById('group-series-no')).display")
            seamless_section_display = page.evaluate("() => getComputedStyle(document.getElementById('export-seamless-section')).display")

            assert_true(pano_overlay_after != "none", "PANORAMA mode displays overlay toggle group")
            assert_true(has_seamless_class_pano, "PANORAMA mode adds mode-seamless container class")
            assert_true(details_open_pano, "PANORAMA mode keeps journal-details open for location & caption")
            assert_true(title_display_pano == "none", "PANORAMA mode hides photo title group")
            assert_true(series_no_display_pano == "none", "PANORAMA mode hides series & No group")
            assert_true(seamless_section_display != "none", "PANORAMA mode shows 2-slide seamless export section")

            # Test 3: Zero external font network requests
            assert_true(len(external_font_requests) == 0, f"Zero external font network requests (actual: {external_font_requests})")

            # Test 4: Non-GPS photo upload
            no_gps_file = os.path.join(BASE_DIR, "tests", "fixtures", "no_gps.jpg")
            page.set_input_files("#file-input", no_gps_file)
            page.wait_for_timeout(800)

            none_card_display = page.evaluate("() => getComputedStyle(document.getElementById('gps-none-card')).display")
            gps_card_display = page.evaluate("() => getComputedStyle(document.getElementById('gps-card')).display")
            assert_true(none_card_display != "none", "Non-GPS photo displays '위치 메타데이터 없음' card")
            assert_true(gps_card_display == "none", "Non-GPS photo keeps GPS action card hidden")

            # Test 5: GPS photo upload & exifr analysis & OSM attribution
            with_gps_file = os.path.join(BASE_DIR, "tests", "fixtures", "with_gps.jpg")
            page.set_input_files("#file-input", with_gps_file)
            page.wait_for_timeout(1000)

            gps_card_display_after = page.evaluate("() => getComputedStyle(document.getElementById('gps-card')).display")
            dms_text = page.locator("#gps-dms-text").inner_text()
            attribution_href = page.locator(".gps-attribution a").get_attribute("href")

            assert_true(gps_card_display_after != "none", "GPS photo displays active GPS metadata card")
            assert_true("35°40′34″N" in dms_text and "139°39′01″E" in dms_text, "GPS photo extracts and formats accurate DMS coordinates")
            assert_true("openstreetmap.org/copyright" in (attribution_href or ""), "OpenStreetMap attribution link is clearly displayed in GPS card")

            # Test 6: Series selection & custom series input
            page.click(".mode-btn[data-mode='photo']")
            page.wait_for_timeout(200)
            page.click("#journal-summary")
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

            # Test 10: Pre-compression Canvas ImageData Seam Verification for PANORAMA
            page.click(".mode-btn[data-mode='panorama']")
            page.wait_for_timeout(400)
            page.wait_for_function("() => window.__app_instance__ && window.__app_instance__.currentImage !== null")

            seam_check = page.evaluate("""async () => {
                const app = window.__app_instance__;
                const artifacts = await app.getExportArtifacts();
                if (!artifacts || !artifacts.canvas || !artifacts.slide1 || !artifacts.slide2) {
                    return { ok: false, msg: 'Artifacts missing canvas or slides' };
                }
                if (artifacts.canvas.width !== 2160 || artifacts.canvas.height !== 1350) {
                    return { ok: false, msg: `Master dimensions mismatch: ${artifacts.canvas.width}x${artifacts.canvas.height}` };
                }
                if (artifacts.slide1.width !== 1080 || artifacts.slide1.height !== 1350) {
                    return { ok: false, msg: `Slide 1 dimensions mismatch: ${artifacts.slide1.width}x${artifacts.slide1.height}` };
                }
                if (artifacts.slide2.width !== 1080 || artifacts.slide2.height !== 1350) {
                    return { ok: false, msg: `Slide 2 dimensions mismatch: ${artifacts.slide2.width}x${artifacts.slide2.height}` };
                }

                const masterCtx = artifacts.canvas.getContext('2d');
                const s1Ctx = artifacts.slide1.getContext('2d');
                const s2Ctx = artifacts.slide2.getContext('2d');

                for (let y = 50; y < 1350; y += 80) {
                    const mLeft = masterCtx.getImageData(1079, y, 1, 1).data;
                    const s1Right = s1Ctx.getImageData(1079, y, 1, 1).data;
                    for (let c = 0; c < 4; c++) {
                        if (mLeft[c] !== s1Right[c]) {
                            return { ok: false, msg: `Seam left mismatch at y=${y}, channel ${c}: master=${mLeft[c]}, s1=${s1Right[c]}` };
                        }
                    }

                    const mRight = masterCtx.getImageData(1080, y, 1, 1).data;
                    const s2Left = s2Ctx.getImageData(0, y, 1, 1).data;
                    for (let c = 0; c < 4; c++) {
                        if (mRight[c] !== s2Left[c]) {
                            return { ok: false, msg: `Seam right mismatch at y=${y}, channel ${c}: master=${mRight[c]}, s2=${s2Left[c]}` };
                        }
                    }
                }
                return { ok: true, msg: 'Pre-compression Canvas ImageData seam is 100% mathematically exact' };
            }""")
            assert_true(seam_check["ok"], f"PANORAMA Canvas ImageData Seam Check: {seam_check['msg']}")

            # Test 11: Rigorous Export E2E - PHOTO mode
            page.click("#tab-btn-studio")
            page.wait_for_timeout(200)
            page.click(".mode-btn[data-mode='photo']")
            page.wait_for_timeout(300)
            page.wait_for_function("() => window.__app_instance__ && window.__app_instance__.currentImage !== null")
            page.click("#tab-btn-export")
            page.wait_for_timeout(200)

            with page.expect_download() as photo_dl_info:
                page.click("#btn-download-single")
            photo_dl = photo_dl_info.value
            photo_file = os.path.join(temp_dir, photo_dl.suggested_filename)
            photo_dl.save_as(photo_file)

            assert_true("PHOTO" in photo_dl.suggested_filename, f"PHOTO export filename contains PHOTO: {photo_dl.suggested_filename}")
            with Image.open(photo_file) as im:
                assert_true(im.size == (1080, 1350), f"PHOTO export image resolution is exactly (1080, 1350) (actual: {im.size})")

            # Test 12: Rigorous Export E2E - CHAPTER mode (2 sequential files: COVER & CLEAN)
            page.click("#tab-btn-studio")
            page.wait_for_timeout(200)
            page.click(".mode-btn[data-mode='chapter']")
            page.wait_for_timeout(300)
            page.wait_for_function("() => window.__app_instance__ && window.__app_instance__.currentImage !== null")
            page.click("#tab-btn-export")
            page.wait_for_timeout(200)

            chapter_downloads = []
            def on_chapter_dl(dl):
                chapter_downloads.append(dl)
            page.on("download", on_chapter_dl)

            page.click("#btn-download-single")
            deadline = time.time() + 10
            while len(chapter_downloads) < 2 and time.time() < deadline:
                page.wait_for_timeout(200)

            assert_true(len(chapter_downloads) == 2, f"CHAPTER mode generates exactly 2 download events (actual: {len(chapter_downloads)})")
            page.remove_listener("download", on_chapter_dl)
            
            c_filenames = [dl.suggested_filename for dl in chapter_downloads]
            has_cover = any("01_COVER" in fn for fn in c_filenames)
            has_clean = any("02_CLEAN" in fn for fn in c_filenames)
            assert_true(has_cover and has_clean, f"CHAPTER files contain 01_COVER and 02_CLEAN: {c_filenames}")

            for idx, c_dl in enumerate(chapter_downloads):
                c_path = os.path.join(temp_dir, f"chap_{idx}_{c_dl.suggested_filename}")
                c_dl.save_as(c_path)
                with Image.open(c_path) as im:
                    assert_true(im.size == (1080, 1350), f"CHAPTER file {c_dl.suggested_filename} resolution is (1080, 1350) (actual: {im.size})")

            # Test 13: Rigorous Export E2E - PANORAMA mode (Slide 1, Slide 2, and ZIP)
            page.click("#tab-btn-studio")
            page.wait_for_timeout(200)
            page.click(".mode-btn[data-mode='panorama']")
            page.wait_for_timeout(300)
            page.wait_for_function("() => window.__app_instance__ && window.__app_instance__.currentImage !== null")
            page.click("#tab-btn-export")
            page.wait_for_timeout(200)

            # Slide 1 download
            with page.expect_download() as s1_dl_info:
                page.click("#btn-download-s1")
            s1_dl = s1_dl_info.value
            s1_file = os.path.join(temp_dir, s1_dl.suggested_filename)
            s1_dl.save_as(s1_file)
            assert_true("01_LEFT" in s1_dl.suggested_filename, f"Slide 1 filename contains 01_LEFT: {s1_dl.suggested_filename}")
            with Image.open(s1_file) as im:
                assert_true(im.size == (1080, 1350), f"Slide 1 resolution is (1080, 1350) (actual: {im.size})")

            # Slide 2 download
            with page.expect_download() as s2_dl_info:
                page.click("#btn-download-s2")
            s2_dl = s2_dl_info.value
            s2_file = os.path.join(temp_dir, s2_dl.suggested_filename)
            s2_dl.save_as(s2_file)
            assert_true("02_RIGHT" in s2_dl.suggested_filename, f"Slide 2 filename contains 02_RIGHT: {s2_dl.suggested_filename}")
            with Image.open(s2_file) as im:
                assert_true(im.size == (1080, 1350), f"Slide 2 resolution is (1080, 1350) (actual: {im.size})")

            # ZIP download
            with page.expect_download() as zip_dl_info:
                page.click("#btn-download-zip")
            zip_dl = zip_dl_info.value
            zip_file_path = os.path.join(temp_dir, zip_dl.suggested_filename)
            zip_dl.save_as(zip_file_path)
            assert_true(zip_dl.suggested_filename.endswith(".zip"), f"ZIP file extension is .zip: {zip_dl.suggested_filename}")

            with zipfile.ZipFile(zip_file_path, "r") as zf:
                namelist = zf.namelist()
                assert_true(len(namelist) == 2, f"ZIP contains exactly 2 slides (actual: {len(namelist)}: {namelist})")
                assert_true(any("01_LEFT" in name for name in namelist), "ZIP namelist includes 01_LEFT")
                assert_true(any("02_RIGHT" in name for name in namelist), "ZIP namelist includes 02_RIGHT")
                for name in namelist:
                    with io.BytesIO(zf.read(name)) as bio:
                        with Image.open(bio) as im:
                            assert_true(im.size == (1080, 1350), f"ZIP entry {name} pixel size is exactly (1080, 1350) (actual: {im.size})")

            browser.close()
            print("\n[SUCCESS] ALL REAL BROWSER TESTS (CHROMIUM DESKTOP STANDARD) PASSED")

    finally:
        httpd.shutdown()
        httpd.server_close()
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    run_tests()
