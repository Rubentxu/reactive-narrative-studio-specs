"""Typed loading of video generation requests from YAML documents."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema
import yaml

from cinematic.budget import Budget
from cinematic.providers.port import VideoGenerationRequest


class VideoRequestError(Exception):
    """Raised when a request document is missing, unparsable, or invalid."""


@dataclass(frozen=True)
class LoadedRequest:
    """A validated request together with the file it was read from."""

    request: VideoGenerationRequest
    path: Path


def _validate(document: dict[str, Any], source: Path) -> None:
    schema_path = Path(__file__).resolve().parents[4] / "specs" / "video-generation-request.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    errors = sorted(
        jsonschema.Draft202012Validator(schema).iter_errors(document),
        key=lambda e: list(e.absolute_path),
    )
    if errors:
        first = errors[0]
        location = ".".join(str(p) for p in first.absolute_path) or "<root>"
        raise VideoRequestError(f"invalid video generation request at {source}: {location}: {first.message}")


def load_video_request(path: str | Path) -> LoadedRequest:
    """Read, validate, and type a video generation request document."""

    request_path = Path(path)
    if not request_path.is_file():
        raise VideoRequestError(f"video generation request not found: {request_path}")
    try:
        document = yaml.safe_load(request_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise VideoRequestError(f"video generation request is not valid YAML: {exc}") from exc
    if not isinstance(document, dict):
        raise VideoRequestError("video generation request must be a mapping")

    _validate(document, request_path)

    budget_document = document["budget"]
    budget = Budget(max_attempts=int(budget_document["maxAttempts"]), max_credits=float(budget_document["maxCredits"]))
    motion_reference = document.get("motionReference")
    request = VideoGenerationRequest(
        shot_id=str(document["shotId"]),
        prompt=str(document["prompt"]),
        motion_reference=str(motion_reference) if motion_reference is not None else None,
        style_references=tuple(str(r) for r in document.get("styleReferences", [])),
        character_references=tuple(str(r) for r in document.get("characterReferences", [])),
        duration_seconds=float(document["durationSeconds"]),
        aspect_ratio=str(document["aspectRatio"]),
        budget=budget,
    )
    return LoadedRequest(request=request, path=request_path)
