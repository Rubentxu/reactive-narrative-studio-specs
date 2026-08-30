# Proposal: cp-catalog-entities — Control Plane slice 2 (catalog store + entity pages + internal Extension Registry)

- **Change id**: `cp-catalog-entities`
- **Cycle**: `p-7c4aff45199a2069/m15-cp-catalog-entities`
- **Evidence**: `explore-report.md` SHA-256 `04c9a1fc33f478feeea27328430fce3c13f6a96876181038d8088a0f187773e3` (480 lines, C2, gates G1–G10 PASS, hypothesis HOLDS with one SHRINK — Dexie OUT per UAT-M10-02 binding clause).
- **Baseline**: branch `main`, HEAD `484e02a` (post-v0.6.0 merge; working tree clean)
- **Target branch** (apply): `feat/m15-cp-catalog-entities-2026-08-30`
- **Path**: A-lite; **version target**: **v0.6.1 (PATCH)** — incremental slice within control-plane area; new capability surface (`extension-registry`, `feature-extensions`, `catalog-and-entity-pages`) is evolution of v0.6.0 surface, not net-new product area. Only one new pinned dep (`@radix-ui/react-tabs`, mandated by `docs/28` §Styling baseline). 0 new ADRs.
- **Rounds**: 1 (m15)

## Intent

Close the binding gate `uat/UAT-M10-02-catalog-entity-pages.md`: **Given** a project snapshot with Project, Character and Build catalog entities **When** the Control Plane opens the project and navigates to `Character:Nora` **Then** the page combines canonical overview, visual card, scene relations and continuity status through **independently registered feature extensions**; **Pass** = "No story feature imports visual feature implementation or vice versa. All data arrives through entity/projection contracts."

This lands **slice 2** of the M10 arc (`docs/19-ROADMAP.md` §M10). Slice 1 (m14/v0.6.0) shipped the Control Plane shell, projection loader and 5 placeholder views. Slice 2 brings the catalog store, project catalog, Project/Character entity pages, and the **internal Extension Registry** (`docs/30` + `ADR-022` prose contract). It also **absorbs all 8 M14 LOW P3 debt findings** as natural side-effects of the Block 0 surface changes, and ships **5+ doc updates** as first-class Block F tasks per the launch packet directive.

## Scope

### In Scope

- **Populate `useProjectionStore.catalogEntities`** from snapshot/directory in `loadFrom` (absorbs DEBT-COUPLING-M14-001); expose `catalogSelectors.{byKind, byEntityRef, byNamespace, count}` and `entityRef.{parse, format, toEntityRef}` helpers (`docs/34` §Entity references: `Kind:namespace/name`).
- **Wire `useProjectionStore.sourceLabel`** into `SourcePicker` header (absorbs DEBT-COUPLING-M14-002); confirmed by `source-picker.spec.tsx`.
- **Drop `ProjectSource.refresh?()`** from the port (absorbs DEBT-ARCH-M14-001 — refresh is not slice-2 surface).
- **Refactor `SnapshotProjectSource.load`** into `parseManifest` + `validateAndLoadProjections` + `loadCatalogEntities` + `assembleBundle` helpers (absorbs DEBT-SMELLS-M14-001); drop the `KNOWN_KEYS` regex fallback and push `synthetic('unknown-schema', …)` on unknown projName (absorbs DEBT-OVERENG-M14-002).
- **Delete the unreachable `validate<T>` export** from `schema/ajv.ts` (absorbs DEBT-OVERENG-M14-001); `registry.ts` `validate<T>` remains canonical.
- **Remove the `routerReady` ghost state-effect** from `App.tsx`; render `<RouterProvider router={router}/>` directly (absorbs DEBT-OVERENG-M14-003).
- **Internal Extension Registry** (`src/extensions/{types,registry,predicates,index}.ts`) — `ControlPlaneFeature[]` compile-time registry with `EntityTabExtension` + `EntityCardExtension` contracts, `apiVersion: 'control-plane.extensions/v1'`, predicate matching (`kindIs`, `and`, `or`, `always`).
- **Independent feature folders** (`src/features/{story,visual,catalog,continuity}/`) — story feature owns Character Arc + Scenes tabs; visual feature owns Visual Card + Visual DNA tab; catalog feature owns MetadataCard + RelationsList + EntityHeader; continuity feature owns ContinuityStatusTab. **Zero cross-import** between folders, enforced by `extension-isolation.spec.ts` (the testable form of the UAT-M10-02 Pass clause).
- **`/catalog` route + `views/Catalog.tsx`** listing Project/Character/Build/UATRun entities grouped by kind.
- **`/entity/$kind/$namespace/$name` route + `views/EntityPage.tsx`** orchestrating `resolveEntityTabs` + `resolveEntityCards` and rendering Radix Tabs + cards. Composes 4 UAT-M10-02 facets on Character:Nora (Overview + Visual Card + Scene Relations + Continuity Status).
- **Replace 5 placeholder views** with domain content (each renders the relevant projection key) — dissolves DEBT-DUPLICATION-M14-001.
- **Golden fixtures** — `golden/control-plane/project-valid/{nora,build}.yaml` (Nora + Build catalog entities) and `golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` (so snapshot UAT works end-to-end). The existing `character.yaml` (name: `protagonist`) is left untouched; `nora.yaml` is the explicit UAT fixture.
- **Add `@radix-ui/react-tabs`** exact-pinned per M14 D3 ladder; record T1 deviation in `control-plane/STACK.md` if drift > patch.
- **Route ordering**: `/catalog` declared before `/entity/...` in `router.ts` (mirrored in `routes.tsx`, preserving the F-004 oracle pattern from slice 1).
- **Vitest specs**: `extension-registry.spec.ts` (dispatch + predicate matching), `catalog-store.spec.ts` (catalogSelectors + entityRef parser), `entity-page-composition.spec.ts` (4 facets on Character:Nora fixture), `extension-isolation.spec.ts` (no cross-import between `features/story` ↔ `features/visual` in either direction), `source-picker.spec.tsx`, `app.spec.tsx`, and extension of `loader.snapshot.spec.ts`.
- **Doc-update tasks (Block F, first-class per launch packet directive)**: `docs/29-NARRATIVE-CATALOG.md` (catalog now implemented as `CatalogEntity` slot), `docs/27-GLOSSARY.md` (add `CatalogEntity Store`, `Extension Registry`, `Entity Page`, `Feature Extension`, `Entity Reference`), `docs/28-CONTROL-PLANE-STACK.md` (Radix Tabs pin resolved), `control-plane/STACK.md` (T1 deviation note), `MANIFEST.json` (regen per m13/m14 precedent), `docs/19-ROADMAP.md` (mark M10 slice 2 done; advance M10 status), repo `README.md` (add Catalog + Entity Pages section).

