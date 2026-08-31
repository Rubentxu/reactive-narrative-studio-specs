/**
 * Mustache-subset template engine for creation-recipes.
 *
 * Implements a SAFE subset of Mustache templating:
 * - {{var}} — variable substitution (top-level only)
 * - {{#each items}}...{{/each}} — iteration over array
 * - {{#if flag}}...{{/if}} — conditional
 * - {{! comment }} — comment (stripped)
 *
 * FORBIDDEN patterns (rejected at parse time with TemplateError):
 * - {{> partial}} — no partials (forbidden-partial)
 * - {{{ raw }}} — no raw HTML (forbidden-raw)
 * - {{ a.b.c }} — no dotted paths (forbidden-dotted-path)
 * - {{ {{nested}} }} — no nested expressions (forbidden-nested)
 * - {{ upper(name) }} — no function calls (forbidden-function-call)
 *
 * This is a PURE function — no eval, exec, subprocess, or file I/O.
 * All substitutions are HTML/JSON-escaped by default.
 */

// Token types
export const TOK_VAR = "var";
export const TOK_EACH = "each";
export const TOK_IF = "if";
export const TOK_COMMENT = "comment";
export const TOK_END_EACH = "end_each";
export const TOK_END_IF = "end_if";
export const TOK_TEXT = "text";

export type TokenType =
  | typeof TOK_VAR
  | typeof TOK_EACH
  | typeof TOK_IF
  | typeof TOK_COMMENT
  | typeof TOK_END_EACH
  | typeof TOK_END_IF
  | typeof TOK_TEXT;

export interface Token {
  type: TokenType;
  value: string;
}

/** Template error codes */
export type TemplateErrorCode =
  | "forbidden-partial"
  | "forbidden-raw"
  | "forbidden-dotted-path"
  | "forbidden-nested"
  | "forbidden-function-call";

/** Error thrown when a template contains a forbidden pattern. */
export class TemplateError extends Error {
  readonly code: TemplateErrorCode;

