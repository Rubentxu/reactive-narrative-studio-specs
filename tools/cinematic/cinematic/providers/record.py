"""Provider-neutral recording of a generation run.

Every provider path — success, budget exhaustion, or live denial — produces the
same two documents: a result record with the typed outcome and a provenance
record tying the request to each accounted attempt.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cinematic.providers.port import (
    VideoGenerationFailure,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoGenerationSuccess,
)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def _result_payload(result: VideoGenerationResult) -> dict[str, Any]:
    if isinstance(result, VideoGenerationSuccess):
        return {
            "status": "success",
            "providerId": result.provider_id,
            "model": result.model,
            "receipt": result.receipt,
            "attempts": result.attempts,
            "costCredits": result.cost_credits,
            "artifact": {"path": result.artifact_path, "sha256": result.artifact_sha256},
        }
    return {
        "status": "failure",
        "reason": result.reason.value,
        "detail": result.detail,
        "attempts": result.attempts,
        "costCredits": result.cost_credits,
        "providerInvoked": result.provider_invoked,
    }


@dataclass(frozen=True)
class RecordedRun:
    """Paths of the two documents written for one provider run."""

    result_path: Path
    provenance_path: Path


def record_provider_run(out_dir: str | Path, request_path: Path, request: VideoGenerationRequest, result: VideoGenerationResult) -> RecordedRun:
    """Write provider-result.json and provider-provenance.json for a run."""

    directory = Path(out_dir)
    directory.mkdir(parents=True, exist_ok=True)
    result_payload = _result_payload(result)

    result_path = directory / "provider-result.json"
    result_path.write_text(json.dumps(result_payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")

    provenance = {
        "version": 1,
        "request": {"path": str(request_path), "sha256": sha256_of(request_path)},
        "providerId": result_payload.get("providerId", "fake"),
        "attempts": [
            {
                "n": index + 1,
                "outcome": "success" if index + 1 == result_payload.get("attempts") and result_payload["status"] == "success" else "failure",
                "costCredits": result_payload.get("costCredits", 0.0) / max(result_payload.get("attempts", 1), 1),
            }
            for index in range(result_payload.get("attempts", 0))
        ],
        "result": result_payload,
    }
    provenance_path = directory / "provider-provenance.json"
    provenance_path.write_text(json.dumps(provenance, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return RecordedRun(result_path=result_path, provenance_path=provenance_path)
