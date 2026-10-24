"""Stable JSON emission used by every CLI command.

Output must be byte-identical across runs of the same command: keys are sorted
and the serialization avoids locale-dependent formatting.
"""

import json
import sys
from typing import Any


def emit(payload: dict[str, Any]) -> None:
    """Print a payload as canonical JSON to stdout."""
    print(json.dumps(payload, sort_keys=True, ensure_ascii=False))


def emit_error(message: str) -> None:
    """Print an error message to stderr."""
    print(message, file=sys.stderr)
