# Roadmap — Updated

Milestones remain outcome-driven and UAT-gated.

## M0–M9

Unchanged strategic sequence:
- M0 Research Baseline
- M1 Git-Native Project Core
- M2 Rebuildable ActiveGraph Runtime
- M3 Narrative Canon + Continuity
- M4 Profiles + Middle Grade
- M5 Editorial Agent Workflow
- M6 Visual Bible
- M7 Image Providers
- M8 Visual QA + Repair
- M9 Illustrated Book Vertical Slice / first product-worthy release

M9 remains the architectural proof before building the portal.

## M10 — Control Plane Foundation

### Deliver
- React/Vite static shell;
- projection loader;
- JSON Schema validation;
- Directory + Snapshot sources;
- `CatalogEntity` store;
- Project catalog;
- Project entity page;
- Character entity page;
- internal Extension Registry;
- Studio Home;
- Workbench;
- local Search;
- safe Narrative Docs;
- initial Graph Lenses;
- offline/static build path.

### UAT
- `UAT-M10-01` serverless loading
- `UAT-M10-02` catalog/entity composition
- `UAT-M10-03` search/docs

### Exit
No mandatory network/backend calls; invalid projection fixture produces
diagnostic rather than application crash.

### Slice 3a — done (m16)

**UAT-M10-03** satisfied: Local Search + Safe Narrative Docs + Decision projection.
In-memory substring index (5 result types: character, scene-chapter, asset, decision, docs),
ASCII-fold tokenizer, 5-level D4 ranker. GFM-safe Markdown rendering via react-markdown
+ rehype-sanitize + remark-gfm + entityLinkPlugin (OWASP XSS vectors stripped).
`[[Kind:namespace/name]]` entity links via `parseEntityRef`. cp-decisions schema
(new file, REQ-DEC-1). See `docs/32-NARRATIVE-DOCS-SEARCH.md` §V1 substring index.

### Slice 2 — done (m15)

**UAT-M10-02** satisfied: catalog/entity composition with Extension Registry,
feature tabs (Story Overview/Arc/Scenes, Visual DNA, Continuity Status),
Entity Cards (Visual, Metadata, Relations), and Radix Tabs orchestration.
See `docs/29-NARRATIVE-CATALOG.md` §"Catalog as implemented (m15 slice 2)".

## M10.1 — Creation Recipes

### Deliver
- recipe schema;
- RJSF wizard;
- same recipe consumable by CLI;
- initial middle-grade illustrated recipe.

### UAT
`UAT-M10-04`.

### Exit
Wizard and CLI create semantically equivalent project manifests/skeletons.

## M10.2 — Capability Catalog

### Deliver
Catalog projections/pages for:
- Skills;
- Packs;
- Profiles;
- Comfy workflows;
- image providers/capabilities;
- recipes.

### Goal
Make the Studio explain the creative toolchain as well as individual books.

## M10.3 — Multi-Project Local Studio

### Deliver
- IndexedDB recent-project registry;
- favorites;
- multi-project catalog;
- local Studio Home.

### UAT
`UAT-M10-05`.

No central catalog DB.

## M11 — Human Reader UAT

As previously defined, with Control Plane projection/pages added.

## M12 — Sequential Art Core

As previously defined.

Control Plane additions:
- panel storyboard page;
- sequential graph lens.

## M13 — Comic Renderer

As previously defined.

## M14 — Manga Profile

As previously defined.

## M15 — Digital Publishing

As previously defined.

## M16 — Series Canon

Add future catalog hierarchy only now:

```text
Universe
 -> Series
 -> NarrativeProject
 -> Edition
```

Do not create these abstractions earlier without need.

## M17 candidate — Write-capable Control Plane

Only if read-only Control Plane proves useful.

Potential:
- approve/reject;
- comment;
- regeneration request.

Architecture:
filesystem decision/command records or explicit local runner bridge.

A persistent backend remains optional, not assumed.

## Active Milestones

```text
M10.1 Creation Recipes               Status: in_progress   Cycle: m10-1-creation-recipes
```
