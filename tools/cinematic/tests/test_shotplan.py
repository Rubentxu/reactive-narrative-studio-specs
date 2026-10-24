"""Shot plan validation: contract acceptance, typed rejection, determinism.

Requirements: REQ-CIN-1
"""

import json
import subprocess
import sys
from pathlib import Path

import yaml

from cinematic.shotplan import load_shot_plan, validate_shot_plan, validate_shot_plan_file

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"
INVALID_FIXTURE = Path(__file__).resolve().parent / "fixtures/shot-plan-invalid.yaml"


def test_canonical_example_is_accepted():
    document, violations = validate_shot_plan_file(EXAMPLE)
    assert document is not None
    assert violations == []


def test_invalid_fixture_is_rejected_with_typed_errors():
    _, violations = validate_shot_plan_file(INVALID_FIXTURE)
    assert violations, "the invalid fixture must produce violations"
    messages = " | ".join(v.message for v in violations)
    assert any("'notes' was unexpected" in v.message for v in violations), messages
    assert any("start at frame 49" in v.message for v in violations), messages


def test_segment_gap_is_detected():
    document = load_shot_plan(EXAMPLE)
    document["camera"]["segments"][1]["frames"] = [50, 96]
    violations = validate_shot_plan(document)
    assert any("start at frame 49" in v.message for v in violations)


def test_incomplete_coverage_is_detected():
    document = load_shot_plan(EXAMPLE)
    document["camera"]["segments"] = document["camera"]["segments"][:2]
    violations = validate_shot_plan(document)
    assert any("coverage ends at 96" in v.message for v in violations)


def test_cli_validate_accepts_and_rejects_deterministically():
    def run_cli(target: Path):
        return subprocess.run(
            [sys.executable, "-m", "tools.cinematic", "validate", str(target), "--json"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    accepted = run_cli(EXAMPLE)
    assert accepted.returncode == 0
    accepted_repeat = run_cli(EXAMPLE)
    assert accepted_repeat.returncode == 0
    assert accepted.stdout == accepted_repeat.stdout, "same input must emit byte-identical JSON"

    rejected = run_cli(INVALID_FIXTURE)
    assert rejected.returncode == 1
    payload = json.loads(rejected.stdout)
    assert payload["valid"] is False
    assert len(payload["errors"]) >= 2


def test_missing_file_is_a_typed_failure():
    _, violations = validate_shot_plan_file("/nonexistent/shot-plan.yaml")
    assert len(violations) == 1
    assert "not found" in violations[0].message


def test_document_must_be_a_mapping():
    not_a_mapping = Path(__file__).resolve().parent / "fixtures" / "shot-plan-not-mapping.yaml"
    not_a_mapping.write_text("- just\n- a\n- list\n", encoding="utf-8")
    try:
        _, violations = validate_shot_plan_file(not_a_mapping)
        assert any("must be a mapping" in v.message for v in violations)
    finally:
        not_a_mapping.unlink()
