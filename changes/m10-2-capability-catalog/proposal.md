# Proposal: m10-2-capability-catalog — Capability Catalog (M10.2 — read-only CP projections/pages for Skills, Packs, Profiles, Comfy workflows, Image providers, Recipes)

- **Change id**: `m10-2-capability-catalog`
- **Cycle**: `p-7c4aff45199a2069/m10-2-capability-catalog`
- **Roadmap anchor**: `docs/19-ROADMAP.md` § M10.2 ("Catalog projections/pages for Skills; Packs; Profiles; Comfy workflows; image providers/capabilities; recipes. Make the Studio explain the creative toolchain as well as individual books.").
- **Conceptual design**: `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog, M10.2" (lists entity kinds `Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`); §"Capability Catalog" workflow example (lines 175-198) — the target rendering template.
- **ADR bindings**: ADR-021 (catalog projection — `CatalogEntity` slot reused for capability kinds); ADR-022 (extension model — capabilities integrate via the existing Extension Registry); ADR-024 (client-side federated catalog — capabilities are read-only CP aggregates over a single project snapshot, NOT multi-project federation, which is M10.3 territory and Dexie-blocked).
- **Stack binding**: `docs/28-CONTROL-PLANE-STACK.md` (Vite 8.2.2 / React 19.2.8 / TanStack Router 1.170.32 / Tailwind 4.3.3 / Ajv 8.20.0 / Vitest 4.1.11 baseline); `import.meta.glob` for build-time static file enumeration (Vite 8.2 supports `?raw` and `?url` import suffixes — the m16 precedent at `docs/32-NARRATIVE-DOCS-SEARCH.md` §"Index persistence" confirms in-memory only).
- **Reference patterns consumed (read-only; not reinvented)**:
  - m16 `control-plane/src/features/catalog/entity/{EntityHeader,MetadataCard,RelationsList,index}.tsx` — read-only entity projection. M10.2 reuses `EntityHeader` + `MetadataCard` + `RelationsList` as the per-entity detail view; `features/capability-catalog/` does NOT duplicate them (reuse from m16).
  - m16 `control-plane/src/features/docs/{docsSafeMarkdown.tsx,entityLinkPlugin.ts}` — GFM-safe Markdown renderer (`react-markdown` + `rehype-sanitize` + `remark-gfm`); already pinned for `examples/skills/<id>/SKILL.md` and the pack `.md` files in `recipes/<id>/skeleton/packs/<id>/*.md`. M10.2 REUSES verbatim.
  - m10.1 `tools/narrative-recipes/recipe_loader.py` + `control-plane/src/recipes/recipeLoader.ts` — already load `recipes/<id>/recipe.yaml` + `parameters.schema.json` + `skeleton/`. M10.2 REUSES for the recipe-kind enumeration; extends minimally to enumerate `recipes/` rather than load a single recipe.
  - m10.1 `recipes/middle-grade-illustrated/` — bundled recipe (canonical V1 fixture for the Recipe capability).
- **Baseline**: branch `feat/m10-2-capability-catalog` HEAD `6c7a7aed09c74773cb2bd6e614336fe621d259aa` (one commit past the orchestrator-stated `364571c5e9685cc86775aed4e425d87e0e380e05`: the `chore(roadmap): serialize m10.2 capability-catalog cycle as in_progress` roadmap marker — **not** a content change).
- **Target branch** (apply): `feat/m10-2-capability-catalog` (cycle-local branch; no separate apply branch).
- **Path**: A-lite, execution mode `auto`; **version target**: **v0.10.0 (MINOR)** — new capability surface (`capability-catalog`) is evolution of the v0.9.0 surface, not net-new product area. 0 new pinned deps expected (everything is `import.meta.glob` + already-pinned dependencies); 0 new ADRs.
- **Rounds**: 1 (m10.2; M10.3 multi-project is a separate future cycle, blocked by m10 invariant on Dexie/IndexedDB).
- **UAT gate**: `uat/UAT-M10-06-capability-catalog.md` (to be authored by sddk-spec phase per the precedent at `uat/UAT-M10-04-creation-recipe.md` and `uat/UAT-M10-03-local-search-docs.md`).

## Intent

Close the binding gate `uat/UAT-M10-06-capability-catalog.md`: **Given** a loaded project snapshot **When** the user navigates to `/capabilities` (overview) **Then** six kind sections render (Skills, Packs, Profiles, Comfy Workflows, Image Providers, Recipes) — each enumerated from the on-disk file tree via build-time `import.meta.glob` — and drilling into `/capabilities/{kind}/{namespace}/{name}` renders a read-only entity page using the m16 `catalog/entity` projection pattern (header + metadata + relations); **Pass** = every kind renders ≥ 1 entry from the bundled seed data + no `fetch(`, no Dexie/IndexedDB, no `useProjectionStore` write paths, and the catalog reads do not mutate `ProjectionBundle`.

`docs/19-ROADMAP.md` § M10.2 lists six kind deliverables. `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog, M10.2" enumerates the entity kinds that the catalog must surface: `Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`. The §"Capability Catalog" prose template (lines 175-198) demonstrates the target rendering pattern: `Workflow: illustration-v4` → Capabilities → Usage → Current hash (sha256).

What is missing is the machine-executable surface:
- **No kind page exists today.** `/catalog` (`control-plane/src/views/Catalog.tsx:7-43`) lists `Project`, `Character`, `Build`, `UATRun` (4 kinds) from `useProjectionStore.catalogEntities` — i.e., the `CatalogEntity` slot populated by `SnapshotProjectSource.loadCatalogEntities`. Capabilities are NOT in the catalog entity slot today; they live in markdown/yaml/json files outside that slot.
- **No topology for capabilities.** m15/m16 chose one view per kind-aggregate (`/catalog`); M10.2 must decide: one `/capabilities` overview + 6 per-kind detail pages? One `/capabilities` with kind-filtered sections? Tabs? Each has different reuse implications for the m16 `EntityHeader`/`MetadataCard`/`RelationsList` projection.
- **No static discovery mechanism.** The capability files live in three different trees:
  - `examples/skills/<id>/SKILL.md` (markdown with open Agent Skills structure per `docs/07-SKILLS-PACKS.md:9-19`)
  - `recipes/<id>/skeleton/packs/<id>/*.md` AND `examples/packs/*.md` (markdown — but the second location has 0 actual files today; the m10.1 cycle DID NOT create `examples/packs/`)
  - `examples/<id>.yaml` AND `recipes/<id>/skeleton/profiles/*.yaml` (YAML `profile/v1` per `specs/profile.schema.json`)
  - `control-plane/workflows/comfyui/*.workflow.json` (JSON `workflow/v1`)
  - `recipes/<id>/recipe.yaml` (YAML `creation-recipe/v1` per `specs/creation-recipe.schema.json`)
  - 0 image-provider files (schema-only — `specs/provider-capability.schema.json` exists; no instance data)
- **No image-provider capability samples.** `specs/provider-capability.schema.json` exists with the full provider-neutral shape (RE-IMG-7, ADR-011), but ZERO instances exist on disk today (`examples/` has no `*.provider.yaml` or similar). This is a fundamental data-coverage question the proposal must resolve.
- **No cross-capability navigation.** A user looking at the `character-consistency` skill cannot today drill to "what packs power it?" or "what profiles consume it?" — the M10.2 goal "make the Studio explain the creative toolchain" requires explicit cross-kind links.

This change closes all five gaps in one reviewable A-lite cycle, adds **ONE NEW capability surface** (`capability-catalog`) and **MODIFIES no spec surface** (capabilities are projections over existing schemas + existing files; no new schemas required), and ships a **read-only build-time catalog** that surfaces the creative toolchain as first-class catalog entities.

### Data coverage (TODAY vs what should exist for v0.10.0)

| Capability kind | TODAY's count + sources | v0.10.0 minimum count | Delta required |
|---|---|---|---|
| **Skills** | 3 (`examples/skills/{character-consistency,narrative-arc,scene-validator}/SKILL.md`) | 3 (no change — already present per `docs/07-SKILLS-PACKS.md:42-87` initial skill families; V1 ships the 3 existing ones only) | NONE |
| **Packs** | 4 pack-KINDS × 1 markdown file each (story_core/story_intake.md, characters/character_design.md, editorial/editorial_pass.md, visual_core/visual_bible_seed.md) at `recipes/middle-grade-illustrated/skeleton/packs/` — total 4 markdown files in 4 pack directories. ALSO 0 files at `examples/packs/` (m10.1 DID NOT create this path; `docs/07-SKILLS-PACKS.md:106-127` lists 12 pack kinds as design intent). | 4 pack-KINDS rendered (the existing 4 inside the bundled recipe skeleton) | NONE for V1; deferred to a future pack-authoring cycle |
| **Profiles** | 1 at `examples/middle-grade-profile.yaml` + 1 at `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` (the same profile authored in two scopes) | 2 (both — V1 surfaces project-scoped + global profiles distinctly per Decision 3) | NONE — V1 surfaces both as authored |
| **Comfy workflows** | 1 (`control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json`) | 1 (no change) | NONE |
| **Image providers** | 0 actual instances; schema-only (`specs/provider-capability.schema.json`) | 0 (no change — see Decision 4) | NONE for V1; V1 ships a "no providers configured — see `specs/provider-capability.schema.json`" prompt per Decision 4 |
| **Recipes** | 1 (`recipes/middle-grade-illustrated/recipe.yaml`) | 1 (no change) | NONE |

**Net delta for v0.10.0**: zero new files in `examples/`, `specs/`, `control-plane/workflows/`, or `recipes/`. The cycle is **purely projection + UI**; no schema modifications, no new instances, no new dependencies. This is the smallest viable M10.2 surface that satisfies the UAT given-clause.

## Scope

### In Scope

**A. Topology decision: per-kind detail pages (Option A from Decision 1).**
One `/capabilities` overview page + six per-kind detail pages (`/capabilities/skills`, `/capabilities/packs`, `/capabilities/profiles`, `/capabilities/workflows`, `/capabilities/providers`, `/capabilities/recipes`). Each per-kind page renders the list of capabilities for that kind as a `CatalogEntity[]` projection. Each capability entry on the per-kind page links to a per-entity detail route `/capabilities/$kind/$namespace/$name` that reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` projection. This pattern mirrors the m15 `/catalog` → `/entity/$kind/$namespace/$name` precedent (see `control-plane/src/views/Catalog.tsx:34` and `control-plane/src/routes/router.ts:21-25`).

**B. Build-time static discovery via `import.meta.glob`.**
Capabilities are enumerated at BUILD TIME via Vite's `import.meta.glob` (already a feature of the Vite 8.2.2 build; used by `control-plane/src/features/recipes/useRecipeLoader.ts` per the m10.1 cycle). Three glob patterns:
- `import.meta.glob('/examples/skills/*\/SKILL.md', { query: '?raw', import: 'default', eager: true })` → returns `{ '/examples/skills/character-consistency/SKILL.md': '...raw markdown...' }` keyed by path. Resolves at build time; NO runtime filesystem read; preserves m10 serverless invariant (no `fetch(`; no dynamic import).
- `import.meta.glob('/recipes/*/recipe.yaml', { query: '?raw', import: 'default', eager: true })` → returns raw YAML per recipe.
- `import.meta.glob('/recipes/*/skeleton/profiles/*.yaml', { query: '?raw', import: 'default', eager: true })` → returns raw YAML per skeleton-scoped profile.
- `import.meta.glob('/recipes/*/skeleton/packs/*/*.md', { query: '?raw', import: 'default', eager: true })` → returns raw markdown per skeleton-scoped pack markdown file.
- `import.meta.glob('/control-plane/workflows/comfyui/*.workflow.json', { query: '?raw', import: 'default', eager: true })` → returns raw JSON per workflow.
- `import.meta.glob('/examples/*.yaml', { query: '?raw', import: 'default', eager: true })` — pre-filtered at the loader level to profile-shape YAML only (matching the `profile/v1` schema const).

All six globs produce a **build-time** `CapabilityManifest` (see Decision 2) embedded in the static bundle. Bundle-size impact: ~50KB raw markdown + ~10KB raw YAML/JSON = ~60KB total uncompressed; ~15KB gzipped (well under the post-M10 budget of 1.5MB gzipped per `docs/28` §"Dependency governance").

**C. Single feature folder `features/capability-catalog/` (the 7th independent feature folder).**
Mirrors the m15/m16/m10.1 precedent:
- m15 introduced `features/{story,visual,catalog,continuity}/` (4 feature folders)
- m16 added `features/docs/` (5th)
- m10.1 added `features/recipes/` (6th)
- m10.2 adds `features/capability-catalog/` (7th)

