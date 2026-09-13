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

## M10.2.1 — Verification & Audit Harness (slice H0→H6) — IN PROGRESS

**UAT-M10-04** now executes for real via the independent Harness (`verification/`, TS+Playwright):
`SCN-M10-04-001` runs the Python CLI and the Control Plane wizard in a real browser and
compares the emitted create-plans with explicit cross-language oracles.

- Baseline BEFORE run (2026-09-13): **FAIL** — exposed the false-green: `/create` never
  mounted (root route without `<Outlet/>`), wizard plan emission broken, sink wrote raw
  templates, round-trip tests never executed both runtimes.
- Production fixes PR-1..PR-6 applied outside the Harness; AFTER run: **PASS** with full
  evidence bundle (before/after in `changes/m10-2-1-verification-audit-harness/evidence/`).
- Traceability Registry (H1) Git-native: `verification/traceability/registry.json` +
  coverage matrix M0–M10.2.
- Pending in this milestone (H7→H10): M10.2 browser audit, M0–M10.2 baseline, CI Audit
  Gate, hardening. Spec: `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/`.

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
M10.1 Creation Recipes               Status: done          Cycle: m10-1-creation-recipes
M10.2 Capability Catalog             Status: done          Cycle: m10-2-capability-catalog (v0.10.0)
```

## M10.2 — Capability Catalog — CLOSED (v0.10.0, 2026-08-31)

**UAT-M10-06** satisfied: skill/pack/profile/workflow/provider/recipe catalog pages.

- 6 new routes (`/capabilities`, `/skills`, `/packs`, `/profiles`, `/workflows`, `/providers`, `/recipes`, `/$kind/$namespace/$name`)
- Detail page reuses m16 `EntityHeader`/`MetadataCard`/`RelationsList` via `extensionRegistry` (capabilityEntryToCatalogEntity bridge)
- 5 cross-reference kinds via entityLinkPlugin (`[[Skill:default/x]]` → `/capabilities/skills/default/x`)
- Profile validator (`tools/validate-profiles/validate.py`) with exact-pinned deps
- Round-trip no-op proof: `useProjectionStore.getState()` deep-equal pre/post route mount
- m10 invariants enforced: no fetch, no Dexie/IndexedDB/Orama, no useProjectionStore

**Carry-forward INCs (m10.1 → M11)**:
- INC-015 (medium): `validate.py --negative-fixtures` default arg
- INC-016 (low): `CreateWizard.renderSkeletons` discards output
- INC-008 (low): m16 extension-isolation grep oracle gap (only-extension-imports of m16 catalog-entity, not the reverse)
