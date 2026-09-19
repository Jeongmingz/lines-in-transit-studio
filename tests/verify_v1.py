# -*- coding: utf-8 -*-
"""
Lines in Transit Studio - Static Code & Asset Verification
Verifies source code invariants, DOM attributes, vendor assets, and CSS rules.
"""

import hashlib
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def assert_true(condition, msg):
    if not condition:
        print(f"[FAIL] {msg}")
        sys.exit(1)
    else:
        print(f"[PASS] {msg}")

def check_fonts():
    license_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'LICENSE-OFL.txt')
    f_archivo = os.path.join(BASE_DIR, 'assets', 'fonts', 'archivo-variable.woff2')
    f_pretendard = os.path.join(BASE_DIR, 'assets', 'fonts', 'pretendard-variable.woff2')
    f_ibm = os.path.join(BASE_DIR, 'assets', 'fonts', 'ibm-plex-mono-500.woff2')

    assert_true(os.path.isfile(f_archivo), "archivo-variable.woff2 exists")
    assert_true(os.path.isfile(f_pretendard), "pretendard-variable.woff2 exists")
    assert_true(os.path.isfile(f_ibm), "ibm-plex-mono-500.woff2 exists")
    assert_true(os.path.isfile(license_path), "LICENSE-OFL.txt exists")

    # Verify Cormorant files are removed
    f600_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-normal-600.woff2')
    f700_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-normal-700.woff2')
    fi600_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-italic-600.woff2')
    assert_true(not os.path.isfile(f600_path), "cormorant-garamond-normal-600.woff2 safely deleted")
    assert_true(not os.path.isfile(f700_path), "cormorant-garamond-normal-700.woff2 safely deleted")
    assert_true(not os.path.isfile(fi600_path), "cormorant-garamond-italic-600.woff2 safely deleted")

    license_txt = open(license_path, 'r', encoding='utf-8').read()
    assert_true("Archivo" in license_txt and "Pretendard" in license_txt, "OFL license includes Archivo and Pretendard")

    # Check that index.html does NOT link to external font CDNs
    index_html = open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8').read()
    assert_true("fonts.googleapis.com" not in index_html, "External fonts.googleapis.com removed from index.html")
    assert_true("fonts.gstatic.com" not in index_html, "External fonts.gstatic.com removed from index.html")


def check_canvas_engine():
    path = os.path.join(BASE_DIR, 'js', 'canvas-engine.js')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("scale = 0.5" in content, "renderToCanvas supports scale parameter defaulting to 0.5")
    assert_true("ctx.scale(scale, scale)" in content, "renderToCanvas scales context via ctx.scale()")
    assert_true("renderPhoto" in content, "renderPhoto method implemented for PHOTO format")
    assert_true("renderChapter" in content, "renderChapter method implemented for CHAPTER format")
    assert_true("renderPanorama" in content, "renderPanorama method implemented for PANORAMA format")
    assert_true("fitText" in content, "Universal fitText helper implemented")
    assert_true("CanvasEngine.fitText" in content, "fitText invoked in CanvasEngine for layout titles")
    assert_true("Pretendard" in content and "Archivo" in content, "Archivo and Pretendard configured in canvas font stacks")
    assert_true("URBAN & ARCHITECTURAL ARCHIVE" not in content, "Hardcoded urban archive slogan removed from canvas engine")
    assert_true("도시의 선과 여백" not in content, "Korean hardcoded slogan removed from canvas engine")

def check_export_engine():
    path = os.path.join(BASE_DIR, 'js', 'export-engine.js')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("!blob" in content, "canvas.toBlob null checks present")
    assert_true("targetMet" in content, "targetMet boolean returned in encodeCanvas")
    assert_true("qualityReduced" in content, "qualityReduced boolean returned in encodeCanvas")
    assert_true("Math.max(0.5, Math.min(5.0, parsedMB))" in content, "targetMB clamped between 0.5MB and 5.0MB")
    assert_true("generateFileName" in content, "generateFileName helper implemented")