The folder contains:
- `features/capability-catalog/index.tsx` — module-init that registers the 7 new routes + registers per-kind `EntityCardExtension`s against the existing Extension Registry (additive; `apiVersion: 'control-plane.extensions/v1'` preserved per ADR-022).
- `features/capability-catalog/manifest.ts` — pure `CapabilityManifest` type + `loadManifest()` function (reads the 6 `import.meta.glob` results synchronously at module-init; zero runtime I/O).
- `features/capability-catalog/parser.ts` — pure parser functions: `parseSkillMarkdown(raw)`, `parsePackMarkdown(raw, packKind)`, `parseProfileYaml(raw)`, `parseWorkflowJson(raw)`, `parseRecipeYaml(raw)`. Each returns a typed `CapabilityEntry` shape (see Decision 6).
- `features/capability-catalog/useCapabilityManifest.ts` — React hook that returns the manifest from `manifest.ts` (memoized; subscribes to nothing — manifest is static post-build).
- `features/capability-catalog/capabilitySelectors.ts` — pure selectors: `capabilitySelectors.byKind(kind)`, `capabilitySelectors.byEntityRef(ref)`, `capabilitySelectors.crossReferences(ref)` (cross-kind drill-down — Decision 7).
- `features/capability-catalog/views/{Overview,KindList,CapabilityDetail}.tsx` — three small view components.
- `features/capability-catalog/views/CapabilityDetail.tsx` — REUSES `EntityHeader` + `MetadataCard` + `RelationsList` from `features/catalog/entity/` (m16) directly via the existing Extension Registry resolution (`extensionRegistry.resolveEntityCards`). This is the load-bearing reuse: the capability-detail page IS an m16-entity-page; the only difference is the underlying data source is the static `CapabilityManifest`, not the `ProjectionBundle`.

**D. Routes registered (7 new routes; 17 total).**
- `/capabilities` (overview; lists 6 kind sections)
- `/capabilities/skills`
- `/capabilities/packs`
- `/capabilities/profiles`
- `/capabilities/workflows`
- `/capabilities/providers`
- `/capabilities/recipes`

Each per-kind page links to `/capabilities/$kind/$namespace/$name` (1 SHARED parameterized route). **Total new routes = 7 (6 kind + 1 overview) + 1 shared entity route = 8 routes** in `router.ts`. The F-004 oracle list at `control-plane/src/routes/routes.tsx:2-11` is EXTENDED to include the 7 new paths (8 entries added; total routePaths becomes 16).

**E. Reuse from m16 + m10.1 (no reinvention).**
- `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList}.tsx` — REUSED via the Extension Registry. No modifications to these files.
- `features/docs/docsSafeMarkdown.tsx` — REUSED to render `SKILL.md` and pack markdown content on the per-entity detail page.
- `features/docs/entityLinkPlugin.ts` — REUSED; capability docs MAY contain `[[Kind:namespace/name]]` cross-links (e.g., `[[Skill:character-consistency]]` from a pack markdown).
- `recipes/recipeLoader.ts` (m10.1) — the existing recipe loader is sufficient for V1; M10.2 only enumerates recipes via `import.meta.glob('/recipes/*/recipe.yaml')` and parses the result through the existing loader's Ajv validation path. **No modifications** to `recipes/recipeLoader.ts` (it already handles `recipes/<id>/recipe.yaml`; M10.2 just iterates the directory).

**F. CI guards (Decision 8).**
- `tsc --noEmit -p control-plane/tsconfig.json` exit 0
- `pnpm --filter control-plane test` (Vitest) N/N (existing tests + NEW `capability-catalog.spec.ts` + `capability-parsers.spec.ts` + `capability-isolation.spec.ts`)
- `pnpm --filter control-plane build` (Vite static build) succeeds; bundle size impact ≤ 15KB gzipped (the 6 `import.meta.glob` results)
- `python -m ajv.cli validate --schema specs/profile-schema.json --data <profile>` exit 0 for every profile under `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml` (recursive)
- `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/*/recipe.yaml` exit 0 for every recipe (already enforced by m10.1)
- `vite preview` against `golden/control-plane/snapshot-valid/` smoke: `/capabilities` + `/capabilities/skills` + `/capabilities/recipes` render the bundled data
- The `extension-isolation.spec.ts` test 4 grep oracle is **EXTENDED** to include `features/capability-catalog/` in the prohibited cross-folder import list (m16 INC-008 fix precedent; the new feature folder follows the same isolation contract)

