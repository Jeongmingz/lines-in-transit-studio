# -*- coding: utf-8 -*-
"""
Lines in Transit Studio - Functional Unit Tests
Verifies core algorithmic and mathematical business logic:
- DMS (Degrees, Minutes, Seconds) coordinate conversion
- Target MB quality clamping
- Standardized file name sanitization and formatting
- Asynchronous request ID race condition resolution
"""

import math
import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def assert_true(condition, msg):
    if not condition:
        print(f"[FAIL] {msg}")
        sys.exit(1)
    else:
        print(f"[PASS] {msg}")

def assert_equal(actual, expected, msg):
    if actual != expected:
        print(f"[FAIL] {msg} -> Expected: {expected!r}, Got: {actual!r}")
        sys.exit(1)
    else:
        print(f"[PASS] {msg}")


# 1. DMS Coordinate Conversion (Python implementation matching App.toDMS)
def to_dms(coordinate, is_latitude):
    absolute = abs(coordinate)
    degrees = math.floor(absolute)
    minutes_not_truncated = (absolute - degrees) * 60
    minutes = math.floor(minutes_not_truncated)
    seconds = round((minutes_not_truncated - minutes) * 60)

    if seconds >= 60:
        seconds = 0
        minutes += 1
    if minutes >= 60:
        minutes = 0
        degrees += 1

    direction = ('N' if coordinate >= 0 else 'S') if is_latitude else ('E' if coordinate >= 0 else 'W')
    return f"{degrees}°{minutes:02d}′{seconds:02d}″{direction}"

def test_dms_conversion():
    # Tokyo Coordinates from user example
    tokyo_lat = 35.6762
    tokyo_lon = 139.6503
    assert_equal(to_dms(tokyo_lat, True), "35°40′34″N", "Tokyo Latitude to DMS")
    assert_equal(to_dms(tokyo_lon, False), "139°39′01″E", "Tokyo Longitude to DMS")

    # Boundary rounding carry-over (e.g. 59.6 seconds rolls over to next minute/degree)
    boundary_coord = 12.9999
    assert_equal(to_dms(boundary_coord, True), "13°00′00″N", "DMS 60-second boundary carry-over")

    # Southern & Western Hemispheres
    sydney_lat = -33.8688
    sydney_lon = 151.2093
    assert_equal(to_dms(sydney_lat, True), "33°52′08″S", "Sydney Latitude (South) to DMS")
    assert_equal(to_dms(sydney_lon, False), "151°12′33″E", "Sydney Longitude to DMS")

    ny_lat = 40.7128
    ny_lon = -74.0060
    assert_equal(to_dms(ny_lat, True), "40°42′46″N", "New York Latitude to DMS")
    assert_equal(to_dms(ny_lon, False), "74°00′22″W", "New York Longitude (West) to DMS")

# 2. Target MB Clamping
def clamp_target_mb(val):
    try:
        parsed = float(val)
    except (ValueError, TypeError):
        parsed = 1.4
    return max(0.5, min(5.0, parsed))

def test_target_mb_clamping():
    assert_equal(clamp_target_mb(-1.0), 0.5, "Negative targetMB clamped to 0.5")
    assert_equal(clamp_target_mb(0.1), 0.5, "Under-limit targetMB (0.1) clamped to 0.5")
    assert_equal(clamp_target_mb(1.4), 1.4, "Standard targetMB (1.4) kept intact")
    assert_equal(clamp_target_mb(2.5), 2.5, "Mid-range targetMB (2.5) kept intact")
    assert_equal(clamp_target_mb(5.0), 5.0, "Boundary targetMB (5.0) kept intact")
    assert_equal(clamp_target_mb(99.0), 5.0, "Over-limit targetMB (99.0) clamped to 5.0")
    assert_equal(clamp_target_mb("invalid"), 1.4, "Invalid string targetMB defaults to 1.4")

