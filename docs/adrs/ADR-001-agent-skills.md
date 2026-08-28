# ADR-001 — Agent Skills as the portable knowledge format

## Status
Accepted.

## Decision
Creative/editorial procedures use the open Agent Skills `SKILL.md` format.

## Rationale
Knowledge should be reusable by OpenCode/Codex/Claude-like clients and by runtime LLM behaviors.

## Consequences
- skills contain method, examples, references and evals;
- runtime packs do not duplicate skill prose;
- SkillRegistry provides controlled loading.
