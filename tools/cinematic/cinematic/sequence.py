"""Loading and validation of multi-shot sequence plans.

A sequence is an ordered list of shot plans that share characters and a
location. The validator enforces identity continuity — every subject that
appears in a shot must be declared as a sequence character, and every
referenced plan must pass its own full validation, physics gates included —
so a sequence can never be built on top of a take that is impossible.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jsonschema
import yaml

from cinematic.shotplan import Violation, validate_shot_plan_file


class SequenceError(Exception):
    """Raised when a sequence file cannot be read or parsed."""


def load_sequence(path: str | Path) -> dict[str, Any]:
    """Read and parse a YAML sequence plan document."""

    sequence_path = Path(path)
    if not sequence_path.is_file():
        raise SequenceError(f"sequence plan not found: {sequence_path}")
    try:
        document = yaml.safe_load(sequence_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise SequenceError(f"sequence plan is not valid YAML: {exc}") from exc
    if not isinstance(document, dict):
        raise SequenceError("sequence plan must be a mapping")
    return document


def _schema_violations(document: dict[str, Any]) -> list[Violation]:
    schema_path = Path(__file__).resolve().parents[2].parent / "specs" / "sequence-plan.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    errors = sorted(
        jsonschema.Draft202012Validator(schema).iter_errors(document),
        key=lambda e: list(e.absolute_path),
    )
    return [
        Violation(
            path="$" + "".join(f"[{p}]" if isinstance(p, int) else f".{p}" for p in error.absolute_path),
            message=error.message,
        )
        for error in errors
    ]


def _continuity_violations(sequence: dict[str, Any], base_dir: Path) -> list[Violation]:
    """Identity continuity and per-plan validation, shot by shot."""

    declared = set(sequence.get("characters", []))
    violations: list[Violation] = []
    for index, shot in enumerate(sequence.get("shots", [])):
        where = f"$.shots[{index}]"
        shot_id = shot.get("id", f"#{index}")
        undeclared = sorted(set(shot.get("characters", [])) - declared)
        if undeclared:
            violations.append(
                Violation(
                    f"{where}.characters",
                    f"shot {shot_id} cites characters not declared in the sequence: {', '.join(undeclared)}",
                )
            )

        plan_path = base_dir / str(shot.get("shotPlan", ""))
        try:
            document, plan_violations = validate_shot_plan_file(plan_path)
        except Exception as error:
            violations.append(Violation(f"{where}.shotPlan", f"shot {shot_id}: plan cannot be read: {error}"))
            continue
        if plan_violations or document is None:
            first = plan_violations[0].message if plan_violations else "unreadable"
            violations.append(
                Violation(
                    f"{where}.shotPlan",
                    f"shot {shot_id}: referenced plan does not validate ({first})"
                    f" — a sequence cannot be built on an impossible take",
                )
            )
            continue
        subjects = {str(subject["id"]) for subject in document.get("subjects", [])}
        unknown_subjects = sorted(subjects - declared)
        if unknown_subjects:
            violations.append(
                Violation(
                    f"{where}.shotPlan",
                    f"shot {shot_id} shows subjects not declared as sequence characters:"
                    f" {', '.join(unknown_subjects)} (identity continuity)",
                )
            )
    return violations


def validate_sequence(sequence: dict[str, Any], base_dir: str | Path) -> list[Violation]:
    """Validate a parsed sequence; returns an empty list when consistent."""

    return _schema_violations(sequence) + _continuity_violations(sequence, Path(base_dir))


def validate_sequence_file(path: str | Path) -> tuple[dict[str, Any] | None, list[Violation]]:
    """Load and validate a sequence file in one step."""

    sequence_path = Path(path)
    try:
        sequence = load_sequence(sequence_path)
    except SequenceError as exc:
        return None, [Violation(path="$", message=str(exc))]
    return sequence, validate_sequence(sequence, sequence_path.parent)
