"""
Parameter validator using jsonschema Draft202012.

Validates user-supplied parameters against a recipe's parameters.schema.json.
Bails BEFORE any filesystem write (per REQ-CR-12).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import jsonschema


@dataclass
class ValidationDiagnostic:
    """Result of a parameter validation."""
    ok: bool
    code: str
    message: str
    path: Optional[str] = None


def apply_schema_defaults(parameters: dict[str, Any], parameters_schema: dict) -> dict[str, Any]:
    """
    Return a copy of `parameters` with JSON Schema `default` values applied
    for missing top-level properties (REQ-CR-10: default parameters yield a
    renderable project). Explicit user params are never overwritten.
    """
    merged = dict(parameters)
    for name, prop in (parameters_schema.get("properties") or {}).items():
        if name not in merged and isinstance(prop, dict) and "default" in prop:
            merged[name] = prop["default"]
    return merged


class ParameterValidator:
    """
    Validates user-supplied parameters against a recipe's parameters.schema.json.

    Usage:
        validator = ParameterValidator()
        result = validator.validate(
            parameters={"title": "My Book", "projectId": "my-book"},
            parameters_schema=recipe_bundle.parameters_schema,
        )
    """

    def validate(
        self,
        parameters: dict[str, Any],
        parameters_schema: dict,
    ) -> ValidationDiagnostic:
        """
        Validate parameters against a JSON Schema.

        Returns a ValidationDiagnostic. Does NOT write to filesystem.
        """
        try:
            jsonschema.validate(
                instance=parameters,
                schema=parameters_schema,
                format_checker=jsonschema.FormatChecker(),
            )
            return ValidationDiagnostic(
                ok=True,
                code="valid",
                message="Parameters are valid",
            )
        except jsonschema.ValidationError as e:
            path_str = ".".join(str(p) for p in e.path) if e.path else None
            msg = e.message
            if path_str:
                msg = f"at {path_str}: {msg}"
            return ValidationDiagnostic(
                ok=False,
                code="parameter-validation-error",
                message=msg,
                path=path_str,
            )
        except Exception as e:
            return ValidationDiagnostic(
                ok=False,
                code="parameter-validation-error",
                message=str(e),
            )
