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
- **H7 done** (cycle `m10-2-1-baseline-audit`): M10.2 browser audit — `SCN-M10-02-001`
  navigates the built app through the six kind routes and a real entity detail with DOM
  oracles. The audit exposed two more production defects of the Outlet/route-param class
  (capability pages unreachable; detail always NotFound), fixed in PR-7/PR-8 with
  before/after evidence.
- **H8 done** (same cycle): baseline M0–M10.2 (`verification/traceability/baseline-m0-m10-2.md`)
  with per-milestone coverage, gaps/backlog and accepted gaps under `waivers.json`
  (`PASS_WITH_WAIVER` mechanics — never turns FAIL into PASS).
- **H9 done** (cycle `m10-2-1-audit-gate-hardening`): Audit Gate Git-native
  (`audit milestone|range|flakiness|retention`) derived from traceability + evidence +
  waivers, declared verification levels, JUnit reports and a CI workflow
  (`.github/workflows/verification.yml`). `audit milestone M10.2.1` → PASS_WITH_WAIVER;
  `audit milestone M10.1` → FAIL with its UNMAPPED backlog — reported, not hidden.
- **H10 done** (same cycle): hardening negative tests (tamper detection, dirty tree,
  process-level redaction, parallel isolation, flakiness). The tests found and fixed a
  real integrity bug in the harness itself (`finalize()` hashed events.jsonl before the
  last append); retained bundles were reindexed with a provenance note.
- Milestone complete: H0→H10 delivered across three cycles
  (v0.11.0, v0.12.0, v0.13.0). Spec:
  `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/`.

## M10.3 — Multi-Project Local Studio — DELIVERED (v0.14.0)

### Deliver
- IndexedDB recent-project registry (metadata only);
- favorites;
- multi-project catalog (project filter);
- local Studio Home.

### UAT
`UAT-M10-05` — executable: `SCN-M10-05-001` (verification/scenarios/).

No central catalog DB: the only local database is the preferences registry
(`rns-studio/projects`), asserted by the scenario (store list + record keys).

### Implementation notes
- Multi-project runtime: loaded projects keep independent identities; the
  Catalog switches the active project without reloading the app.
- Home (`/home`): Continue Working, Recent Projects, favorites, forget.
- Defects found by the executable UAT and fixed: snapshot docs basename
  matching for real file inputs; Home stale registry list; Catalog heading
  identity; registry backend state loss.

## M11 — Human Reader UAT — DELIVERED (v0.15.0)

### Deliver
- Anonymized reader feedback form at `/reader-uat` (8th feature folder
  `features/human-reader/`, new additive `reader-feedback` extension kind);
- JSONL round-report export (local download; no upload, no database);
- explicit human/synthetic separation per ADR-019 in UI and artifact
  (`source: 'human-reader'`);
- carry-forward INC closures: INC-015 (recursive negative-fixtures fallback),
  INC-008 (path-resolution isolation oracle + declared cross-feature exception),
  INC-016 (already fixed by v0.11.0 — closed with evidence).

### UAT
`UAT-M11-01` — executable: `SCN-M11-01-001` (empty submission valid, filled
round fields exact, no IndexedDB/localStorage created, separation labels).

### Notes
- No new dependencies; no fetch; no IndexedDB/Dexie/Orama; page-scoped state
  (`useState`) + `sessionStorage` for the anonymous reader id only.
- The isolation oracle exposed a pre-existing m10.2 cross-feature import
  (capability-catalog → catalog components), now an audited exception tracked
  as INC-M11-001.

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

**Carry-forward INCs (m10.1 → M11)** — all CLOSED in M11 (v0.15.0):
- INC-015 (medium): `validate.py --negative-fixtures` default arg → recursive fallback
- INC-016 (low): `CreateWizard.renderSkeletons` discards output → fixed in v0.11.0 (PR-1), closed with evidence
- INC-008 (low): isolation grep oracle gap → replaced by a path-resolution oracle (M11)
