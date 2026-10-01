# Roadmap — Updated

> **ESTADO: COMPLETADO (2026-10-01, v0.23.0).** Todos los hitos adoptados están
> implementados, integrados y verificados: M10→M15 + cierre de trazabilidad (v0.11.0–v0.20.0),
> M17 Write-capable Control Plane (v0.21.0), cierre del waiver de cross-references (v0.22.0)
> y cierre de la deuda m16 DOC-3/DOC-4 (v0.23.0 — entity refs navegables a /entity/).
> `audit all`: PASS — proven 79 / waived 0 / blocking 0. Canónico: 11/11 escenarios PASS.
> Backlog SDDK: sin ítems vivos (DOC-3/4 promovidos y cerrados en el ciclo
> p-de82af3e9774d9a0/m16-doc-entity-links). **M16 Series Canon** permanece como sección
> condicional del roadmap ("solo con demanda multi-libro real") — es un deferral del propio
> roadmap, no trabajo pendiente. Tags v0.10.0–v0.23.0 locales (sin push autorizado).
> Nota de identidad SDDK: los ciclos hasta v0.22.0 viven en el proyecto p-7c4aff45199a2069
> (identidad por fallback seed); desde v0.23.0 la identidad canónica es p-de82af3e9774d9a0
> (derivada del remote; checkout fijado con .sddk/project-pin.json).
>
> Ciclo deuda v0.23.1 (debt-evidence-integrity): M11 Human Reader UAT restaurado al
> inventario de trazabilidad (+4 REQ PROVEN), guard de frescura del registry en `audit all`,
> sha256 build-time en capability-catalog y dead code eliminado. `audit all`: PASS —
> proven 83 / waived 0 / blocking 0.

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

## M12 — Sequential Art Core — DELIVERED (v0.16.0)

### Deliver
- Deterministic chapter-beats → SequentialArtIR adapter validated against
  `specs/sequential-ir.schema.json` (8–10 pages target, reading order,
  scene-break gutters, deterministic shotRefs, dialogue as editable text);
- panel storyboard page `/storyboard` (pages/panels grid, reading-order
  badges, scene breaks, direction, ZERO `<img>` per UAT-M12-01);
- sequential graph lens (one node per panel, sequence edges, importance
  weighting, scene-break gaps).

### UAT
`UAT-M12-01` — executable: `SCN-M12-01-001` (10 pages / 33 panels probe,
strictly increasing order, dialogue in DOM, imgCount 0, lens nodes/edges).

### Notes
- Prose-to-beat extraction is a future skill; the beat contract
  (`ChapterManuscript`) is the authoring surface. Sample chapter fixture is
  labeled in the UI. Balloon placement stays template-based (doc 11).

## M13 — Comic Renderer — DELIVERED (v0.17.0)

### Deliver (original definition)
- panel templates (deterministic grid rects from the page layout);
- layered image composition (art layer with placeholder slots tagged by
  shotRef + separate lettering layer — no image generation in this milestone);
- lettering layer (all dialogue/captions as editable SVG `<text>`);
- balloons/captions (template placement, doc 11);
- CBZ proof (store-mode zip, no new deps: one SVG page per IR page +
  ComicInfo.xml).

### Exit
"produce comic proof with editable text not baked by the image model" —
verified: the proof contains no `<image>` and no rasterized text; dialogue is
searchable in the stored CBZ bytes; art/lettering toggles prove separation.

### UAT
`uat/UAT-M13-01.md` authored this cycle — executable as `SCN-M13-01-001`.

### Notes
- The renderer takes a `PresentationProfile` from day one (M14 adds the manga
  profile against the same sequential source).

## M14 — Manga Profile — DELIVERED (v0.18.0)

### Deliver (original definition)
- RTL reading direction (doc 11 §Reading direction: manga `rtl`);
- monochrome/screentone settings (deterministic SVG dot-grid pattern fill);
- manga visual/editorial profile (`MANGA_PROFILE` over the same engine).

### Exit
"same sequential source can be rendered through distinct comic vs manga
presentation profiles" — verified: `SCN-M14-01-001` renders the SAME
SequentialArtIR through both profiles (switcher on `/comic`): manga declares
`data-direction="rtl"`, mirrors panel 0 to the rightmost column, fills art
slots via the screentone `<pattern>`, uses a grayscale-only palette, and the
narrative lettering is identical across profiles; a CBZ proof is exported per
profile with profile-marked pages.