**G. Doc updates (first-class per m16/m10.1 precedent).**
- `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog as implemented (m10.2 slice)" — NEW subsection documenting the V1 implementation: 6 kinds, 7 routes, build-time manifest, no-write invariant
- `docs/27-GLOSSARY.md` — add `Capability Manifest (V1)`, `Build-time Static Discovery`, `Cross-capability Drill-down`, `Capability Detail Page`
- `docs/28-CONTROL-PLANE-STACK.md` — note `import.meta.glob` + `?raw` import suffix usage in the catalog feature (no new pins)
- `docs/19-ROADMAP.md` — mark M10.2 done; advance status
- `README.md` — add "Capability Catalog" section under Control Plane
- `MANIFEST.json` — regen following m13/m14/m15/m16/m10.1 precedent
- `uat/UAT-M10-06-capability-catalog.md` — NEW UAT file (orchestrator/cycle creates via sddk-spec per UAT-M10-03/M10-04 precedent)

**H. Fixtures (Capability Manifest sample data for testing).**
- `golden/control-plane/snapshot-valid/capabilities/` — NEW directory containing:
  - `skill-character-consistency.json` — minimal fixture for the 6-kind manifest
  - `skill-narrative-arc.json`
  - `skill-scene-validator.json`
  - `pack-story_core.json`
  - `pack-characters.json`
  - `pack-editorial.json`
  - `pack-visual_core.json`
  - `profile-middle-grade-10-11.json` (global, from `examples/`)
  - `profile-middle-grade-10-11-recipe.json` (project-scoped, from `recipes/.../skeleton/profiles/`)
  - `workflow-sdxl-illustrated-page.json`
  - `recipe-middle-grade-illustrated.json`
  - `providers-empty.json` — explicit empty fixture (Decision 4)
- `control-plane/test/fixtures/capability-manifest-snapshot.ts` — the bundled build-time manifest, exported as a vitest fixture for the `capability-catalog.spec.ts` round-trip tests

### Out of Scope (explicit deferrals)

- **Indexing capability content into search (m16's substring index)** — `docs/32-NARRATIVE-DOCS-SEARCH.md` V1 substring index is out of scope per the cycle intent. Capability discovery on `/capabilities` is by kind-section browse; full-text search across capability content is a future cycle (Decision 6). m16's `useSearchIndex` does NOT need to extend to capability content; if a future cycle wants capability-search, it would extend `searchIndex.build()` to consume the `CapabilityManifest` (out of scope for V1).
- **Authoring/editing capabilities (M17 candidate)** — `docs/19-ROADMAP.md` § M17 explicitly says "Only if read-only Control Plane proves useful." M10.2 is read-only; authoring is M17 territory. The `FileSystemAccessSink` from m10.1 is NOT used.
- **Multi-project capability sharing (M10.3)** — `uat/UAT-M10-05-multi-project-catalog.md` describes the M10.3 surface. M10.3 is BLOCKED by the m10 invariant on Dexie/IndexedDB (the M10.3 plan requires IndexedDB recent-project registry + favorites + multi-project catalog). M10.2 is single-project only; the capability manifest is per-build, not per-user-session.
- **Image-provider capability samples** — Decision 4. V1 ships zero providers; the `/capabilities/providers` page renders an explicit empty state with a pointer to `specs/provider-capability.schema.json` for future authoring.
- **Pack authoring (`examples/packs/`)** — `docs/07-SKILLS-PACKS.md:106-127` lists 12 pack kinds as design intent (story_core, characters, worldbuilding, plot, editorial, audience, visual_core, image_generation, visual_qa, sequential_art, publishing, reader_uat). Today only 4 pack kinds exist (story_core, characters, editorial, visual_core) inside the bundled `recipes/middle-grade-illustrated/skeleton/packs/`. V1 surfaces those 4. Creating additional packs at `examples/packs/<id>/*.md` is a pack-authoring cycle (not in scope).
- **Comfy workflow authoring (`control-plane/workflows/comfyui/*.workflow.json`)** — only 1 workflow exists today. Adding more is workflow-authoring territory (separate cycle).
- **Schema additions for new `Capability` entity kinds** — `specs/catalog-entity.schema.json` ALREADY includes the 6 capability kinds in its `kind` enum (lines 23-30 verified at HEAD): `Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`. NO schema mutation required; the additive-only-schema invariant holds trivially.
- **Capability content search across multiple capabilities** — see "first bullet"; deferred.
- **Capability version history / provenance** — out of scope; recipes have `recipe.lock.json` (m10.1), but skills/packs/profiles/workflows/providers do not have lock files in V1.
- **Workflow execution / provider invocation** — out of scope; `docs/12-IMAGE-PIPELINE.md` describes the runtime invocation path; M10.2 only surfaces the *catalog* of workflows + providers, not their runtime.
- **Telemetry / analytics on capability consumption** — deferred.
- **Studio Home integration** — the M10.3 multi-project Home is out of scope; M10.2 does not integrate with Home widgets.
- **Capability export (e.g. download as a tarball)** — out of scope; capabilities are read-only catalog entries.

## Capabilities

> CONTRACT with sddk-spec. Vault research: this project has NO capability entries in the vault beyond `capability-m2-init-2026-08-28` (invalidated by m14's Vitest introduction). All capability names below are net-new or additive. **Names MUST be reused verbatim in `{cycle-artifacts-dir}/specs/<name>/spec.md` by sddk-spec.** The cycle adds **1 NEW capability surface** (`capability-catalog`); no existing capability is modified at the spec level.

### New Capabilities

- **`capability-catalog`** — the V1 read-only catalog of creative toolchain capabilities (Skills, Packs, Profiles, Comfy Workflows, Image Providers, Recipes) exposed through the Control Plane. Covers: (i) the 7 new routes registered at `feat/m10-2-capability-catalog` HEAD (`/capabilities` + 6 per-kind pages + 1 shared entity route = 8 new route entries; 17 total in `router.ts`); (ii) the `CapabilityManifest` (Decision 2) — a build-time static manifest produced by 6 `import.meta.glob` calls at module-init; (iii) the 6 parsers (`parseSkillMarkdown`, `parsePackMarkdown`, `parseProfileYaml`, `parseWorkflowJson`, `parseRecipeYaml`, `parseProviderYaml-or-empty`); (iv) the 7th independent feature folder `features/capability-catalog/` mirroring m15/m16/m10.1 isolation pattern; (v) cross-capability drill-down via `capabilitySelectors.crossReferences(ref)` (Decision 7); (vi) reuse of m16 `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList}` and `features/docs/docsSafeMarkdown` for the per-entity detail view; (vii) zero-write invariant — `useProjectionStore` is NEVER imported in `features/capability-catalog/` (m10 invariant; verified by `capability-isolation.spec.ts`); (viii) empty-state UX for the providers section (Decision 4). Backing implementation: `control-plane/src/features/capability-catalog/{index.tsx,manifest.ts,parser.ts,useCapabilityManifest.ts,capabilitySelectors.ts}` + `control-plane/src/features/capability-catalog/views/{Overview,KindList,CapabilityDetail}.tsx` + `golden/control-plane/snapshot-valid/capabilities/*.json` (12 fixtures). NO new schemas; NO new dependencies; NO new ADRs. Three new specs: `capability-catalog.spec.ts` (6-kind enumeration + cross-references + drill-down), `capability-parsers.spec.ts` (5 parsers + 1 empty-state), `capability-isolation.spec.ts` (zero `useProjectionStore` import + zero cross-folder imports + INC-008 grep pattern extension).

### Modified Capabilities

None at the spec level. The 6 capabilities shipped by m14/m15/m16/m10.1 are **consumed but not modified**:

### Unchanged (consumed but not modified at spec level)

- **`catalog-and-entity-pages`** (m15) — `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList,index}.tsx` are REUSED unchanged; the capability detail page resolves them via the existing Extension Registry.
- **`safe-narrative-docs`** (m16) — `features/docs/docsSafeMarkdown.tsx` + `features/docs/entityLinkPlugin.ts` are REUSED unchanged; capability markdown renders through the GFM-safe pipeline with `[[Kind:namespace/name]]` cross-links.
- **`serverless-app-shell`** (m14+m15+m16+m10.1) — 7 new routes are ADDITIVE; F-004 oracle at `control-plane/src/routes/routes.tsx:2-11` is EXTENDED (8 entries added; total 16). The m10.1 `extension-isolation.spec.ts` test 4 grep oracle is EXTENDED to include `features/capability-catalog/` (INC-008 fix precedent).
- **`local-search-index`** (m16) — `useSearchIndex` is NOT extended; the capability manifest is consumed by `/capabilities` browse views, not by the search index. (Future cycle may extend the search index to consume the manifest.)
- **`creation-recipe-system`** + **`recipe-wizard-feature`** (m10.1) — `recipes/recipeLoader.ts` is REUSED unchanged for the recipe-kind enumeration; the wizard is NOT involved.
- **`projection-loader-port`** (m15+m16) — `ProjectionBundle` is NOT extended; capabilities are a separate static manifest, not a projection.
- **`extension-registry`** (m15+m16) — consumed unchanged; new `EntityCardExtension`s for capabilities register via `features/capability-catalog/index.tsx`.
- **`golden-fixture-corpus`** (m14+m15+m16+m10.1) — EXTENDED with 12 new fixture files under `golden/control-plane/snapshot-valid/capabilities/`.
- **`schema-validation-pipeline`** (m14) — NOT extended; no new schemas added.

## Decision Points (the proposal MUST surface these — see top-of-task constraints)

### Decision 1 — Topology: **Option A (one overview + 6 per-kind detail pages)**

**Choice**:
- `/capabilities` — overview page with 6 kind sections (one per kind); each section shows count + first 5 entries + "see all" link to the per-kind page
- `/capabilities/{skills|packs|profiles|workflows|providers|recipes}` — 6 per-kind pages, each rendering the full list of capabilities for that kind
- `/capabilities/$kind/$namespace/$name` — 1 SHARED parameterized entity-detail route (reuses m16's `EntityHeader` + `MetadataCard` + `RelationsList` projection)

**Justification**:
- Option (a) "single `/capabilities` page with kind-filtered sections" is rejected: bundles 6 disparate content types on one page; large page (Skills have ~253 lines for `character-consistency` alone); no clean URL for sharing a specific capability; breaks m15's `/catalog` → `/entity/$kind/$namespace/$name` precedent.
- Option (b) "tab-based single page" is rejected: TanStack Router does not natively do tab-based routing without a query string hack; per-kind URLs are a stronger contract; tab UX would require 6 tabs at all times (poor information density when the user knows what they want).
- Option (c) "only overview + per-entity detail (no per-kind list)" is rejected: forces all kind discovery through one page; loses the "show me all packs" UX; doesn't scale to 100+ capabilities per kind.
- Option (A) — chosen: aligns with m15 `/catalog` (overview + per-kind list) + m16 `/entity/$kind/$namespace/$name` (parameterized detail); URL-shareable per kind; clean separation of concerns; total 8 new routes (7 page routes + 1 shared entity route).

**Invariants honored**:
- **Serverless / no-fetch**: all routes serve from the static bundle; no dynamic content loading per route.
- **No Dexie / IndexedDB / Orama**: capabilities are build-time; no client-side persistence of capability state.
- **No-write Control Plane**: `useProjectionStore` is never imported in `features/capability-catalog/`; the capability detail page renders from `useCapabilityManifest()`, not from `useProjectionStore`.
- **Static build**: `vite build` produces a static bundle; `import.meta.glob` resolves at build time.

### Decision 2 — Discovery mechanism: **Option A (build-time `import.meta.glob`)**

**Choice**: Vite's `import.meta.glob` with `{ query: '?raw', import: 'default', eager: true }` for all 6 capability kinds. The 6 globs are listed in §B above. Each glob returns a synchronous `Record<string, string>` (path → raw content) embedded in the static bundle.

**Justification**:
- Option (a) "file-system glob walk at runtime" is rejected: requires either the File System Access API (requires user-grant per session; clobbers the "instant catalog" UX) or a backend (forbidden by m10 serverless invariant). The m10.1 wizard uses File System Access for SINK writes to user-selected directories; M10.2 has no user-selected directory.
- Option (b) "static index JSON generated at build time" is rejected: requires a build script outside Vite + a custom Vite plugin; `import.meta.glob` is Vite's first-party equivalent with no additional toolchain surface.
- Option (c) "lazy-loaded via dynamic import" is rejected: lazy loading would mean the user waits on a network round-trip to discover capabilities; with `import.meta.glob` the cost is paid once at build time and zero at runtime.
- Option (A) — chosen: Vite first-party; zero new toolchain; bundle-size impact ~15KB gzipped; synchronous at module-init; well-documented Vite feature.

**Bundle-size impact**: 50KB raw markdown + 10KB raw YAML/JSON = 60KB total uncompressed; ~15KB gzipped. Post-M10 budget is 1.5MB gzipped per `docs/28` §"Dependency governance"; M10.2 consumes ~1% of the budget.

**Invariants honored**:
- **Static build**: `import.meta.glob` is a build-time feature; `vite build` resolves the globs and embeds the contents.
- **No-fetch**: the globs return bundled content; no network.
- **No-write**: the globs are read-only at module-init.

### Decision 3 — Profile coverage: **Option B (project-scoped + global profiles grouped distinctly)**

**Choice**: Profiles are enumerated from TWO locations and rendered with a "Scope" badge:
- `examples/*.yaml` — global profiles (the "examples" tree)
- `recipes/<id>/skeleton/profiles/*.yaml` — project-scoped profiles (per-recipe skeleton)

Each profile on `/capabilities/profiles` shows its scope (`global` or `recipe:<recipe-id>`) as a metadata badge. Drill-down to a profile detail page shows the scope in the EntityHeader metadata section.

**Justification**:
- Option (a) "single unified view (project-scoped + global collapsed)" is rejected: collapses semantically distinct scopes; the user cannot tell which profiles are bundled examples vs. per-recipe; `specs/profile-aliases.yaml` already treats the alias as a forward-looking registry, not a flat enumeration.
- Option (c) "only global profiles; project-scoped profiles are reachable only via the recipe detail page" is rejected: projects ARE the unit of work in M10; a user working on `middle-grade-illustrated` reasonably wants to see its skeleton profiles directly.
- Option (B) — chosen: both surfaces visible; scope badge makes the distinction explicit; matches the m15 `CatalogEntity.relations` pattern (per-entity provenance metadata).

**Data coverage today**: 1 global profile (`examples/middle-grade-profile.yaml`) + 1 project-scoped profile (`recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml`). The two are NOT identical files (per `examples/middle-grade-profile.yaml` shape vs `recipes/.../profile-middle-grade-10-11.yaml` — both authored independently; m10.1 author intent: the recipe ships its own canonical skeleton profile, the example tree shows the design intent).

**Invariants honored**: additive-only — no schema mutation; both profile files are validated against the existing `specs/profile.schema.json` (semver-compatible).

### Decision 4 — Image providers handling: **Option B (empty state + schema pointer)**

**Choice**: `/capabilities/providers` renders an explicit empty state with:
- Heading: "No image providers configured"
- Body: "Image provider capabilities are declared against `specs/provider-capability.schema.json` (provider-neutral descriptor, RE-IMG-7, ADR-011). Future authoring lands with the image-provider configuration cycle."
- Pointer link to `docs/12-IMAGE-PIPELINE.md` §"Capability model" for context

**Justification**:
- Option (a) "ship example providers" is rejected: provider instances are deployment/runtime configuration (per `docs/12-IMAGE-PIPELINE.md`); shipping example instances would mislead authors into thinking they are static defaults. Provider authoring belongs to the runtime configuration cycle (M7 territory) — not M10.2 catalog territory.
- Option (c) "generate stub from schema" is rejected: `specs/provider-capability.schema.json` describes a typed shape; generating a "stub" instance would be a synthetic entity with no real provider backing — violates the "catalog is a read-model of real things" principle at `docs/29-NARRATIVE-CATALOG.md:9-13`.
- Option (B) — chosen: explicit empty state honors "catalog is read-model" principle; documents the schema as the authoring target; no synthetic content; defer the provider-instances authoring to the appropriate cycle.

**Empty-state UI**: 6-line message + 1 button linking to `docs/12-IMAGE-PIPELINE.md` (rendered as `<a href="/docs/12-IMAGE-PIPELINE.md" target="_blank" rel="noopener">View Image Pipeline Documentation</a>` — relative path; works under `vite preview`; zero-fetch). The empty state is a fixed fixture in `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` for `capability-catalog.spec.ts` to assert against.

**Invariants honored**: additive-only — no schema mutation; no synthetic entities.

### Decision 5 — Pack ownership: **Option B (project-scoped from recipe skeletons; no `examples/packs/` in V1)**

**Choice**: Packs are enumerated ONLY from `recipes/<id>/skeleton/packs/<pack-id>/*.md` (project-scoped via the bundled recipe). The `examples/packs/` path is NOT created in V1; future pack-authoring cycles may create it.

**Justification**:
- Option (a) "catalog-level packs (a new `examples/packs/<id>/*.md` tree separate from recipes)" is rejected: V1 has no authoring use case; `docs/07-SKILLS-PACKS.md:106-127` lists 12 pack kinds as design intent, but only 4 ship in the bundled recipe; creating `examples/packs/` with 0 files in V1 would be a dead directory.
- Option (c) "only project-scoped; the catalog shows packs grouped under their parent recipe" is rejected: hides packs from the `/capabilities` overview; breaks the "make the Studio explain the toolchain" goal — users want to see packs as first-class capabilities, not as nested recipe children.
- Option (B) — chosen: packs are visible at `/capabilities/packs` with their scope shown (e.g., `recipe:middle-grade-illustrated/story_core`); the catalog treats packs as first-class even when they live under a recipe skeleton; orphan analysis (what happens if `middle-grade-illustrated` is deleted?) is documented in §Risks below.

**Orphan risk mitigation**: A future cycle that deletes `recipes/middle-grade-illustrated/` would orphan the 4 packs. The proposal does NOT add an authoring-cycle delete protection in V1; this is a known limitation recorded as `RISK-R-PACK-ORPHAN` in §Risks. Future pack-authoring cycles will lift packs to `examples/packs/` and remove this risk.

**Pack-kind aggregation**: 4 pack-KINDS today (`story_core`, `characters`, `editorial`, `visual_core`). The `/capabilities/packs` page groups by pack-KIND (not by recipe); each pack-KIND section shows the contributing recipes. E.g., the `story_core` section shows 1 entry: `recipe:middle-grade-illustrated/story_core/story_intake.md`.

**Invariants honored**: additive-only — no `examples/packs/` created; no schema mutation.

### Decision 6 — Cross-capability navigation: **Option A (drill-down via `crossReferences`)**

**Choice**: The `CapabilityManifest` carries cross-kind relations:
- A `Skill` has `crossRefs: { packs: string[]; profiles: string[]; recipes: string[]; workflows: string[] }` (computed at build time from the file-tree topology: a pack under `recipes/<id>/skeleton/packs/<pack-id>/*.md` that mentions the skill in its content; profiles that declare the skill in their `voice.skills` array; etc.)
- A `Profile` has `crossRefs: { recipes: string[] }` (recipes that reference this profile in `project.profiles`)
- A `Pack` has `crossRefs: { recipes: string[]; skills: string[] }` (parent recipe + skills mentioned in the pack markdown)
- A `Workflow` has `crossRefs: { providers: string[] }` (provider providers that mention this workflow — V1 has 0 providers, so empty)
- A `Recipe` has `crossRefs: { skills: string[]; packs: string[]; profiles: string[] }` (all the lists in `recipe.yaml`)
- A `Provider` has `crossRefs: { workflows: string[] }` (V1 empty)

Drill-down: the per-entity detail page (`CapabilityDetail.tsx`) renders an `RelationsList` section for each non-empty `crossRefs` group. Each cross-ref renders as `<Link to="/capabilities/<kind>/<namespace>/<name>">` (TanStack Router; internal navigation; no fetch).

**Justification**:
- Option (a) "no cross-references; users browse by kind" is rejected: fails the "make the Studio explain the toolchain" goal — a user looking at the `character-consistency` skill cannot discover "what packs power it" or "what profiles consume it" without manually opening each pack/profile/recipe. The m15 `RelationsList` (`control-plane/src/features/catalog/entity/RelationsList.tsx:5-21`) is the standard projection for relations; reusing it via cross-refs is the lowest-effort highest-value UX.
- Option (b) "deep content-indexing (parse every skill/pack/recipe for `uses-skill`/`provides-pack` semantic tags)" is rejected: out of scope for V1; would require a content schema addition; the M10.2 cycle is meant to be projection-only.
- Option (A) — chosen: topologically-derived cross-references (file-tree + simple string match in pack markdown); zero content-parsing depth; matches the m16 `[[Kind:namespace/name]]` entity-link rendering via the existing `entityLinkPlugin` if pack markdown authors add explicit cross-links (future enhancement, not enforced in V1).

**Computation cost**: topologically-derived cross-references are computed ONCE at module-init (when `manifest.ts` builds the `CapabilityManifest`); cost is O(n) in the number of capability entries (~10 today). Memoized; no runtime cost.

**Invariants honored**: additive-only — no schema mutation; uses existing `RelationsList` from m16 unchanged.

### Decision 7 — Reuse strategy: **Option A (load-bearing reuse of m16 catalog/entity + docsSafeMarkdown)**

**Choice**: M10.2 does NOT reimplement `EntityHeader`/`MetadataCard`/`RelationsList`/`docsSafeMarkdown`. The `CapabilityDetail.tsx` view:
1. Resolves capability-specific `EntityCardExtension`s registered by `features/capability-catalog/index.tsx` against the existing `extensionRegistry` (per-entity mode)
2. Each capability-kind-specific card (e.g., `SkillCapabilityCard`, `RecipeCapabilityCard`) renders the parsed content through `docsSafeMarkdown` (for markdown capabilities) or as a typed key-value list (for YAML/JSON capabilities)
3. The m16 `RelationsList` is resolved automatically via `extensionRegistry.resolveEntityCards(...)` — no extra wiring

**Justification**:
- Option (a) "load-bearing reuse" — chosen: minimal code; consistent UX; honors the "no reinvention" cycle intent.
- Option (b) "re-implement per-kind" is rejected: duplicates ~150 LoC of m16 entity projection; the cycle intent is "reuse from m16" (see top-of-task constraints).
- Option (c) "no entity-page reuse; render capabilities as plain lists" is rejected: loses the cross-kind navigation (Decision 6); loses the consistent UX with `/catalog` entities.

**Implementation pattern**: each capability-kind registers an `EntityCardExtension` (additive; `kind: 'card'` already in the existing extension model at `control-plane/src/extensions/types.ts:33-42`). The card's `render(ctx)` receives a synthetic `CatalogEntity` constructed from the `CapabilityManifest` entry — the entity has `kind: 'Skill'|'Pack'|'Profile'|'Recipe'|'Workflow'|'Provider'`, `metadata.name`, `metadata.namespace`, `metadata.title`, `metadata.description`, `metadata.annotations`. The m16 `MetadataCard` renders the metadata; `RelationsList` renders the cross-refs.

**Invariants honored**: ADR-022 (extension model); additive `apiVersion: 'control-plane.extensions/v1'` preserved; no new registry kind.

### Decision 8 — CI guards: **tsc 0 + Vitest N/N + Vite build static + ajv-cli profile/recipe validation**

**Choice**:
1. `tsc --noEmit -p control-plane/tsconfig.json` exit 0
2. `pnpm --filter control-plane test` (Vitest) N/N; the new specs `capability-catalog.spec.ts`, `capability-parsers.spec.ts`, `capability-isolation.spec.ts` are part of this run; `extension-isolation.spec.ts` test 4 grep oracle EXTENDED to include `features/capability-catalog/` (INC-008 fix precedent from m16)
3. `pnpm --filter control-plane build` (Vite static build) succeeds; bundle size impact ≤ 15KB gzipped
4. `python -m ajv.cli validate --schema specs/profile.schema.json --data <profile>` exit 0 for every profile under `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml` (recursive; new CI gate specific to M10.2)
5. `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/*/recipe.yaml` exit 0 for every recipe (m10.1 gate continues to enforce)
6. `vite preview` against `golden/control-plane/snapshot-valid/` smoke: `/capabilities`, `/capabilities/skills`, `/capabilities/profiles` render without JS errors; the providers page renders the empty state

**Justification**:
- tsc 0 + Vitest N/N + Vite build static are the m14/m15/m16/m10.1 precedent.
- The ajv-cli profile validation gate is NEW for M10.2; it enforces that every profile enumerated in the catalog is valid against `specs/profile.schema.json`. The recursive walk catches new profiles added to `examples/` or to any `recipes/*/skeleton/profiles/`.
- The bundle-size check is part of the M14 D3 ladder; the 15KB gzipped budget is well below the 1.5MB gzipped post-M10 limit.

## Approach

**Option A** from the decision matrix (per-kind detail pages + build-time static discovery + cross-references + load-bearing reuse of m16 + empty-state for providers). A-lite single reviewable unit with **6 atomic per-block commits** (m15/m16/m10.1 precedent-supported size-exception; A-lite 6-block ceiling NOT exceeded because the new Block PF is pre-flight only, no production code):

| Block | Path | Files | Est. LoC | Risk |
|---|---|---|---|---|
| **PF** Pre-flight — `pnpm view` + `ls` audits to verify Vite 8.2 `import.meta.glob` + `?raw` import suffix are supported; write `$CA/resolved-versions.json`; classify T0/T1/T2 | `$CA/resolved-versions.json` only | 0 in repo | ~30 receipts | Med |
| **0** Manifest + parsers — `manifest.ts` (6 `import.meta.glob` calls + `CapabilityManifest` type) + `parser.ts` (5 parsers + 1 empty-state function) + `useCapabilityManifest.ts` (hook) + `capabilitySelectors.ts` (selectors + `crossReferences`) | `control-plane/src/features/capability-catalog/{manifest,parser,useCapabilityManifest,capabilitySelectors}.ts` + `control-plane/test/{capability-parsers,capability-catalog}.spec.ts` + `golden/control-plane/snapshot-valid/capabilities/*.json` (12 fixtures) + `control-plane/test/fixtures/capability-manifest-snapshot.ts` | ~4 new + 14 new fixtures | ~480 | Med |
| **1** Views — `Overview.tsx` (6 kind sections) + `KindList.tsx` (per-kind list) + `CapabilityDetail.tsx` (entity detail reusing m16 components) | `control-plane/src/features/capability-catalog/views/{Overview,KindList,CapabilityDetail}.tsx` + `control-plane/src/styles.css` (add `.view-capabilities` + `.kind-section-*` styles ~30 LoC) | ~3 new + 1 modified | ~340 | Low |
| **2** Routes + Extension Registry wiring — 7 new routes in `router.ts` + F-004 oracle update in `routes.tsx` (8 entries added; total 16) + 6 new `EntityCardExtension`s in `features/capability-catalog/index.tsx` + `extension-isolation.spec.ts` test 4 grep oracle extended for `features/capability-catalog/` | `control-plane/src/routes/{router.ts,routes.tsx}` + `control-plane/src/features/capability-catalog/index.tsx` + `control-plane/test/extension-isolation.spec.ts` (INC-008 fix precedent) + `control-plane/test/routes-router.spec.ts` (F-004 oracle update: 16 entries) | ~1 new + 4 modified | ~220 | Low |
| **3** Tests + CI guard wiring — `capability-isolation.spec.ts` (zero `useProjectionStore` import + zero cross-folder imports) + ajv-cli profile validation script (`tools/validate-profiles/validate.py`) + GitHub Actions YAML extension OR local-CI `just check` recipe addition (per CI-policy) | `control-plane/test/capability-isolation.spec.ts` + `tools/validate-profiles/validate.py` + `justfile` recipe addition (or `.github/workflows/*.yml` doc update per CI-policy) | ~2 new + 1 modified | ~280 | Low |
| **F** Closeout — `docs/29` §"Capability Catalog as implemented (m10.2 slice)" + `docs/27` 4 new glossary entries + `docs/28` note on `import.meta.glob` + `docs/19` M10.2 done + repo `README.md` Capability Catalog section + `MANIFEST.json` regen + `uat/UAT-M10-06-capability-catalog.md` NEW + `changes/m10-2-capability-catalog/{spec,design,tasks}.md` pre-flight | `docs/{19,27,28,29}-*.md` + `README.md` + `MANIFEST.json` + `uat/UAT-M10-06-capability-catalog.md` + `changes/m10-2-capability-catalog/` | ~10 doc edits + 1 MANIFEST regen + 1 NEW UAT + 3 new change artifacts | ~180 | Low |

Total ~25 new files + ~10 modified files, ~1500 LoC, **0 new pinned deps**, **0 new schemas**, **0 new ADRs**, **1 NEW capability** (capability-catalog), **0 modified capabilities at spec level**, **6+ doc updates (first-class)**, **1 NEW UAT file**. Exceeds the 400-line review budget by ~3.75× — same size-exception treatment M14/M15/M16/m10.1 used. Per-block commits (6) keep individual commit sizes under ~480 LoC (Block 0 largest). A-lite 6-block ceiling NOT exceeded (PF is pre-flight, not a production block).

### m10 invariant compliance map

| Invariant | How honored |
|---|---|
| **Serverless / no-fetch** | All routes serve from the static bundle; `import.meta.glob` resolves at build time; no runtime fetch; no network calls. |
| **No Dexie / IndexedDB / Orama** | No Dexie/IndexedDB introduced. Capability manifest is build-time; no client-side persistence. No Orama (capability content is NOT indexed into search per Decision 6 / out-of-scope). |
| **No-write Control Plane** | `useProjectionStore` is NEVER imported in `features/capability-catalog/`. The capability detail page renders from `useCapabilityManifest()`, not from `useProjectionStore`. `capability-isolation.spec.ts` enforces this with a grep oracle (`grep -rE "from\s+['\"]\.\.\/\.\.\/store\/projectionStore['\"]" control-plane/src/features/capability-catalog/ 2>/dev/null` → 0 hits). |
| **Exact dependency pins** | 0 new runtime deps. All imports use already-pinned dependencies (`react`, `react-dom`, `react-markdown`, `rehype-sanitize`, `remark-gfm`, `@tanstack/react-router`). |
| **Static build path** | `vite build` produces a static bundle. `import.meta.glob` is a build-time Vite feature. No SSR; no server actions. |
| **Additive-only schema evolution** | NO schema file in `specs/` is modified. `specs/catalog-entity.schema.json` already includes the 6 capability kinds in its `kind` enum (verified at HEAD lines 23-30) — no mutation required. `specs/provider-capability.schema.json`, `specs/profile.schema.json`, `specs/creation-recipe.schema.json` are unmodified. The M10.2 cycle is purely projection + UI. |
| **Read-only Control Plane** | No authoring/editing surface. No `FileSystemAccessSink`. No CLI command surface. Pure read-model. |

## Quality Intent

- **Production surfaces**:
  - `control-plane/src/features/capability-catalog/` (7th feature folder; ~12 modules)
  - `control-plane/src/features/capability-catalog/views/{Overview,KindList,CapabilityDetail}.tsx` (3 new views)
  - `control-plane/src/routes/{router.ts,routes.tsx}` (7 new routes; F-004 oracle update)
  - `control-plane/src/extensions/types.ts` (unchanged; consumed)
  - `control-plane/src/styles.css` (3 new CSS classes; ~30 LoC)
  - `golden/control-plane/snapshot-valid/capabilities/*.json` (12 fixtures)
  - `tools/validate-profiles/validate.py` (NEW CI gate; recursive profile schema validation)
  - 3 NEW Vitest specs (`capability-catalog.spec.ts` + `capability-parsers.spec.ts` + `capability-isolation.spec.ts`)
  - 1 EXTENDED Vitest spec (`extension-isolation.spec.ts` test 4 grep oracle extension for `features/capability-catalog/`; INC-008 fix precedent)
  - 1 EXTENDED Vitest spec (`routes-router.spec.ts` F-004 oracle update: 16 entries)
  - Doc updates: `docs/{19,27,28,29}-*.md` + `README.md` + `MANIFEST.json`
  - `uat/UAT-M10-06-capability-catalog.md` (NEW UAT file)
- **Changed public APIs**:
  - 7 new routes registered (`/capabilities` + 6 per-kind pages + 1 shared entity route = 8 routes total in `router.ts`)
  - `routePaths` extended from 8 to 16 entries (F-004 oracle update in `routes.tsx`)
  - 6 new `EntityCardExtension`s registered against the existing Extension Registry (additive; `apiVersion: 'control-plane.extensions/v1'` preserved per ADR-022)
  - `useCapabilityManifest()` hook (NEW React surface; returns the static `CapabilityManifest`)
  - `capabilitySelectors.{byKind,byEntityRef,crossReferences}` (NEW pure selectors)
  - 5 NEW parsers (`parseSkillMarkdown`, `parsePackMarkdown`, `parseProfileYaml`, `parseWorkflowJson`, `parseRecipeYaml`) + 1 NEW empty-state function (`parseProvidersYaml` returning `[]`)
  - `manifest.loadManifest()` (NEW pure function; synchronous at module-init)
  - `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` (NEW explicit empty-state fixture)
- **Readiness dimensions**:
  - **contract completeness** — every route has a component; every component has a feature-folder registration; every capability-kind has a card extension; every fixture has a snapshot-valid location.
  - **internal consistency** — no `specs/*.schema.json` modified (AC-INV-schema binding holds); `MANIFEST.json` regen follows m13/m14/m15/m16/m10.1 precedent; route ordering preserves F-004 oracle pattern (matches m10.1 `/create` and m16 `/search` precedents); `extension-isolation.spec.ts` grep invariant extended to include `features/capability-catalog/` (INC-008 fix precedent).
  - **testability** — 3 NEW Vitest specs + 2 EXTENDED Vitest specs + 1 NEW ajv-cli validate script; the `capability-manifest-snapshot.ts` fixture is the round-trip oracle (the parsed manifest equals the fixture).
  - **security** — `docsSafeMarkdown.tsx` (m16) sanitization allow-list prevents XSS in capability markdown; `import.meta.glob` reads at build time (no runtime user-input paths); no `eval`; no remote code loading; static build preserves AC-INV-serverless.
  - **isolation** — `features/capability-catalog/` does NOT import any other `features/` folder (m15 grep invariant extended; INC-008 fix); `features/capability-catalog/` does NOT import `useProjectionStore` (NEW invariant; `capability-isolation.spec.ts` enforces); the 6 parsers are pure functions with no I/O.
- **Required real boundaries**:
  - `pnpm install --frozen-lockfile && pnpm build && pnpm test` MUST succeed against the real `specs/*.schema.json` files (no schema changes; the existing schemas apply).
  - `vite preview` against `golden/control-plane/snapshot-valid/` MUST serve the SPA and render `/capabilities` with 6 kind sections (Skills: 3 entries; Packs: 4 pack-KIND groups; Profiles: 2 entries; Workflows: 1 entry; Providers: empty state; Recipes: 1 entry).
  - `extension-isolation.spec.ts` MUST find 0 cross-folder imports in `control-plane/src/features/{story,visual,catalog,continuity,docs,recipes,capability-catalog}/` (both direct AND relative-escape patterns) — INC-008 fix extended.
  - `capability-isolation.spec.ts` MUST find 0 imports of `useProjectionStore` in `control-plane/src/features/capability-catalog/` — NEW invariant.
  - `routes-router.spec.ts` MUST assert `routePaths.length === 16` (8 existing + 8 new); `/capabilities`, `/capabilities/skills`, `/capabilities/recipes` are all present.
  - `python -m ajv.cli validate --schema specs/profile.schema.json --data <profile>` MUST exit 0 for every profile under `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml`.
  - `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data <recipe>` MUST exit 0 for every recipe under `recipes/*/recipe.yaml` (m10.1 gate continues to enforce).
  - The capability manifest round-trip: `parseSkillMarkdown(rawSkill) === expectedFixture` for all 3 skills; `parsePackMarkdown(rawPack, kind) === expectedFixture` for all 4 packs; `parseProfileYaml(rawProfile) === expectedFixture` for both profiles; `parseWorkflowJson(rawWorkflow) === expectedFixture`; `parseRecipeYaml(rawRecipe) === expectedFixture`; `parseProvidersYaml(rawProviders) === []`.
  - DevTools Network panel MUST show zero outbound application-API requests after `/capabilities` load (m10 invariant preserved).
  - Bundle size impact MUST be ≤ 15KB gzipped (the 6 `import.meta.glob` results).
  - `control-plane/package.json` declares no new pins; `pnpm install --frozen-lockfile` succeeds on Node 24 LTS.

## Architecture Impact

- **Level**: `local` — M10.2 does not cross the prose-contracts ↔ executable-code seam in a new direction. The capability manifest is purely a projection over existing schemas and existing files. No new schemas; no new dependencies; no new ADRs; no new registry kinds.
- **Evidence**:
  - **Inputs**: `docs/19-ROADMAP.md` § M10.2 (capability kinds enumerated), `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog, M10.2" (entity kinds + workflow example rendering), `docs/07-SKILLS-PACKS.md` (skills structure + pack kinds), `docs/12-IMAGE-PIPELINE.md` §"Capability model" (provider capability shape), `docs/28-CONTROL-PLANE-STACK.md` (Vite 8.2 / React 19.2 / TanStack Router baseline), `specs/catalog-entity.schema.json` (existing 6 capability kinds in `kind` enum at lines 23-30), `specs/profile.schema.json` + `specs/creation-recipe.schema.json` (existing profile + recipe schemas), `specs/provider-capability.schema.json` (existing provider schema), `examples/skills/<id>/SKILL.md` (3 skills), `recipes/middle-grade-illustrated/skeleton/{packs,profiles}/` (4 packs + 1 profile), `examples/middle-grade-profile.yaml` (1 global profile), `recipes/middle-grade-illustrated/recipe.yaml` (1 recipe), `control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json` (1 workflow), m15 `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList}.tsx` (reused), m16 `features/docs/docsSafeMarkdown.tsx` + `entityLinkPlugin.ts` (reused), m10.1 `recipes/recipeLoader.ts` (reused).
  - **Outputs**: NEW `control-plane/src/features/capability-catalog/` (12 modules); NEW `golden/control-plane/snapshot-valid/capabilities/*.json` (12 fixtures); MODIFIED `control-plane/src/routes/{router.ts,routes.tsx}` (7 new routes + F-004 oracle update); MODIFIED `control-plane/src/styles.css` (~30 LoC new CSS); MODIFIED `control-plane/test/extension-isolation.spec.ts` (INC-008 grep oracle extended); MODIFIED `control-plane/test/routes-router.spec.ts` (F-004 oracle update: 16 entries); NEW `control-plane/test/{capability-catalog,capability-parsers,capability-isolation}.spec.ts`; NEW `tools/validate-profiles/validate.py` (CI gate); NEW `uat/UAT-M10-06-capability-catalog.md`; MODIFIED `docs/{19,27,28,29}-*.md`; MODIFIED `README.md`; MODIFIED `MANIFEST.json`.
  - **ADRs consumed (no new ones)**: ADR-021 (catalog projection — `CatalogEntity` slot pattern reused for capability kinds; verified by reading `kind` enum at `specs/catalog-entity.schema.json:23-30`), ADR-022 (extension model — capability cards register against the existing `EntityCardExtension` shape; `apiVersion: 'control-plane.extensions/v1'` preserved verbatim), ADR-024 (client-side federated catalog — M10.2 is single-project, NOT multi-project; the catalog federation boundary is M10.3 territory per `docs/35-CATALOG-PROVIDERS.md` and the m10 invariant on Dexie/IndexedDB).