### Out of Scope (deferred to slice 3+ per launch packet)

- **Dexie / IndexedDB persistence** — OUT (SHRINK vs launch packet hypothesis). UAT-M10-02 binding clause does NOT require persistence; `docs/28` §State strategy defers Dexie to "Studio metadata: recently opened projects, favorites, widget layout, search cache". Slice 3+ adds Dexie when recent-projects / favorites land (M10.3).
- **Studio Home + Workbench** — slice 4 per `docs/33` + ADR-025.
- **Search (Orama)** — slice 4 per `docs/32`.
- **Narrative Docs** — slice 5 per `docs/32` + `docs/13`.
- **Graph Lenses** — slice 6 per `docs/13`.
- **RJSF Recipes** — slice 7 (M10.1) per `docs/31` + ADR-023.
- **Capability Catalog** — M10.2 per `docs/19`.
- **Multi-project federated catalog** — M10.3 per `docs/19` + `docs/35`.
- **Full 9-tab Project page + full 10-tab Character page** — only the 4 UAT-M10-02 facets (Overview + Visual Card + Scene Relations + Continuity Status); plus `Visual DNA` (per `docs/13`) → 5-tab Character target. Other Character tabs (Arc / Relationships / Timeline / Knowledge / Illustrations / UAT) are slice 3+.
- **`cp-build.schema.json` + Build projection** — slice 2 only needs the `Build` catalog-entity kind (`specs/catalog-entity.schema.json` already includes `Build` in its 11-value enum). A dedicated projection schema is not required by UAT-M10-02 (only navigation to Character:Nora is exercised). Slice 3+ adds `cp-build.schema.json` if/when a Build entity page is needed.
- **Playwright harness** — slice 3+ per `docs/28` §Testing.
- **ADR-026** — slot 26/26 stays reserved. Slice 2 follows ADR-022 prose contract verbatim; no new architectural decision is introduced.

## Capabilities

> CONTRACT with sddk-spec. Vault research: only `capability-m2-init-2026-08-28` exists in this project ("no test runner"; invalidated by m14 Vitest). Slice-2 reuses the **5 m14 capabilities** (3 MODIFIED, 2 untouched) and adds **3 NEW** capabilities. Names MUST be reused verbatim in `{cycle-artifacts-dir}/specs/<name>/spec.md` by sddk-spec.

### New Capabilities

- **`extension-registry`** — static, compile-time `ControlPlaneFeature[]` registry in `control-plane/src/extensions/`. Exports `ControlPlaneFeature`, `EntityTabExtension`, `EntityCardExtension`, `ExtensionContext`, `ExtensionPredicate` interfaces with `apiVersion: 'control-plane.extensions/v1'`. Registry exposes `register(feature)`, `resolveEntityTabs(entity): EntityTabExtension[]` (sorted by `priority` ascending, filtered by `predicate(entity)`), `resolveEntityCards(entity)`. Predicates module exports `kindIs(kind)`, `and(...preds)`, `or(...preds)`, `always()`. No remote-code loading, no dynamic registry mutation after initial module evaluation, no telemetry. Per ADR-022 ("internal and statically linked"). The first 4 extensions registered: catalog `MetadataCard` + `EntityHeader` + `RelationsList`, story `OverviewTab` + `ArcTab` + `ScenesTab`, visual `VisualCard` + `VisualDNATab`, continuity `ContinuityStatusTab`.
- **`feature-extensions`** — independent feature folders under `control-plane/src/features/{story,visual,catalog,continuity}/`. Each feature owns its entity tabs/cards, registers them against `extension-registry` at module init, and reads ONLY from `useProjectionStore` projection keys (`cp-characters`, `cp-chapters`, `cp-assets`, `cp-characters.visualDNA`, `cp-visual-quality`, `CatalogEntity.metadata`). **Hard invariant**: zero cross-import between `features/story/` ↔ `features/visual/` (either direction) and zero cross-import between `features/catalog/` ↔ `features/story/` (either direction). Enforced by `extension-isolation.spec.ts` which runs `grep -r 'from.*features/(story|visual|catalog|continuity)/' control-plane/src/features/` for each source folder and asserts zero hits in each direction. This is the **testable form of the UAT-M10-02 Pass clause**: "No story feature imports visual feature implementation or vice versa."
- **`catalog-and-entity-pages`** — `/catalog` route + `views/Catalog.tsx` listing catalog entities grouped by kind (Project / Character / Build / UATRun), each row links to `/entity/$kind/$namespace/$name`. `/entity/$kind/$namespace/$name` route + `views/EntityPage.tsx` orchestrates `resolveEntityTabs` + `resolveEntityCards`, renders the entity header, the card strip (above tabs) and the tab strip (Radix `@radix-ui/react-tabs`). Character:Nora composes the 4 UAT-M10-02 facets (Overview + Visual Card + Scene Relations + Continuity Status) plus Visual DNA (docs/13 §Character). UAT-M10-02 Given clause satisfied by `nora.yaml` + Build fixtures + snapshot-valid catalog entities.

