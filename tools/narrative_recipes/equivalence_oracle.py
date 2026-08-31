"""
Equivalence oracle — canonical JSON equality per RFC 8785 JCS subset.

Provides:
- canonical_json(value) -> str: serializes with sorted keys, no insignificant whitespace
- canonical_json_equal(a, b) -> bool: compares canonical forms
- strip_recipe_owned(manifest) -> dict: removes timestamp/non-recipe-owned fields
"""

from __future__ import annotations

import json
import unicodedata
from typing import Any


def canonical_json(value: Any) -> str:
    """
    Serialize a value to canonical JSON (RFC 8785 JCS subset).

    Properties:
    - Keys are sorted lexicographically
    - No insignificant whitespace
    - UTF-8 encoding
    - NFC Unicode normalization
    - No JSON5/Trailing comma extensions
    """
    # json.dumps with sort_keys=True gives us sorted keys
    # NFC normalization via unicodedata
    serialized = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
        allow_nan=False,
    )
    # NFC normalize (Unicode NFC form)
    return unicodedata.normalize("NFC", serialized)


def canonical_json_equal(a: Any, b: Any) -> bool:
    """
    Check if two values are equal when serialized to canonical JSON.

    Returns True if canonical_json(a) == canonical_json(b).
    """
    return canonical_json(a) == canonical_json(b)


def strip_recipe_owned(manifest: dict) -> dict:
    """
    Remove non-recipe-owned fields from a project manifest.

    Recipe-owned fields (per UAT-M10-04):
    - manifest.audience.profile
    - manifest.format
    - manifest.publishing
    - project.profiles
    - project.packs
    - project.skills
    - project.publishingTargets
    - initialGoals

    Non-recipe-owned fields (removed):
    - createdAt (timestamp)
    - other non-recipe fields
    """
    result: dict = {}

    # Copy only recipe-owned top-level keys
    recipe_owned_toplevel = {
        "audience", "format", "publishing", "initialGoals",
    }

    for key, value in manifest.items():
        if key in recipe_owned_toplevel:
            result[key] = value
        elif key == "project":
            # project sub-object: only recipe-owned sub-keys
            project = value if isinstance(value, dict) else {}
            project_recipe_owned = {
                "profiles", "packs", "skills", "publishingTargets",
            }
            result_project: dict = {}
            for pk, pv in project.items():
                if pk in project_recipe_owned:
                    result_project[pk] = pv
            if result_project:
                result["project"] = result_project
        # else: skip non-recipe-owned fields like createdAt, id, title, etc.

    return result


class EquivalenceOracle:
    """
    Oracle for checking round-trip equivalence between wizard and CLI outputs.

    Usage:
        oracle = EquivalenceOracle()
        ok = oracle.canonical_json_equal(manifest_a, manifest_b)
    """

    def canonical_json(self, value: Any) -> str:
        return canonical_json(value)

    def canonical_json_equal(self, a: Any, b: Any) -> bool:
        return canonical_json_equal(a, b)

    def strip_recipe_owned(self, manifest: dict) -> dict:
        return strip_recipe_owned(manifest)