- **Architecture intent**: no explore-report produced for this cycle (the orchestrator explicitly delegated "do NOT re-research; consume directly"). The decision matrix above (8 decision points) is the canonical intent for design phase to deepen. The fallback table (6 blocks, 6 atomic commits) is the canonical intent for tasks phase. No architectural reversibility decision is introduced by M10.2; no new ADR needed (slot 26/26 reserved per m15/m16 precedent).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `changes/m10-2-capability-catalog/{proposal,spec,design,tasks}.md` | New | The change record (4 files; this proposal + spec + design + tasks) |
| `control-plane/src/features/capability-catalog/index.tsx` | New | Module-init that registers 6 `EntityCardExtension`s against the existing Extension Registry (~80 LoC) |
| `control-plane/src/features/capability-catalog/manifest.ts` | New | 6 `import.meta.glob` calls + `CapabilityManifest` type + `loadManifest()` (~120 LoC) |
| `control-plane/src/features/capability-catalog/parser.ts` | New | 5 parsers + 1 empty-state function (~280 LoC) |
| `control-plane/src/features/capability-catalog/useCapabilityManifest.ts` | New | React hook wrapping `loadManifest()` (~40 LoC) |
| `control-plane/src/features/capability-catalog/capabilitySelectors.ts` | New | `byKind` + `byEntityRef` + `crossReferences` selectors (~80 LoC) |
| `control-plane/src/features/capability-catalog/views/Overview.tsx` | New | `/capabilities` overview page with 6 kind sections (~120 LoC) |
| `control-plane/src/features/capability-catalog/views/KindList.tsx` | New | Per-kind list page (`/capabilities/<kind>`) (~100 LoC) |
| `control-plane/src/features/capability-catalog/views/CapabilityDetail.tsx` | New | Per-entity detail page reusing m16 components via Extension Registry (~140 LoC) |
| `control-plane/src/features/catalog/entity/{EntityHeader,MetadataCard,RelationsList,index}.tsx` | Unmodified | REUSED unchanged from m15/m16 |
| `control-plane/src/features/docs/{docsSafeMarkdown.tsx,entityLinkPlugin.ts}` | Unmodified | REUSED unchanged from m16 |
| `control-plane/src/features/recipes/recipeLoader.ts` | Unmodified | REUSED unchanged from m10.1 |
| `control-plane/src/store/projectionStore.ts` | Unmodified | NOT imported in `features/capability-catalog/` (m10 invariant) |
| `control-plane/src/routes/router.ts` | Modified | Add 7 new routes (overview + 6 per-kind pages; shared entity route) (~30 LoC) |
| `control-plane/src/routes/routes.tsx` | Modified | F-004 oracle update: 8 new entries added; total 16 (~8 LoC) |
| `control-plane/src/styles.css` | Modified | Add `.view-capabilities` + `.kind-section-*` + `.capability-detail-*` styles (~30 LoC) |
| `control-plane/src/extensions/types.ts` | Unmodified | Consumed; no `kind` discriminator added (Decision 7) |
| `control-plane/package.json` | Unmodified | No new deps |
| `control-plane/pnpm-lock.yaml` | Unmodified | No new deps |
| `control-plane/test/capability-catalog.spec.ts` | New | 6-kind enumeration + cross-references + drill-down (~250 LoC) |
| `control-plane/test/capability-parsers.spec.ts` | New | 5 parsers + 1 empty-state (~200 LoC) |
| `control-plane/test/capability-isolation.spec.ts` | New | Zero `useProjectionStore` import + zero cross-folder imports (~120 LoC) |
| `control-plane/test/extension-isolation.spec.ts` | Modified | INC-008 grep oracle extended for `features/capability-catalog/` (~3 LoC) |
| `control-plane/test/routes-router.spec.ts` | Modified | F-004 oracle update: 16 entries (~5 LoC) |
| `control-plane/test/fixtures/capability-manifest-snapshot.ts` | New | Bundled build-time manifest exported for round-trip tests (~100 LoC) |
| `golden/control-plane/snapshot-valid/capabilities/{skill-character-consistency,skill-narrative-arc,skill-scene-validator}.json` | New | 3 skill fixtures |
| `golden/control-plane/snapshot-valid/capabilities/{pack-story_core,pack-characters,pack-editorial,pack-visual_core}.json` | New | 4 pack fixtures |
| `golden/control-plane/snapshot-valid/capabilities/{profile-middle-grade-10-11,profile-middle-grade-10-11-recipe}.json` | New | 2 profile fixtures (global + project-scoped) |
| `golden/control-plane/snapshot-valid/capabilities/workflow-sdxl-illustrated-page.json` | New | 1 workflow fixture |
| `golden/control-plane/snapshot-valid/capabilities/recipe-middle-grade-illustrated.json` | New | 1 recipe fixture |
| `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` | New | Explicit empty-state fixture for the providers page |
| `tools/validate-profiles/validate.py` | New | CI gate: recursive profile schema validation (~60 LoC) |
| `tools/validate-profiles/README.md` | New | Documents the CI gate + invocation (~40 LoC) |
| `uat/UAT-M10-06-capability-catalog.md` | New | NEW UAT file (Given/When/Then/Pass per the M10-04 / M10-03 precedent) |
| `docs/29-NARRATIVE-CATALOG.md` | Modified | NEW §"Capability Catalog as implemented (m10.2 slice)" (~80 LoC) |
| `docs/27-GLOSSARY.md` | Modified | Add `Capability Manifest (V1)`, `Build-time Static Discovery`, `Cross-capability Drill-down`, `Capability Detail Page` (~4 entries) |
| `docs/28-CONTROL-PLANE-STACK.md` | Modified | Note `import.meta.glob` + `?raw` import suffix usage (~10 LoC) |
| `docs/19-ROADMAP.md` | Modified | Mark M10.2 done; advance status (~5 LoC) |
| `README.md` | Modified | Add "Capability Catalog" section under Control Plane (~30 LoC) |
| `MANIFEST.json` | Modified (regen) | + entries for new files; `_meta.regenerated_at` + `_meta.regeneration_reason` per m13/m14/m15/m16/m10.1 precedent |
| `justfile` or `.github/workflows/*.yml` | Modified | Add `validate-profiles` step (per CI-policy: local-CI as source of truth, GitHub Actions as release gate) |
| `specs/`, `examples/`, `recipes/`, `control-plane/workflows/` | UNCHANGED | AC-INV-schema binding holds; no schema mutation; no new instance data |
| `tools/narrative-recipes/`, `tools/narrative-cli/` | UNCHANGED | m10.1 surfaces consumed unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **RISK-R-BUNDLE-SIZE** `import.meta.glob` results inflate bundle beyond the 15KB gzipped budget (e.g., future cycle adds 50+ skills) | MED | Bundle-size check in CI (15KB gzipped cap for the capability manifest); if exceeded, switch to `import.meta.glob` with `import: 'default'` (no `?raw`) and lazy-load markdown at view time (a future M10.2.x cycle); the V1 surface is bounded by today's 10 entries |
| **RISK-R-GLOB-MISS** A capability file is added to a path NOT covered by one of the 6 globs (e.g., a future skill at `examples/skills/<id>/references/foo.md` — the glob matches `<id>/SKILL.md` only) | LOW | The 6 glob patterns are explicit and pinned in `manifest.ts` with comments documenting each pattern's intent; `capability-catalog.spec.ts` asserts the exact count per kind matches the bundled data; future-cycle additions follow the same path convention; the 1-skipped-pattern (skill markdown files OUTSIDE `SKILL.md`) is documented in §Out-of-scope |
| **RISK-R-PACK-ORPHAN** A future cycle deletes `recipes/middle-grade-illustrated/` and orphans the 4 packs | LOW | Documented in Decision 5; the catalog handles orphan packs gracefully (they appear under `recipe:<deleted-recipe-id>/<pack-id>` until manually lifted to `examples/packs/`); a future pack-authoring cycle lifts packs out of recipe skeletons |
| **RISK-R-EMPTY-PROVIDERS** The providers page renders an empty state that users find confusing ("where are the providers?") | LOW | Empty-state UX includes explicit messaging + a pointer to `docs/12-IMAGE-PIPELINE.md`; Decision 4 rationale explicitly addresses this; future M7 cycle adds provider authoring |
| **RISK-R-CROSS-REF-MISMATCH** `crossReferences` topologically-derived cross-refs are stale or incorrect (e.g., a pack markdown no longer mentions a skill that the recipe declares) | LOW | Topological derivation is based on file-tree + simple string match in pack markdown; correctness is verified at module-init; `capability-catalog.spec.ts` asserts the expected cross-refs for the bundled data |
| **RISK-R-DOC-UPDATE** Doc-update obligation adds ~150 LoC across 7+ docs (m15 precedent first-class directive; launch packet "docs discipline mandatory") | HIGH | Block F dedicated closeout block; one task per doc + oracle verifying substantive change (not no-op); `MANIFEST.json` regen follows m13/m14/m15/m16/m10.1 precedent |
| **RISK-R-REVIEW-BUDGET** M10.2 exceeds the 400-line review budget by ~3.75× (~1500 LoC) | HIGH | Same size-exception pattern as m14/m15/m16/m10.1: 6 atomic per-block commits (~480 LoC max per commit, Block 0 largest), review per commit; A-lite 6-block ceiling NOT exceeded (Block PF is pre-flight, not a production block); recorded natural split line (M10.2-i = Blocks 0+1 = manifest + views; M10.2-ii = Blocks 2+3+F = routes + tests + closeout) — do NOT activate without orchestrator override |
| **RISK-R-INC-008** A future contributor injecting `import { foo } from "../../story/character/index"` into `features/capability-catalog/` would not be caught by today's grep oracle | MED | The `extension-isolation.spec.ts` test 4 grep oracle is EXTENDED in Block 2 (Decision 8) to include `features/capability-catalog/` in the prohibited-folder list; matches the m16 INC-008 fix precedent; the new test enforces BEFORE Block 3 (which adds the new feature folder imports) is applied |
| **RISK-R-USEPROJECTIONSTORE** A future contributor imports `useProjectionStore` into `features/capability-catalog/`, breaking the m10 no-write invariant | LOW | The NEW `capability-isolation.spec.ts` (Block 3) asserts zero imports of `useProjectionStore` in `features/capability-catalog/` via a grep oracle; this is a NEW invariant specific to M10.2 (the m10 invariant is generic; this test makes it concrete for the new feature folder) |
| **RISK-R-SCHEMA-DRIFT** A future cycle modifies `specs/profile.schema.json` (adds required fields) and the 2 bundled profiles fail validation | LOW | The `tools/validate-profiles/validate.py` CI gate enforces schema validity at every PR; the additive-only-schema invariant (m10) prevents tightening constraints; the bundled profiles use minimal fields (`schema`, `profileId`, `audience`, `format`, `voice`, optional `guardrails`) |
| **RISK-R-MARKDOWN-INJECTION** A capability markdown file contains malicious content (e.g., `<script>`) that bypasses `docsSafeMarkdown` | LOW | `docsSafeMarkdown.tsx` (m16) has the GFM-safe sanitization allow-list (D6; lines 33-55 of the existing file); `docs-sanitization.spec.ts` (m16) covers OWASP XSS vectors; M10.2 reuses this pipeline verbatim; a NEW `capability-parsers.spec.ts` test asserts that `parseSkillMarkdown` does NOT execute the markdown — it only extracts metadata; rendering goes through `docsSafeMarkdown` |
| **RISK-R-ROUTE-CONFLICT** A future cycle adds a route that conflicts with `/capabilities/$kind/$namespace/$name` (e.g., `/capabilities/audit/...`) | LOW | The shared entity route is parameter-typed (`$kind` + `$namespace` + `$name`); TanStack Router routes are strictly typed; future route additions follow the same `$kind/$namespace/$name` pattern (m15/m16 precedent) |
| **RISK-R-EMPTY-MARKDOWN** A skill markdown file is empty or has only frontmatter; the parser produces an entry with no description | MED | `parseSkillMarkdown` extracts a 200-char excerpt from the first heading or paragraph; empty markdown produces a "no description" placeholder; `capability-parsers.spec.ts` covers the empty case |
| **RISK-R-PIPELINE-FRAGMENTATION** M10.2 reads capability files via `import.meta.glob`, while m10.1 reads recipes via `recipes/recipeLoader.ts` (runtime Ajv + FS); the two discovery paths diverge | MED | Documented in `docs/29` §"Capability Catalog as implemented (m10.2 slice)"; the divergence is intentional (recipes are runtime content; capabilities are static); future cycle may unify via a single `ContentSource` port (out of scope for V1) |