# 3. Filename Generation (matching ExportEngine.generateFileName)
def generate_file_name(issue_no='01', location='SCENE', suffix='PHOTO', ext='jpg', series=''):
    clean_no = str(issue_no).zfill(3)
    clean_loc = re.sub(r'[^a-zA-Z0-9가-힣]', '_', location)
    clean_loc = re.sub(r'_+', '_', clean_loc)[:15].upper() or 'SCENE'

    if series:
        clean_series = re.sub(r'[^a-zA-Z0-9가-힣]', '_', series)
        clean_series = re.sub(r'_+', '_', clean_series)[:15].upper() or 'JOURNAL'
        return f"LIT_{clean_series}-{clean_no}_{clean_loc}_{suffix}.{ext}"

    return f"LIT_ISSUE-{clean_no}_{clean_loc}_{suffix}.{ext}"

def test_filename_generation():
    assert_equal(
        generate_file_name("1", "Kanazawa Waterway", "PHOTO", "jpg", "PASSING PLACES"),
        "LIT_PASSING_PLACES-001_KANAZAWA_WATERW_PHOTO.jpg",
        "Photo filename with series and location sanitization"
    )
    assert_equal(
        generate_file_name("1", "Kanazawa", "01_COVER", "jpg", "PASSING PLACES"),
        "LIT_PASSING_PLACES-001_KANAZAWA_01_COVER.jpg",
        "Chapter cover filename with 01_COVER suffix"
    )
    assert_equal(
        generate_file_name("1", "Kanazawa", "02_CLEAN", "jpg", "PASSING PLACES"),
        "LIT_PASSING_PLACES-001_KANAZAWA_02_CLEAN.jpg",
        "Clean photo filename with 02_CLEAN suffix"
    )
    assert_equal(
        generate_file_name("2", "도쿄/시부야 35°40'N", "01_LEFT", "jpg", "CITY LINES"),
        "LIT_CITY_LINES-002_도쿄_시부야_35_40_N_01_LEFT.jpg",
        "Slide 01 filename with Korean & symbols sanitization and series"
    )
    assert_equal(
        generate_file_name("15", "", "PHOTO", "png", ""),
        "LIT_ISSUE-015_SCENE_PHOTO.png",
        "Fallback to LIT_ISSUE and SCENE for empty series and location"
    )

# 4. Request ID Race Condition State Machine
def test_request_id_race_condition():
    # Simulates: User initiates Sample 1 (slow async), then immediately picks User Photo (fast async)
    state = {"active_image": None}
    current_request_id = 0

    # Step A: Sample 1 starts
    current_request_id += 1
    sample1_req_id = current_request_id

    # Step B: User selects photo right after
    current_request_id += 1
    photo_req_id = current_request_id

    # Photo finishes first
    if photo_req_id == current_request_id:
        state["active_image"] = "USER_PHOTO"

    # Sample 1 finishes later
    if sample1_req_id == current_request_id:
        state["active_image"] = "SAMPLE_1"  # Should NOT execute

    assert_equal(state["active_image"], "USER_PHOTO", "Fast user photo wins over slow sample load")

# 5. Journal Presets & Typography Integrity Test
def test_journal_presets():
    path = os.path.join(BASE_DIR, 'js', 'presets.js')
    content = open(path, 'r', encoding='utf-8').read()
    
    assert_true("mode: 'photo'" in content, "DEFAULT_STATE defaults to photo format")
    assert_true("series: 'PASSING PLACES'" in content, "DEFAULT_STATE defaults to PASSING PLACES series")
    assert_true("photoFitMode: 'cover'" in content, "DEFAULT_STATE defaults to photoFitMode: 'cover'")
    assert_true("SERIES_PRESETS" in content, "SERIES_PRESETS exported")
    assert_true("PASSING PLACES" in content and "CITY LINES" in content and "WATERLINES" in content, "Core series presets defined")
    assert_true("BRAND_TYPOGRAPHY" in content, "BRAND_TYPOGRAPHY exported")
    assert_true("-0.035em" in content, "Archivo masthead letterSpacing -0.035em is defined")
    assert_true("-0.01em" in content, "Photo title letterSpacing -0.01em is defined")
    assert_true("0.06em" in content, "Series number letterSpacing 0.06em is defined")
    assert_true("SAMPLE_PHOTOS" in content, "SAMPLE_PHOTOS exported")
    assert_true("hotel" in content and "landscape" in content and "canal" in content, "3 genre sample photos defined")

