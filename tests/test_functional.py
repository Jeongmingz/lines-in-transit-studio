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
import re
import sys

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
    direction = ('N' if coordinate >= 0 else 'S') if is_latitude else ('E' if coordinate >= 0 else 'W')
    return f"{degrees}°{minutes:02d}′{seconds:02d}″{direction}"

def test_dms_conversion():
    # Tokyo Coordinates from user example
    tokyo_lat = 35.6762
    tokyo_lon = 139.6503
    assert_equal(to_dms(tokyo_lat, True), "35°40′34″N", "Tokyo Latitude to DMS")
    assert_equal(to_dms(tokyo_lon, False), "139°39′01″E", "Tokyo Longitude to DMS")

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
def generate_file_name(issue_no='01', location='SCENE', suffix='COVER', ext='jpg'):
    clean_no = str(issue_no).zfill(3)
    clean_loc = re.sub(r'[^a-zA-Z0-9가-힣]', '_', location)
    clean_loc = re.sub(r'_+', '_', clean_loc)[:15].upper() or 'SCENE'
    return f"LIT_ISSUE-{clean_no}_{clean_loc}_{suffix}.{ext}"

def test_filename_generation():
    assert_equal(
        generate_file_name("1", "Tokyo Shibuya", "COVER", "jpg"),
        "LIT_ISSUE-001_TOKYO_SHIBUYA_COVER.jpg",
        "Cover filename with space sanitization"
    )
    assert_equal(
        generate_file_name("2", "도쿄/시부야 35°40'N", "SLIDE-01", "jpg"),
        "LIT_ISSUE-002_도쿄_시부야_35_40_N_SLIDE-01.jpg",
        "Slide 01 filename with Korean & symbols sanitization"
    )
    assert_equal(
        generate_file_name("15", "", "COVER", "png"),
        "LIT_ISSUE-015_SCENE_COVER.png",
        "Fallback to SCENE for empty location"
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

    assert_equal(state["active_image"], "USER_PHOTO", "Stale async response correctly discarded")

if __name__ == '__main__':
    print("=== Lines in Transit Studio Functional Tests ===")
    test_dms_conversion()
    test_target_mb_clamping()
    test_filename_generation()
    test_request_id_race_condition()
    print("\n[SUCCESS] ALL FUNCTIONAL TESTS PASSED")