def check_html_and_css():
    html_path = os.path.join(BASE_DIR, 'index.html')
    html_content = open(html_path, 'r', encoding='utf-8').read()

    css_path = os.path.join(BASE_DIR, 'css', 'style.css')
    css_content = open(css_path, 'r', encoding='utf-8').read()

    assert_true("JOURNAL STUDIO" in html_content, "Header badge updated to JOURNAL STUDIO in index.html")
    assert_true('role="tabpanel"' in html_content, "tabpanel ARIA role present in index.html")
    assert_true("guides-single" in html_content and "guides-seamless" in html_content, "Split guides structure in HTML")
    assert_true("cut-badge" in html_content, "Central cut badge element present in HTML")
    assert_true("vendor/exifr.mini.umd.js" in html_content, "exifr script tag present in index.html")
    assert_true("gps-card" in html_content and "btn-fetch-address" in html_content, "GPS card and reverse geocode button present in HTML")
    assert_true('id="select-series"' in html_content, "Series selection dropdown present in index.html")
    assert_true('id="input-date"' in html_content, "Capture date input present in index.html")
    assert_true('id="select-typography"' in html_content, "Typography preset dropdown present for CHAPTER layouts")
    assert_true('multiple' in html_content and 'id="carousel-list"' in html_content, "Multi-photo carousel controls present")
    assert_true('id="btn-save-draft"' in html_content, "Browser-local draft save control present")
    assert_true('id="chk-append-coords"' not in html_content, "Public exact-coordinate caption option removed")
    assert_true('id="chk-include-clean"' not in html_content, "Clean photo toggle checkbox removed from index.html")
    assert_true('id="btn-copy-caption"' in html_content, "Instagram caption copy button present in index.html")
    assert_true('id="input-caption-note"' in html_content, "Observation note textarea present in index.html")
    assert_true('id="btn-sample-1"' in html_content and 'id="btn-sample-2"' in html_content and 'id="btn-sample-3"' in html_content, "3 genre sample buttons present in HTML")

    assert_true(".cut-badge" in css_content and "top: 8px" in css_content, "Cut badge pinned to top in CSS")
    assert_true(".guide-slide-box.slide-1" in css_content, "Slide 1 safe area CSS rule present")
    assert_true(".guide-slide-box.slide-2" in css_content, "Slide 2 safe area CSS rule present")
    assert_true(".gps-card" in css_content and ".gps-badge" in css_content, "GPS card CSS styles present")
    assert_true("Archivo" in css_content and "Pretendard" in css_content, "Archivo and Pretendard font-face rules present in CSS")

def check_app_controller():
    path = os.path.join(BASE_DIR, 'js', 'app.js')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("this.renderDirty = true;" in content, "Dirty-flag RAF render loop in scheduleRender")
    assert_true("runRenderLoop" in content, "runRenderLoop async loop present")
    assert_true("this.isExporting" in content, "Export concurrency lock present")
    assert_true("setExportButtonsDisabled" in content, "Export button disable helper present")
    assert_true("renderToCanvas(this.mainCanvas, this.currentImage, this.state, 0.5)" in content, "Main preview renders at 0.5 scale")
    assert_true("ArrowRight" in content and "ArrowLeft" in content, "Keyboard arrow navigation for tabs present")
    assert_true("this.imageLoadRequestId" in content, "imageLoadRequestId race condition guard present")
    assert_true("handleReverseGeocode" in content, "handleReverseGeocode method present")
    assert_true("extractGps" in content, "extractGps method present")
    assert_true("select-series" in content, "select-series event handling present in app.js")
    assert_true("handleFiles" in content and "exportCarouselZip" in content, "Multi-photo carousel loading and ZIP export implemented")
    assert_true("DraftStore" in content and "saveDraft" in content, "IndexedDB draft persistence integrated")
    assert_true("select-typography" in content, "Typography preset switching integrated")

def check_api_and_vendor():
    exifr_path = os.path.join(BASE_DIR, 'vendor', 'exifr.mini.umd.js')
    geocode_path = os.path.join(BASE_DIR, 'api', 'geocode.js')

    assert_true(os.path.isfile(exifr_path), "vendor/exifr.mini.umd.js exists")
    assert_true(os.path.isfile(geocode_path), "api/geocode.js exists")

    geocode_content = open(geocode_path, 'r', encoding='utf-8').read()
    assert_true("nominatim.openstreetmap.org" in geocode_content, "Nominatim reverse geocoding in api/geocode.js")
    assert_true("LinesInTransitStudio" in geocode_content, "Compliant User-Agent in api/geocode.js")

def check_readme():
    path = os.path.join(BASE_DIR, 'README.md')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("Journal Post Maker" in content, "Journal Post Maker definition present in README")
    assert_true("70% 사진 · 20% 기록 · 10% 브랜드" in content, "70:20:10 rule present in README")
    assert_true("PHOTO" in content and "CHAPTER" in content and "PANORAMA" in content, "3 formats documented in README")

if __name__ == '__main__':
    print("=== Lines in Transit Studio Static Verification ===")
    check_fonts()
    check_canvas_engine()
    check_export_engine()
    check_html_and_css()
    check_app_controller()
    check_api_and_vendor()
    check_readme()
    print("\n[SUCCESS] ALL STATIC CHECKS PASSED")