### Modified Capabilities

- **`projection-loader-port`** — `loadFrom` in `useProjectionStore` now ALSO populates `catalogEntities: CatalogEntity[]` (validated through the existing `BY_API_VERSION` registry entry for `narrative.dev/v1alpha1`). `SnapshotProjectSource.load` refactors into `parseManifest` + `validateAndLoadProjections` + `loadCatalogEntities` + `assembleBundle` helpers; the `KNOWN_KEYS` regex fallback is dropped (unknown projName now surfaces `synthetic('unknown-schema', …)`). `ProjectSource.refresh?()` is removed from the port (refresh is not slice-2 surface; slice 3+ reintroduces it when LSP-shaped contract needs it). Path-traversal guard, AJV setup, and snapshot format contract from slice 1 are PRESERVED verbatim (AC-INV-schema binding). Repository AC test `extension-isolation.spec.ts` consumes catalog entities through `useProjectionStore.getState().catalogEntities` only — never through cross-feature imports.
- **`serverless-app-shell`** — adds `/catalog` and `/entity/$kind/$namespace/$name` to `router.ts` + `routes.tsx` (route ordering: `/catalog` BEFORE `/entity/...` so the wildcard does not shadow the static path; mirrors the F-004 single-quoted `path: '/…'` oracle pattern). The 5 placeholder views (`Overview/Story/Visual/QA/History`) gain real domain content from the relevant projection keys — dissolves DEBT-DUPLICATION-M14-001. `App.tsx` renders `<RouterProvider router={router}/>` directly with NO `routerReady` ghost state-effect. Serverless invariant preserved (no `fetch(`, telemetry, analytics, CDN, remote font). `Catalog` + `EntityPage` views are added; `EntityPage` is the only call site of `extension-registry.resolveEntityTabs/resolveEntityCards`. Network panel remains empty after `vite preview` (UAT-M10-01 invariant extends to slice-2 pages).
- **`golden-fixture-corpus`** — extends slice-1 fixtures with: `golden/control-plane/project-valid/nora.yaml` (Character:Nora with `visualDNA` populated so the visual-feature extension has data to render), `golden/control-plane/project-valid/build.yaml` (Build:v0.6.0 entity referencing `latestBuild` of demo-project), `golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` (so the snapshot UAT Given clause is satisfied end-to-end). Path-traversal guard fixture and M14 in-pack test fixtures PRESERVED. Deferred families (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) remain out of slice-2 scope.

### Unchanged (consumed but not modified at spec level)

- **`control-plane-shell`** — workspace scaffold unchanged; only Radix Tabs added as a new pinned dep via `package.json` (no shell-level edits).
- **`schema-validation-pipeline`** — registry shape unchanged; `control-plane-extension-config/v1` was already registered in slice 1 (no new schema entry needed); consumers simply instantiate the Extension Registry.

## Approach

**Option B** from explore §"Approaches" — no Dexie, no new ADR, 5-tab Character page, Dexie OUT (SHRINK vs launch packet hypothesis), all 8 M14 LOW P3 findings absorbed inside Block 0 as natural side-effects. Single reviewable unit with **7 atomic per-block commits** (M14 precedent-supported size-exception; A-lite 6-block ceiling exceeded by 1 due to docs-MANIFEST closeout block).

| Block | Path | Files | Est. LoC | Risk |
|---|---|---|---|---|
| **0** Foundation — populate `catalogEntities` + drop `refresh?` + extract `load` helpers + delete unreachable exports + drop `routerReady` + Extension Registry module + `entityRef` helpers + `catalogSelectors` + Radix Tabs pin | `control-plane/src/{extensions,store}/` + modified `projectionStore/ProjectSource/SnapshotProjectSource/ajv/App` + `package.json`/`pnpm-lock.yaml`/`STACK.md` | ~13 new + ~7 modified | ~310 | Med |
| **A** `/catalog` route + `views/Catalog.tsx` + catalog feature `MetadataCard/RelationsList/EntityHeader` + route wiring (catalog BEFORE entity) | `control-plane/src/views/Catalog.tsx` + `features/catalog/entity/*.tsx` + `routes/{router,routes}.tsx` | ~6 new + 2 modified | ~200 | Low |
| **B** `/entity/...` route + `views/EntityPage.tsx` + 5 placeholder views gain domain content (dissolves DEBT-DUPLICATION-M14-001) | `control-plane/src/views/{EntityPage,Overview,Story,Visual,QA,History}.tsx` + `routes/{router,routes}.tsx` | ~1 new + 6 modified | ~260 | Med |
| **C** Character:Nora composition — story feature tabs + visual feature card/tab + continuity feature tab + Nora fixture integration | `control-plane/src/features/{story/character,visual/character,continuity/character}/*.tsx` | ~6 new | ~340 | Med |
| **D** Fixtures — Nora character YAML + Build entity YAML (project-valid + snapshot-valid) | `golden/control-plane/{project-valid,snapshot-valid}/...` | ~4 new + 2 modified | ~120 | Low |
| **E** Tests — extension-registry + catalog-store + entity-page-composition + extension-isolation + source-picker + app + loader.snapshot extension | `control-plane/test/...` | ~7 new + 1 modified | ~250 | Low |
| **F** Closeout — `docs/29` catalog-implemented + `docs/27` glossary + `docs/28` Radix pin + `control-plane/STACK.md` T1 note + `MANIFEST.json` regen + `docs/19` M10 status + repo `README` + `changes/cp-catalog-entities/{spec,design,tasks}.md` pre-flight | `docs/` + `MANIFEST.json` + `README.md` + `changes/` | ~10 doc edits + 3 new change artifacts | ~120 | Low |

