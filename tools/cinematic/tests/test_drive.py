"""Headless driver: sandboxed execution, guard, evidence conservation.

Requirements: REQ-CIN-2, REQ-CIN-3, REQ-CIN-10
"""

import hashlib
import json
import subprocess
from pathlib import Path

import pytest

from cinematic.drive import BlenderBinaryNotFoundError, resolve_blender_bin, run_scene

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"
ALLOWED_KEYS = ("PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "CINEMATIC_MODE")


def test_unresolvable_binary_is_a_typed_failure(tmp_path):
    with pytest.raises(BlenderBinaryNotFoundError):
        resolve_blender_bin(env={}, default=tmp_path / "missing-blender")


def test_env_override_wins_and_is_verified(tmp_path):
    override = tmp_path / "custom-blender"
    override.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    override.chmod(override.stat().st_mode | 0o111)
    assert resolve_blender_bin(env={"BLENDER_BIN": str(override)}, default=tmp_path / "missing") == override


def test_broken_env_override_is_a_typed_failure(tmp_path):
    with pytest.raises(BlenderBinaryNotFoundError):
        resolve_blender_bin(env={"BLENDER_BIN": str(tmp_path / "nope")}, default=tmp_path / "also-missing")


def test_child_environment_is_allowlisted(tmp_path):
    report = run_scene(EXAMPLE, tmp_path / "ws", mode="scene")
    assert report.ok
    assert "CINEMATIC_MODE" in report.child_env_keys
    for key in report.child_env_keys:
        assert key in ALLOWED_KEYS


def test_generated_script_contains_no_host_paths(tmp_path):
    workspace = tmp_path / "ws"
    run_scene(EXAMPLE, workspace, mode="scene")
    script = (workspace / "generated-scene.py").read_text(encoding="utf-8")
    assert "/home/" not in script
    assert str(REPO_ROOT) not in script
    assert str(tmp_path) not in script


def test_injected_failure_exits_nonzero_with_traceback(tmp_path):
    workspace = tmp_path / "ws"
    run_scene(EXAMPLE, workspace, mode="scene")
    script_path = workspace / "generated-scene.py"
    script = script_path.read_text(encoding="utf-8")
    script_path.write_text(
        script.replace("def main():", 'def main():\n    raise RuntimeError("injected")', 1),
        encoding="utf-8",
    )
    completed = subprocess.run(
        [str(resolve_blender_bin()), "--background", "--factory-startup", "--python", str(script_path)],
        cwd=workspace,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode != 0
    assert "injected" in completed.stderr
    assert "RuntimeError" in completed.stderr


def test_stale_metadata_from_a_previous_run_never_satisfies_the_marker(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "scene-metadata.json").write_text(
        json.dumps({"version": 1, "shotId": "GHOST", "mode": "scene", "fps": 12,
                    "fps_base": 1.0, "frame_start": 1, "frame_end": 2,
                    "camera": {"lensMm": 50, "segments": []},
                    "objects": ["ghost"], "render": {"engine": "BLENDER_WORKBENCH",
                    "resolution": {"width": 640, "height": 360}, "container": "FFMPEG",
                    "codec": "H264"}, "outputs": [{"path": "ghost.blend", "sha256": "0" * 64}]}),
        encoding="utf-8",
    )
    report = run_scene(EXAMPLE, workspace, mode="scene")
    assert report.ok
    assert report.metadata["shotId"] == "SC12-SH03"
    assert report.metadata["fps"] == 24


def test_driver_rejects_declared_outputs_that_do_not_match_their_bytes(tmp_path):
    from cinematic import drive

    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    assert report.ok
    (workspace / "scene.blend").write_bytes(b"tampered after the fact")
    metadata = json.loads((workspace / "scene-metadata.json").read_text(encoding="utf-8"))
    assert drive._outputs_match(workspace, metadata) is False
    (workspace / "scene.blend").write_bytes(Path(workspace / "scene.blend").read_bytes()[:-8])
    assert drive._outputs_match(workspace, metadata) is False


def test_script_is_conserved_and_referenced_by_provenance(tmp_path):
    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    script_path = workspace / "generated-scene.py"
    assert script_path.is_file()
    digest = hashlib.sha256(script_path.read_bytes()).hexdigest()
    assert report.provenance["generatedScript"]["sha256"] == digest
    assert report.provenance["generatedScript"]["path"] == "generated-scene.py"
