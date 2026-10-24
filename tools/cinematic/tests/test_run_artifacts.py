"""Run artifacts: metadata validity and hash integrity of the derivation chain.

Requirements: REQ-CIN-4, REQ-CIN-5
"""

import hashlib
import json
from pathlib import Path

import jsonschema

from cinematic.drive import run_scene

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"
SPECS = REPO_ROOT / "specs"


def _load_schema(name: str):
    return json.loads((SPECS / name).read_text(encoding="utf-8"))


def _sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_metadata_matches_contract_and_plan(tmp_path):
    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    jsonschema.validate(report.metadata, _load_schema("scene-metadata.schema.json"))
    assert report.metadata["fps"] == 24
    assert report.metadata["fps_base"] == 1.0
    assert report.metadata["frame_start"] == 1
    assert report.metadata["frame_end"] == 144
    assert report.metadata["camera"]["lensMm"] == 50.0
    assert report.metadata["shotId"] == "SC12-SH03"
    assert report.metadata["objects"] == ["maya", "CIN_CAMERA"]


def test_declared_outputs_exist_and_match_their_hashes(tmp_path):
    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    for output in report.metadata["outputs"]:
        artifact = workspace / output["path"]
        assert artifact.is_file(), output
        assert _sha256_of(artifact) == output["sha256"]


def test_provenance_covers_the_full_chain(tmp_path):
    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    jsonschema.validate(report.provenance, _load_schema("provenance.schema.json"))
    assert report.provenance["shotPlan"]["path"].endswith("shot-plan.yaml")
    assert report.provenance["shotPlan"]["sha256"] == _sha256_of(EXAMPLE)
    assert report.provenance["generatedScript"]["path"] == "generated-scene.py"
    assert report.provenance["sceneMetadata"]["path"] == "scene-metadata.json"
    declared_outputs = {o["path"] for o in report.metadata["outputs"]}
    proven_outputs = {o["path"] for o in report.provenance["outputs"]}
    assert proven_outputs == declared_outputs


def test_tampered_artifact_is_detected_by_rehash(tmp_path):
    workspace = tmp_path / "ws"
    report = run_scene(EXAMPLE, workspace, mode="scene")
    blend = workspace / "scene.blend"
    original = blend.read_bytes()
    blend.write_bytes(original + b"tampered")
    for output in report.metadata["outputs"]:
        artifact = workspace / output["path"]
        if artifact == blend:
            assert _sha256_of(artifact) != output["sha256"]