Total ~51 new files + ~20 modified, ~1570 LoC, **1 new pinned dep**, **0 new ADRs**, **8 M14 findings absorbed**, **5+ doc updates** (first-class). Exceeds the 400-line review budget by ~4× — same size-exception treatment M14 used. Per-block commits (7) keep individual commit sizes under ~340 LoC (Block C largest). A-lite 6-block ceiling exceeded by 1 (Block F is mandatory doc closeout). Recorded natural split line (Split 2a = Blocks 0+A / Split 2b = Blocks B+C+D+E+F) — do NOT activate without orchestrator override.

### M14 Debt Absorption Map (binding side-effects in Block 0)

| Finding | File | Resolution | Test |
|---|---|---|---|
| DEBT-COUPLING-M14-001 | `store/projectionStore.ts` | Populate `catalogEntities` in `loadFrom` | `catalog-store.spec.ts` |
| DEBT-COUPLING-M14-002 | `app/SourcePicker.tsx` | Render `sourceLabel` in header | `source-picker.spec.tsx` |
| DEBT-ARCH-M14-001 | `loader/ProjectSource.ts` | Drop `refresh?()` from port | compile-time |
| DEBT-SMELLS-M14-001 | `loader/SnapshotProjectSource.ts` | Extract helpers + add `loadCatalogEntities` | `loader.snapshot.spec.ts` |
| DEBT-OVERENG-M14-001 | `schema/ajv.ts` | Delete unreachable `validate<T>` export | compile-time |
| DEBT-OVERENG-M14-002 | `loader/SnapshotProjectSource.ts` | Drop regex fallback; push `synthetic('unknown-schema', …)` | `loader.diagnostics.spec.ts` |
| DEBT-OVERENG-M14-003 | `app/App.tsx` | Remove `routerReady` state-effect | `app.spec.tsx` |
| DEBT-DUPLICATION-M14-001 | `views/{Overview,Story,Visual,QA,History}.tsx` | Replace placeholders with domain content | component tests |

## Quality Intent

- **Production surfaces**: `control-plane/src/extensions/{types,registry,predicates,index}.ts`, `control-plane/src/store/{catalogSelectors,entityRef}.ts`, `control-plane/src/views/{Catalog,EntityPage}.tsx`, `control-plane/src/features/{story,visual,catalog,continuity}/{character,project,entity}/*.tsx`; modified `control-plane/src/{store/projectionStore,loader/{ProjectSource,SnapshotProjectSource},schema/ajv,app/{App,SourcePicker},views/{Overview,Story,Visual,QA,History},routes/{router,routes}}.{ts,tsx}`; modified `control-plane/package.json` (`@radix-ui/react-tabs` exact pin), `control-plane/pnpm-lock.yaml` (regen), `control-plane/STACK.md` (T1 note if needed); `control-plane/test/{extension-registry,catalog-store,entity-page-composition,extension-isolation,source-picker,app}.spec.ts(x)` + extended `loader.snapshot.spec.ts`; `golden/control-plane/{project-valid/{nora,build}.yaml,snapshot-valid/catalog/{nora,build}.yaml}`; `MANIFEST.json` regen; `docs/{19,27,28,29}-*.md` updates; `README.md` section.
- **Changed public APIs**: `useProjectionStore.catalogEntities` populated by `loadFrom`; `useProjectionStore.sourceLabel` rendered; `ProjectSource.refresh?()` removed; `useProjectionStore` selectors `byKind/byEntityRef/byNamespace/count`; `parseEntityRef("Kind:namespace/name")`; `extensionRegistry.register/resolveEntityTabs/resolveEntityCards`; `routes.tsx` adds `/catalog` + `/entity/$kind/$namespace/$name`. All `control-plane/`-internal; no spec-pack API impact.
- **Readiness dimensions**:
  - **contract completeness** — every `ControlPlaneExtension` carries `apiVersion`; every feature folder's registration is the canonical extension entry; every catalog entity arrives via `CatalogEntity` schema validated through the existing `BY_API_VERSION` registry entry.
  - **internal consistency** — no `specs/*.schema.json` modified; `MANIFEST.json` regen follows m13/m14 precedent; route ordering preserves F-004 oracle pattern; `extension-isolation.spec.ts` grep invariant holds.
  - **testability** — 7 Vitest specs; UAT-M10-02 Given clause satisfied by Nora + Build fixtures; Pass clause satisfied by `extension-isolation.spec.ts` (the grep test is the enforcement mechanism).
  - **security** — no path-traversal changes; no remote-code loading; Extension Registry is compile-time static; the path-traversal guard from slice 1 is PRESERVED verbatim.
  - **isolation** — feature folders do not import each other; the `extension-registry` module is the only mediator; consumer code (`EntityPage`) reads ONLY from `useProjectionStore` and `extension-registry`.
