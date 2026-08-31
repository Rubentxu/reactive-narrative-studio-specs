"""
Mustache-subset template engine for the creation-recipes system.

Implements a SAFE subset of Mustache templating:
- {{var}} — variable substitution (top-level only)
- {{#each items}}...{{/each}} — iteration over array
- {{#if flag}}...{{/if}} — conditional
- {{! comment }} — comment (stripped)

FORBIDDEN patterns (rejected at parse time with TemplateError):
- {{> partial}} — no partials (forbidden-partial)
- {{{ raw }}} — no raw HTML (forbidden-raw)
- {{ a.b.c }} — no dotted paths (forbidden-dotted-path)
- {{ {{nested}} }} — no nested expressions (forbidden-nested)
- {{ upper(name) }} — no function calls (forbidden-function-call)

This is a PURE function — no eval, exec, subprocess, os.system, or file I/O.
All substitutions are HTML/JSON-escaped by default.
"""

from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass
from typing import Any, Callable


# Token types for the template engine
TOK_VAR = "var"
TOK_EACH = "each"
TOK_IF = "if"
TOK_COMMENT = "comment"
TOK_END_EACH = "end_each"
TOK_END_IF = "end_if"
TOK_TEXT = "text"


@dataclass
class TemplateError(Exception):
    """Raised when a template contains a forbidden pattern."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


class _TemplateParser:
    """
    Parses a mustache-subset template into tokens.

    Grammar:
        {{var}}          → TOK_VAR
        {{#each items}}  → TOK_EACH
        {{/each}}        → TOK_END_EACH
        {{#if flag}}     → TOK_IF
        {{/if}}          → TOK_END_IF
        {{! comment }}   → TOK_COMMENT (stripped)
        {{{ raw }}}      → forbidden-raw
        {{ a.b.c }}      → forbidden-dotted-path
        {{> partial }}   → forbidden-partial
        {{ {{nested}} }} → forbidden-nested
        {{ upper(name) }} → forbidden-function-call
        text             → TOK_TEXT
    """

    # Matches {{...}} expressions (non-greedy)
    EXPR_RE = re.compile(r"\{\{(.*?)\}\}")
    # Matches triple-brace {{{...}}} (raw HTML)
    RAW_RE = re.compile(r"\{\{\{(.+?)\}\}\}")
    # Matches {{> partial}} (forbidden partial)
    PARTIAL_RE = re.compile(r"\{\{\s*>\s*\S+\s*\}\}")
    # Matches function call {{ name(args) }}
    FUNCTION_CALL_RE = re.compile(r"\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\}\}")
    # Matches nested {{ inside }}
    NESTED_RE = re.compile(r"\{\{.*\{\{.*\}.*\}\}.*\}\}")
    # Matches dotted paths {{ a.b.c }}
    DOTTED_PATH_RE = re.compile(r"\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\.[a-zA-Z_][a-zA-Z0-9_.]*\s*\}\}")
    # Matches comments {{! comment }}
    COMMENT_RE = re.compile(r"\{\{\s*!.*?\}\}")
    # Matches variable {{ var }} (single identifier, no dots, no parens)
    VAR_RE = re.compile(r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$")
    # Matches {{#each items}}
    EACH_START_RE = re.compile(r"^\s*#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$")
    # Matches {{/each}}
    EACH_END_RE = re.compile(r"^\s*/each\s*$")
    # Matches {{#if flag}}
    IF_START_RE = re.compile(r"^\s*#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$")
    # Matches {{/if}}
    IF_END_RE = re.compile(r"^\s*/if\s*$")

    def parse(self, template: str) -> list[tuple[str, Any]]:
        """
        Parse a template string into tokens.

        Returns list of (token_type, token_value) tuples.
        TOK_TEXT values are raw text strings.
        Other token values are the variable/condition names.
        """
        tokens: list[tuple[str, Any]] = []
        pos = 0

        while pos < len(template):
            # Find the next {{ expression
            match = self.EXPR_RE.search(template, pos)
            if not match:
                # Rest of template is text
                if pos < len(template):
                    tokens.append((TOK_TEXT, template[pos:]))
                break

            # Text before this expression
            if match.start() > pos:
                tokens.append((TOK_TEXT, template[pos:match.start()]))

            expr = match.group(1)
            pos = match.end()

            # Check for forbidden patterns FIRST (before other checks)
            # Triple-brace raw HTML — detect by checking if match starts with {{{
            # EXPR_RE captures {{...}} from the first {{ to the first }}
            # For {{{raw}}}, the match starts with {{{ and is a raw expression
            matched_str = match.group()
            if matched_str.startswith("{{{"):
                raise TemplateError(
                    code="forbidden-raw",
                    message=f"Triple-brace {{{{{expr}}}}} is not allowed (raw HTML). "
                             "All substitutions are escaped by default.",
                )

            # Forbidden partial
            if self.PARTIAL_RE.match("{{" + expr + "}}"):
                raise TemplateError(
                    code="forbidden-partial",
                    message=f"{{{{expr}}}} uses a partial ({{>}}), which is not allowed.",
                )

            # Forbidden dotted path
            if self.DOTTED_PATH_RE.match("{{" + expr + "}}"):
                raise TemplateError(
                    code="forbidden-dotted-path",
                    message=f"{{{{expr}}}} contains a dotted path, which is not allowed. "
                             "Only top-level variable names are permitted.",
                )

            # Forbidden nested expression
            if self.NESTED_RE.match("{{" + expr + "}}"):
                raise TemplateError(
                    code="forbidden-nested",
                    message=f"{{{{expr}}}} contains a nested {{ expression, which is not allowed.",
                )

            # Forbidden function call
            if self.FUNCTION_CALL_RE.match("{{" + expr + "}}"):
                raise TemplateError(
                    code="forbidden-function-call",
                    message=f"{{{{expr}}}} calls a function, which is not allowed.",
                )

            # Comment (stripped) — {{! comment }} — detect via ! prefix in expr
            if expr.strip().startswith("!"):
                tokens.append((TOK_COMMENT, expr.strip()[1:].strip()))
                continue

            # Each block
            each_start = self.EACH_START_RE.match(expr)
            if each_start:
                tokens.append((TOK_EACH, each_start.group(1)))
                continue

            each_end = self.EACH_END_RE.match(expr)
            if each_end:
                tokens.append((TOK_END_EACH, None))
                continue

            # If block
            if_start = self.IF_START_RE.match(expr)
            if if_start:
                tokens.append((TOK_IF, if_start.group(1)))
                continue

            if_end = self.IF_END_RE.match(expr)
            if if_end:
                tokens.append((TOK_END_IF, None))
                continue

            # Variable (includes {{.}} for current item in each loops)
            # Check {{.}} special case first
            if expr.strip() == ".":
                tokens.append((TOK_VAR, "."))
                continue
            # Apply regex to expr (the content between {{ and }})
            var_match = self.VAR_RE.match(expr)
            if var_match:
                tokens.append((TOK_VAR, var_match.group(1)))
                continue

            # Unknown expression — treat as text (literal {{...}})
            tokens.append((TOK_TEXT, "{{" + expr + "}}"))

        return tokens


def _escape_json(value: Any) -> str:
    """Escape a value for safe JSON/HTML string substitution.

    Approach: JSON-encode, then HTML-escape the inner content (between quotes).
    This ensures <, >, &, " are safely escaped while preserving the value.

    Example: "Hello <World>" → "\u0022Hello \u003cWorld\u003e\u0022"
    After stripping outer quotes and HTML-escaping inner content:
    Hello &lt;World&gt;
    """
    # For strings: json.dumps("<>") = '"<>"'  — we want the inner <>
    # For numbers: json.dumps(42) = '42'  — no quotes
    # For booleans: json.dumps(true) = 'true'  — no quotes
    encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
    if encoded.startswith('"') and encoded.endswith('"'):
        # It's a JSON string — strip outer quotes, HTML-escape inner content
        inner = encoded[1:-1]
        return html.escape(inner)
    else:
        # It's a JSON literal (number, bool, null) — HTML-escape as-is
        return html.escape(encoded)


class TemplateEngine:
    """
    Pure template engine for the creation-recipes mustache-subset.

    All substitution is HTML/JSON-safe. No file I/O, no exec, no eval.
    """

    def __init__(self):
        self._parser = _TemplateParser()

    def render(self, template: str, params: dict[str, Any]) -> str:
        """
        Render a template with the given parameters.

        Args:
            template: A mustache-subset template string.
            params: A dict of top-level parameter names to values.

        Returns:
            The rendered string with all substitutions applied.

        Raises TemplateError if the template contains forbidden patterns.
        """
        tokens = self._parser.parse(template)
        return self._render_tokens(tokens, params, _current_item=None)

    def _render_tokens(
        self,
        tokens: list[tuple[str, Any]],
        params: dict[str, Any],
        _current_item: Any = None,
    ) -> str:
        """Render a list of parsed tokens."""
        result_parts: list[str] = []
        i = 0

        while i < len(tokens):
            tok_type, tok_val = tokens[i]

            if tok_type == TOK_TEXT:
                result_parts.append(tok_val)

            elif tok_type == TOK_VAR:
                if tok_val == ".":
                    # {{.}} refers to current item in each loop
                    value = _current_item if _current_item is not None else ""
                else:
                    value = params.get(tok_val, "")
                # Escape HTML/JSON-safe substitution
                result_parts.append(_escape_json(value))

            elif tok_type == TOK_EACH:
                list_var = tok_val
                items = params.get(list_var, [])
                if not isinstance(items, list):
                    items = []
                # Collect content until {{/each}}
                section_end = self._find_end(tokens, i + 1, TOK_END_EACH)
                section_tokens = tokens[i + 1:section_end]
                for item in items:
                    item_params = params.copy()
                    item_params[list_var] = item
                    result_parts.append(
                        self._render_tokens(section_tokens, item_params, _current_item=item),
                    )
                i = section_end

            elif tok_type == TOK_IF:
                cond_var = tok_val
                value = params.get(cond_var)
                # Truthy: render content until {{/if}}
                section_end = self._find_end(tokens, i + 1, TOK_END_IF)
                section_tokens = tokens[i + 1:section_end]
                if value:
                    result_parts.append(
                        self._render_tokens(section_tokens, params, _current_item=_current_item),
                    )
                i = section_end

            elif tok_type == TOK_COMMENT:
                # Stripped from output
                pass

            elif tok_type == TOK_END_EACH:
                pass  # handled by _render_tokens loop

            elif tok_type == TOK_END_IF:
                pass  # handled by _render_tokens loop

            i += 1

        return "".join(result_parts)

    def _find_end(
        self,
        tokens: list[tuple[str, Any]],
        start: int,
        end_type: str,
    ) -> int:
        """Find the matching end token for a block start."""
        depth = 1
        for j in range(start, len(tokens)):
            if tokens[j][0] in (TOK_EACH, TOK_IF):
                depth += 1
            elif tokens[j][0] == end_type:
                depth -= 1
                if depth == 0:
                    return j
        return len(tokens)
