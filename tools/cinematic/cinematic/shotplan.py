"""Loading and validation of shot plan documents.

Validation is deterministic: schema errors and semantic rule violations are
collected as path-addressed messages, sorted, and reported identically for the
same input on every run. The module holds no Blender, vendor, or I/O knowledge
beyond reading the plan file itself.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema
import yaml

_FRAME_COUNT_EPSILON = 1e-9


@dataclass(frozen=True)
class Violation:
    """A single validation failure, addressed by document path."""

    path: str
    message: str

    def as_dict(self) -> dict[str, str]:
        return {"path": self.path, "message": self.message}


class ShotPlanError(Exception):
    """Raised when a shot plan file cannot be read or parsed."""


def specs_dir() -> Path:
    """Locate the directory holding the JSON Schema contracts.

    Resolution order: the ``CINEMATIC_SPECS_DIR`` environment variable, then the
    repository ``specs/`` directory relative to this file.
    """

    override = os.environ.get("CINEMATIC_SPECS_DIR")
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[2].parent / "specs"


def load_shot_plan(path: str | Path) -> dict[str, Any]:
    """Read and parse a YAML shot plan document."""

    plan_path = Path(path)
    if not plan_path.is_file():
        raise ShotPlanError(f"shot plan not found: {plan_path}")
    try:
        document = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ShotPlanError(f"shot plan is not valid YAML: {exc}") from exc
    if not isinstance(document, dict):
        raise ShotPlanError("shot plan must be a mapping")
    return document


def _schema_violations(document: dict[str, Any]) -> list[Violation]:
    schema_path = specs_dir() / "shot-plan.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = jsonschema.Draft202012Validator(schema)
    return [
        Violation(path=_json_path(error.absolute_path), message=error.message)
        for error in sorted(validator.iter_errors(document), key=lambda e: _json_path(e.absolute_path))
    ]


def _json_path(parts: tuple[Any, ...]) -> str:
    out = "$"
    for part in parts:
        out += f"[{part}]" if isinstance(part, int) else f".{part}"
    return out


def _semantic_violations(document: dict[str, Any]) -> list[Violation]:
    """Rules not expressible in JSON Schema.

    Camera segments must be ordered, contiguous, and cover exactly the frame
    range implied by the duration and frame rate.
    """

    violations: list[Violation] = []
    duration = document.get("durationSeconds")
    fps = document.get("fps")
    segments = document.get("camera", {}).get("segments")

    if isinstance(duration, (int, float)) and isinstance(fps, int) and isinstance(segments, list):
        expected_total = duration * fps
        previous_end = 0
        for index, segment in enumerate(segments):
            frames = segment.get("frames") if isinstance(segment, dict) else None
            if not (isinstance(frames, list) and len(frames) == 2 and all(isinstance(f, int) for f in frames)):
                continue
            start, end = frames
            if start > end:
                violations.append(
                    Violation(
                        f"$.camera.segments[{index}].frames",
                        f"segment start {start} is greater than end {end}",
                    )
                )
                continue
            if start != previous_end + 1:
                violations.append(
                    Violation(
                        f"$.camera.segments[{index}].frames",
                        f"segment must start at frame {previous_end + 1} but starts at {start}",
                    )
                )
            previous_end = end
        if abs(previous_end - expected_total) > _FRAME_COUNT_EPSILON:
            violations.append(
                Violation(
                    "$.camera.segments",
                    f"segments must cover exactly [1, {int(expected_total)}] but coverage ends at {previous_end}",
                )
            )
    return violations


def validate_shot_plan(document: dict[str, Any]) -> list[Violation]:
    """Validate a parsed shot plan; returns an empty list when valid."""

    from cinematic.camera import evaluate_camera_gates

    violations = _schema_violations(document) + _semantic_violations(document)
    if not violations:
        violations += evaluate_camera_gates(document)
    return violations


def validate_shot_plan_file(path: str | Path) -> tuple[dict[str, Any] | None, list[Violation]]:
    """Load and validate a shot plan file in one step."""

    try:
        document = load_shot_plan(path)
    except ShotPlanError as exc:
        return None, [Violation(path="$", message=str(exc))]
    return document, validate_shot_plan(document)