- **Required real boundaries**:
  - `pnpm install --frozen-lockfile && pnpm build && pnpm test` MUST succeed against the real `specs/*.schema.json` files.
  - `vite preview` against `golden/control-plane/snapshot-valid/` MUST serve the SPA and render `/catalog` (listing entities from `manifest.json` + `catalog/` folder) AND `/entity/Character/demo/nora` (composing the 4 UAT-M10-02 facets).
  - `extension-isolation.spec.ts` MUST find 0 cross-folder imports in each direction (story↔visual, story↔catalog, visual↔continuity, etc.).
  - Loading `golden/control-plane/project-invalid-schema/` MUST still return a `Diagnostic` with at least one `AjvError` (slice-1 invariant preserved).
  - DevTools Network panel MUST show zero outbound application-API requests after SPA load (UAT-M10-01 invariant preserved + extended to slice-2 pages).

## Architecture Impact

- **Level**: `boundary` — slice 2 introduces the Extension Registry module and feature folders that compose the entity-page surface, crossing the prose-contracts ↔ executable-code seam in a new direction (Backstage-rejection rationale + feature-isolation enforcement).
- **Evidence**:
  - **Inputs**: `specs/catalog-entity.schema.json` (11-value `kind` enum including `Build`), `specs/cp-{characters,assets,chapters,visual-quality}.schema.json` (existing), `specs/control-plane-extension.schema.json` (slice-1 registered consumer), 16-schema registry (slice 1).
  - **Outputs**: `useProjectionStore.catalogEntities` populated; `extensionRegistry` module exporting compile-time feature list; `EntityPage` orchestrating 4 facets on Character:Nora; `/catalog` listing entities by kind.
  - **ADRs consumed (no new ones)**: ADR-014 (projection envelopes — modified capability), ADR-021 (catalog projection — `CatalogEntity` slot pattern), ADR-022 (extension model — `"internal and statically linked"`, `"every extension contract carries API version"`), ADR-024 (federated providers — out of scope, future slice), ADR-025 (Home/Workbench separation — out of scope, future slice).
