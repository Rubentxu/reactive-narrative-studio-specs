"""Scene script generation: byte determinism and structural soundness.

Requirements: REQ-CIN-2
"""

import hashlib
import re
from pathlib import Path

from cinematic.blender_gen import generate_scene_script
from cinematic.shotplan import load_shot_plan

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"

# Primitives that exist in the target Blender release; the generated script may
# only reference operators built from this set.
AVAILABLE_PRIMITIVES = {
    "circle",
    "cone",
    "cube",
    "cube_gizmo",
    "cylinder",
    "grid",
    "ico_sphere",
    "monkey",
    "plane",
    "torus",
    "uv_sphere",
}


def _script() -> str:
    return generate_scene_script(load_shot_plan(EXAMPLE))


def test_generation_is_byte_identical():
    first = _script()
    second = _script()
    assert hashlib.sha256(first.encode()).hexdigest() == hashlib.sha256(second.encode()).hexdigest()


def test_script_compiles_and_has_no_host_paths():
    script = _script()
    compile(script, "generated-scene.py", "exec")
    assert "/home/" not in script
    assert str(REPO_ROOT) not in script
    assert not re.search(r"time\.|random|datetime", script)


def test_scene_constants_match_the_plan():
    script = _script()
    assert "FPS = 24" in script
    assert "FRAME_END = 144" in script
    assert "CAMERA_LENS_MM = 50.000000" in script
    assert "'capsule': 'uv_sphere'" in script
    assert "SHOT_ID = 'SC12-SH03'" in script


def test_only_available_primitives_are_referenced():
    script = _script()
    for match in re.findall(r"primitive_(\w+)_add", script):
        assert match in AVAILABLE_PRIMITIVES, match


def test_camera_keyframes_cover_every_segment():
    script = _script()
    assert "for entry in CAMERA_KEYFRAMES:" in script
    assert 'camera.keyframe_insert(data_path="location", frame=entry["frame"])' in script
    for boundary in (1, 48, 49, 96, 97, 144):
        assert "'frame': " + str(boundary) in script


def test_subject_is_followed_by_an_aimed_target():
    script = _script()
    assert "TARGET_NAME = 'CIN_TARGET'" in script
    assert 'target = bpy.data.objects.new(TARGET_NAME, None)' in script
    assert 'constraints.new(type="TRACK_TO")' in script
    assert 'track.target = target' in script


def test_failure_guard_exits_nonzero():
    script = _script()
    assert "except Exception:" in script
    assert "traceback.print_exc()" in script
    assert "sys.exit(1)" in script


def test_metadata_is_written_last():
    script = _script()
    main_body = script[script.index("def main()"):]
    assert main_body.index("build_scene()") < main_body.index("save_as_mainfile")
    assert main_body.index("save_as_mainfile") < main_body.index("write_metadata()")
