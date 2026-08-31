"""JSON output formatter for narrative CLI commands."""

import json
import sys
from typing import Any

import yaml


def print_json(data: dict[str, Any], fp=None) -> None:
    """Print data as canonical JSON (RFC 8785 JCS subset: sorted keys)."""
    file = fp or sys.stdout
    canonical = json.dumps(data, sort_keys=True, indent=2, ensure_ascii=False)
    print(canonical, file=file)


def print_yaml(data: dict[str, Any], fp=None) -> None:
    """Print data as YAML."""
    file = fp or sys.stdout
    yaml.safe_dump(data, file, sort_keys=True, default_flow_style=False)


def format_output(data: dict[str, Any], as_json: bool) -> str:
    """Format data as JSON or YAML string."""
    if as_json:
        return json.dumps(data, sort_keys=True, indent=2, ensure_ascii=False)
    return yaml.safe_dump(data, sort_keys=True, default_flow_style=False)
