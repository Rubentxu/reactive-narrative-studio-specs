"""Tests for TemplateEngine — 5-fixture corpus."""

import os
import sys

import pytest
import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from narrative_recipes.template_engine import TemplateEngine, TemplateError


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures", "mustache-subset")


def load_fixture(name: str) -> dict:
    with open(os.path.join(FIXTURES_DIR, f"{name}.yaml")) as f:
        return yaml.safe_load(f)


class TestTemplateEngine:
    """Tests for the mustache-subset template engine."""

    def test_variable(self):
        fixture = load_fixture("variable")
        engine = TemplateEngine()
        result = engine.render(fixture["template"], fixture["params"])
        assert result == fixture["expected_output"]

    def test_each(self):
        fixture = load_fixture("each")
        engine = TemplateEngine()
        result = engine.render(fixture["template"], fixture["params"])
        assert result == fixture["expected_output"]

    def test_if_truthy(self):
        fixture = load_fixture("if")
        for case in fixture["cases"]:
            engine = TemplateEngine()
            result = engine.render(fixture["template"], case["params"])
            assert result == case["expected_output"], f"Case {case['name']}: expected {case['expected_output']!r}, got {result!r}"

    def test_comment_stripped(self):
        fixture = load_fixture("comment")
        engine = TemplateEngine()
        result = engine.render(fixture["template"], fixture["params"])
        assert result == fixture["expected_output"]

    def test_forbidden_partial(self):
        fixture = load_fixture("error")
        engine = TemplateEngine()
        with pytest.raises(TemplateError) as exc_info:
            engine.render(fixture["template"], fixture["params"])
        assert exc_info.value.code == fixture["expected_error"]["code"]

    def test_forbidden_raw(self):
        engine = TemplateEngine()
        with pytest.raises(TemplateError) as exc_info:
            engine.render("{{{raw}}}", {"raw": "<b>"})
        assert exc_info.value.code == "forbidden-raw"

    def test_forbidden_dotted_path(self):
        engine = TemplateEngine()
        with pytest.raises(TemplateError) as exc_info:
            engine.render("{{a.b.c}}", {"a": {"b": {"c": "x"}}})
        assert exc_info.value.code == "forbidden-dotted-path"

    def test_forbidden_function_call(self):
        engine = TemplateEngine()
        with pytest.raises(TemplateError) as exc_info:
            engine.render("{{ upper(name) }}", {"name": "x"})
        assert exc_info.value.code == "forbidden-function-call"

    def test_html_escape_prevents_xss(self):
        engine = TemplateEngine()
        result = engine.render("{{msg}}", {"msg": '<script>alert("xss")</script>'})
        # The < and > should be HTML-escaped, preventing XSS
        assert "<script>" not in result
        assert "&lt;script&gt;" in result or "script" not in result.lower()



    def test_if_falsy(self):
        fixture = load_fixture("if")
        # Find the falsy case
        falsy_case = next(c for c in fixture["cases"] if c["name"] == "falsy")
        engine = TemplateEngine()
        result = engine.render(fixture["template"], falsy_case["params"])
        assert result == ""

    def test_nested_if(self):
        engine = TemplateEngine()
        template = "{{#if a}}{{#if b}}AB{{/if}}{{/if}}"
        assert engine.render(template, {"a": True, "b": True}) == "AB"
        assert engine.render(template, {"a": True, "b": False}) == ""
        assert engine.render(template, {"a": False, "b": True}) == ""

    def test_var_not_found(self):
        engine = TemplateEngine()
        result = engine.render("Hello {{name}}!", {})
        assert result == "Hello !"
