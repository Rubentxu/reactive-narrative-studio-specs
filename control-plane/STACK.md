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