  constructor(code: TemplateErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TemplateError";
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

// Matches {{...}} expressions (non-greedy)
const EXPR_RE = /\{\{(.*?)\}\}/g;
// Matches triple-brace {{{...}}} (raw HTML)
const RAW_RE = /^\{\{\{/;
// Matches {{> partial}} (forbidden partial)
const PARTIAL_RE = /^\{\{\s*>\s*\S+\s*\}\}/;
// Matches function call {{ name(args) }}
const FUNCTION_CALL_RE = /^\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\}\}/;
// Matches nested {{ inside }}
const NESTED_RE = /^\{\{.*\{\{.*\}\}.*\}\}/;
// Matches dotted paths {{ a.b.c }}
const DOTTED_PATH_RE = /^\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\.[a-zA-Z_][a-zA-Z0-9_.]*\s*\}\}/;
// Matches comments {{! comment }}
const COMMENT_RE = /^\{\{\s*!/;
// Matches variable {{ var }} (single identifier)
const VAR_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
// Matches {{#each items}}
const EACH_START_RE = /^\s*#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
// Matches {{/each}}
const EACH_END_RE = /^\s*\/each\s*$/;
// Matches {{#if flag}}
const IF_START_RE = /^\s*#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
// Matches {{/if}}
const IF_END_RE = /^\s*\/if\s*$/;

/** Parse a template string into tokens. */
function parse(template: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  EXPR_RE.lastIndex = 0;
  while ((match = EXPR_RE.exec(template)) !== null) {
    const matchStart = match.index;
    const matched = match[0]!; // e.g. "{{name}}"
    const expr = match[1] ?? ""; // content between {{ and }}

    // Text before this expression
    if (matchStart > lastIndex) {
      tokens.push({ type: TOK_TEXT, value: template.slice(lastIndex, matchStart) });
    }

    // Check for forbidden patterns FIRST

    // Triple-brace raw HTML — detect by checking if match starts with {{{
    if (RAW_RE.test(matched)) {
      throw new TemplateError(
        "forbidden-raw",
        `Triple-brace ${matched} is not allowed (raw HTML). All substitutions are escaped by default.`,
      );
    }

    // Forbidden partial
    if (PARTIAL_RE.test(matched)) {
      throw new TemplateError(
        "forbidden-partial",
        `${matched} uses a partial ({{>}}), which is not allowed.`,
      );
    }

    // Forbidden dotted path
    if (DOTTED_PATH_RE.test(matched)) {
      throw new TemplateError(
        "forbidden-dotted-path",
        `${matched} contains a dotted path, which is not allowed. Only top-level variable names are permitted.`,
      );
    }

    // Forbidden nested expression
    if (NESTED_RE.test(matched)) {
      throw new TemplateError(
        "forbidden-nested",
        `${matched} contains a nested {{ expression, which is not allowed.`,
      );
    }

    // Forbidden function call
    if (FUNCTION_CALL_RE.test(matched)) {
      throw new TemplateError(
        "forbidden-function-call",
        `${matched} calls a function, which is not allowed.`,
      );
    }

    // Comment — strip from output
    if (COMMENT_RE.test(matched)) {
      tokens.push({ type: TOK_COMMENT, value: expr.trim().slice(1).trim() });
      lastIndex = matchStart + matched.length;
      continue;
    }

    // Each block
    const eachStartMatch = expr.match(EACH_START_RE);
    if (eachStartMatch !== null) {
      tokens.push({ type: TOK_EACH, value: eachStartMatch[1]! });
      lastIndex = matchStart + matched.length;
      continue;
    }

    if (EACH_END_RE.test(expr.trim())) {
      tokens.push({ type: TOK_END_EACH, value: "" });
      lastIndex = matchStart + matched.length;
      continue;
    }

    // If block
    const ifStartMatch = expr.match(IF_START_RE);
    if (ifStartMatch !== null) {
      tokens.push({ type: TOK_IF, value: ifStartMatch[1]! });
      lastIndex = matchStart + matched.length;
      continue;
    }

    if (IF_END_RE.test(expr.trim())) {
      tokens.push({ type: TOK_END_IF, value: "" });
      lastIndex = matchStart + matched.length;
      continue;
    }

    // Variable (includes {{.}} for current item in each loops)
    const trimmedExpr = expr.trim();
    if (trimmedExpr === ".") {
      tokens.push({ type: TOK_VAR, value: "." });
      lastIndex = matchStart + matched.length;
      continue;
    }
    if (VAR_RE.test(trimmedExpr)) {
      tokens.push({ type: TOK_VAR, value: trimmedExpr });
      lastIndex = matchStart + matched.length;
      continue;
    }

    // Unknown expression — treat as literal text
    tokens.push({ type: TOK_TEXT, value: matched });
    lastIndex = matchStart + matched.length;
  }

  // Remaining text
  if (lastIndex < template.length) {
    tokens.push({ type: TOK_TEXT, value: template.slice(lastIndex) });
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// JSON/HTML escaping
// ---------------------------------------------------------------------------

/**
 * Escape a value for safe JSON/HTML string substitution.
 * For strings: JSON-encode, then HTML-escape the inner content.
 */
function escapeJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded.startsWith('"') && encoded.endsWith('"')) {
    // It's a JSON string — strip outer quotes, HTML-escape inner content
    const inner = encoded.slice(1, -1);
    return inner
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // JSON literal (number, bool, null)
  return encoded
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

function findEnd(tokens: Token[], start: number, endType: TokenType): number {
  let depth = 1;
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.type === TOK_EACH || tok.type === TOK_IF) {
      depth += 1;
    } else if (tok.type === endType) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return tokens.length;
}

function renderTokens(
  tokens: Token[],
  params: Record<string, unknown>,
  currentItem?: unknown,
): string {
  const parts: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i]!;

    if (tok.type === TOK_TEXT) {
      parts.push(tok.value);
    } else if (tok.type === TOK_VAR) {
      if (tok.value === ".") {
        parts.push(escapeJson(currentItem));
      } else {
        const v = tok.value in params ? params[tok.value] : "";
        parts.push(escapeJson(v));
      }
    } else if (tok.type === TOK_EACH) {
      const listVar = tok.value;
      const items = Array.isArray(params[listVar]) ? (params[listVar] as unknown[]) : [];
      const sectionEnd = findEnd(tokens, i + 1, TOK_END_EACH);
      const sectionTokens = tokens.slice(i + 1, sectionEnd);
      for (const item of items) {
        const itemParams = { ...params, [listVar]: item };
        parts.push(renderTokens(sectionTokens, itemParams, item));
      }
      i = sectionEnd;
    } else if (tok.type === TOK_IF) {
      const condVar = tok.value;
      const value = params[condVar];
      const sectionEnd = findEnd(tokens, i + 1, TOK_END_IF);
      const sectionTokens = tokens.slice(i + 1, sectionEnd);
      if (value) {
        parts.push(renderTokens(sectionTokens, params, currentItem));
      }
      i = sectionEnd;
    } else if (tok.type === TOK_COMMENT) {
      // Stripped from output
    }
    // TOK_END_EACH, TOK_END_IF: handled by findEnd

    i += 1;
  }

  return parts.join("");
}

// ---------------------------------------------------------------------------
// TemplateEngine
// ---------------------------------------------------------------------------

/**
 * Pure template engine for the creation-recipes mustache-subset.
 *
 * All substitution is HTML/JSON-safe. No file I/O, no eval, no exec.
 */
export class TemplateEngine {
  /**
   * Render a template with the given parameters.
   *
   * @param template - A mustache-subset template string
   * @param params - A dict of top-level parameter names to values
   * @returns The rendered string with all substitutions applied
   * @throws TemplateError if the template contains forbidden patterns
   */
  render(template: string, params: Record<string, unknown>): string {
    const tokens = parse(template);
    return renderTokens(tokens, params);
  }
}
