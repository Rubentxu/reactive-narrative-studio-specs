# Reactive Narrative Studio — Specification Pack

> Working name. Product naming remains intentionally open.

Reactive Narrative Studio is an **agent-first, Git-native, local-first
narrative production system** for stories, novels, illustrated books,
graphic novels, comics, manga and future sequential/narrative media.

The initial dogfooding profile is Spanish-language readers aged 8–12, while
the architecture remains audience-neutral through composable profiles.

## What this repository is

This repository is the **specification pack** — the canonical source of
truth for the system's architecture, schemas, decision records, examples,
and acceptance tests. It contains **no runnable application code yet**.
Implementation repositories will consume the schemas, ADRs and UAT
scenarios defined here.

A runnable reference implementation is expected to land as a separate
repository, following the constraints documented in
[`docs/25-IMPLEMENTATION-STARTER.md`](docs/25-IMPLEMENTATION-STARTER.md).

## Quick links

| You want to… | Read |
|---|---|
| Understand the vision | [`docs/01-VISION.md`](docs/01-VISION.md) |
| Read the product requirements | [`docs/02-PRD.md`](docs/02-PRD.md) |
| See the architecture | [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) |
| Browse the domain model | [`docs/04-DOMAIN-MODEL.md`](docs/04-DOMAIN-MODEL.md) |
| See the decision history | [`docs/adrs/`](docs/adrs/) (25 ADRs) |
| Validate against a JSON Schema | [`specs/`](specs/) (20 schemas) |
| See a worked example | [`examples/`](examples/) |
| Run an acceptance test | [`uat/`](uat/) (17 UATs) — executable via the [`verification/`](verification/) Harness |
| Run the Verification Harness | `cd verification && pnpm install && pnpm verify` (M10.2.1) |
| Check the glossary | [`docs/27-GLOSSARY.md`](docs/27-GLOSSARY.md) |
| See the risks | [`docs/26-RISKS.md`](docs/26-RISKS.md) |

## Create a project

Two paths share the same recipe source:

**Browser wizard** — `cd control-plane && pnpm preview`, then navigate to `/create`.
Select a recipe, fill in the parameters, and download `create-plan.json` or save directly
to a directory (Chromium only via File System Access API; Firefox/Safari use the download fallback).

**CLI** — `pip install -e tools/narrative-cli` (or `python -m narrative_cli`), then:

```bash
narrative init --recipe middle-grade-illustrated \
  --param title="My Novel" \
  --param projectId="my-novel" \
  --param audience="profile-middle-grade-10-11" \
  --out ./output
```

Both paths produce a canonical `create-plan.json`; the CLI accepts one as `--plan`:

```bash
narrative init --plan create-plan.json --out ./output
```

Recipes live in `recipes/<id>/`. Currently bundled: `middle-grade-illustrated`
(middle-grade illustrated novel, 10–11 age group). See
[`docs/33-CREATION-RECIPES.md`](docs/33-CREATION-RECIPES.md) for the full closeout doc.

## Repository layout

```text
.
├── README.md                 — this file
├── LICENSE                   — MIT
├── MANIFEST.json             — canonical file inventory + schema version
├── OVERLAY-MANIFEST.json     — Backstage-inspired Control Plane overlay provenance
├── docs/                     — 35 narrative documents + 25 ADRs
├── specs/                    — 20 JSON Schemas (catalog, projections, CLI contracts)
├── examples/                 — 5 worked YAML examples
├── uat/                      — 17 acceptance-test scenarios
├── control-plane/            — Control Plane assets (recipes, providers)
└── changes/                  — SDDK change records (proposal/spec/design/tasks)
```

## Release status

- **Current release**: `v0.1.0` — annotated tag, peeled to commit `42147d91`.
- **Wave 1–3 landed**: catalog vocabulary normalization (lowercase status,
  lifecycle enum of 10, capability kinds enum of 11), inspect/next CLI
  contracts, and 13 control-plane projection schemas (cp-approvals,
  cp-assets, cp-chapters, cp-characters, cp-costs, cp-graph, cp-progress,
  cp-project, cp-scm, cp-uat, cp-visual-quality, cp-workflow, cp-history).
- **Wave 4 deferred** to the next cycle (`spec-completion-ir`): narrative-IR,
  visual-IR, sequential-IR, event, provider-capability, publishing-receipt,
  profile, visual-spec schemas and the first ComfyUI workflow bundle.
- **Acceptance criteria**: 6 of 13 ACs implemented in this release; the
  remaining 7 are deferred or not in scope for the spec pack.
- **Verification verdict**: PASS_WITH_WARNINGS. See
  [`docs/26-RISKS.md`](docs/26-RISKS.md) for the open risks.

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

## Control Plane — Catalog + Entity Pages

