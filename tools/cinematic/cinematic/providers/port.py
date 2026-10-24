"""The video generation port and its typed results.

The port is the only coupling point between the domain and any video provider:
callers see capabilities first, then a generation call whose outcome — success
or failure — is a value of the result type. Failures never cross the port as
raised exceptions, and no vendor SDK types appear anywhere in this module.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from cinematic.budget import FailureReason


@dataclass(frozen=True)
class ProviderCapabilities:
    """What a provider supports, declared before any generation happens."""

    provider_id: str
    supports_motion_reference: bool
    max_duration_seconds: float
    aspect_ratios: tuple[str, ...]
    live_capable: bool


@dataclass(frozen=True)
class VideoGenerationRequest:
    """A single generation request, mirroring the JSON Schema contract."""

    shot_id: str
    prompt: str
    motion_reference: str | None
    style_references: tuple[str, ...]
    character_references: tuple[str, ...]
    duration_seconds: float
    aspect_ratio: str
    budget: Any


@dataclass(frozen=True)
class VideoGenerationSuccess:
    """A completed generation, with full attempt and cost accounting."""

    provider_id: str
    model: str | None
    receipt: str
    artifact_path: str
    artifact_sha256: str
    attempts: int
    cost_credits: float


@dataclass(frozen=True)
class VideoGenerationFailure:
    """A failed or denied generation; the failure is a value, not an exception."""

    reason: FailureReason
    detail: str
    attempts: int
    cost_credits: float
    provider_invoked: bool


VideoGenerationResult = VideoGenerationSuccess | VideoGenerationFailure


class VideoProvider(Protocol):
    """Contract every provider implementation must satisfy."""

    def capabilities(self) -> ProviderCapabilities:
        """Declare provider capabilities before generation."""

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        """Generate a video; returns a typed success or failure."""


def sha256_file(path: str | Path) -> str:
    """Content hash used for every artifact the port touches."""

    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()
