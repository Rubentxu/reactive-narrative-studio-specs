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
