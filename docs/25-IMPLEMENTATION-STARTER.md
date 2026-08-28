# Implementation Starter — Updated

## Core implementation remains Python-first

Do M1–M9 before investing heavily in the portal.

## Control Plane implementation begins after projection contract proves stable

Suggested repository strategy:

```text
repo/
├── pyproject.toml
├── src/reactive_narrative/
├── skills/
├── recipes/
├── schemas/
├── control-plane/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── vite.config.ts
│   └── src/
└── tests/
```

A monorepo is sufficient. Do not create a separate portal repository unless
deployment/versioning pressure appears.

## Control Plane first slices

### CP-A — Build shell
- Node 24 LTS;
- pnpm;
- TypeScript strict;
- React 19.2;
- Vite 8.1;
- routing;
- design tokens.

### CP-B — Projection loader
- SnapshotProjectSource;
- AJV validation;
- diagnostics;
- typed stores.

Implement snapshot before native directory access to make tests deterministic.

### CP-C — Catalog
- CatalogEntity schema;
- entity refs;
- CatalogStore;
- project list;
- project page.

### CP-D — Extension registry
Only:
- EntityTab;
- EntityCard;
- HomeWidget.

Add other extension kinds when used.

### CP-E — Directory source
- File System Access adapter;
- permission UX;
- fallback to snapshot.

### CP-F — Home + Workbench
- recent project registry;
- favorites;
- current focus;
- deterministic next action.

### CP-G — Search + Docs
- collators;
- Orama;
- safe Markdown;
- entity links.

### CP-H — Graph lenses
- Graphology;
- Sigma stable;
- scoped project/character/visual lenses.

### CP-I — Recipes
- recipe schema;
- RJSF;
- compare generated manifest with CLI.

## Dependency rule

Do not introduce TanStack Query merely because it is common in React.
There is no remote server query lifecycle in V1.

TanStack Router is selected for routing; state and data have dedicated local
stores.

## Definition of M10 success

A static production bundle can:

1. open a known project snapshot;
2. validate projections;
3. show catalog/entity pages;
4. show Home/Workbench;
5. search;
6. render docs safely;
7. render graph lens;
8. work offline after load;
9. require no application API.

Then directory access and multi-project ergonomics harden the experience.