## Rollback Plan

This is content + tooling change with no runtime state. Per the A-lite contract:

1. Every block lands as its own commit:
   - Block PF: `chore(sddk): m10-2-pf-preflight-resolved-versions` (writes `$CA/resolved-versions.json`; no tracked source mutation)
   - Block 0: `feat(control-plane): capability-catalog-manifest-parsers-fixtures` (manifest + parsers + 12 fixtures + 2 specs)
   - Block 1: `feat(control-plane): capability-catalog-views-styles` (3 views + styles)
   - Block 2: `feat(control-plane): capability-catalog-routes-extensions-oracle` (7 routes + 6 EntityCardExtensions + INC-008 + F-004 oracle updates)
   - Block 3: `test(control-plane): capability-isolation-ajv-cli-profile-validation` (1 spec + 1 validate script)
   - Block F: `docs(control-plane): capability-catalog-docs-manifest-stack-closeout` + `chore(manifest): regen-m10-2-entries`
2. Released under tag `v0.10.0` (MINOR bump per semver for incremental capability surface); release notes link to `UAT-M10-06` evidence (`capability-catalog.spec.ts` PASS + `capability-parsers.spec.ts` PASS + `capability-isolation.spec.ts` PASS + `vite preview /capabilities` smoke).
3. **Full rollback**: `git revert v0.9.0..v0.10.0` — or `--no-commit <first>..<last>` for selective revert.
4. **Partial rollback**: each block revertible independently. Block 0's manifest + parsers + fixtures are removable without affecting Blocks 1–F (no views → no consumers of the manifest). Block 1's views are removable without affecting Block 0 (parsers remain as pure functions callable from future tests). Block 2's routes + extensions + oracle updates are removable without affecting Blocks 0+1+3+F (no route → no consumers of the views). Block 3's tests + validate script are removable without affecting Blocks 0–2+F. Block F's doc/MANIFEST updates are removable without affecting Blocks 0–4.
5. **No remote dependency**: no CI integration to undo, no DB migration (Dexie OUT per m10 invariant), no telemetry backend.
6. **No spec-pack mutation**: rollback never reverts `docs/`, `specs/`, `examples/`, `uat/`, `templates/` (the M10.2 cycle is purely projection + UI; no spec changes).