### UAT
`uat/UAT-M14-01.md` authored this cycle — executable as `SCN-M14-01-001`.

### Notes
- Comic profile output is byte-compatible with M13 (flat fills, LTR grid,
  M13 palette) — regression-locked by unit tests.
- Lettering/meta colors were lifted from svg.ts hardcodes into the profile
  (`captionStroke/textFill/captionTextFill/metaFill`) so the manga
  monochrome guarantee holds without touching comic bytes.
- Balloon placement stays template-based; reading direction only mirrors the
  grid columns (rows read top-down in both directions).

## M15 — Digital Publishing — DELIVERED (v0.19.0)

### Deliver (original definition)
- EPUB reflowable (prose chapters from the ChapterManuscript: scene beats as
  prose, dialogue as real text, EPUB 3 nav/OPF/spine);
- fixed-layout experiment (pre-paginated pages embedding the comic renderer's
  layered SVG pages — rendition meta, svg properties, viewport per page);
- validation adapters (deterministic reader-entry contract: OCF layout,
  container→OPF resolution, metadata, manifest↔zip correspondence, spine
  resolution; product-side `validateEpub` + harness `epub-entries` oracle).

### Exit
"artifacts open correctly in agreed reference readers" — verified at the
reader-entry contract level: both EPUBs built from the same sample chapter
pass `validateEpub` on `/publish` (downloads stay disabled otherwise) and
satisfy `SCN-M15-01-001`'s `epub-entries` oracles (mimetype first + exact
content, container→OPF, pre-paginated rendition with svg pages, dialogue
searchable in stored bytes).

### UAT
`uat/UAT-M15-01.md` authored this cycle — executable as `SCN-M15-01-001`.

### Notes
- The store-mode zip builder moved to `src/lib/store-zip.ts` (generic
  infrastructure); comic-renderer re-exports it for compatibility.
- The runtime edge `epub → comic-renderer` is declared in the isolation
  allowlist (doc 14: publishing adapters compose presentation output).
- Structural conformance only — no epubcheck/JVM claim; third-party reader
  rendering quality is explicitly out of the proof.

## M16 — Series Canon

Add future catalog hierarchy only now:

```text
Universe
 -> Series
 -> NarrativeProject
 -> Edition
```

Do not create these abstractions earlier without need.

## M17 — Write-capable Control Plane — DELIVERED (v0.21.0)

### Deliver (original definition)
- approve / reject / comment / regeneration request — as OUTBOUND
  decision-command records (`specs/cp-commands.schema.json`,
  `control-plane/commands/v1`): one record per file, validated against the
  schema before write, discriminated payloads (subjectDecision/rationale,
  comment text, regeneration reason + scope).
- Architecture honored: filesystem decision/command records — FSA directory
  sink writes `commands/<id>.json` into the user-picked directory, download
  fallback otherwise. No persistent backend, no network, no store mutation.
- `/decisions` view: lists the loaded cp-decisions projection with per-decision
  action buttons prefilling the composer; standalone composer for arbitrary
  EntityRefs; store round-trip no-op preserved.

### Exit
"write-capable surface proven end-to-end": `SCN-M17-01-001` loads the golden
snapshot, probes rows/statuses/prefill, emits approve + regenerate records and
asserts schema conformance (`schema` oracle, now draft 2020-12 capable) and
exact payload fields (`jsonl-entry` oracle, id/createdAt declared non-semantic).

### UAT
`uat/UAT-M17-01.md` authored this cycle — executable as `SCN-M17-01-001`.

### Notes
- cp-commands is deliberately NOT referenced from the control-plane envelope
  `$defs` — the envelope describes a loaded project; commands are outbound
  artifacts (negative-reachability test enforces this).
- Harness fixes delivered with the cycle: `schema` oracle accepts draft
  2020-12; `verify --tag dev` gives scenario-under-construction runs a
  non-canonical tag (VAH-014 canonical history stays clean);
  `audit flakiness` now applies the same canonical filter as the hardening test.

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
