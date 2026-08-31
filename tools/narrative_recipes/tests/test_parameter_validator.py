"""Tests for ParameterValidator."""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from narrative_recipes.parameter_validator import ParameterValidator


class TestParameterValidator:
    """Tests for the parameter validator."""

    def test_valid_parameters_pass(self):
        validator = ParameterValidator()
        schema = {
            "type": "object",
            "required": ["title", "projectId"],
            "properties": {
                "title": {"type": "string"},
                "projectId": {"type": "string", "pattern": "^[a-z0-9][a-z0-9_-]*$"},
            },
        }
        params = {"title": "My Book", "projectId": "my-book"}
        result = validator.validate(params, schema)
        assert result.ok is True
        assert result.code == "valid"

    def test_missing_required_field_fails(self):
        validator = ParameterValidator()
        schema = {
            "type": "object",
            "required": ["title", "projectId"],
            "properties": {
                "title": {"type": "string"},
                "projectId": {"type": "string"},
            },
        }
        params = {"title": "My Book"}  # missing projectId
        result = validator.validate(params, schema)
        assert result.ok is False
        assert result.code == "parameter-validation-error"

    def test_pattern_violation_fails(self):
        validator = ParameterValidator()
        schema = {
            "type": "object",
            "required": ["projectId"],
            "properties": {
                "projectId": {"type": "string", "pattern": "^[a-z0-9][a-z0-9_-]*$"},
            },
        }
        params = {"projectId": "Invalid Project ID"}  # contains space
        result = validator.validate(params, schema)
        assert result.ok is False
        assert "does not match" in result.message
        assert "projectId" in result.message

    def test_enum_violation_fails(self):
        validator = ParameterValidator()
        schema = {
            "type": "object",
            "required": ["genre"],
            "properties": {
                "genre": {"type": "string", "enum": ["fantasy", "mystery", "adventure"]},
            },
        }
        params = {"genre": "horror"}  # not in enum
        result = validator.validate(params, schema)
        assert result.ok is False
