# -*- coding: utf-8 -*-
"""Focused browser checks for carousel, local draft, and typography workflows."""

import http.server
import os
import socketserver
import tempfile
import threading
import zipfile

from PIL import Image
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"[PASS] {message}")


def run():
    os.chdir(BASE_DIR)
    server = socketserver.TCPServer(("", 0), QuietHandler)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="msedge", headless=True)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            page.goto(f"http://localhost:{port}")
            page.evaluate("localStorage.clear(); indexedDB.deleteDatabase('lines-in-transit-studio')")
            page.reload()

            fixtures = [
                os.path.join(BASE_DIR, "tests", "fixtures", "no_gps.jpg"),
                os.path.join(BASE_DIR, "tests", "fixtures", "with_gps.jpg"),
            ]
            page.set_input_files("#file-input", fixtures)
            page.wait_for_function("window.__app_instance__.carouselItems.length === 2")
            check(page.locator(".carousel-item").count() == 2, "Multiple uploads create ordered carousel cards")

            page.locator(".carousel-item").nth(1).locator(".carousel-thumb").click()
            page.locator("#zoom-slider").fill("1.5")
            page.locator("#zoom-slider").dispatch_event("change")
            zoom = page.evaluate("window.__app_instance__.carouselItems[1].zoom")
            check(abs(zoom - 1.5) < 0.01, "Each carousel photo keeps its own composition")

            second_name = page.evaluate("window.__app_instance__.carouselItems[1].name")
            page.locator(".carousel-item").nth(1).locator('[data-action="left"]').click()
            check(page.evaluate("window.__app_instance__.carouselItems[0].name") == second_name, "Carousel order controls move photos")

            page.locator('[data-mode="chapter"]').click()
            page.locator("#select-typography").select_option("archive")
            check(page.evaluate("window.__app_instance__.state.typographyPreset") == "archive", "CHAPTER typography selection updates render state")

            page.locator('[data-mode="photo"]').click()
            page.locator("#journal-summary").click()
            page.locator("#input-caption-note").fill("빛이 벽을 가로지르는 순간 멈췄다.")
            page.locator("#input-caption-note").dispatch_event("input")
            page.locator("#btn-save-draft").click()
            page.wait_for_function("document.querySelector('#draft-status').textContent.includes('저장 완료')")
            page.reload()
            page.wait_for_function("window.__app_instance__.carouselItems.length === 2")
            check(page.locator("#input-caption-note").input_value().startswith("빛이"), "Draft restores observation note")
            check(page.locator(".carousel-item").count() == 2, "Draft restores photos and order")

            page.locator("#tab-btn-export").click()
            with page.expect_download() as download_info:
                page.locator("#btn-download-single").click()
            download = download_info.value
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_path = os.path.join(temp_dir, download.suggested_filename)
                download.save_as(zip_path)
                with zipfile.ZipFile(zip_path) as archive:
                    names = archive.namelist()
                    check(len(names) == 2, "Carousel ZIP contains every ordered photo")
                    for name in names:
                        with archive.open(name) as image_file:
                            with Image.open(image_file) as image:
                                check(image.size == (1080, 1350), f"{name} exports at 1080×1350")

            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    print("=== Lines in Transit Studio V2 Browser Tests ===")
    run()
    print("\n[SUCCESS] ALL V2 BROWSER TESTS PASSED")
