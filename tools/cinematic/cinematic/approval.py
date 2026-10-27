"""Explicit approval records for shot plans.

A record exists only for a plan that already passed the contract and camera
physics checks — those deterministic facts are captured by the system, while
the human contributes the decision, the rationale, and their name. An invalid
plan never produces a record: promotion to an approved shot is only possible
for a validated take.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import jsonschema

from cinematic.shotplan import specs_dir, validate_shot_plan_file


class ApprovalError(Exception):
    """Raised when an approval record cannot be written."""


def _sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_approval_record(
    shot_plan_path: str | Path,
    decision: str,
    rationale: str,
    decided_by: str,
    decided_at: str | None = None,
) -> dict[str, Any]:
    """Build the approval record for a plan that must validate first.

    Raises :class:`ApprovalError` when the plan does not pass validation — a
    record for an invalid take must never exist.
    """

    document, violations = validate_shot_plan_file(shot_plan_path)
    if violations or document is None:
        shown = "; ".join(f"{v.path}: {v.message}" for v in violations[:3])
        if len(violations) > 3:
            shown += f"; and {len(violations) - 3} more violations"
        raise ApprovalError(f"shot plan did not pass deterministic checks, no record written: {shown}")

    if decision not in ("approved", "rejected"):
        raise ApprovalError(f"decision must be 'approved' or 'rejected', got {decision!r}")
    if not rationale.strip():
        raise ApprovalError("rationale is required: an approval without a stated reason does not exist")
    if not decided_by.strip():
        raise ApprovalError("decidedBy is required: an approval must name who decided it")

    instant = decided_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "version": 1,
        "shotPlan": {"path": str(shot_plan_path), "sha256": _sha256_of(Path(shot_plan_path))},
        "decision": decision,
        "rationale": rationale,
        "decidedBy": decided_by,
        "decidedAt": instant,
        "deterministicChecks": {"schemaValid": True, "gatesPassed": True},
    }


def write_approval_record(out_path: str | Path, record: dict[str, Any]) -> Path:
    """Validate and write the record; refuses to overwrite a non-empty file."""

    destination = Path(out_path)
    if destination.exists() and destination.read_text(encoding="utf-8").strip():
        raise ApprovalError(f"refusing to overwrite an existing record: {destination}")

    schema = json.loads((specs_dir() / "shot-approval.schema.json").read_text(encoding="utf-8"))
    jsonschema.validate(record, schema)

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(record, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return destination