- **Architecture intent**: explore-report §"Approaches Option B" + §"M14 Debt Absorption" + §"Affected areas" are the canonical intent for design phase to deepen. A proposal-phase observed/planned C4 preview is produced by `sddk-c4-likec4` if available; otherwise the fallback table in the explore-report §"Affected areas (slice 2 — write surface, NOT explored today)" is the canonical intent (21 new file rows + 17 modified file rows with LoC and block attribution).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `changes/cp-catalog-entities/{proposal,spec,design,tasks}.md` | New | The change record (4 files; this proposal + spec + design + tasks) |
| `control-plane/src/extensions/{types,registry,predicates,index}.ts` | New | Compile-time Extension Registry module (~245 LoC) |
| `control-plane/src/store/catalogSelectors.ts` | New | `byKind`, `byEntityRef`, `byNamespace`, `count` selectors (~60 LoC) |
| `control-plane/src/store/entityRef.ts` | New | `parseEntityRef`, `formatEntityRef`, `toEntityRef` (~40 LoC) |
| `control-plane/src/views/Catalog.tsx` | New | `/catalog` listing by kind (~120 LoC) |
| `control-plane/src/views/EntityPage.tsx` | New | Entity page wrapper composing feature extensions (~140 LoC) |
| `control-plane/src/features/catalog/entity/{MetadataCard,RelationsList,EntityHeader}.tsx` | New | Catalog feature cards (~180 LoC) |
| `control-plane/src/features/story/character/{OverviewTab,ArcTab,ScenesTab}.tsx` | New | Story feature tabs for Character (~280 LoC) |
| `control-plane/src/features/visual/character/{VisualCard,VisualDNATab}.tsx` | New | Visual feature card + tab for Character (~220 LoC) |
| `control-plane/src/features/continuity/character/ContinuityStatusTab.tsx` | New | Continuity feature tab (~110 LoC) |
| `control-plane/test/{extension-registry,catalog-store,entity-page-composition,extension-isolation,source-picker,app}.spec.ts(x)` | New | 6 Vitest specs (~370 LoC) |
| `golden/control-plane/{project-valid,snapshot-valid}/...` | Modified/New | Nora + Build fixtures (~6 files, ~120 LoC) |
| `control-plane/package.json` | Modified | Add `@radix-ui/react-tabs` exact pin |
| `control-plane/pnpm-lock.yaml` | Modified | Regenerate for Radix |
| `control-plane/STACK.md` | Modified | T1 deviation note for Radix (if any) |
| `control-plane/src/store/projectionStore.ts` | Modified | Populate `catalogEntities`; expose `sourceLabel` |
| `control-plane/src/loader/ProjectSource.ts` | Modified | Drop `refresh?()` from port |
| `control-plane/src/loader/SnapshotProjectSource.ts` | Modified | Extract helpers; drop regex fallback; add `loadCatalogEntities` |
| `control-plane/src/schema/ajv.ts` | Modified | Delete unreachable `validate<T>` export |
| `control-plane/src/app/App.tsx` | Modified | Remove `routerReady`; render `<RouterProvider>` directly |
| `control-plane/src/app/SourcePicker.tsx` | Modified | Render `sourceLabel` in header |
| `control-plane/src/routes/{router.ts,routes.tsx}` | Modified | Add `/catalog` BEFORE `/entity/...`; preserve F-004 oracle pattern |
| `control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` | Modified | Replace placeholders with domain content |
| `control-plane/test/loader.snapshot.spec.ts` | Modified | Add coverage for `loadCatalogEntities` |
| `MANIFEST.json` | Modified (regen) | + entries for new files; `_meta.regenerated_at` + `_meta.regeneration_reason` |
| `docs/29-NARRATIVE-CATALOG.md` | Modified | Document catalog now implemented as `CatalogEntity` slot |
| `docs/27-GLOSSARY.md` | Modified | Add `CatalogEntity Store`, `Extension Registry`, `Entity Page`, `Feature Extension`, `Entity Reference` |
| `docs/28-CONTROL-PLANE-STACK.md` | Modified | Note Radix Tabs exact-pin resolved at slice 2 apply |
| `docs/19-ROADMAP.md` | Modified | Mark M10 slice 2 done; advance M10 status |
| `README.md` | Modified | Add "Catalog + Entity Pages" section under Control Plane |
| `specs/`, `examples/`, `uat/`, `templates/` | UNCHANGED | AC-INV-schema binding from m13/m14 still applies |
| `docs/adrs/ADR-026-*.md` | NOT REQUIRED | Slice 2 introduces 0 ADRs (slot 26/26 stays reserved) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **R-001** Dexie scope creep re-emerges during design (launch packet hypothesised Dexie) | HIGH | Proposal explicitly declares Dexie OUT (SHRINK vs launch packet). Design phase ratifies; if a new UAT/architectural need for persistence emerges, escalate to orchestrator with evidence + ADR-026 candidate |
| **R-002** Build entity projection schema ambiguity — does slice 2 need `cp-build.schema.json`? | MED | Slice 2 only needs the `Build` catalog-entity kind (already in `catalog-entity.schema.json` enum). No dedicated projection schema required by UAT-M10-02 (only navigation to Character:Nora exercised). Default: NO `cp-build.schema.json`; slice 3+ adds it if a Build page is needed |
| **R-003** Radix Tabs as new pinned dep — exact pin + transitive risks | MED | Block 0 adds `@radix-ui/react-tabs` exact pin per M14 D3 ladder; Block F appends T1 deviation to `control-plane/STACK.md` if drift > patch; new dep bounded (one package) |
| **R-004** 8 M14 LOW findings must absorb without scope explosion | HIGH | Absorption map places all 8 in Block 0; file-level edits are minimal (~3–5 LoC per file for most findings); Block 0 is gated on all 8 closures; 22/22 vitest must remain green throughout |
| **R-005** Doc-update obligation adds ~120 LoC across 5+ docs (launch packet first-class directive) | HIGH | Block F dedicated closeout block; one task per doc + oracle verifying substantive change (not no-op); `MANIFEST.json` regen follows m13/m14 precedent |
| **R-006** Review budget 400 lines — slice-2 exceeds ~4× (~1570 LoC) | HIGH | Same size-exception pattern as M14: 7 atomic per-block commits, review per commit. A-lite 6-block ceiling exceeded by 1 due to mandatory Block F; recorded natural split line (Split 2a/2b) for orchestrator override |
| **R-007** ADR headroom tight (slot 26/26 reserved) | LOW | Design phase confirms 0 ADRs needed before apply; Block F reserves ADR-026 for future slice requiring irreversibility decision |
| **R-008** Story/visual feature isolation enforcement — can drift silently during apply | LOW | `extension-isolation.spec.ts` (Block E) greps `control-plane/src/features/{story,visual,catalog,continuity}/` for cross-folder imports in each direction; run in CI; invariant holds |
| **R-009** Character page tab composition may exceed 4 facets | LOW | Slice 2 ships 5 Character tabs (Overview / Visual DNA / Scenes / Continuity + 1 optional UAT catalog tab); 4 UAT-M10-02 facets explicit; extra tab costs ~30 LoC; no scope creep |
| **R-010** Path-traversal guard and M14 spec const collision (`control-plane/project/v1`) | LOW | Slice 2 design must NOT introduce a new dispatch rule; aggregate schema route is NOT used; projection envelopes route through per-projection `cp-*.schema.json` |
| **R-011** Catalog page route precedes entity pages in TanStack Router (`/entity/...` wildcard) | LOW | Block A declares `/catalog` first; Blocks B/C declare `/entity/...` after; `routes.tsx` mirrors the order (F-004 oracle) |
| **R-012** Radix Tabs bring transitive CSS leak into `dist/` | LOW | Radix Tabs is CSS-only consumer; `pnpm build` records initial `dist/` size in Block F closing report (no gate) |

## Rollback Plan

This is content + tooling change with no runtime state. Per the A-lite contract:

1. Every block lands as its own commit:
   - Block 0: `feat(control-plane): catalog-store-extension-registry-debt-absorptions`
   - Block A: `feat(control-plane): catalog-page-catalog-feature`
   - Block B: `feat(control-plane): entity-page-route-view-content`
   - Block C: `feat(control-plane): character-nora-feature-tabs`
   - Block D: `feat(golden): nora-build-catalog-entity-fixtures`
   - Block E: `test(control-plane): extension-registry-catalog-store-isolation`
   - Block F: `docs(control-plane): catalog-entity-pages-docs-manifest-stack-closeout` + `chore(manifest): regen-cp-catalog-entities-entries`
2. Released under tag `v0.6.1` (PATCH bump per semver for incremental control-plane slice); release notes link to `UAT-M10-02` evidence (`extension-isolation.spec.ts` PASS + `entity-page-composition.spec.ts` PASS).
3. **Full rollback**: `git revert v0.6.0..v0.6.1` — or `--no-commit <first>..<last>` for selective revert.
4. **Partial rollback**: each block revertible independently. Block 0's foundation (catalog store + extension registry) is removable without affecting Blocks A–F (the registry dispatch falls back to "no extensions registered" → empty page). Block F's doc/MANIFEST updates are removable without affecting Blocks A–E.
5. **No remote dependency**: no CI integration to undo, no DB migration (Dexie OUT), no telemetry backend.
6. **No spec-pack mutation**: rollback never reverts `docs/`, `specs/`, `examples/`, `uat/`, `templates/` (none were modified — only Block F updates `docs/19/27/28/29` which are post-pack surface, not the schema pack; see m13 retirement of pack-only invariant for the precedent).

## Dependencies

- **Baseline** `484e02a` (post-v0.6.0 merge) MUST remain unamended until apply.
- **16 schemas** in `specs/` (1 catalog-entity + 1 control-plane envelope + 1 control-plane-extension + 13 `cp-*`) are the validation inputs and MUST remain unmodified by slice 2 (AC-INV-schema binding from m13 cycle still applies).
- **Slice-1 surfaces** (m14 v0.6.0) — `projectionStore`, `ProjectSource` port, `SnapshotProjectSource`, `Ajv` setup, `TanStack Router` 6 routes, `5 placeholder views`, `16-fixture golden corpus`, `5 Vitest specs` — all consumed; modifications are documented above.
- **`docs/28-CONTROL-PLANE-STACK.md` baseline** (Vite 8.1 / React 19.2 / TanStack Router / Tailwind 4.3 / Zustand / Ajv 8 / Vitest) — locked at proposal time; Radix UI is added per `docs/28` §Styling "accessible primitives" (tabs/dialogs/dropdowns/etc.). Apply-phase exact-version verification per M14 D3 ladder (PF.2–PF.4 pre-flight).
- **`docs/29-NARRATIVE-CATALOG.md`** (Catalog vs Narrative Graph + entity envelope + lifecycle + status + relations) — authoritative for the `CatalogEntity` slot pattern.
- **`docs/30-CONTROL-PLANE-EXTENSIONS.md`** (extension kinds + compile-time registry + no dynamic remote code + error isolation) — authoritative for the Extension Registry contract.
- **`docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`** §Entity references — `Kind:namespace/name` canonical string pattern.
- **`docs/35-CATALOG-PROVIDERS.md`** (CatalogProvider port + M10 providers + IndexedDB storage scope) — slice 2 surface is validate-only (populate existing `catalogEntities` slot); full CatalogStore persistence deferred to slice 3+ when M10.3 lands.
- **`uat/UAT-M10-02-catalog-entity-pages.md`** — slice 2 binding exit criterion. Pass clause enforced by `extension-isolation.spec.ts`.
- **25 ADRs** in `docs/adrs/ADR-001..025` — all consumed; no new ADR for slice 2 (slot 26/26 stays reserved for a future irreversibility decision).
- **m14 release state** (`v0.6.0`, `feat/release/v0.6.0` merged) — prerequisite precedent for `control-plane/` slice 2.
- **Node 24 LTS runtime + pnpm 11.9.x + `@radix-ui/react-tabs` exact pin** — apply-phase prereq verified by `tools/install-pnpm.sh` helper.

## Success Criteria

