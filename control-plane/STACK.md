# Control Plane Implementation Baseline

```text
Node 24 LTS
TypeScript strict
React 19.2
Vite 8.1
pnpm
TanStack Router
Tailwind 4.3
Radix UI
Lucide
Zustand
Dexie
Ajv 8 / JSON Schema 2020-12
RJSF 6.8
Orama
Graphology + Sigma stable 3.x
react-markdown/unified + sanitizer
Vitest + Testing Library + Playwright
```

This is a design baseline, not a generated `package.json`.
The implementation must pin exact compatible releases when M10 starts.

## T1 Deviations (resolved at m14 apply)

- **vite**: docs/28 baseline 8.1 → resolved 8.2.2 (minor drift)

## T1 Deviations (resolved at m15 apply)

- **@radix-ui/react-tabs**: resolved at m15 apply — exact pin `1.1.21` confirmed via T0 ladder per M14 D3 (patch drift from baseline; compatible with React 19.2.8)

## Markdown Pipeline Deps (resolved at m16 apply — Block PF)

| Dep | Exact pin | Design estimate | Drift | Tier |
|-----|-----------|----------------|-------|------|
| `react-markdown` | `9.1.0` | `9.0.3` | +0.0.1 patch | T0 |
| `rehype-sanitize` | `6.0.0` | `6.0.0` | none | T1 |
| `remark-gfm` | `4.0.1` | `4.0.0` | +0.0.1 patch | T1 |
| `unist-util-visit` | `5.1.0` | `5.0.0` | +0.0.1 patch (advisory, no STOP) | T2 |

**T1 STOP verifications (all passed — no triggers):**
- `hast-util-sanitize@5.0.2` within `^5.0.0` peer of `rehype-sanitize@6` → no major drift
- `mdast-util-gfm@3.1.0` within `^3.0.0` peer of `remark-gfm@4` → no major drift

**T2 advisory (non-blocking):** `unist-util-visit@5.1.0` drifted from `5.0.0` estimate — recorded but does not STOP per design Appendix A.

## M10.1 Creation Recipes — resolved pins

| Dep / Tool | Exact pin | Notes |
|---|---|---|
| `@rjsf/core` | `6.8.0` | Peer-compatible with React 19.2.8; verified at Block PF |
| `@rjsf/validator-ajv8` | `6.8.0` | Same release train as @rjsf/core |
| `ajv-cli` (Node) | `ajv-cli@6.x` | CI gate for schema validation; Python ajv-py used in validate script |
| `narrative-cli` | `tools/narrative-cli/` | In-pack CLI; editable install or `python -m narrative_cli` |
| `narrative-recipes` | `tools/narrative_recipes/` | In-pack Python core; `pip install -e tools/narrative_recipes` |
| `validate-recipes` | `tools/validate-recipes/validate.py` | Lock fingerprint validator; Python ajv-py |
| `mustache-subset engine` | Python `tools/narrative_recipes/template_engine.py` + TS `src/recipes/templateEngine.ts` | Identical grammar; round-trip equivalence oracle |

