"""Camera physics: shared geometry, rig envelopes, and gate discrimination.

Requirements: REQ-CIN-13, REQ-CIN-14, REQ-CIN-15
"""

from pathlib import Path

import pytest

from cinematic.camera import (
    DEFAULT_RIG,
    RIG_LIMITS,
    UnknownRigError,
    camera_position,
    evaluate_camera_gates,
    resolve_rig,
    subject_center,
)
from cinematic.shotplan import load_shot_plan, validate_shot_plan

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"


def _base_plan():
    return {
        "id": "PHYS-01",
        "sceneRef": "SC1",
        "sequenceRef": "SQ1",
        "durationSeconds": 6,
        "fps": 24,
        "subjects": [
            {
                "id": "hero",
                "representation": "capsule",
                "action": "walk",
                "start": [0, -8, 0],
                "end": [0, 6, 0],
            }
        ],
        "camera": {
            "lensMm": 50,
            "segments": [
                {"frames": [1, 48], "move": "tracking_backward", "height": 0.45},
                {"frames": [49, 96], "move": "tracking_backward", "height": 1.2},
                {"frames": [97, 144], "move": "crane_up", "heightFrom": 1.2, "heightTo": 5.0},
            ],
        },
    }


def test_default_rig_is_gimbal():
    assert resolve_rig({}) == RIG_LIMITS[DEFAULT_RIG]


def test_unknown_rig_is_a_typed_violation():
    plan = _base_plan()
    plan["rig"] = "hoverboard"
    with pytest.raises(UnknownRigError):
        resolve_rig(plan)
    violations = evaluate_camera_gates(plan)
    assert len(violations) == 1
    assert violations[0].path == "$.rig"
    assert "unknown rig 'hoverboard'" in violations[0].message


def test_subject_center_interpolates_and_raises_the_aim_point():
    plan = _base_plan()
    assert subject_center(plan, 1) == (0.0, -8.0, 0.9)
    assert subject_center(plan, 144) == (0.0, 6.0, 0.9)
    mid = subject_center(plan, 73)
    assert mid[1] == pytest.approx(-1.0, abs=0.2)
    assert mid[2] == pytest.approx(0.9)


def test_tracking_camera_stays_behind_the_subject():
    plan = _base_plan()
    for frame in (1, 24, 48):
        subject_x, subject_y, _ = subject_center(plan, frame)
        camera = camera_position(plan, frame)
        assert camera[0] == pytest.approx(subject_x)
        assert camera[1] == pytest.approx(subject_y - 4.0)
        assert camera[2] == pytest.approx(0.45)


def test_static_camera_freezes_at_the_segment_start_pose():
    plan = _base_plan()
    plan["camera"]["segments"] = [{"frames": [1, 144], "move": "static", "height": 1.5}]
    first = camera_position(plan, 1)
    assert first == (0.0, -12.0, 1.5)
    for frame in (40, 90, 144):
        assert camera_position(plan, frame) == first


def test_crane_height_interpolates_across_the_segment():
    plan = _base_plan()
    plan["camera"]["segments"] = plan["camera"]["segments"][2:3]
    start = camera_position(plan, 97)
    end = camera_position(plan, 144)
    middle = camera_position(plan, 120)
    assert start[2] == pytest.approx(1.2)
    assert end[2] == pytest.approx(5.0)
    assert middle[2] == pytest.approx(1.2 + (5.0 - 1.2) * ((120 - 97) / (144 - 97)))


def test_canonical_example_passes_all_gates():
    assert evaluate_camera_gates(load_shot_plan(EXAMPLE)) == []
    assert validate_shot_plan(load_shot_plan(EXAMPLE)) == []


def test_locked_camera_through_a_walking_subject_is_rejected():
    plan = _base_plan()
    plan["subjects"][0]["start"] = [0, 0, 0]
    plan["subjects"][0]["end"] = [0, -10, 0]
    plan["camera"]["segments"] = [{"frames": [1, 96], "move": "static", "height": 1.0}]
    plan["durationSeconds"] = 4
    messages = [v.message for v in evaluate_camera_gates(plan)]
    assert any("below the rig minimum" in m for m in messages), messages
    assert any("behind the camera plane" in m for m in messages), messages


def test_speed_ceiling_rejects_an_impossible_walk():
    plan = _base_plan()
    plan["durationSeconds"] = 1
    plan["camera"]["segments"] = [{"frames": [1, 24], "move": "tracking_backward", "height": 0.45}]
    messages = [v.message for v in evaluate_camera_gates(plan)]
    assert any("exceeds the rig ceiling" in m for m in messages), messages


def test_tripod_cannot_translate():
    plan = _base_plan()
    plan["rig"] = "tripod"
    messages = [v.message for v in evaluate_camera_gates(plan)]
    assert any("exceeds the rig ceiling" in m for m in messages), messages


def test_moving_move_with_a_still_subject_stalls():
    plan = _base_plan()
    plan["subjects"][0]["end"] = list(plan["subjects"][0]["start"])
    plan["camera"]["segments"] = [{"frames": [1, 144], "move": "tracking_backward", "height": 1.0}]
    messages = [v.message for v in evaluate_camera_gates(plan)]
    assert any("stalls below the rig floor" in m for m in messages), messages


def test_generated_script_consumes_the_shared_geometry():
    from cinematic.blender_gen import generate_scene_script

    plan = load_shot_plan(EXAMPLE)
    script = generate_scene_script(plan)
    frames = sorted({f for s in plan["camera"]["segments"] for f in s["frames"]})
    expected_positions = [
        {"frame": frame, "pos": tuple(float(c) for c in camera_position(plan, frame))}
        for frame in frames
    ]
    assert f"CAMERA_KEYFRAMES = {expected_positions!r}" in script
    assert "TARGET_NAME = 'CIN_TARGET'" in script
    assert 'constraints.new(type="TRACK_TO")' in script
    assert 'track.track_axis = "TRACK_NEGATIVE_Z"' in script
