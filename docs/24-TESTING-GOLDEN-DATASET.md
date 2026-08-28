# Testing and Golden Dataset — Updated

## Existing backend/runtime testing remains.

## Control Plane testing layers

### Schema fixtures
Valid and invalid:
- catalog entities;
- project projections;
- recipes;
- extension config.

### Feature unit tests
Vitest:
- catalog normalization;
- entity refs;
- relation resolution;
- search collators;
- recipe normalization.

### Component tests
Testing Library:
- entity cards/tabs;
- Home widgets;
- Workbench next action;
- diagnostics.

### Browser UAT
Playwright:
- open snapshot;
- open directory adapter fixture;
- search;
- docs navigation;
- graph lens;
- recipe creation.

### Security fixtures
- malicious Markdown;
- javascript link;
- malformed ZIP;
- oversized/recursive data;
- path traversal.

### Performance fixtures
- 10 projects;
- 1k catalog entities;
- 10k narrative graph nodes;
- large docs index.

Performance numbers should become budgets only after first measured M10 build.

## Golden Control Plane workspace

```text
golden/control-plane/
├── project-valid/
├── project-stale-projection/
├── project-invalid-schema/
├── project-malicious-docs/
├── two-project-catalog/
├── large-graph/
└── recipes/
```

## Extension conformance

Every extension:
- stable ID;
- API version;
- no side effects at registration;
- matching predicate tests;
- error boundary behavior.
