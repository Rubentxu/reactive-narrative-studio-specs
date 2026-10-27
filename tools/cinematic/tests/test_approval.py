"""Approval records: explicit human decision over deterministic checks.

Requirements: REQ-CIN-19
"""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import jsonschema

from cinematic.approval import ApprovalError, build_approval_record, write_approval_record
from cinematic.shotplan import specs_dir

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"
FIXED_INSTANT = "2026-10-27T12:00:00+00:00"


def _schema():
    return json.loads((specs_dir() / "shot-approval.schema.json").read_text(encoding="utf-8"))


def test_approved_record_validates_and_carries_real_hash(tmp_path):
    record = build_approval_record(EXAMPLE, "approved", "framing reads well", "operator", FIXED_INSTANT)
    out = tmp_path / "approval.json"
    written = write_approval_record(out, record)

    jsonschema.validate(json.loads(written.read_text(encoding="utf-8")), _schema())
    expected_hash = hashlib.sha256(EXAMPLE.read_bytes()).hexdigest()
    assert record["shotPlan"]["sha256"] == expected_hash
    assert record["deterministicChecks"] == {"schemaValid": True, "gatesPassed": True}
    assert record["decidedAt"] == FIXED_INSTANT


def test_rejected_decision_is_also_a_valid_record(tmp_path):
    record = build_approval_record(EXAMPLE, "rejected", "subject too small in frame", "operator", FIXED_INSTANT)
    out = tmp_path / "approval.json"
    write_approval_record(out, record)
    jsonschema.validate(json.loads(out.read_text(encoding="utf-8")), _schema())


def test_missing_rationale_or_author_is_refused_without_writing(tmp_path):
    out = tmp_path / "approval.json"
    with __import__("pytest").raises(ApprovalError):
        build_approval_record(EXAMPLE, "approved", "  ", "operator", FIXED_INSTANT)
    with __import__("pytest").raises(ApprovalError):
        build_approval_record(EXAMPLE, "approved", "reason", "  ", FIXED_INSTANT)
    assert not out.exists()


def test_invalid_plan_never_produces_a_record(tmp_path):
    fixture = Path(__file__).resolve().parent / "fixtures/shot-plan-physics-invalid.yaml"
    with __import__("pytest").raises(ApprovalError) as error:
        build_approval_record(fixture, "approved", "reason", "operator", FIXED_INSTANT)
    assert "no record written" in str(error.value)
    assert "and 110 more violations" in str(error.value)


def test_refuses_to_overwrite_an_existing_record(tmp_path):
    record = build_approval_record(EXAMPLE, "approved", "reason", "operator", FIXED_INSTANT)
    out = tmp_path / "approval.json"
    write_approval_record(out, record)
    with __import__("pytest").raises(ApprovalError):
        write_approval_record(out, record)


def test_cli_happy_and_invalid_paths(tmp_path):
    out = tmp_path / "approval.json"
    accepted = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "approve", "--shot-plan", str(EXAMPLE),
         "--out", str(out), "--decision", "approved", "--rationale", "ok",
         "--decided-by", "operator", "--decided-at", FIXED_INSTANT, "--json"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert accepted.returncode == 0
    assert out.is_file()

    denied = tmp_path / "never.json"
    rejected = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "approve", "--shot-plan",
         str(Path(__file__).resolve().parent / "fixtures/shot-plan-physics-invalid.yaml"),
         "--out", str(denied), "--decision", "approved", "--rationale", "ok",
         "--decided-by", "operator"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert rejected.returncode == 1
    assert not denied.exists()