## Dependencies

- **Baseline** `364571c5e9685cc86775aed4e425d87e0e380e05` (post-v0.9.0 m10.1 merge) MUST remain unamended until apply.
- **No schemas modified** by M10.2 (AC-INV-schema binding from m13 cycle still applies; 0 existing schemas are modified, 0 new schemas are added).
- **No new dependencies** — all imports use already-pinned dependencies in `control-plane/package.json`: `react@19.2.8`, `react-dom@19.2.8`, `react-markdown@9.1.0`, `rehype-sanitize@6.0.0`, `remark-gfm@4.0.1`, `@tanstack/react-router@1.170.32`, `ajv@8.20.0`, `tailwindcss@4.3.3`. **Vite 8.2.2** must support `import.meta.glob` with `{ query: '?raw', import: 'default', eager: true }` — confirmed in Vite 8.x documentation (well-known feature since Vite 3.x); verified at PF block.
- **Slice-1 surfaces** (m14 v0.6.0) — `projectionStore`, `ProjectSource` port, `SnapshotProjectSource`, `Ajv` setup, `TanStack Router` 6 routes, `5 placeholder views`, `16-fixture golden corpus`, `5 Vitest specs` — all consumed; the M10.2 cycle does NOT modify the projection store (no `useProjectionStore` import in `features/capability-catalog/`).
- **Slice-2 surfaces** (m15 v0.7.0) — Extension Registry module, feature folders (`features/{story,visual,catalog,continuity}/`), `entityRef` helpers, `catalogSelectors`, `/catalog` + `/entity/...` routes, `views/{Catalog,EntityPage}.tsx` — all consumed; `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList}.tsx` REUSED unchanged.
- **Slice-3a surfaces** (m16 v0.8.0) — search index + safe docs + decision projection + `features/docs/` + `useSearchIndex` hook — consumed; `features/docs/{docsSafeMarkdown.tsx,entityLinkPlugin.ts}` REUSED unchanged; M10.2 does NOT extend the search index to consume the capability manifest.
- **m10.1 surfaces** (m10.1 v0.9.0) — `creation-recipe-system` + `recipe-wizard-feature` + `recipes/recipeLoader.ts` — consumed; the recipe loader is REUSED for the recipe-kind enumeration; the wizard is NOT involved.
- **`docs/28-CONTROL-PLANE-STACK.md` baseline** (Vite 8.2.2 / React 19.2.8 / TanStack Router 1.170.32 / Tailwind 4.3.3 / Ajv 8.20.0 / Vitest 4.1.11) — locked at proposal time; `import.meta.glob` is pre-authorised by Vite 8.2.2; no new pins required.
- **`docs/29-NARRATIVE-CATALOG.md`** §"Capability Catalog, M10.2" + §"Capability Catalog" prose template (lines 175-198) — authoritative for the M10.2 surface.
- **`docs/07-SKILLS-PACKS.md`** §"Agent Skills" (lines 9-19) — authoritative for skill directory layout; `examples/skills/<id>/SKILL.md` is the canonical path.
- **`docs/12-IMAGE-PIPELINE.md`** §"Capability model" (lines 49-67) — authoritative for the provider capability shape; `specs/provider-capability.schema.json` is the canonical schema.
- **`docs/35-CATALOG-PROVIDERS.md`** — authoritative for the M10 client-side federated catalog architecture; M10.2 is single-project, NOT federated.
- **`specs/catalog-entity.schema.json`** lines 23-30 — existing 6 capability kinds (`Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`) in the `kind` enum; M10.2 reuses these without mutation.
- **`specs/profile.schema.json`** — authoritative for profile shape; the ajv-cli validate gate enforces schema validity at CI.
- **`specs/creation-recipe.schema.json`** — authoritative for recipe shape; the m10.1 ajv-cli validate gate (m10.1 Block 4) continues to enforce.

## User-visible surface

### Routes (17 total in `router.ts`; 16 entries in F-004 oracle at `routes.tsx`)

| # | Path | Component | Source | Description |
|---|---|---|---|---|
| 1 | `/` | `SourcePicker` | m14 | Project source picker (landing page) |
| 2 | `/overview` | `Overview` | m14 | Project overview (loaded project) |
| 3 | `/story` | `Story` | m14 | Story placeholder view |
| 4 | `/visual` | `Visual` | m14 | Visual placeholder view |
| 5 | `/qa` | `QA` | m14 | QA placeholder view |
| 6 | `/history` | `History` | m14 | History placeholder view |
| 7 | `/search` | `Search` | m16 | Local search (5 result types) |
| 8 | `/catalog` | `Catalog` | m15 | Catalog (4 entity kinds) |
| 9 | `/entity/$kind/$namespace/$name` | `EntityPage` | m15 | Per-entity detail page |
| 10 | `/create` | `Create` | m10.1 | RJSF recipe wizard |
| **11** | **`/capabilities`** | **`Overview`** (M10.2) | **M10.2** | **Capability overview (6 kind sections)** |
| **12** | **`/capabilities/skills`** | **`KindList`** (M10.2) | **M10.2** | **Skills list page** |
| **13** | **`/capabilities/packs`** | **`KindList`** (M10.2) | **M10.2** | **Packs list page (grouped by pack-KIND)** |
| **14** | **`/capabilities/profiles`** | **`KindList`** (M10.2) | **M10.2** | **Profiles list page (with scope badges)** |
| **15** | **`/capabilities/workflows`** | **`KindList`** (M10.2) | **M10.2** | **Comfy workflows list page** |
| **16** | **`/capabilities/providers`** | **`KindList`** (M10.2) | **M10.2** | **Image providers list page (empty state)** |
| **17** | **`/capabilities/recipes`** | **`KindList`** (M10.2) | **M10.2** | **Recipes list page** |
| **18** | **`/capabilities/$kind/$namespace/$name`** | **`CapabilityDetail`** (M10.2) | **M10.2** | **Per-capability detail page (reuses m16 components)** |

Total: 18 routes registered in `router.ts`. The F-004 oracle list at `routes.tsx:2-11` is EXTENDED from 8 entries to 16 entries (one entry per route that is NOT `/entity/...` or `/capabilities/$kind/...` (the parameterized routes are not in the F-004 list per the m15 precedent at `routes.tsx`)).

### Data flows

#### 1. Build-time static discovery

```text
Vite build
  └─ import.meta.glob('/examples/skills/*\/SKILL.md', { query: '?raw', eager: true })
       └─ { '/examples/skills/character-consistency/SKILL.md': '...raw markdown...' }
  └─ import.meta.glob('/recipes/*/recipe.yaml', { query: '?raw', eager: true })
  └─ import.meta.glob('/recipes/*/skeleton/profiles/*.yaml', { query: '?raw', eager: true })
  └─ import.meta.glob('/recipes/*/skeleton/packs/*/*.md', { query: '?raw', eager: true })
  └─ import.meta.glob('/control-plane/workflows/comfyui/*.workflow.json', { query: '?raw', eager: true })
  └─ import.meta.glob('/examples/*.yaml', { query: '?raw', eager: true })
  └─ manifest.ts: buildCapabilityManifest(globs) → CapabilityManifest
       └─ static, embedded in bundle, ~15KB gzipped
```