| id | Criterion | Milestone |
|---|---|---|
| **AC-15.1** | `changes/cp-catalog-entities/{proposal,design,tasks,spec}.md` all exist; `spec.md` declares the 3 NEW capabilities (`extension-registry`, `feature-extensions`, `catalog-and-entity-pages`) and the 3 MODIFIED capabilities (`projection-loader-port`, `serverless-app-shell`, `golden-fixture-corpus`) | M15 |
| **AC-15.2** | `control-plane/package.json` declares `@radix-ui/react-tabs` exact pin per M14 D3 ladder; `pnpm install --frozen-lockfile` succeeds on Node 24 LTS | M15 |
| **AC-15.3** | `pnpm build` produces a static `dist/` bundle; `pnpm test` runs the new 6 Vitest specs (`extension-registry`, `catalog-store`, `entity-page-composition`, `extension-isolation`, `source-picker`, `app`) + the extended `loader.snapshot.spec.ts` and exits 0; the slice-1 22/22 vitest count grows to ≥ 28 | M15 |
| **AC-15.4** | `vite preview` against `golden/control-plane/snapshot-valid/` serves the SPA and renders `/catalog` (listing Project/Character/Build/UATRun entities from `manifest.json` + `catalog/` folder) AND `/entity/Character/demo/nora` (composing the 4 UAT-M10-02 facets: Overview + Visual Card + Scene Relations + Continuity Status) | M15 |
| **AC-15.5** | UAT-M10-02 Pass clause is satisfied: `extension-isolation.spec.ts` grep test finds 0 cross-folder imports in `control-plane/src/features/{story,visual,catalog,continuity}/` in each direction; `entity-page-composition.spec.ts` asserts all 4 facets render on the Character:Nora fixture | M15 |
| **AC-15.6** | `useProjectionStore.catalogEntities` is populated by `loadFrom` for both `SnapshotProjectSource` and `DirectoryProjectSource`; `catalogSelectors.{byKind, byEntityRef, byNamespace, count}` return correct projections; `parseEntityRef("Character:demo/nora")` returns `{kind: "Character", namespace: "demo", name: "nora"}` | M15 |
| **AC-15.7** | All 8 M14 LOW P3 findings are closed by Block 0 side-effects (verified by `debt-verify` gate: 0 introduced findings + 8 resolved follow-ups from the m14 cycle). The slice-1 22/22 vitest remains green throughout Block 0 execution | M15 |
| **AC-15.8** | Path-traversal guard from slice 1 is PRESERVED verbatim (`SnapshotProjectSource.ts`); `control-plane/project/v1` collision rule is PRESERVED (`registry.ts`); no `specs/*.schema.json` modified (AC-INV-schema binding); route ordering places `/catalog` BEFORE `/entity/...` | M15 |
| **AC-15.9** | ADR count stays at 25 (0 new ADRs for slice 2; slot 26/26 remains reserved); Network panel empty after `vite preview` (UAT-M10-01 invariant preserved + extended to slice-2 pages) | M15 |
| **AC-15.10** | `MANIFEST.json` regen includes new `control-plane/src/extensions/`, `control-plane/src/features/`, `control-plane/src/store/{catalogSelectors,entityRef}.ts`, `control-plane/src/views/{Catalog,EntityPage}.tsx`, `golden/control-plane/{project-valid/{nora,build},snapshot-valid/catalog/{nora,build}}.yaml`, `control-plane/test/{extension-registry,catalog-store,entity-page-composition,extension-isolation,source-picker,app}.spec.ts(x)` entries; `_meta.regenerated_at` + `_meta.regeneration_reason` updated per m13/m14 precedent | M15 |
| **AC-15.11** | Block F doc-update tasks are first-class and substantive (not no-op): `docs/29-NARRATIVE-CATALOG.md` documents catalog now implemented as `CatalogEntity` slot + Catalog page; `docs/27-GLOSSARY.md` adds `CatalogEntity Store`, `Extension Registry`, `Entity Page`, `Feature Extension`, `Entity Reference`; `docs/28-CONTROL-PLANE-STACK.md` notes Radix Tabs exact pin; `control-plane/STACK.md` records T1 deviation if any; `docs/19-ROADMAP.md` marks M10 slice 2 done; repo `README.md` adds "Catalog + Entity Pages" section under Control Plane. Slice-2 closing report records initial `dist/` bundle size baseline (R-012 baseline; no gate) | M15 |

## Vault References

- `~/.sddk-knowledge/p-7c4aff45199a2069/capabilities/capability-m2-init-2026-08-28.md` (only existing capability node — invalidated by Vitest in m14)
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/cycle-m12-spec-completion-followup-7-2026-08-30.md` (m12 precedent for pack-only invariant retirement)
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/review-block-{6A..6E}-2026-08-28.md` (m6 review-budget precedent for A-lite 6-block ceiling)
- `~/.sddk-knowledge/p-7c4aff45199a2069/incs/INC-002-review-budget-overrun-policy.md` (review-budget guardrail — size-exception precedent for m14 also covers m15)
- Cycle artifact: `p-7c4aff45199a2069/m15-cp-catalog-entities/explore-report.md` (SHA-256 `04c9a1fc33f478feeea27328430fce3c13f6a96876181038d8088a0f187773e3`; hypothesis HOLDS with one SHRINK — Dexie OUT, Option B recommended, 0 new ADRs)
- Cycle artifact precedent: `p-7c4aff45199a2069/m14-cp-foundation/{explore-report,proposal,spec,design,tasks,verify-report,debt-report}.md` (m14 slice-1 pattern; SHA `d2f1f974…` proposal, `682071d7…` spec, `c1d4ed0c…` design, 22/22 vitest PASS, 9/9 mandatory gates PASS, F-001..F-007 RESOLVED, 8 LOW P3 findings OPEN at subject SHA `1b04801` for slice-2 absorption)
- Inner-repo: `docs/{19-ROADMAP,25-IMPLEMENTATION-STARTER,28-CONTROL-PLANE-STACK,29-NARRATIVE-CATALOG,30-CONTROL-PLANE-EXTENSIONS,34-CONTROL-PLANE-DATA-CONTRACTS,35-CATALOG-PROVIDERS}.md` (M10 strategic anchors)
- Inner-repo: `uat/UAT-M10-02-catalog-entity-pages.md` (slice-2 binding exit criterion)
- Inner-repo: `control-plane/STACK.md` (slice-1 pinned baseline; Radix Tabs added at slice-2 apply per `docs/28` §Styling)
- Inner-repo: `specs/{catalog-entity,control-plane,control-plane-extension,cp-*}.schema.json` (16 validation inputs; all unmodified per AC-INV-schema binding)
- Inner-repo precedent: `tools/sddk-pack-audit` (m13 first post-pack-only `tools/` entry — pattern for `control-plane/` extensions + features as second post-pack surface)