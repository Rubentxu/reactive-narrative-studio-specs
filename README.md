# Reactive Narrative Studio — Specification Pack

> Working name. Product naming remains intentionally open.

Reactive Narrative Studio is an **agent-first, Git-native, local-first
narrative production system** for stories, novels, illustrated books,
graphic novels, comics, manga and future sequential/narrative media.

The initial dogfooding profile is Spanish-language readers aged 8–12, while
the architecture remains audience-neutral through composable profiles.

## Core thesis

1. **Skills are knowledge.**
2. **Packs are behavior.**
3. **The graph is live project state.**
4. **Events, decisions and receipts are evidence.**
5. **Git-friendly files hold canonical project source.**
6. **The Control Plane is a projection consumer, never a source of truth.**

## Runtime architecture

Python-first, with:

- ActiveGraph behind a runtime port;
- per-project SQLite;
- JSONL evidence/event export;
- ComfyUI + replaceable SaaS image providers;
- content-addressed assets;
- Typst as first print renderer;
- Agent Skills as the portable creative knowledge layer.

## Project isolation

One project directory is one independent SCM/runtime boundary:

```text
book-project/
├── narrative.yaml
├── narrative.lock
├── canon/
├── manuscript/
├── visual/
├── assets/
├── feedback/
├── .narrative/
│   ├── events/
│   ├── decisions/
│   ├── receipts/
│   ├── projections/
│   └── runtime/activegraph.sqlite
└── build/
```

The runtime DB can be removed and rebuilt from accepted project source and
evidence.

## Control Plane — refined architecture

The Control Plane takes inspiration from Backstage's strongest UX and
information-architecture patterns, without adopting Backstage as a platform.

```text
                    STATIC PWA
┌─────────────────────────────────────────────────────────┐
│ Studio Home │ Catalog │ Create │ Search │ Docs          │
│─────────────────────────────────────────────────────────│
│ Entity Pages │ Workbench │ Graph Lenses │ QA │ History │
│─────────────────────────────────────────────────────────│
│             Feature / Extension Registry                │
│─────────────────────────────────────────────────────────│
│               Projection & Catalog Store                │
└──────────────────────────┬──────────────────────────────┘
                           │
                    JSON projections
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
         Git          ActiveGraph         Assets
```

### Backstage patterns intentionally reused

| Backstage pattern | Reactive Narrative Studio |
|---|---|
| Software Catalog | Narrative Catalog |
| Catalog Entity | Narrative Entity Projection |
| Entity Page | Narrative Entity Page |
| Frontend Plugins | Control Plane Features |
| Extension Blueprints | Typed Extension Points |
| Software Templates | Creation Recipes |
| Scaffolder Wizard | New Project Wizard |
| TechDocs | Narrative Docs |
| Search/Collators | Narrative Search/Collators |
| Home Widgets | Studio Home Widgets |
| Starred Entities | Favorites |
| Lifecycle | Creative Lifecycle |
| System/Domain | future Series/Universe |

### Backstage complexity deliberately rejected

No mandatory:
- application backend;
- central catalog database;
- server-side scaffolder;
- backend plugin runtime;
- Elasticsearch;
- organization IAM model;
- dynamic remote plugins.

## Control Plane stack baseline

Current implementation baseline:

- Node.js **24 LTS**;
- TypeScript strict;
- React **19.2**;
- Vite **8.1**;
- pnpm workspace;
- TanStack Router;
- Tailwind CSS **4.3**;
- Radix UI primitives;
- Lucide icons;
- Zustand for small client application state;
- Dexie/IndexedDB for local Studio metadata;
- Ajv 8 with JSON Schema 2020-12;
- RJSF **6.8** for Creation Recipe forms;
- Orama for local full-text search;
- Sigma.js stable 3.x + Graphology for large graph views;
- React Markdown / unified ecosystem with sanitization;
- Vitest + Testing Library;
- Playwright for browser UAT;
- PWA/service worker as an optional deployment capability.

Exact dependency pins belong in the implementation lockfile. Major/minor
choices above are the architectural baseline, not an excuse to float
dependencies indefinitely.

## New specification documents

The Backstage-inspired refinement adds:

- `docs/28-CONTROL-PLANE-STACK.md`
- `docs/29-NARRATIVE-CATALOG.md`
- `docs/30-CONTROL-PLANE-EXTENSIONS.md`
- `docs/31-CREATION-RECIPES.md`
- `docs/32-NARRATIVE-DOCS-SEARCH.md`
- `docs/33-STUDIO-HOME-WORKBENCH.md`
- `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`
- `docs/35-CATALOG-PROVIDERS.md`

plus ADRs 021–025 and additional M10 UAT scenarios.

## First product-worthy release remains unchanged

M9 still proves the core before portal expansion:

```text
Git project
 -> middle-grade profile
 -> canon
 -> 3 chapters
 -> editorial/continuity QA
 -> visual bible
 -> 5 accepted AI illustrations
 -> Typst proof PDF
 -> delete runtime
 -> rebuild
 -> reproduce valid proof
```

Only then does M10 build the richer serverless Control Plane.