#### 2. Capability overview render (`/capabilities`)

```text
Route /capabilities → Overview.tsx
  └─ useCapabilityManifest() → CapabilityManifest
  └─ capabilitySelectors.byKind('Skill') → [skill1, skill2, skill3]
  └─ capabilitySelectors.byKind('Pack') → [pack1, pack2, pack3, pack4]
  └─ ... (6 kinds)
  └─ render <KindSection kind='Skill' entries={[skill1, ...]} />
       └─ for each entry: <Link to="/capabilities/skill/<namespace>/<name>">namespace/name</Link>
       └─ "see all" link → /capabilities/skills
```

#### 3. Per-kind list render (`/capabilities/<kind>`)

```text
Route /capabilities/<kind> → KindList.tsx
  └─ useCapabilityManifest() → CapabilityManifest
  └─ capabilitySelectors.byKind(<kind>) → CapabilityEntry[]
  └─ for each entry: <Link to="/capabilities/<kind>/<namespace>/<name>">
       └─ EntityHeader rendering (namespace/name)
       └─ MetadataCard rendering (scope badge for profiles; pack-KIND for packs; etc.)
  └─ for providers kind with 0 entries: render <EmptyState providers-empty />
```

#### 4. Per-capability detail render (`/capabilities/$kind/$namespace/$name`)

```text
Route /capabilities/$kind/$namespace/$name → CapabilityDetail.tsx
  └─ useCapabilityManifest() → CapabilityManifest
  └─ capabilitySelectors.byEntityRef({ kind, namespace, name }) → CapabilityEntry | undefined
  └─ if undefined: render <NotFound />
  └─ else: render <EntityPage entity={synthesizeCatalogEntity(entry)} />
       └─ extensionRegistry.resolveEntityTabs(entity) → [tab1, tab2, ...]
            └─ tab for Skill renders SkillCapabilityCard
            └─ tab for Profile renders ProfileCapabilityCard
            └─ ... (6 kind-specific tabs registered by features/capability-catalog/index.tsx)
       └─ extensionRegistry.resolveEntityCards(entity) → [card1, card2, ...]
            └─ EntityHeader (m15; reused) renders kind/namespace/name
            └─ MetadataCard (m15; reused) renders metadata + annotations
            └─ RelationsList (m15; reused) renders cross-references
                 └─ for each cross-reference group (e.g., 'packs', 'profiles'):
                      └─ for each ref: <Link to="/capabilities/<kind>/<ns>/<name>">
```

### UI components (3 NEW views + 1 shared card module)

| Component | Source | Description |
|---|---|---|
| `Overview` | `features/capability-catalog/views/Overview.tsx` | 6 kind sections; each shows count + first 5 entries + "see all" |
| `KindList` | `features/capability-catalog/views/KindList.tsx` | Full list of capabilities for one kind; supports scope badges (profiles) + pack-KIND grouping (packs) + empty state (providers) |
| `CapabilityDetail` | `features/capability-catalog/views/CapabilityDetail.tsx` | Per-entity detail; reuses m16 `EntityHeader` + `MetadataCard` + `RelationsList` via Extension Registry; renders markdown content via `docsSafeMarkdown` |
| `index.tsx` | `features/capability-catalog/index.tsx` | Module-init that registers 6 `EntityCardExtension`s (one per kind) against the existing Extension Registry |

### Capabilities enumerated (V1 surface)

| Kind | Count | Source | Rendering |
|---|---|---|---|
| Skills | 3 | `examples/skills/{character-consistency,narrative-arc,scene-validator}/SKILL.md` | `docsSafeMarkdown` for full SKILL.md; `EntityHeader` for name; `RelationsList` for cross-refs |
| Packs | 4 (KINDs) / 4 (files) | `recipes/middle-grade-illustrated/skeleton/packs/{story_core,characters,editorial,visual_core}/*.md` | `docsSafeMarkdown` for pack markdown; `EntityHeader` for pack-KIND + scope badge |
| Profiles | 2 (1 global + 1 project-scoped) | `examples/middle-grade-profile.yaml` + `recipes/.../skeleton/profiles/profile-middle-grade-10-11.yaml` | Key-value list for YAML; `EntityHeader` + scope badge |
| Comfy Workflows | 1 | `control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json` | Key-value list for JSON; `EntityHeader` |
| Image Providers | 0 | (none) | Empty state with pointer to `docs/12-IMAGE-PIPELINE.md` |
| Recipes | 1 | `recipes/middle-grade-illustrated/recipe.yaml` | Key-value list for YAML (mirrors the m10.1 CreateWizard form); `EntityHeader` |

**Total: 11 capability entries** (3 + 4 + 2 + 1 + 0 + 1 = 11).

## Acceptance criteria (UAT-M10-06-N)

The following 5 acceptance criteria will be codified in `uat/UAT-M10-06-capability-catalog.md` during the sddk-spec phase. They are listed here per the top-of-task constraints. **At least one (AC-06-03) is a round-trip / no-op proof (catalog reads should not mutate state).**

### UAT-M10-06-01 — Overview renders 6 kind sections

**Given** a project with the bundled seed data (3 skills, 4 packs, 2 profiles, 1 workflow, 0 providers, 1 recipe)

**When** the user navigates to `/capabilities`

**Then** the page renders 6 kind sections, each showing the count and the first 5 entries (with a "see all" link if the kind has more than 5 entries)

**Pass**:
- The page shows the "Skills" section with 3 entries (all 3 fit in the "first 5" preview; no "see all" link)
- The page shows the "Packs" section with 4 entries grouped by pack-KIND
- The page shows the "Profiles" section with 2 entries (1 global, 1 project-scoped)
- The page shows the "Comfy Workflows" section with 1 entry
- The page shows the "Image Providers" section with a "0 providers configured" message (empty state)
- The page shows the "Recipes" section with 1 entry

**Verifiable proof clause**: `vite preview /capabilities` renders the page; `capability-catalog.spec.ts` test "overview renders 6 kind sections" PASS.

### UAT-M10-06-02 — Per-kind list renders all entries

**Given** a project with the bundled seed data

**When** the user navigates to `/capabilities/skills` (or `packs` / `profiles` / `workflows` / `providers` / `recipes`)

**Then** the per-kind list renders all entries for that kind with metadata badges (scope for profiles; pack-KIND for packs)

**Pass**:
- `/capabilities/skills` lists all 3 skills
- `/capabilities/packs` lists all 4 packs (grouped by pack-KIND)
- `/capabilities/profiles` lists both profiles with scope badges (`global` and `recipe:middle-grade-illustrated`)
- `/capabilities/workflows` lists the 1 workflow
- `/capabilities/providers` renders the empty state with a pointer to `docs/12-IMAGE-PIPELINE.md`
- `/capabilities/recipes` lists the 1 recipe

**Verifiable proof clause**: 6 Vitest tests in `capability-catalog.spec.ts` (one per kind) PASS; `routes-router.spec.ts` test "all 6 per-kind routes registered" PASS.

### UAT-M10-06-03 — Round-trip: catalog reads do NOT mutate state

**Given** a loaded project with `useProjectionStore.status === 'loaded'`, `useProjectionStore.bundle` populated, `useProjectionStore.catalogEntities` populated (e.g., the bundled 4 entity kinds from `golden/control-plane/snapshot-valid/`)

**When** the user navigates through all 8 new M10.2 routes (`/capabilities`, the 6 per-kind pages, and a sample `/capabilities/skill/examples/character-consistency` detail page)

**Then** the `useProjectionStore` state is COMPLETELY UNCHANGED:
- `status` remains `'loaded'`
- `bundle` remains the SAME object reference (identity check)
- `catalogEntities` remains the SAME array reference (identity check)
- `diagnostics` remains the SAME array reference
- `sourceLabel` remains the SAME string

**Pass**:
- The M10.2 cycle NEVER imports `useProjectionStore` in `features/capability-catalog/` (verified by `capability-isolation.spec.ts` grep oracle)
- The M10.2 cycle NEVER writes to the projection store (verified by `capability-isolation.spec.ts` state-identity test)
- After navigating through all 8 new routes, `useProjectionStore.getState()` returns the SAME object identity (verified by `capability-isolation.spec.ts` test "projection store identity preserved across navigation")

**Verifiable proof clause**: `capability-isolation.spec.ts` test "projection store identity preserved" PASS; `grep -c "useProjectionStore" control-plane/src/features/capability-catalog/**/*.ts` returns `0`.

### UAT-M10-06-04 — Per-capability detail renders entity projection via m16 reuse

**Given** the bundled `Skill:examples/character-consistency` (or any other capability)

**When** the user navigates to `/capabilities/skill/examples/character-consistency`

**Then** the detail page renders:
1. `EntityHeader` (from `features/catalog/entity/EntityHeader.tsx`) showing `Skill` / `examples` / `character-consistency`
2. `MetadataCard` (from `features/catalog/entity/MetadataCard.tsx`) showing the parsed metadata (description from `SKILL.md` first heading, version, etc.)
3. `RelationsList` (from `features/catalog/entity/RelationsList.tsx`) showing cross-references (e.g., the packs that mention this skill)
4. The full `SKILL.md` content rendered through `docsSafeMarkdown` (m16; GFM-safe; entity-link-aware)

