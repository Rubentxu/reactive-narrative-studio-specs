"""Tests for EquivalenceOracle."""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from narrative_recipes.equivalence_oracle import EquivalenceOracle, canonical_json, strip_recipe_owned


class TestEquivalenceOracle:
    """Tests for the equivalence oracle."""

    def test_canonical_json_sort_keys(self):
        """canonical_json sorts keys."""
        a = {"b": 1, "a": 2}
        b = {"a": 2, "b": 1}
        assert canonical_json(a) == canonical_json(b)

    def test_canonical_json_equal(self):
        oracle = EquivalenceOracle()
        manifest_a = {"title": "Book", "audience": {"profile": "middle-grade-10-11"}}
        manifest_b = {"title": "Book", "audience": {"profile": "middle-grade-10-11"}}
        assert oracle.canonical_json_equal(manifest_a, manifest_b) is True

    def test_canonical_json_not_equal(self):
        oracle = EquivalenceOracle()
        manifest_a = {"title": "Book A"}
        manifest_b = {"title": "Book B"}
        assert oracle.canonical_json_equal(manifest_a, manifest_b) is False

    def test_strip_recipe_owned_removes_created_at(self):
        """strip_recipe_owned removes timestamp fields."""
        oracle = EquivalenceOracle()
        manifest = {
            "title": "Book",
            "createdAt": "2024-01-01T00:00:00Z",
            "audience": {"profile": "middle-grade-10-11"},
        }
        stripped = oracle.strip_recipe_owned(manifest)
        assert "createdAt" not in stripped
        assert stripped.get("title") is None  # title is not recipe-owned

    def test_strip_recipe_owned_keeps_audience(self):
        """strip_recipe_owned keeps audience profile."""
        oracle = EquivalenceOracle()
        manifest = {
            "createdAt": "2024-01-01T00:00:00Z",
            "audience": {"profile": "middle-grade-10-11"},
        }
        stripped = oracle.strip_recipe_owned(manifest)
        assert stripped.get("audience", {}).get("profile") == "middle-grade-10-11"

    def test_strip_recipe_owned_keeps_project_fields(self):
        """strip_recipe_owned keeps project.profiles, packs, skills."""
        oracle = EquivalenceOracle()
        manifest = {
            "createdAt": "2024-01-01T00:00:00Z",
            "project": {
                "profiles": ["middle-grade-10-11"],
                "packs": ["story_core", "characters"],
                "skills": ["story-intake"],
                "publishingTargets": ["print-pdf"],
                "internal_field": "should be removed",
            },
        }
        stripped = oracle.strip_recipe_owned(manifest)
        assert stripped["project"]["profiles"] == ["middle-grade-10-11"]
        assert stripped["project"]["packs"] == ["story_core", "characters"]
        assert "internal_field" not in stripped["project"]

    def test_timestamp_differences_are_ignored(self):
        """Two manifests differing only in createdAt are considered equal."""
        oracle = EquivalenceOracle()
        manifest_a = {
            "audience": {"profile": "middle-grade-10-11"},
            "createdAt": "2024-01-01T00:00:00Z",
        }
        manifest_b = {
            "audience": {"profile": "middle-grade-10-11"},
            "createdAt": "2024-06-15T12:00:00Z",
        }
        stripped_a = oracle.strip_recipe_owned(manifest_a)
        stripped_b = oracle.strip_recipe_owned(manifest_b)
        assert oracle.canonical_json_equal(stripped_a, stripped_b) is True

    def test_array_order_matters(self):
        """Array order differences are NOT ignored (recipe-owned)."""
        oracle = EquivalenceOracle()
        manifest_a = {"project": {"packs": ["story_core", "characters"]}}
        manifest_b = {"project": {"packs": ["characters", "story_core"]}}
        assert oracle.canonical_json_equal(manifest_a, manifest_b) is False
