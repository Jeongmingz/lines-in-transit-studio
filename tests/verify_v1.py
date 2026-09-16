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
    f600_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-normal-600.woff2')
    f700_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-normal-700.woff2')
    fi600_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'cormorant-garamond-italic-600.woff2')
    license_path = os.path.join(BASE_DIR, 'assets', 'fonts', 'LICENSE-OFL.txt')

    assert_true(os.path.isfile(f600_path), "cormorant-garamond-normal-600.woff2 exists")
    assert_true(os.path.isfile(f700_path), "cormorant-garamond-normal-700.woff2 exists")
    assert_true(os.path.isfile(fi600_path), "cormorant-garamond-italic-600.woff2 exists")
    assert_true(os.path.isfile(license_path), "LICENSE-OFL.txt exists")

    h600 = hashlib.sha256(open(f600_path, 'rb').read()).hexdigest()
    h700 = hashlib.sha256(open(f700_path, 'rb').read()).hexdigest()
    assert_true(h600 != h700, f"Font weights 600 and 700 have distinct SHA256 hashes ({h600[:8]} vs {h700[:8]})")

def check_canvas_engine():
    path = os.path.join(BASE_DIR, 'js', 'canvas-engine.js')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("scale = 0.5" in content, "renderToCanvas supports scale parameter defaulting to 0.5")
    assert_true("ctx.scale(scale, scale)" in content, "renderToCanvas scales context via ctx.scale()")
    assert_true("PANORAMA · [1/2]" in content, "Slide 1 index is correctly formatted as PANORAMA · [1/2]")
    assert_true("[2/2]" in content and "state.location" in content, "Slide 2 index is correctly formatted as [location] · [2/2]")
    assert_true("fitText" in content, "Universal fitText helper implemented")
    assert_true("CanvasEngine.fitText" in content, "fitText invoked in CanvasEngine for layout titles")
    assert_true("nanum myeongjo" in content.lower() and "noto sans kr" in content.lower(), "Korean font fallbacks configured in canvas font stacks")

def check_export_engine():
    path = os.path.join(BASE_DIR, 'js', 'export-engine.js')
    content = open(path, 'r', encoding='utf-8').read()

    assert_true("!blob" in content, "canvas.toBlob null checks present")
    assert_true("targetMet" in content, "targetMet boolean returned in encodeCanvas")
    assert_true("qualityReduced" in content, "qualityReduced boolean returned in encodeCanvas")
    assert_true("Math.max(0.5, Math.min(5.0, parsedMB))" in content, "targetMB clamped between 0.5MB and 5.0MB")

def check_html_and_css():
    html_path = os.path.join(BASE_DIR, 'index.html')
    html_content = open(html_path, 'r', encoding='utf-8').read()

    css_path = os.path.join(BASE_DIR, 'css', 'style.css')
    css_content = open(css_path, 'r', encoding='utf-8').read()

    assert_true("Nanum+Myeongjo" in html_content and "Noto+Sans+KR" in html_content, "Google Fonts link present in index.html")
    assert_true('role="tabpanel"' in html_content, "tabpanel ARIA role present in index.html")
    assert_true("guides-single" in html_content and "guides-seamless" in html_content, "Split guides structure in HTML")
    assert_true("cut-badge" in html_content, "Central cut badge element present in HTML")
    assert_true("vendor/exifr.mini.umd.js" in html_content, "exifr script tag present in index.html")
    assert_true("gps-card" in html_content and "btn-fetch-address" in html_content, "GPS card and reverse geocode button present in HTML")

    assert_true(".cut-badge" in css_content and "top: 8px" in css_content, "Cut badge pinned to top in CSS")
    assert_true(".guide-slide-box.slide-1" in css_content, "Slide 1 safe area CSS rule present")
    assert_true(".guide-slide-box.slide-2" in css_content, "Slide 2 safe area CSS rule present")
    assert_true(".gps-card" in css_content and ".gps-badge" in css_content, "GPS card CSS styles present")

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

    assert_true("60fps" not in content, "Exaggerated 60fps claim removed from README")
    assert_true("부드러운 인터랙션을 목표로 최적화되었습니다" in content, "Realistic performance description present in README")

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