**Pass**:
- The detail page reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` components WITHOUT modification
- The detail page reuses `docsSafeMarkdown` for markdown rendering WITHOUT modification
- The detail page registers an `EntityCardExtension` for the `Skill` kind that renders the parsed skill metadata

**Verifiable proof clause**: `capability-catalog.spec.ts` test "detail page composes m16 components" PASS; `extension-isolation.spec.ts` test "features/capability-catalog/ does not import features/catalog/entity/ directly" PASS (the reuse happens via the Extension Registry, not via direct import — preserves feature-folder isolation).

### UAT-M10-06-05 — Cross-capability drill-down works

**Given** the `Skill:examples/character-consistency` detail page

**When** the user clicks a cross-reference in the `RelationsList` (e.g., a pack that mentions `character-consistency`)

**Then** the user is navigated to the referenced capability's detail page (e.g., `/capabilities/pack/recipe:middle-grade-illustrated/story_core/story_intake`)

**Pass**:
- The `RelationsList` renders cross-references as TanStack Router `<Link>`s (internal navigation; no fetch)
- The cross-references are computed at module-init from the `CapabilityManifest` topology
- The drill-down navigation works without any network requests
- After the drill-down, `useProjectionStore` state is still UNCHANGED (this is a no-op navigation; same as UAT-M10-06-03)

**Verifiable proof clause**: `capability-catalog.spec.ts` test "cross-references resolve to entity detail routes" PASS; `capability-isolation.spec.ts` test "projection store identity preserved after drill-down" PASS.

## Success Criteria

- [ ] **`uat/UAT-M10-06-capability-catalog.md` authored by sddk-spec with all 5 acceptance criteria PASS** (codified by sddk-spec).
- [ ] **`pnpm --filter control-plane build` succeeds** — Vite static build with `import.meta.glob` resolved; bundle size impact ≤ 15KB gzipped.
- [ ] **`pnpm --filter control-plane test` succeeds** — Vitest N/N; the 3 NEW specs (`capability-catalog.spec.ts` + `capability-parsers.spec.ts` + `capability-isolation.spec.ts`) plus the 2 EXTENDED specs (`extension-isolation.spec.ts` + `routes-router.spec.ts`) all PASS.
- [ ] **`pnpm --filter control-plane typecheck` succeeds** — tsc 0 with strict mode.
- [ ] **`python -m ajv.cli validate --schema specs/profile.schema.json --data <profile>` succeeds** for all 2 profiles under `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml`.
- [ ] **`python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data <recipe>` succeeds** for the 1 recipe under `recipes/*/recipe.yaml` (m10.1 gate continues to enforce).
- [ ] **`vite preview` against `golden/control-plane/snapshot-valid/` renders `/capabilities` + 6 per-kind pages + 1 sample detail page without JS errors**.
- [ ] **The M10 invariant is honored** — no `fetch(` in `features/capability-catalog/`; no Dexie/IndexedDB/Orama; `useProjectionStore` is never imported in `features/capability-catalog/`; no new runtime deps; static build; no `specs/*.schema.json` modified.
- [ ] **`docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog as implemented (m10.2 slice)" documents the V1 implementation**.
- [ ] **`MANIFEST.json` regen** follows m13/m14/m15/m16/m10.1 precedent.
- [ ] **`docs/19-ROADMAP.md` marks M10.2 done**; advances status.
- [ ] **No new schemas added**; the existing `specs/catalog-entity.schema.json` `kind` enum covers all 6 capability kinds.
- [ ] **The 7 m10.1 find-patterns continue to hold** — see "Verifications / preempted verifier findings" below.

## Verifications / preempted verifier findings

M10.1 had 15 verifier findings (`verify-findings.json` F-01 through F-16 + SF-01 through SF-02). M10.2 preempts the following analogous findings by construction:

| Pre-empted verifier finding ID | What sddk-verify might look for | How M10.2 preemptively resolves it |
|---|---|---|
| **`V-06-01-routecount`** | sddk-verify asserts `routePaths.length === N` (where N is the expected route count after M10.2) | The `routes-router.spec.ts` oracle is EXPLICITLY updated in Block 2 from 8 entries to 16 entries; the test asserts `routePaths.length === 16` exactly |
| **`V-06-02-cross-folder-imports`** | sddk-verify grep oracle checks `from '../../story/'` (and other feature folders) inside `features/capability-catalog/` | The `extension-isolation.spec.ts` test 4 grep oracle is EXTENDED in Block 2 to include `features/capability-catalog/` in the prohibited list (INC-008 fix precedent from m16) |
| **`V-06-03-no-write-invariant`** | sddk-verify asserts `useProjectionStore` is never imported in `features/capability-catalog/` | The NEW `capability-isolation.spec.ts` (Block 3) grep oracle asserts `0` matches for `useProjectionStore` in `features/capability-catalog/` |
| **`V-06-04-schema-mutation`** | sddk-verify asserts NO `specs/*.schema.json` is modified by M10.2 | The cycle is purely projection + UI; no schema mutations; `MANIFEST.json` shows no schema file modifications |
| **`V-06-05-no-new-deps`** | sddk-verify asserts NO new entries in `control-plane/package.json` dependencies | 0 new pinned deps; all imports use already-pinned dependencies |
| **`V-06-06-static-build`** | sddk-verify asserts `vite build` succeeds and produces a static bundle | The `import.meta.glob` is a Vite first-party build-time feature; `vite build` produces a static bundle; no SSR |
| **`V-06-07-bundle-size-budget`** | sddk-verify asserts bundle size impact ≤ 15KB gzipped | The 6 `import.meta.glob` results are ~15KB gzipped; well below the 1.5MB gzipped post-M10 budget |
| **`V-06-08-fixture-coverage`** | sddk-verify asserts every enumerated capability has a snapshot-valid fixture | 12 NEW fixtures in `golden/control-plane/snapshot-valid/capabilities/`; one per kind (3 skills + 4 packs + 2 profiles + 1 workflow + 0 providers + 1 recipe = 11 enumerated + 1 empty-state fixture = 12 fixtures total) |
| **`V-06-09-doc-discipline`** | sddk-verify asserts doc updates are substantive (not no-op) | Block F dedicated closeout block; one task per doc + oracle verifying substantive change (matches m15/m16/m10.1 precedent) |
| **`V-06-10-cross-language-equivalence`** | sddk-verify might assert that Python and TypeScript produce identical output | M10.2 does NOT have a Python component (no `tools/` additions besides the validate script); the `tools/validate-profiles/validate.py` is a CI gate, NOT a parallel implementation; no cross-language equivalence needed |
| **`V-06-11-route-param-collision`** | sddk-verify might assert the shared `/capabilities/$kind/$namespace/$name` route does not collide with future routes | TanStack Router routes are strictly typed; the `$kind/$namespace/$name` parameter pattern matches m15's `/entity/$kind/$namespace/$name` precedent; future route additions follow the same pattern |
| **`V-06-12-entity-isolation-via-extension-registry`** | sddk-verify might assert the capability detail page does not import `features/catalog/entity/` directly (must use Extension Registry) | The `CapabilityDetail.tsx` view uses `extensionRegistry.resolveEntityCards(...)` to render `EntityHeader` + `MetadataCard` + `RelationsList`; the new `capability-isolation.spec.ts` test asserts no direct imports from `features/catalog/entity/` (this is a NEW isolation invariant specific to M10.2) |
| **`V-06-13-empty-state-coverage`** | sddk-verify might assert the providers empty state is rendered when 0 providers exist | The `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` fixture + the `capability-catalog.spec.ts` test "providers page renders empty state" PASS |
| **`V-06-14-cross-references-completeness`** | sddk-verify might assert `crossReferences` is computed for all capability entries | The `capability-catalog.spec.ts` test "cross-references resolve to entity detail routes" PASS; the topological derivation is verified at module-init |
| **`V-06-15-F-004-oracle-coverage`** | sddk-verify might assert the F-004 oracle at `routes.tsx` covers all new routes | The `routes.tsx` F-004 oracle is EXTENDED in Block 2 with 8 new entries; total 16; the `routes-router.spec.ts` test asserts `routePaths.length === 16` |

## References

### Cycle artifacts (this change)

- This proposal: `changes/m10-2-capability-catalog/proposal.md`
- (To be authored in subsequent phases) `changes/m10-2-capability-catalog/{spec,design,tasks}.md`
- (To be authored) `uat/UAT-M10-06-capability-catalog.md`
- (Cycle artifacts dir) `~/.local/share/sddk/projects/p-7c4aff45199a2069/cycle-artifacts/p-7c4aff45199a2069/m10-2-capability-catalog/`

### Reference cycles (precedents consumed)

- **m16 (slice 3a)**: `changes/m16-cp-studio-search-docs/proposal.md` — search/docs + decision projection pattern
  - Reused: `control-plane/src/features/catalog/entity/{EntityHeader,MetadataCard,RelationsList,index}.tsx` (m15/m16 catalog entity projection)
  - Reused: `control-plane/src/features/docs/{docsSafeMarkdown.tsx,entityLinkPlugin.ts}` (GFM-safe markdown)
  - Pattern reused: INC-008 grep oracle extension for new feature folders
- **m15 (slice 2)**: `changes/m15-cp-catalog-entities/proposal.md` — catalog + entity pages
  - Pattern reused: `/catalog` overview + `/entity/$kind/$namespace/$name` parameterized detail
- **m14 (slice 1)**: `changes/m14-cp-foundation/` — control plane shell + projection loader
  - Pattern reused: F-004 oracle at `routes.tsx`; `extension-isolation.spec.ts` grep invariant
- **m10.1 (m10.1)**: `changes/m10-1-creation-recipes/proposal.md` — creation recipes + RJSF wizard
  - Reused: `recipes/recipeLoader.ts` for recipe-kind enumeration
  - Pattern reused: 6 atomic per-block commits; F-004 oracle update for `/create`; INC-008 fix precedent

### Documentation

- `docs/19-ROADMAP.md` § M10.2 (lines 79-91) — milestone scope + Goal
- `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog, M10.2" (lines 34-41) — entity kinds enumerated
- `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog" prose template (lines 175-198) — target rendering
- `docs/29-NARRATIVE-CATALOG.md` §"Catalog as implemented (m15 slice 2)" (lines 200-220) — catalog architecture precedent
- `docs/07-SKILLS-PACKS.md` §"Agent Skills" (lines 9-19) — skill directory layout
- `docs/07-SKILLS-PACKS.md` §"Initial skill families" (lines 42-87) — initial skills (V1 ships 3)
- `docs/07-SKILLS-PACKS.md` §"Packs" (lines 102-127) — pack kinds (V1 ships 4)
- `docs/08-PROFILES.md` §"Profile axes" (lines 5-16) — profile composition
- `docs/08-PROFILES.md` §"Middle-grade reference profiles" (lines 19-26) — initial profiles (V1 ships 1 global + 1 project-scoped)
- `docs/12-IMAGE-PIPELINE.md` §"Why ComfyUI" (lines 24-37) — reference workflows location
- `docs/12-IMAGE-PIPELINE.md` §"Capability model" (lines 49-67) — provider capability shape
- `docs/27-GLOSSARY.md` — to be EXTENDED with 4 new entries: `Capability Manifest (V1)`, `Build-time Static Discovery`, `Cross-capability Drill-down`, `Capability Detail Page`
- `docs/28-CONTROL-PLANE-STACK.md` §"Dependency governance" — bundle-size budget
- `docs/28-CONTROL-PLANE-STACK.md` §"Docs pipeline" — markdown rendering pipeline (m16)
- `docs/32-NARRATIVE-DOCS-SEARCH.md` §"Index persistence" — V1 substring index (NOT extended by M10.2)
- `docs/33-STUDIO-HOME-WORKBENCH.md` — Studio Home (out of scope; M10.3)
- `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` §Entity references — `Kind:namespace/name` canonical string pattern
- `docs/35-CATALOG-PROVIDERS.md` — client-side federated catalog architecture (M10.2 is single-project)
- `docs/adrs/ADR-021-narrative-catalog-projection.md` — catalog projection model
- `docs/adrs/ADR-022-control-plane-extension-model.md` — extension model (M10.2 reuses without modification)
- `docs/adrs/ADR-024-client-side-federated-catalog.md` — federated catalog (M10.3 territory)

### Schemas

- `specs/catalog-entity.schema.json` lines 23-30 — 6 capability kinds in the `kind` enum (`Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`)
- `specs/profile.schema.json` — profile shape (V1 enumerates 2 profiles against this schema)
- `specs/creation-recipe.schema.json` — recipe shape (V1 enumerates 1 recipe; m10.1 gate)
- `specs/provider-capability.schema.json` — provider shape (V1 has 0 instances; empty state)
- `specs/profile-aliases.yaml` — profile alias registry (forward-looking scaffolding; not enumerated by M10.2)

### Control plane paths (existing; reused unchanged)

- `control-plane/src/features/catalog/entity/EntityHeader.tsx` — REUSED via Extension Registry
- `control-plane/src/features/catalog/entity/MetadataCard.tsx` — REUSED via Extension Registry
- `control-plane/src/features/catalog/entity/RelationsList.tsx` — REUSED via Extension Registry
- `control-plane/src/features/catalog/entity/index.tsx` — REUSED (registers the 3 entity cards against the Extension Registry)
- `control-plane/src/features/docs/docsSafeMarkdown.tsx` — REUSED for SKILL.md + pack markdown rendering
- `control-plane/src/features/docs/entityLinkPlugin.ts` — REUSED for `[[Kind:namespace/name]]` cross-links
- `control-plane/src/recipes/recipeLoader.ts` — REUSED for recipe-kind enumeration
- `control-plane/src/extensions/types.ts` — `EntityCardExtension` shape consumed
- `control-plane/src/store/catalogSelectors.ts` — pattern reused for `capabilitySelectors`
- `control-plane/src/routes/router.ts` — MODIFIED (7 new routes)
- `control-plane/src/routes/routes.tsx` — MODIFIED (F-004 oracle update: 8 new entries)
- `control-plane/test/extension-isolation.spec.ts` — MODIFIED (INC-008 grep oracle extension)
- `control-plane/test/routes-router.spec.ts` — MODIFIED (F-004 oracle update)
- `control-plane/package.json` — UNCHANGED (0 new deps)

### Bundled capability files (TODAY's data)

- Skills: `examples/skills/{character-consistency,narrative-arc,scene-validator}/SKILL.md` (3 files)
- Packs: `recipes/middle-grade-illustrated/skeleton/packs/{story_core,characters,editorial,visual_core}/*.md` (4 pack-KINDs × 1 file = 4 files)
- Profiles: `examples/middle-grade-profile.yaml` (1 global) + `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` (1 project-scoped) = 2 files
- Comfy workflows: `control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json` (1 file)
- Image providers: (0 files; schema-only)
- Recipes: `recipes/middle-grade-illustrated/recipe.yaml` (1 file)

**Total: 11 capability entries enumerated by V1.**

### CI-policy

Per `~/.config/opencode/AGENTS.md` §"CI Policy — Local CI Is the Source of Truth": local validation is the gate; GitHub Actions is the release gate. The M10.2 cycle validates locally via `pnpm --filter control-plane {typecheck,test,build}` + `python -m ajv.cli validate ...` (the 2 profile schema validations + the m10.1 recipe schema validation); the GitHub Actions workflow is updated to add the `validate-profiles` step at the release gate only.

### Engram memory topics

- `architecture/capability-catalog` — to be created at apply-time via `engram_mem_save` with the M10.2 architectural decisions
- `pattern/import-meta-glob-discovery` — to be created at apply-time as a reusable pattern
- `decision/empty-state-for-zero-instances` — to be created at apply-time as a reusable UX pattern

### Glossary additions (for sddk-spec to codify)

- **Capability Manifest (V1)**: The build-time static record of all capabilities (Skills, Packs, Profiles, Comfy Workflows, Image Providers, Recipes) enumerated from on-disk files via `import.meta.glob`. Resolves at Vite build time; ~15KB gzipped; embedded in the static bundle.
- **Build-time Static Discovery**: The pattern of using Vite's `import.meta.glob` with `{ query: '?raw', import: 'default', eager: true }` to enumerate file-tree contents at build time. Preserves the m10 serverless invariant (no runtime fetch); zero bundle-time I/O at runtime.
- **Cross-capability Drill-down**: The pattern of computing topologically-derived cross-references between capabilities (e.g., a skill referenced by a pack) and rendering them via the m16 `RelationsList` component. No content parsing; pure file-tree + simple string match.
- **Capability Detail Page**: The per-entity detail view at `/capabilities/$kind/$namespace/$name` that reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` via the existing Extension Registry. The only difference from a `/entity/...` page is the underlying data source (the static `CapabilityManifest`, not the `ProjectionBundle`).