The catalog and entity page system is built in `control-plane/` as a serverless
React/Vite PWA. See [`docs/29-NARRATIVE-CATALOG.md`](docs/29-NARRATIVE-CATALOG.md)
for the implemented design and [`docs/30-CONTROL-PLANE-EXTENSIONS.md`](docs/30-CONTROL-PLANE-EXTENSIONS.md) for the Extension Registry architecture.
UAT-M10-02 validates catalog/entity composition with four feature tabs per entity.

## Control Plane — Local Search + Narrative Docs (M10.3)

Slice 3a (m16) ships **Local Search + Safe Narrative Docs + Decision projection**:

### Local Search

In-memory substring full-text index over catalog entities, `cp-*` projections, and Markdown docs.
Five result types: `character`, `scene-chapter`, `asset`, `decision`, `docs`.
Tokenizer: Unicode NFD → strip combining marks → lowercase → split on non-alphanumeric.
Ranker: exact-id=100 > Kind:ns/name=80 > multi-token-hit=60 > single-token-hit=40 > snippet-only=20.
No IndexedDB, no Orama, no network requests.

**UAT-M10-03** validates end-to-end: search `llave plateada` returns ≥1 result per type;
opening docs renders safe Markdown; entity navigation works.

### Safe Narrative Docs

`react-markdown` + `rehype-sanitize` + `remark-gfm` + `entityLinkPlugin` pipeline.
GFM-safe allow-list strips OWASP XSS vectors (script, javascript:/data:/vbscript:, iframe, object/embed, style, inline event handlers).
`[[Kind:namespace/name]]` entity-link syntax → internal `/entity/Kind/namespace/name` links via `parseEntityRef`.

### Decision projection

`specs/cp-decisions.schema.json` (NEW) validates `{ id, action, targetRef, date, status }` entries.
Decision entity kind registered against existing `catalog-entity.schema.json`.

### References

- [`docs/32-NARRATIVE-DOCS-SEARCH.md`](docs/32-NARRATIVE-DOCS-SEARCH.md) — V1 substring index contract, GFM-safe allow-list, 5-level ranker, scene-chapter derivation, Orama V2 migration path
- [`docs/27-GLOSSARY.md`](docs/27-GLOSSARY.md) — glossary entries for search index, safe docs, decision projection, scene-chapter
- [`docs/28-CONTROL-PLANE-STACK.md`](docs/28-CONTROL-PLANE-STACK.md) — version-locked Markdown dependency table
- [`uat/UAT-M10-03-local-search-docs.md`](uat/UAT-M10-03-local-search-docs.md) — binding UAT scenario

### vite preview smoke

```bash
cd control-plane && pnpm build && pnpm preview &
# curl http://localhost:4173/search → HTTP 200
```

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

## Specification methodology

This pack is maintained under the **Spec-Driven Kit (SDDK)** workflow:

1. Every change starts as a proposal in `changes/<change-name>/proposal.md`.
2. Specs are written as `specs/<capability>/spec.md` deltas.
3. Design and tasks split the change into review-sized work units.
4. Each task is applied as an atomic conventional commit on `main`.
5. Each cycle closes with a verify + debt-verify gate, a local annotated
   semver tag, and a durable archive manifest in the external SDDK vault.

The current change in flight is `spec-completion`; its artifacts are
preserved under [`changes/spec-completion/`](changes/spec-completion/) and
its full ledger trace lives in the SDDK vault.

## Contributing

This is an early-stage specification pack. Until the implementation
repositories land, contributions are best submitted as:

## Capability Catalog (M10.2)

The `control-plane/src/features/capability-catalog/` feature module
provides a read-only Control Plane view of every discoverable studio
capability. Routes:

- `/capabilities` — overview with kind-section counts
- `/capabilities/skills`, `/packs`, `/profiles`, `/workflows`, `/providers`, `/recipes` — per-kind lists
- `/capabilities/$kind/$namespace/$name` — detail page (composes m16 `EntityHeader` + `MetadataCard` + `RelationsList`)

Manifest is pre-computed at build time via `import.meta.glob` (no runtime
network calls; m10 serverless invariant preserved). Cross-references in
markdown resolve via the extended `entityLinkPlugin`. See
[`docs/29-NARRATIVE-CATALOG.md`](docs/29-NARRATIVE-CATALOG.md) §Capability
Catalog as implemented for the full reference.

1. An issue that frames the problem and references existing ADRs.
2. A change record (`changes/<name>/`) with proposal + spec + design +
   tasks following the SDDK conventions.
3. Atomic conventional commits on a feature branch, with the SDDK gate
   pipeline green on `main` before merge.

For trivial documentation fixes, a direct pull request is fine.

## Project status

Active. Pre-implementation. The architecture, control-plane overlay and
acceptance-test scaffolding are stable; the runnable reference
implementation is the next milestone.

## License

Released under the [MIT License](LICENSE). Copyright © 2026 Rubentxu.