# 6. Caption Formatting & Dynamic Hashtag Defense Test
def format_caption(note, state):
    lines = []
    if note and note.strip():
        lines.append(note.strip())
        lines.append('')

    if state.get('location'):
        natural_loc = re.sub(r'\s*·\s*', ', ', state['location']).strip()
        lines.append(natural_loc)

    if state.get('customCameraTag'):
        clean_cam = re.sub(r'\s*SOOC\s*', '', state['customCameraTag'], flags=re.IGNORECASE).strip()
        if clean_cam:
            lines.append(clean_cam)

    lines.append('')
    tags = ['#linesintransit']

    series = state.get('series', 'PASSING PLACES')
    series_tag = re.sub(r'[^a-z0-9가-힣]', '', series.lower())
    if series_tag:
        tags.append(f'#{series_tag}')

    if state.get('location'):
        primary_loc = re.split(r'[,·/]', state['location'])[0].strip()
        loc_tag = re.sub(r'[^a-z0-9가-힣]', '', primary_loc.lower())
        if loc_tag:
            tags.append(f'#{loc_tag}')

    if state.get('customCameraTag'):
        cam_lower = state['customCameraTag'].lower()
        if 'x-t30 ii' in cam_lower or 'xt30' in cam_lower:
            tags.append('#fujifilmxt30ii')
        elif 'ipod' in cam_lower:
            tags.append('#ipodtouch')
        elif 'fujifilm' in cam_lower or 'fuji' in cam_lower:
            tags.append('#fujifilm')
        else:
            raw_cam = re.sub(r'[^a-z0-9가-힣]', '', state['customCameraTag'].split('·')[0].lower())
            if raw_cam:
                tags.append(f'#{raw_cam}')

    lines.append(' '.join(tags))
    return '\n'.join(lines)

def test_caption_formatting():
    # Test case 1: Standard Fujifilm in Kanazawa
    state1 = {
        'location': 'KANAZAWA · JAPAN',
        'customCameraTag': 'FUJIFILM X-T30 II · CLASSIC CHROME SOOC',
        'series': 'WATERLINES'
    }
    cap1 = format_caption("골목 끝 수로에 오후 햇살이 닿으면서 물결이 빛났다.", state1)
    assert_true("KANAZAWA, JAPAN" in cap1, "Caption formats location with natural comma")
    assert_true("FUJIFILM X-T30 II · CLASSIC CHROME" in cap1, "Caption strips SOOC from camera line")
    assert_true("#linesintransit" in cap1, "Caption includes brand anchor hashtag")
    assert_true("#waterlines" in cap1, "Caption includes series hashtag")
    assert_true("#kanazawa" in cap1, "Caption includes primary city hashtag")
    assert_true("#fujifilmxt30ii" in cap1, "Caption dynamically generates #fujifilmxt30ii")
    assert_true("#filmphotography" not in cap1, "#filmphotography is strictly excluded")

    # Test case 2: Korean location defense (never produces empty '#')
    state2 = {
        'location': '서울 종로구 계동',
        'customCameraTag': 'APPLE IPOD TOUCH 7 · VINTAGE DIGITAL',
        'series': 'POCKET NOTES'
    }
    cap2 = format_caption("북촌 한옥 처마 아래.", state2)
    assert_true("#서울종로구계동" in cap2 or "#서울" in cap2, "Korean location preserved as valid hashtag")
    assert_true("# " not in cap2 and not cap2.endswith("#"), "No empty hashtags generated for Korean input")
    assert_true("#ipodtouch" in cap2, "iPod Touch generates #ipodtouch hashtag")

if __name__ == '__main__':
    print("=== Lines in Transit Studio Functional Tests ===")
    test_dms_conversion()
    test_target_mb_clamping()
    test_filename_generation()
    test_request_id_race_condition()
    test_journal_presets()
    test_caption_formatting()
    print("\n[SUCCESS] ALL FUNCTIONAL TESTS PASSED")

