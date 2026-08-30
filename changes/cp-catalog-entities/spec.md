# cp-catalog-entities — Control Plane slice 2 (catalog store + entity pages + internal Extension Registry) — Delta Spec

## Source

- **Proposal SHA-256**: `bca39004ebd18bce88de57a53cbf63339b9d9ba790b7451ee1db33d2b99a1f82` (`changes/cp-catalog-entities/proposal.md`, 244 LoC; cycle artifact `art-bca39004ebd1-df0fe286`).
- **Explore-report SHA-256**: `04c9a1fc33f478feeea27328430fce3c13f6a96876181038d8088a0f187773e3` (`cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/explore-report.md`, 480 LoC, C2, gates G1–G10 PASS, hypothesis HOLDS with one SHRINK — Dexie OUT per UAT-M10-02 binding clause).
- **Cycle**: `p-7c4aff45199a2069/m15-cp-catalog-entities` (A-lite, branch `feat/m15-cp-catalog-entities-2026-08-30`, base `484e02a`).
- **Path**: A-lite; **version target**: v0.6.1 (PATCH — incremental control-plane slice; new capability surface is evolution of v0.6.0 surface, not net-new product area).
- **Capability IDs (3 NEW + 3 MODIFIED, names reused verbatim from proposal §"Capabilities")**: `extension-registry` (NEW), `feature-extensions` (NEW), `catalog-and-entity-pages` (NEW), `projection-loader-port` (MODIFIED), `serverless-app-shell` (MODIFIED), `golden-fixture-corpus` (MODIFIED). Unchanged consumed: `control-plane-shell`, `schema-validation-pipeline`.
- **Binding exit criterion**: `uat/UAT-M10-02-catalog-entity-pages.md` — Given a project snapshot with Project, Character and Build catalog entities; When the Control Plane opens the project and navigates to `Character:Nora`; Then the page combines canonical overview, visual card, scene relations and continuity status through independently registered feature extensions; Pass = "No story feature imports visual feature implementation or vice versa. All data arrives through entity/projection contracts."

## Purpose

m15 opens slice 2 of the M10 arc (`docs/19-ROADMAP.md` §M10) on top of the m14 v0.6.0 control-plane foundation. Slice 1 shipped the projection loader, 5 placeholder views, and the serverless SPA shell. Slice 2 lands the **CatalogEntity store** (populating the dead `catalogEntities` slot in `useProjectionStore`), the **internal Extension Registry** (compile-time `ControlPlaneFeature[]` per ADR-022 + `docs/30`), the **independent feature folders** under `src/features/{story,visual,catalog,continuity}/`, the **`/catalog` and `/entity/$kind/$namespace/$name` routes**, and the **Project/Character entity pages** that compose independently-registered feature extensions. It also **absorbs all 8 M14 LOW P3 debt findings** as natural side-effects of Block 0 and ships **5+ doc updates** as first-class Block F tasks per the launch packet directive. **Dexie / IndexedDB persistence is OUT** of slice 2 (SHRINK vs launch packet hypothesis — UAT-M10-02 binding clause does not require persistence; slice 3+ adds Dexie when M10.3 recent-projects / favorites land).

After this delta:
1. **`extension-registry`** — compile-time static `ControlPlaneFeature[]`, `apiVersion: 'control-plane.extensions/v1'`, contract types `EntityTabExtension` + `EntityCardExtension`, `register/resolveEntityTabs/resolveEntityCards`, predicate helpers `kindIs/and/or/always`. No remote-code loading. No dynamic mutation after module init.
2. **`feature-extensions`** — independent feature folders `src/features/{story,visual,catalog,continuity}/`; each feature owns its tabs/cards, registers at module init, reads ONLY from `useProjectionStore`. **Zero cross-import between feature folders in any direction.** Enforced by `extension-isolation.spec.ts` (the testable form of the UAT-M10-02 Pass clause).
3. **`catalog-and-entity-pages`** — `/catalog` listing by kind; `/entity/$kind/$namespace/$name` orchestrating `resolveEntityTabs` + `resolveEntityCards`. Character:Nora composes 4 UAT-M10-02 facets (Overview + Visual Card + Scene Relations + Continuity Status) plus Visual DNA (`docs/13`).
4. **`projection-loader-port` (MODIFIED)** — `loadFrom` populates `catalogEntities`; `SnapshotProjectSource.load` refactors into `parseManifest` + `validateAndLoadProjections` + `loadCatalogEntities` + `assembleBundle`; `KNOWN_KEYS` regex fallback dropped (unknown projName surfaces `synthetic('unknown-schema', …)`); `ProjectSource.refresh?()` REMOVED from the port.
5. **`serverless-app-shell` (MODIFIED)** — adds `/catalog` and `/entity/$kind/$namespace/$name` (route ordering: `/catalog` BEFORE `/entity/...`); 5 placeholder views gain real domain content; `App.tsx` removes `routerReady` ghost state-effect; `SourcePicker` renders `sourceLabel` in header; Catalog + EntityPage views added; `EntityPage` is the sole consumer of `extensionRegistry.resolveEntityTabs/resolveEntityCards`.
6. **`golden-fixture-corpus` (MODIFIED)** — adds `nora.yaml` + `build.yaml` (project-valid); adds `snapshot-valid/catalog/{nora,build}.yaml` (so snapshot UAT Given clause is satisfied end-to-end). Path-traversal guard fixture + slice-1 in-pack test fixtures PRESERVED.

After this delta, `uat/UAT-M10-02-catalog-entity-pages.md` is satisfied and the slice-2 closeout task in `docs/19-ROADMAP.md` §M10 advances to done.

---

## Capability: `extension-registry` (NEW)

### Requirement: REQ-EXR-1 — Compile-time `ControlPlaneFeature[]` registry with `apiVersion: 'control-plane.extensions/v1'`

The system SHALL export a compile-time `ControlPlaneFeature[]` registry from `control-plane/src/extensions/{types,registry,predicates,index}.ts`. Every registered feature SHALL carry `apiVersion: 'control-plane.extensions/v1'` as a const literal (compile-time-enforced, not a string the consumer can vary). The registry SHALL expose `register(feature)`, `resolveEntityTabs(entity): EntityTabExtension[]` (filtered by `predicate(entity)`, sorted by `priority` ascending), and `resolveEntityCards(entity): EntityCardExtension[]`. The registry SHALL NOT load remote code, SHALL NOT mutate after module evaluation, and SHALL emit no telemetry.

#### Scenario: EVT-EXR-01 — Registered features carry `apiVersion` const and resolveEntityTabs sorts by priority ascending

- **GIVEN** apply Block 0 lands and `control-plane/src/extensions/types.ts` exports `ControlPlaneFeature` interface
- **WHEN** `pnpm test --run control-plane/test/extension-registry.spec.ts` is invoked and a Vitest spec registers three feature extensions with `apiVersion: 'control-plane.extensions/v1'` and priorities `30, 10, 20` against `Character` kind
- **THEN** `extensionRegistry.resolveEntityTabs({ kind: 'Character' })` SHALL return the three `EntityTabExtension`s in `priority` ascending order `[10, 20, 30]`
- **AND** `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/extensions/*.ts` SHALL be `>= 4` (every feature object literal in tests + module-level registry carries the const)
- **AND** `grep -cE 'fetch\(|http\.|telemetry' control-plane/src/extensions/*.ts` SHALL return `0` (no remote code, no telemetry).

### Requirement: REQ-EXR-2 — Extension contract types: `EntityTabExtension` + `EntityCardExtension` + `ExtensionContext`

The system SHALL export two extension contract interfaces — `EntityTabExtension` (carries `id`, `kind: 'tab'`, `targetKind`, `priority`, `predicate`, `render(ctx): ReactNode`) and `EntityCardExtension` (carries `id`, `kind: 'card'`, `targetKind`, `priority`, `predicate`, `render(ctx): ReactNode`). Both SHALL consume an `ExtensionContext` interface that exposes the catalog entity reference, projection read accessors (`getProjection<T>(key)`), and a `now()` clock — NOT a direct handle on Zustand internals.

#### Scenario: EVT-EXR-02 — EntityTabExtension + EntityCardExtension contract types exist and ExtensionContext provides projection accessors

- **GIVEN** apply Block 0 lands
- **WHEN** `grep -cE 'interface EntityTabExtension|interface EntityCardExtension|interface ExtensionContext' control-plane/src/extensions/types.ts` is invoked
- **THEN** the count SHALL be `>= 3` (all three contract interfaces declared)
- **AND** the Vitest spec `extension-registry.spec.ts` SHALL exit `0` asserting that a registered `EntityCardExtension.render(ctx)` can call `ctx.getProjection('cp-characters')` and receives the typed projection value
- **AND** `ExtensionContext` SHALL NOT expose `useProjectionStore.setState` or any Zustand mutator (verifiable by `grep -c 'setState\|set(' control-plane/src/extensions/types.ts` returning `0`).

### Requirement: REQ-EXR-3 — Predicate helpers (`kindIs`, `and`, `or`, `always`) and resolution filtering

The system SHALL export predicate helpers from `control-plane/src/extensions/predicates.ts`: `kindIs(kind: string)`, `and(...preds: ExtensionPredicate[])`, `or(...preds: ExtensionPredicate[])`, `always()`. The registry's `resolveEntityTabs` and `resolveEntityCards` SHALL filter features by evaluating `predicate(entity)`; features whose predicate returns `false` SHALL be excluded.

#### Scenario: EVT-EXR-03 — kindIs predicate matches a Character; and/or combine predicates; resolution filters out non-matching features

- **GIVEN** apply Block 0 lands and four features are registered — one with `kindIs('Character')`, one with `and(kindIs('Character'), always())`, one with `or(kindIs('NarrativeProject'), kindIs('Character'))`, one with `always()`
- **WHEN** the Vitest spec invokes `extensionRegistry.resolveEntityTabs({ kind: 'Character', metadata: { name: 'nora', namespace: 'demo' } })`
- **THEN** ALL four features SHALL be returned (every predicate matches a Character)
- **AND** when the spec invokes `extensionRegistry.resolveEntityTabs({ kind: 'Build', metadata: { name: 'v0.6.0', namespace: 'demo' } })`
- **THEN** ONLY the `always()`-predicate feature SHALL be returned (`kindIs('Character')` and the `and(...)` / `or(...)` predicates return `false` for `Build`)
- **AND** `grep -cE 'export function (kindIs|and|or|always)' control-plane/src/extensions/predicates.ts` SHALL be `>= 4` (all four predicate helpers exported).

---

## Capability: `feature-extensions` (NEW)

### Requirement: REQ-FEX-1 — Independent feature folders — ZERO cross-folder imports in any direction

The system SHALL organise feature extensions into independent folders under `control-plane/src/features/{story,visual,catalog,continuity}/`. The system SHALL enforce **zero cross-folder imports between any pair of feature folders** in any direction (story↔visual, story↔catalog, story↔continuity, visual↔catalog, visual↔continuity, catalog↔continuity). The Extension Registry module (`control-plane/src/extensions/`) SHALL be the SOLE mediator for cross-feature composition; consumer code (`EntityPage`) reads ONLY from `useProjectionStore` and the registry. This is the testable form of the UAT-M10-02 Pass clause: "No story feature imports visual feature implementation or vice versa. All data arrives through entity/projection contracts."

#### Scenario: EVT-FEX-01 — `extension-isolation.spec.ts` greps feature folders for cross-imports and asserts zero hits in each direction (the load-bearing UAT-M10-02 Pass clause)

- **GIVEN** apply Blocks 0 + A + B + C land and all four feature folders `src/features/{story,visual,catalog,continuity}/` exist
- **WHEN** `pnpm test --run control-plane/test/extension-isolation.spec.ts` is invoked
- **THEN** the spec SHALL execute `grep -rE "from\s+['\"].*features/(story|visual|catalog|continuity)/" control-plane/src/features/` once per source folder and assert results array is `[]` for each of the four source folders
- **AND** the spec SHALL additionally assert `grep -rE "from\s+['\"]\.\./\.\./(story|visual|catalog|continuity)/" control-plane/src/features/` returns `0` matches (relative escape paths blocked)
- **AND** the spec SHALL exit `0`, satisfying the UAT-M10-02 Pass clause
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/cli-receipts.jsonl` per SC-POL-1.

### Requirement: REQ-FEX-2 — Each feature folder owns its tabs/cards and registers them at module init

The system SHALL organise each feature folder with at minimum: a registration side-effect file (e.g., `features/story/character/index.ts`) that calls `extensionRegistry.register(...)` for every tab/card the feature owns at module-evaluation time; a `*.tsx` file per tab/card component; and NO re-exports from another feature folder. The registration file SHALL be the single canonical entry point for that feature's surface.

#### Scenario: EVT-FEX-02 — Each feature folder's `index.ts` registers against `extensionRegistry` and the registry exposes those features after module init

- **GIVEN** apply Blocks A + B + C land and `control-plane/src/features/{story,visual,catalog,continuity}/{character,project,entity}/index.ts` exist
- **WHEN** the Vitest spec imports `control-plane/src/features/story/character/index` (transitive side effect of `app/App.tsx`)
- **THEN** `extensionRegistry.resolveEntityTabs({ kind: 'Character', metadata: { name: 'nora', namespace: 'demo' } })` SHALL include the story-feature `OverviewTab`, `ArcTab`, `ScenesTab`
- **AND** `extensionRegistry.resolveEntityCards(...)` for the same entity SHALL include the visual-feature `VisualCard`, the catalog-feature `MetadataCard` + `EntityHeader` + `RelationsList`, and the continuity-feature `ContinuityStatusTab`
- **AND** the count of registered features for Character:Nora SHALL be `>= 9` (3 story tabs + 2 visual cards/tabs + 3 catalog cards + 1 continuity tab)
- **AND** `pnpm test --run control-plane/test/extension-registry.spec.ts` SHALL exit `0`.

### Requirement: REQ-FEX-3 — Features read ONLY from `useProjectionStore` projection keys

The system SHALL constrain feature code to read catalog entity data and projection data exclusively from `useProjectionStore` (via typed selectors `byKind/byEntityRef/byNamespace/count`) and `ctx.getProjection(key)` inside `ExtensionContext`. The system SHALL NOT permit feature folder code to import `useProjectionStore.setState` or to call `set(...)` directly; mutations, when needed, SHALL go through registered action creators.

#### Scenario: EVT-FEX-03 — Feature source files contain no direct `setState` calls and only read from `useProjectionStore` + ExtensionContext

- **GIVEN** apply Blocks A + B + C land
- **WHEN** `grep -rE 'setState|\.set\(' control-plane/src/features/` is invoked
- **THEN** the count SHALL be `0` (no direct Zustand mutations from feature code)
- **AND** `grep -rE "useProjectionStore|\.getProjection\(" control-plane/src/features/` SHALL be `>= 6` (every feature file consumes projection data through one of the two sanctioned channels)
- **AND** `pnpm test --run control-plane/test/extension-isolation.spec.ts` SHALL exit `0`.

---

## Capability: `catalog-and-entity-pages` (NEW)

### Requirement: REQ-CEP-1 — `/catalog` route + `views/Catalog.tsx` listing entities grouped by kind

The system SHALL register a `/catalog` route in `control-plane/src/routes/{router.ts,routes.tsx}` and SHALL ship `control-plane/src/views/Catalog.tsx` that lists `Project`, `Character`, `Build`, and `UATRun` catalog entities grouped by kind. The `/catalog` route declaration SHALL occur BEFORE any `/entity/...` route declaration in the router (mirroring the F-004 single-quoted `path: '/…'` oracle pattern from slice 1) so the wildcard does not shadow the static path.

#### Scenario: EVT-CEP-01 — `/catalog` route declared before `/entity/...` and Catalog view groups entities by kind

- **GIVEN** apply Blocks A + D land and `golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` + the existing slice-1 narrative-project.yaml are committed
- **WHEN** `grep -nE "path:\s*'/catalog|path:\s*'/entity" control-plane/src/routes/routes.tsx` is invoked
- **THEN** the `/catalog` line number SHALL be LESS than the `/entity/...` line number (route ordering oracle — wildcard does not shadow)
- **AND** `grep -cE 'projectionStore\(.+\)\.catalogEntities|catalogSelectors\.(byKind|count)' control-plane/src/views/Catalog.tsx` SHALL be `>= 2` (consumes the populated `catalogEntities` slot via selectors)
- **AND** `pnpm test --run control-plane/test/catalog-store.spec.ts` SHALL exit `0` asserting that `catalogSelectors.byKind('Character')` returns exactly `[Character:Nora]` from the snapshot-valid corpus.

### Requirement: REQ-CEP-2 — `/entity/$kind/$namespace/$name` route + `views/EntityPage.tsx` orchestration

The system SHALL register `/entity/$kind/$namespace/$name` in `control-plane/src/routes/{router.ts,routes.tsx}` (AFTER `/catalog`) and SHALL ship `control-plane/src/views/EntityPage.tsx` that (a) parses `$kind/$namespace/$name` into an `EntityRef`, (b) resolves the matching catalog entity via `catalogSelectors.byEntityRef`, (c) calls `extensionRegistry.resolveEntityTabs(entity)` + `resolveEntityCards(entity)`, and (d) renders the entity header (`EntityHeader`), a card strip above the tabs, and the tab strip using Radix `@radix-ui/react-tabs`. `EntityPage` SHALL be the SOLE consumer of `extensionRegistry.resolveEntityTabs/resolveEntityCards`.

#### Scenario: EVT-CEP-02 — EntityPage composes Overview + Visual Card + Scene Relations + Continuity Status on Character:Nora fixture (UAT-M10-02 facets)

- **GIVEN** apply Blocks B + C + D land, the `nora.yaml` fixture is committed under both `golden/control-plane/project-valid/nora.yaml` AND `golden/control-plane/snapshot-valid/catalog/nora.yaml`, and the spec's `vitest` setup loads the snapshot-valid corpus into `useProjectionStore`
- **WHEN** `pnpm test --run control-plane/test/entity-page-composition.spec.ts` is invoked and the spec renders `<EntityPage/>` with the Character:demo/nora URL params
- **THEN** the rendered DOM SHALL contain (a) the `EntityHeader` (kind=Character, namespace=demo, name=nora), (b) the `VisualCard` from the visual feature, (c) the `MetadataCard` + `RelationsList` from the catalog feature, (d) the `OverviewTab` + `ScenesTab` + `VisualDNATab` + `ContinuityStatusTab` content rendered as Radix Tabs panels — minimum 4 facets (Overview + Visual Card + Scene Relations + Continuity Status) per UAT-M10-02
- **AND** `grep -cE "resolveEntityTabs|resolveEntityCards" control-plane/src/` SHALL be `== 2` (only `EntityPage.tsx` and the registry module itself invoke them; no other view consumes them directly)
- **AND** the spec SHALL exit `0` and append the argv/exit_code receipt to `cli-receipts.jsonl` per SC-POL-1.

### Requirement: REQ-CEP-3 — Entity reference helpers (`parseEntityRef`, `formatEntityRef`, `toEntityRef`)

The system SHALL export `parseEntityRef`, `formatEntityRef`, and `toEntityRef` from `control-plane/src/store/entityRef.ts`. `parseEntityRef` SHALL accept the canonical `Kind:namespace/name` string (per `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` §Entity references) and SHALL return `{ kind: string; namespace: string; name: string }`; malformed input SHALL throw a typed `EntityRefParseError`. `formatEntityRef` SHALL invert `parseEntityRef`. `toEntityRef` SHALL accept a `CatalogEntity` and return its `EntityRef`.

#### Scenario: EVT-CEP-03 — parseEntityRef("Character:demo/nora") returns `{kind: "Character", namespace: "demo", name: "nora"}` and malformed input throws

- **GIVEN** apply Block 0 lands and `control-plane/src/store/entityRef.ts` is committed
- **WHEN** `pnpm test --run control-plane/test/catalog-store.spec.ts` is invoked and the spec calls `parseEntityRef('Character:demo/nora')`
- **THEN** the returned object SHALL deep-equal `{ kind: 'Character', namespace: 'demo', name: 'nora' }`
- **AND** `formatEntityRef({ kind: 'Build', namespace: 'demo', name: 'v0.6.0' })` SHALL return `'Build:demo/v0.6.0'`
- **AND** `parseEntityRef('not-a-valid-ref')` SHALL throw an `EntityRefParseError` whose `message` references the malformed input
- **AND** `toEntityRef({ apiVersion: 'narrative.dev/v1alpha1', kind: 'Character', metadata: { name: 'nora', namespace: 'demo' } })` SHALL return `{ kind: 'Character', namespace: 'demo', name: 'nora' }`
- **AND** the spec SHALL exit `0`.

### Requirement: REQ-CEP-4 — Catalog selectors (`byKind`, `byEntityRef`, `byNamespace`, `count`) on the populated `catalogEntities` slot

The system SHALL export `catalogSelectors.{byKind, byEntityRef, byNamespace, count}` from `control-plane/src/store/catalogSelectors.ts`. All four selectors SHALL operate on `useProjectionStore.getState().catalogEntities` and SHALL be pure functions. `count(kind)` SHALL return the number of entities matching `kind`. `byKind(kind)` SHALL return a fresh array of matching entities. `byEntityRef(ref)` SHALL return the matching entity or `undefined`. `byNamespace(namespace)` SHALL return all entities in the given namespace regardless of kind.

#### Scenario: EVT-CEP-04 — `useProjectionStore.catalogEntities` populated by `loadFrom` and all four selectors return correct projections

- **GIVEN** apply Blocks 0 + D land and `nora.yaml` + `build.yaml` are committed under `golden/control-plane/{project-valid,snapshot-valid}/catalog/`
- **WHEN** the Vitest spec invokes `await useProjectionStore.getState().loadFrom(new SnapshotProjectSource(files), 'snapshot-valid')` and then reads `useProjectionStore.getState().catalogEntities`
- **THEN** `catalogEntities.length` SHALL be `>= 3` (Character:Nora + Build:v0.6.0 + the existing narrative-project from slice 1)
- **AND** `catalogSelectors.byKind('Character')` SHALL return exactly `[Character:Nora]`
- **AND** `catalogSelectors.byEntityRef({ kind: 'Build', namespace: 'demo', name: 'v0.6.0' })` SHALL return the Build entity (not `undefined`)
- **AND** `catalogSelectors.byNamespace('demo')` SHALL return every demo-namespaced entity (length `>= 2`)
- **AND** `catalogSelectors.count('Character')` SHALL return `1`.

---

## Capability: `projection-loader-port` (MODIFIED)

### Requirement: REQ-PLP-1 (MODIFIED) — `loadFrom` populates `catalogEntities` and `ProjectSource.refresh?()` is REMOVED

The system SHALL modify `useProjectionStore.loadFrom` so that on a successful `SnapshotProjectSource.load` (or `DirectoryProjectSource.load`), `catalogEntities: CatalogEntity[]` is populated with the validated catalog entities (validated through the existing `BY_API_VERSION` registry entry for `narrative.dev/v1alpha1`). The system SHALL REMOVE `refresh?(): Promise<Diagnostic<ProjectionBundle>>` from the `ProjectSource` port (refresh is not slice-2 surface; slice 3+ reintroduces it when an LSP-shaped contract warrants it). Path-traversal guard, AJV setup, and snapshot format contract from slice 1 SHALL be PRESERVED verbatim.

#### Scenario: EVT-PLP-01 (MODIFIED) — `loadFrom` populates `catalogEntities` and `refresh?()` is absent from the port

- **GIVEN** apply Block 0 lands and `golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` are committed
- **WHEN** `await useProjectionStore.getState().loadFrom(new SnapshotProjectSource(files), 'snapshot-valid')` is invoked
- **THEN** `useProjectionStore.getState().status` SHALL be `'loaded'` AND `useProjectionStore.getState().catalogEntities.length` SHALL be `>= 3`
- **AND** `grep -cE 'refresh\?' control-plane/src/loader/ProjectSource.ts` SHALL return `0` (refresh method removed from port)
- **AND** `grep -cE '\.\.|path\.resolve|isAbsolute' control-plane/src/loader/SnapshotProjectSource.ts` SHALL be `>= 2` (path-traversal guard from slice 1 PRESERVED verbatim per AC-INV-schema binding)
- **AND** the Vitest spec `loader.snapshot.spec.ts` SHALL exit `0`.

(Previously: `loadFrom` only stored `bundle + sourceLabel`; `catalogEntities` was a dead write-only slot. `ProjectSource` port declared `refresh?(projectId)`.)

### Requirement: REQ-PLP-4 (NEW — slice 2) — `SnapshotProjectSource.load` decomposed into named helpers

The system SHALL refactor `SnapshotProjectSource.load` into four named helper functions: `parseManifest(files)`, `validateAndLoadProjections(files, names)`, `loadCatalogEntities(files, snapshot)`, and `assembleBundle(projections)`. The 82-LoC monolith from slice 1 SHALL be replaced by composition of these helpers, with each helper testable in isolation. The `KNOWN_KEYS` regex fallback SHALL be DROPPED; unknown `projName` SHALL emit a `synthetic('unknown-schema', …)` diagnostic in the `errors[]` array (this is the DEBT-OVERENG-M14-002 absorption).

#### Scenario: EVT-PLP-04 — `load()` decomposed; unknown `projName` emits `synthetic('unknown-schema', …)` instead of regex fallback

- **GIVEN** apply Block 0 lands and `golden/control-plane/snapshot-valid/` is committed
- **WHEN** `grep -cE 'export function (parseManifest|validateAndLoadProjections|loadCatalogEntities|assembleBundle)' control-plane/src/loader/SnapshotProjectSource.ts` is invoked
- **THEN** the count SHALL be `>= 4` (all four helpers exported)
- **AND** `grep -cE 'KNOWN_KEYS' control-plane/src/loader/SnapshotProjectSource.ts` SHALL return `0` (regex fallback dropped)
- **AND** the Vitest spec `loader.snapshot.spec.ts` SHALL include a case where `manifest.json` references a non-existent projection name; the returned diagnostic SHALL be `{ ok: false, errors: [...] }` where at least one error carries `keyword: 'unknown-schema'`
- **AND** the spec SHALL exit `0`.

### Requirement: REQ-PLP-5 (NEW — slice 2) — `ajv.ts` deletes unreachable `validate<T>` export; `registry.ts` `validate<T>` remains canonical

The system SHALL DELETE the `validate<T>(schema, data)` export from `control-plane/src/schema/ajv.ts` (it was unreachable from any importer per the m14 audit). The canonical `validate<T>` API in `control-plane/src/schema/registry.ts` SHALL be the sole validator entry point. The Ajv instance export (`ajv`) SHALL remain for diagnostic formatting only (no validator convenience methods).

#### Scenario: EVT-PLP-05 — `validate<T>` removed from `ajv.ts` and unreachable grep confirms no importer remains

- **GIVEN** apply Block 0 lands
- **WHEN** `grep -cE 'export function validate' control-plane/src/schema/ajv.ts` is invoked
- **THEN** the count SHALL be `0`
- **AND** `grep -rE "from.*schema/ajv['\"]" control-plane/src/ | grep -v 'ajv\.\(get\|compile\|errors\)'` SHALL return `0` (no surviving importer of the deleted API; legitimate `ajv` imports for `get`/`compile`/`errors` access are preserved)
- **AND** `pnpm exec tsc --noEmit` in `control-plane/` SHALL exit `0` (compile-time proves no broken import path)
- **AND** `pnpm test --run control-plane/test/ajv.spec.ts` SHALL exit `0` (existing slice-1 ajv test still green).

---

## Capability: `serverless-app-shell` (MODIFIED)

### Requirement: REQ-SAS-1 (MODIFIED) — Routes add `/catalog` + `/entity/...`; placeholder views gain domain content

The system SHALL register `/catalog` (BEFORE `/entity/...`, mirroring the F-004 single-quoted `path: '/…'` oracle pattern) and `/entity/$kind/$namespace/$name` (AFTER `/catalog`) in `control-plane/src/routes/{router.ts, routes.tsx}`. The five placeholder views from slice 1 (`Overview/Story/Visual/QA/History.tsx`) SHALL be replaced with real domain content that reads from the corresponding projection key (this dissolves DEBT-DUPLICATION-M14-001). `views/Catalog.tsx` and `views/EntityPage.tsx` SHALL be added; `EntityPage` SHALL be the SOLE consumer of `extensionRegistry.resolveEntityTabs/resolveEntityCards`.

#### Scenario: EVT-SAS-01 (MODIFIED) — All eight routes registered in correct order; `/catalog` precedes `/entity/...`; placeholder views replaced

- **GIVEN** apply Blocks A + B land
- **WHEN** `grep -nE "path:\s*'/(catalog|entity/\\\$kind)" control-plane/src/routes/routes.tsx` is invoked
- **THEN** the `/catalog` line number SHALL be LESS than `/entity/$kind/$namespace/$name` (route ordering oracle)
- **AND** `grep -cE "path:\s*'/" control-plane/src/routes/routes.tsx` SHALL be `>= 8` (six slice-1 routes + `/catalog` + `/entity/...`)
- **AND** `grep -cE 'fetch\(|axios|XMLHttpRequest|http\.get' control-plane/src/views/*.tsx` SHALL remain `0` (serverless invariant preserved across slice-2 views)
- **AND** `test -f control-plane/src/views/{Catalog,EntityPage,Overview,Story,Visual,QA,History}.tsx` SHALL succeed for all 7 view files
- **AND** `pnpm build` SHALL exit `0`.

(Previously: Six slice-1 routes; five placeholder views (`<div>...</div>`); no `/catalog` or `/entity/...`.)

### Requirement: REQ-SAS-5 (NEW — slice 2) — `App.tsx` renders `<RouterProvider>` directly with NO `routerReady` ghost state-effect

The system SHALL REMOVE the `routerReady` `useState`/`useEffect` ghost state-effect from `control-plane/src/app/App.tsx` (this is the DEBT-OVERENG-M14-003 absorption). `App.tsx` SHALL render `<RouterProvider router={router}/>` directly inside `<ErrorBoundary>`. The "Loading…" guard branch SHALL be deleted.

#### Scenario: EVT-SAS-05 — App.tsx renders `<RouterProvider>` directly; `routerReady` reference is absent

- **GIVEN** apply Block 0 lands
- **WHEN** `grep -cE 'routerReady' control-plane/src/app/App.tsx` is invoked
- **THEN** the count SHALL be `0` (ghost state removed)
- **AND** `grep -cE '<RouterProvider' control-plane/src/app/App.tsx` SHALL be `>= 1`
- **AND** `pnpm test --run control-plane/test/app.spec.tsx` SHALL exit `0`
- **AND** the spec SHALL assert `<App/>` renders `<RouterProvider/>` synchronously without an intermediate "Loading…" placeholder.

### Requirement: REQ-SAS-6 (NEW — slice 2) — `SourcePicker` renders `sourceLabel` in header

The system SHALL modify `control-plane/src/app/SourcePicker.tsx` to render `sourceLabel` from the Zustand store in the header. This is the DEBT-COUPLING-M14-002 absorption — the existing dead `sourceLabel: string | null` slot becomes a visible UI element. The Vitest spec `source-picker.spec.tsx` SHALL assert the rendered DOM contains the current `sourceLabel` value (or a null fallback when unset).

#### Scenario: EVT-SAS-06 — SourcePicker renders `sourceLabel` value (or empty fallback) in the header

- **GIVEN** apply Block 0 lands
- **WHEN** `grep -cE 'sourceLabel' control-plane/src/app/SourcePicker.tsx` is invoked
- **THEN** the count SHALL be `>= 1` (component reads from the store)
- **AND** `pnpm test --run control-plane/test/source-picker.spec.tsx` SHALL exit `0`
- **AND** the spec SHALL render `<SourcePicker/>` with `useProjectionStore` state `{ sourceLabel: 'snapshot-valid' }` and assert the rendered header text contains `'snapshot-valid'`
- **AND** the spec SHALL additionally render `<SourcePicker/>` with `sourceLabel: null` and assert a graceful empty-fallback string (no `null` printed literally).

### Requirement: REQ-SAS-7 (NEW — slice 2) — Serverless invariant preserved + extended to slice-2 pages

The system SHALL guarantee that, after `vite preview` serves the SPA and a user loads `golden/control-plane/snapshot-valid/`, the SPA SHALL make zero outbound application-API requests across ALL routes — including the slice-2 routes `/catalog` and `/entity/Character/demo/nora` (extending the slice-1 UAT-M10-01 invariant to slice-2 surfaces). `control-plane/package.json` SHALL NOT declare telemetry, analytics, remote fonts, CDN, or runtime HTTP-client dependencies.

#### Scenario: EVT-SAS-07 — Zero remote dependencies and `vite preview` renders `/catalog` + `/entity/Character/demo/nora` from snapshot-valid corpus

- **GIVEN** apply Blocks A + B + F land and `vite preview` is invoked against `golden/control-plane/snapshot-valid/`
- **WHEN** `grep -cE 'telemetry|analytics|google-fonts|cdn\.|@sentry|datadog|axios|fetch-polyfill' control-plane/package.json control-plane/src/**/*.{ts,tsx}` is invoked
- **THEN** the count SHALL be `0`
- **AND** `pnpm exec vite preview --port 4173` SHALL serve `/catalog` (rendering Project/Character/Build entities grouped by kind) AND `/entity/Character/demo/nora` (composing the 4 UAT-M10-02 facets)
- **AND** DevTools Network panel SHALL show zero outbound application-API requests after page load (the UAT-M10-01 invariant extended to slice-2 pages)
- **AND** `pnpm test --run` SHALL exit `0`.

---

## Capability: `golden-fixture-corpus` (MODIFIED)

### Requirement: REQ-GFC-5 (NEW — slice 2) — `nora.yaml` + `build.yaml` extend the slice-1 fixtures

The system SHALL commit `golden/control-plane/project-valid/nora.yaml` (a Character entity with `name: nora`, `namespace: demo`, populated `visualDNA` so the visual-feature extension has data to render) and `golden/control-plane/project-valid/build.yaml` (a Build entity referencing `latestBuild` of the demo project). The system SHALL ALSO commit `golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` so the snapshot UAT Given clause is satisfied end-to-end. Existing `golden/control-plane/project-valid/character.yaml` (with `name: protagonist`) SHALL remain untouched per the launch packet directive — Nora is a NEW fixture, not a rename.

#### Scenario: EVT-GFC-05 — All four slice-2 fixtures committed and pass their per-file validators

- **GIVEN** apply Block D lands
- **WHEN** `test -f golden/control-plane/project-valid/{nora,build}.yaml golden/control-plane/snapshot-valid/catalog/{nora,build}.yaml` is invoked
- **THEN** all 4 files SHALL exist
- **AND** `pnpm test --run control-plane/test/schema-fixtures.spec.ts` SHALL exit `0` asserting that `parseEntityRef('Character:demo/nora')` round-trips with `nora.yaml` and `parseEntityRef('Build:demo/v0.6.0')` round-trips with `build.yaml`
- **AND** `pnpm test --run control-plane/test/catalog-store.spec.ts` SHALL exit `0` asserting that `catalogSelectors.byKind('Character')` returns exactly `[Character:Nora]` from the snapshot-valid corpus
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cli-receipts.jsonl` per SC-POL-1.

### Requirement: REQ-GFC-6 (NEW — slice 2) — Path-traversal guard and slice-1 in-pack test fixtures PRESERVED verbatim

The system SHALL PRESERVE the slice-1 path-traversal guard fixture (`control-plane/test/loader.diagnostics.spec.ts` inline data) and ALL slice-1 fixtures (`golden/control-plane/{project-valid,project-invalid-schema,snapshot-valid}/`) without modification. Deferred families (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) remain out of slice-2 scope per `docs/24-TESTING-GOLDEN-DATASET.md` §Fixture expansion.

#### Scenario: EVT-GFC-06 — Slice-1 fixtures are unmodified; only `nora.yaml` + `build.yaml` + snapshot-valid/catalog/ are added

- **GIVEN** apply Block D lands
- **WHEN** `git diff --stat 484e02a..HEAD -- golden/control-plane/project-valid/ golden/control-plane/project-invalid-schema/ golden/control-plane/snapshot-valid/projections/` is invoked
- **THEN** the diff SHALL be empty (slice-1 fixtures preserved verbatim per AC-INV-schema binding from m13/m14)
- **AND** `git status --porcelain golden/control-plane/` SHALL list ONLY `project-valid/{nora,build}.yaml` and `snapshot-valid/catalog/{nora,build}.yaml` as new files
- **AND** `pnpm test --run control-plane/test/loader.diagnostics.spec.ts` SHALL exit `0` (path-traversal guard test from slice 1 still passes).

---

## Acceptance Criteria Matrix

| AC | Block | Requirement(s) | Scenario(s) | Verification | Status |
|---|---|---|---|---|---|
| **AC-15.1** | 0 + F | (capability surface) | (cap invariant) | `grep -cE 'extension-registry\|feature-extensions\|catalog-and-entity-pages\|projection-loader-port\|serverless-app-shell\|golden-fixture-corpus' changes/cp-catalog-entities/spec.md` returns `>= 6` (all 6 capabilities declared verbatim per proposal §"Capabilities"); `test -f changes/cp-catalog-entities/{proposal,spec}.md` | Bash / deterministic |
| **AC-15.2** | 0 | REQ-EXR-1 | EVT-EXR-01 | `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/extensions/*.ts` returns `>= 4`; `grep -cE 'fetch\(\|http\.\|telemetry' control-plane/src/extensions/*.ts` returns `0`; `pnpm test --run control-plane/test/extension-registry.spec.ts` exits `0`; 3 NEW capability files exist under `control-plane/src/extensions/` | Bash + Vitest |
| **AC-15.3** | 0 + E | REQ-FEX-1 | EVT-FEX-01 | `pnpm test --run control-plane/test/extension-isolation.spec.ts` exits `0`; `grep -rE "from\s+['\"].*features/(story\|visual\|catalog\|continuity)/" control-plane/src/features/` returns `0` matches across all 4 source folders (the load-bearing UAT-M10-02 Pass clause) | Vitest + Bash |
| **AC-15.4** | A + D | REQ-CEP-1, REQ-GFC-5 | EVT-CEP-01, EVT-GFC-05 | `grep -nE "path:\s*'/catalog\|path:\s*'/entity" control-plane/src/routes/routes.tsx` shows `/catalog` line number LESS than `/entity/...` line number; `test -f golden/control-plane/{project-valid,snapshot-valid}/catalog/{nora,build}.yaml` succeeds; `pnpm test --run control-plane/test/catalog-store.spec.ts` exits `0` | Bash + Vitest |
| **AC-15.5** | B + C | REQ-CEP-2 | EVT-CEP-02 | `pnpm test --run control-plane/test/entity-page-composition.spec.ts` exits `0` asserting 4 UAT-M10-02 facets rendered on Character:Nora (Overview + Visual Card + Scene Relations + Continuity Status); `grep -cE "resolveEntityTabs\|resolveEntityCards" control-plane/src/` equals `2` (only EntityPage.tsx and the registry module invoke them); `pnpm build` exits `0` | Vitest + Bash |
| **AC-15.6** | 0 | REQ-PLP-4, REQ-PLP-5, REQ-SAS-5, REQ-SAS-6 | EVT-PLP-04, EVT-PLP-05, EVT-SAS-05, EVT-SAS-06 | All 4 slice-2 AC-DEBT-15.x helpers are present: `grep -cE 'export function (parseManifest\|validateAndLoadProjections\|loadCatalogEntities\|assembleBundle)' control-plane/src/loader/SnapshotProjectSource.ts` returns `>= 4`; `grep -cE 'export function validate' control-plane/src/schema/ajv.ts` returns `0`; `grep -cE 'routerReady' control-plane/src/app/App.tsx` returns `0`; `grep -cE 'sourceLabel' control-plane/src/app/SourcePicker.tsx` returns `>= 1` | Bash |
| **AC-15.7** | 0 | REQ-PLP-1 (MODIFIED) | EVT-PLP-01 (MODIFIED) | `grep -cE 'refresh\?' control-plane/src/loader/ProjectSource.ts` returns `0`; `pnpm test --run control-plane/test/loader.snapshot.spec.ts` exits `0` asserting `catalogEntities.length >= 3` after `loadFrom(snapshot-valid)`; `grep -cE '\.\.\|path\.resolve\|isAbsolute' control-plane/src/loader/SnapshotProjectSource.ts` returns `>= 2` (path-traversal guard PRESERVED verbatim) | Bash + Vitest |
| **AC-15.8** | F | (regen + closeout) | (Block F) | `test "$(ls docs/adrs/ADR-*.md 2>/dev/null \| wc -l)" -le 26`; ADR count delta from baseline `484e02a` is `0` (slot 26/26 stays reserved per R-007 mitigation); `MANIFEST.json` `_meta.regenerated_at` updated per m13/m14 precedent; `MANIFEST.json` entries cover new `control-plane/src/extensions/` + `features/` + `views/{Catalog,EntityPage}.tsx` + `golden/control-plane/{project-valid,snapshot-valid}/catalog/` paths | git diff + jq |
| **AC-15.9** | E + F | (gate) | EVT-* | `sddk debt-verify` verdict == `PASS_WITH_WARNINGS` or `PASS`; `sddk-pack-audit gate --root .` first stdout line == `PASS`; `pnpm test --run` exits `0` with `>= 7` spec files reported (slice-1 5 specs + extension-registry + catalog-store + entity-page-composition + extension-isolation + source-picker + app = 11 total per AC-15.3/15.4/15.5/15.6 evidence) | vault verify + Bash |
| **AC-15.10** | F | (doc updates) | EVT-15.10-* | All 5+ doc updates land with verifiable oracles: (a) `docs/29-NARRATIVE-CATALOG.md` documents `CatalogEntity` slot; (b) `docs/27-GLOSSARY.md` contains the 5 new terms (`CatalogEntity Store`, `Extension Registry`, `Entity Page`, `Feature Extension`, `Entity Reference`) verified by `grep -c`; (c) `docs/28-CONTROL-PLANE-STACK.md` notes Radix Tabs exact pin; (d) `control-plane/STACK.md` has T1 deviation entry (if any); (e) `MANIFEST.json` regen verified by `_meta.regenerated_at` newer than `_meta.created`; (f) `docs/19-ROADMAP.md` §M10 marks slice 2 done; (g) `README.md` has `Catalog + Entity Pages` section under Control Plane | grep + jq + git diff |
| **AC-15.11** | F | (closing report) | (Block F) | Slice-2 closing report records initial `dist/` bundle size baseline (R-012; no gate), `pnpm --version` verification receipt (SC-POL-1 evidence), and `sddk-pack-audit gate` PASS receipt with recorded argv/exit_code per AC-INV-rdd | grep + JSONL parse |
| **AC-DEBT-15.1** | 0 | REQ-PLP-1 | EVT-PLP-01 | DEBT-COUPLING-M14-001 absorption: `useProjectionStore.catalogEntities` populated by `loadFrom`; `pnpm test --run control-plane/test/catalog-store.spec.ts` exits `0` | Vitest |
| **AC-DEBT-15.2** | 0 | REQ-SAS-6 | EVT-SAS-06 | DEBT-COUPLING-M14-002 absorption: `sourceLabel` rendered in `SourcePicker.tsx` header; `pnpm test --run control-plane/test/source-picker.spec.tsx` exits `0` | Vitest |
| **AC-DEBT-15.3** | 0 | REQ-PLP-1 | EVT-PLP-01 | DEBT-ARCH-M14-001 absorption: `refresh?()` removed from port; `grep -cE 'refresh\?' control-plane/src/loader/ProjectSource.ts` returns `0`; `pnpm exec tsc --noEmit` exits `0` (compile-time proof) | Bash + tsc |
| **AC-DEBT-15.4** | 0 | REQ-PLP-4 | EVT-PLP-04 | DEBT-SMELLS-M14-001 absorption: `load()` refactored into 4 named helpers; `grep -cE 'export function (parseManifest\|validateAndLoadProjections\|loadCatalogEntities\|assembleBundle)'` returns `>= 4`; `pnpm test --run control-plane/test/loader.snapshot.spec.ts` exits `0` | Bash + Vitest |
| **AC-DEBT-15.5** | 0 | REQ-PLP-5 | EVT-PLP-05 | DEBT-OVERENG-M14-001 absorption: `validate<T>` unreachable export removed from `ajv.ts`; `grep -cE 'export function validate' control-plane/src/schema/ajv.ts` returns `0`; `pnpm test --run control-plane/test/ajv.spec.ts` exits `0` | Bash + Vitest |
| **AC-DEBT-15.6** | 0 | REQ-PLP-4 | EVT-PLP-04 | DEBT-OVERENG-M14-002 absorption: `KNOWN_KEYS` regex fallback dropped; `grep -cE 'KNOWN_KEYS' control-plane/src/loader/SnapshotProjectSource.ts` returns `0`; the unknown-projName test case exits `0` with `keyword: 'unknown-schema'` diagnostic | Bash + Vitest |
| **AC-DEBT-15.7** | 0 | REQ-SAS-5 | EVT-SAS-05 | DEBT-OVERENG-M14-003 absorption: `routerReady` ghost state-effect removed; `grep -cE 'routerReady' control-plane/src/app/App.tsx` returns `0`; `pnpm test --run control-plane/test/app.spec.tsx` exits `0` | Bash + Vitest |
| **AC-DEBT-15.8** | B | REQ-SAS-1 (MODIFIED) | EVT-SAS-01 (MODIFIED) | DEBT-DUPLICATION-M14-001 absorption: 5 placeholder views replaced with domain content; `test -f control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` succeeds; component tests exit `0` | Bash + Vitest |
| **AC-INV-schema** | 0 + A + B + C + D + E + F | (no-schema-mod) | (invariant) | `git diff --stat 484e02a..HEAD -- specs/*.schema.json` returns empty (no schema modified by slice 2; m13/m14 AC-INV-schema binding still applies) | git |
| **AC-INV-serverless** | 0 + A + B + C | REQ-SAS-7 | EVT-SAS-07 | `grep -cE 'telemetry\|analytics\|google-fonts\|cdn\.\|@sentry\|datadog\|axios\|fetch-polyfill' control-plane/package.json control-plane/src/**/*.{ts,tsx}` returns `0`; DevTools Network panel empty after `vite preview` against `snapshot-valid/` including `/catalog` and `/entity/Character/demo/nora` | Bash + manual |
| **AC-INV-rdd** | 0 + A + B + C + D + E + F | REQ-* (SC-POL-1) | EVT-* | `cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/cli-receipts.jsonl` exists, is valid JSONL, contains one entry per applied recipe (pnpm install/build/test/preview, vite preview, schema-fixtures test, snapshot test, ajv test, extension-registry test, catalog-store test, extension-isolation test, entity-page-composition test, source-picker test, app test) with `exit_code` matching the actual run | JSONL parse |

Total: **21 ACs** (AC-15.1..15.11 + AC-DEBT-15.1..15.8 + AC-INV-schema + AC-INV-serverless + AC-INV-rdd). The 8 AC-DEBT-15.x ACs are the first-class absorption commitments for the 8 M14 LOW P3 debt findings; AC-15.1..15.11 are the slice-2 functional and closeout ACs; AC-INV-* preserve the m13/m14 invariants.

---

## Source-of-Truth Exclusions

The following sites are **canonical contracts, registries, oracles, or inviolable surfaces** and MUST NOT be refactored by this change. They are the contract/oracle/surface, not consumers.

| Site | Role | Reason excluded |
|---|---|---|
| `specs/*.schema.json` (16 files including `cp-build` schema if added by slice 3+) | Inner-repo substrate contracts | AC-INV-schema from m13 still binding; m15 does not modify any `specs/*.schema.json` |
| `specs/profile-aliases.yaml` | Alias registry | m12A canonical; m15 only consumes via projection loader (no edits) |
| `docs/28-CONTROL-PLANE-STACK.md` | Stack baseline | Pinned at proposal time; apply notes Radix Tabs exact-version reality per R-003 but never silently deviates |
| `docs/30-CONTROL-PLANE-EXTENSIONS.md` | Extension kinds + compile-time registry | Authoritative for the `Extension Registry` contract (slice 2 follows ADR-022 prose contract verbatim) |
| `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` | Envelope shape + validation pipeline + entity references | Authoritative for `Kind:namespace/name` reference string + loader contract |
| `docs/29-NARRATIVE-CATALOG.md` | Catalog vs Narrative Graph + entity envelope | Authoritative for the `CatalogEntity` slot pattern |
| `docs/35-CATALOG-PROVIDERS.md` | CatalogProvider port + M10 providers | Authoritative; slice 2 surface is validate-only (populate existing `catalogEntities` slot); full CatalogStore persistence deferred to slice 3+ when M10.3 lands |
| `uat/UAT-M10-02-catalog-entity-pages.md` | Slice-2 binding exit criterion | Authoritative; m15 satisfies its Pass clause via `extension-isolation.spec.ts` (REQ-FEX-1) |
| `uat/UAT-M10-01.md` | Slice-1 exit criterion (carried forward) | Authoritative; AC-INV-serverless extends the invariant to slice-2 pages |
| Root `.gitignore` (Python + `.narrative/` + `assets/generated/candidates/` + `build/` + `control-plane/`) | Existing ignore surface | m14 EXTENDS additively; slice-2 MUST NOT remove existing entries |
| `MANIFEST.json` `package`, `generated_for`, `working_name` keys | Top-level MANIFEST identity | Regen only adds new entries and updates `_meta` |
| `tools/sddk-pack-audit` (m13) + `tools/install-pnpm.sh` (m14) | Existing tooling | Owned by m13/m14; m15 does not modify |
| Slice-1 surface: `control-plane/src/loader/{ProjectSource,DirectoryProjectSource}.ts`, `control-plane/src/schema/registry.ts`, slice-1 5 placeholder views, slice-1 22-fixture golden corpus, slice-1 22/22 vitest baseline | Slice-1 contract | Authoritative for slice 1; slice 2 only extends where REQ-* declares explicit modification |

**Secondary exclusions** (kept-literal by design):
- 25 existing ADRs (`docs/adrs/ADR-001..025`) — slice 2 introduces 0 ADRs (slot 26/26 stays reserved per R-007 mitigation)
- All `examples/`, `templates/` files — slice-2 MUST NOT modify (per AC-INV-schema binding)
- `uat/UAT-M10-{03,04,05}-*.md` — out of slice-2 scope (search, recipes, multi-project deferred to slice 3+)

---

## Risk Register

| # | Risk | Likelihood | Per-risk verification |
|---|---|---|---|
| **R1** | Dexie scope creep re-emerges during design (launch packet hypothesised Dexie) | HIGH | Proposal explicitly declares Dexie OUT (SHRINK vs launch packet). AC-15.4 + AC-15.5 + AC-INV-serverless verify no Dexie/IndexedDB dependencies in `package.json`. If a future UAT/architectural need for persistence emerges, escalate to orchestrator with evidence + ADR-026 candidate |
| **R2** | Build entity projection schema ambiguity — does slice 2 need `cp-build.schema.json`? | MED | Slice 2 only needs the `Build` catalog-entity kind (already in `catalog-entity.schema.json` enum). No dedicated projection schema required by UAT-M10-02 (only navigation to Character:Nora exercised). Default: NO `cp-build.schema.json`; slice 3+ adds it if a Build page is needed |
| **R3** | Radix Tabs as new pinned dep — exact pin + transitive risks | MED | Block 0 adds `@radix-ui/react-tabs` exact pin per M14 D3 ladder; Block F appends T1 deviation to `control-plane/STACK.md` if drift > patch; new dep bounded (one package); AC-INV-rdd records the install/build receipts |
| **R4** | 8 M14 LOW findings must absorb without scope explosion | HIGH | AC-DEBT-15.1..15.8 each map to one finding with a verifiable oracle; absorption map places all 8 in Block 0; file-level edits are minimal (~3–5 LoC per file for most findings); Block 0 is gated on all 8 closures; slice-1 22/22 vitest remains green throughout Block 0 execution (AC-15.9) |
| **R5** | Doc-update obligation adds ~120 LoC across 5+ docs (launch packet first-class directive) | HIGH | AC-15.10 verifies each doc update with a concrete oracle (`grep -c` for new terms in glossary; MANIFEST `_meta.regenerated_at` newer than `_meta.created`; specific section markers); Block F dedicated closeout |
| **R6** | Review budget 400 lines — slice-2 exceeds ~4× (~1570 LoC) | HIGH | Same size-exception pattern as M14: 7 atomic per-block commits, review per commit. A-lite 6-block ceiling exceeded by 1 due to mandatory Block F; recorded natural split line (Split 2a/2b) for orchestrator override |
| **R7** | ADR headroom tight (slot 26/26 reserved) | LOW | AC-15.8 enforces `ls docs/adrs/ADR-*.md` count delta from baseline `484e02a` is `0` (no new ADRs; slot 26/26 stays reserved per R-007 mitigation) |
| **R8** | Story/visual feature isolation enforcement — can drift silently during apply | LOW | AC-15.3 + EVT-FEX-01 + `extension-isolation.spec.ts` greps `control-plane/src/features/{story,visual,catalog,continuity}/` for cross-folder imports in each direction; run in CI; invariant holds |
| **R9** | Character page tab composition may exceed 4 facets | LOW | Slice 2 ships 5 Character tabs (Overview / Arc / Scenes / Visual DNA / Continuity); 4 UAT-M10-02 facets explicit; extra tab costs ~30 LoC; no scope creep |
| **R10** | Path-traversal guard and M14 spec const collision (`control-plane/project/v1`) | LOW | Slice 2 design MUST NOT introduce a new dispatch rule; aggregate schema route is NOT used; projection envelopes route through per-projection `cp-*.schema.json`; AC-15.7 enforces the guard PRESERVED verbatim |
| **R11** | Catalog page route precedes entity pages in TanStack Router (`/entity/...` wildcard) | LOW | AC-15.4 enforces `/catalog` line number < `/entity/...` line number; Block A declares `/catalog` first; Blocks B/C declare `/entity/...` after; `routes.tsx` mirrors the order (F-004 oracle) |
| **R12** | Radix Tabs bring transitive CSS leak into `dist/` | LOW | Radix Tabs is CSS-only consumer; `pnpm build` records initial `dist/` size in Block F closing report (no gate per AC-15.11) |

---

## Entropy Metrics (qualitative; DQS dimension improvements)

Entropy here is the **cross-feature coupling + extension-boundary entropy** of the slice-2 control plane: the spread of feature surfaces across isolated folders, the tightness of the Extension Registry mediation guarantee, and the Information Bottleneck of the catalog store → selectors → entity page chain.

| Dimension | Pre-M15 (m14 only) | Post-M15 slice 2 | Delta |
|---|---|---|---|
| **Connascence of Name (CoN)** — feature identity across folders + extensions | None (no Extension Registry; placeholders only) | `extension-registry` module with `apiVersion: 'control-plane.extensions/v1'` const; each feature registers at module init; F-004 route ordering oracle preserved | ↓ |
| **Connascence of Value (CoV)** — extension isolation invariant | None (no extensions) | `extension-isolation.spec.ts` enforces zero cross-folder imports in each direction (the testable UAT-M10-02 Pass clause) | ↓ |
| **Connascence of Type (CoT)** — catalog entity shape across loader/store/views | Dead `catalogEntities: CatalogEntity[]` slot in `useProjectionStore` (write-only) | `catalogEntities` populated by `loadFrom` (REQ-PLP-1 MODIFIED); `catalogSelectors.{byKind,byEntityRef,byNamespace,count}` typed; `entityRef.{parse,format,to}` typed | ↓ |
| **Information Bottleneck (IB)** — loader → store → entity page | Store was bottleneck but `catalogEntities` was dead | Catalog store is bottleneck; selectors expose typed projections; `EntityPage` reads ONLY from store + extension-registry (sole mediator); features read ONLY from store + ExtensionContext | ↑ |
| **Design Quality Score (DQS)** — composite slice-2 quality | Smell: dead catalog slot, 5 placeholder views, ghost state-effect, regex fallback, unreachable export | Smell eliminated: 7 new components (Catalog + EntityPage + 4 feature folders), 6 Vitest specs (extension-registry, catalog-store, entity-page-composition, extension-isolation, source-picker, app), Extension Registry module, 4 fixtures (nora + build in 2 locations), 8 M14 debt findings absorbed, 5+ doc updates | ↑ |
| **SOLID entropy** (SRP/OCP at the boundary layer) | Single `SnapshotProjectSource.load()` 82-LoC monolith; 5 placeholder views with no SRP | `load()` decomposed into 4 named helpers (`parseManifest`, `validateAndLoadProjections`, `loadCatalogEntities`, `assembleBundle`); `EntityPage` orchestrates features but contains no domain logic; each feature folder has one responsibility; new feature added via one `index.ts` registration | ↑ |

The slice-2 is **boundary + tooling at the cycle layer**: no inner-repo schema modification, no spec-pack mutation outside Block F closeout, no `MANIFEST.json` identity change (only `_meta` regen), 0 new ADRs. The Extension Registry module + feature folders are net-new `control-plane/` content; the 8 M14 LOW P3 findings are absorbed inside Block 0 as natural side-effects of the surface changes. m13's pack-only invariant retirement (m13 cycle precedent) carries forward: `tools/` + `control-plane/` are both cycle-mutable post-m13.

---

## Out of Scope (deferred to slice 3+ per launch packet)

- **Dexie / IndexedDB persistence** — OUT (SHRINK vs launch packet hypothesis). Slice 3+ adds Dexie when M10.3 recent-projects / favorites land per `docs/28` §State strategy.
- **Studio Home + Workbench** — slice 4 per `docs/33` + ADR-025.
- **Search (Orama collators)** — slice 4 per `docs/32`.
- **Narrative Docs** (`react-markdown` + sanitizing rehype layer + entity-link plugin) — slice 5 per `docs/32` + `docs/13`.
- **Graph Lenses** (Graphology + Sigma stable 3.x + ForceAtlas2 worker) — slice 6 per `docs/13`.
- **RJSF Recipes** — slice 7 (M10.1) per `docs/31` + ADR-023.
- **Capability Catalog** — M10.2 per `docs/19`.
- **Multi-project federated catalog** — M10.3 per `docs/19` + `docs/35`.
- **Full 9-tab Project page + full 10-tab Character page** — only the 4 UAT-M10-02 facets + Visual DNA (5 tabs total). Other Character tabs (Relationships / Timeline / Knowledge / Illustrations / UAT) are slice 3+.
- **`cp-build.schema.json` + Build projection schema** — slice 2 only needs the `Build` catalog-entity kind (already in `catalog-entity.schema.json` enum). Slice 3+ adds the projection schema if/when a Build entity page is needed.
- **Playwright harness** — slice 3+ per `docs/28` §Testing.
- **ADR-026** — slot 26/26 stays reserved. Slice 2 follows ADR-022 prose contract verbatim; no new architectural decision is introduced.
- **Spec pack modifications** — `docs/`, `specs/`, `examples/`, `templates/`, `uat/` UNCHANGED for the schema pack proper; Block F updates `docs/19/27/28/29` which are post-pack surface, not the schema pack.

---

## Invariant Preservation

All 11 project invariants from `milestones/m1-onboard-2026-08-28.md` L28–50 are preserved unchanged. The m12 + m13 + m14 invariants (`AC-INV-schema`, `AC-INV-serverless`, `AC-INV-rdd`) are **preserved**:

- `AC-INV-schema` (no `specs/*.schema.json` modification) — preserved absolutely; re-asserted for m15 via AC-INV-schema (git diff vs `484e02a`).
- `AC-INV-serverless` (zero outbound application-API requests) — preserved; extended to slice-2 pages (`/catalog`, `/entity/...`) per AC-15.10 (served by `vite preview` against `snapshot-valid/`) + AC-INV-serverless.
- `AC-INV-rdd` (every CLI invocation records `argv` and `exit_code` to `cli-receipts.jsonl`) — preserved; m15's `cli-receipts.jsonl` is the cycle-scoped file under `cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/`.

The new invariants introduced by this cycle:

| Invariant | Source | Enforcement |
|---|---|---|
| `extension-isolation.spec.ts` zero cross-folder imports (each direction) | REQ-FEX-1 | AC-15.3 (Vitest + Bash grep) — the load-bearing UAT-M10-02 Pass clause |
| `apiVersion: 'control-plane.extensions/v1'` on every registered feature | REQ-EXR-1 | AC-15.2 (Bash grep) |
| `extensionRegistry` is sole mediator; features read only from store + `ExtensionContext` | REQ-FEX-1, REQ-FEX-3 | AC-15.3 (Bash grep `setState`, `set(`); EVT-FEX-01 (Vitest) |
| `useProjectionStore.catalogEntities` populated by `loadFrom` | REQ-PLP-1 (MODIFIED), REQ-CEP-4 | AC-15.7 (Vitest) + AC-DEBT-15.1 |
| `ProjectSource.refresh?()` removed from port | REQ-PLP-1 (MODIFIED) | AC-DEBT-15.3 (Bash grep + tsc --noEmit) |
| `KNOWN_KEYS` regex fallback dropped; unknown projName surfaces `synthetic('unknown-schema', …)` | REQ-PLP-4 (NEW) | AC-DEBT-15.6 (Bash grep + Vitest) |
| `validate<T>` unreachable export removed from `ajv.ts`; `registry.ts` `validate<T>` is canonical | REQ-PLP-5 (NEW) | AC-DEBT-15.5 (Bash grep + Vitest) |
| `routerReady` ghost state-effect removed from `App.tsx` | REQ-SAS-5 (NEW) | AC-DEBT-15.7 (Bash grep + Vitest) |
| `sourceLabel` rendered in `SourcePicker` header | REQ-SAS-6 (NEW) | AC-DEBT-15.2 (Bash grep + Vitest) |
| `/catalog` declared BEFORE `/entity/...` (F-004 oracle preserved) | REQ-CEP-1 | AC-15.4 (Bash grep line numbers) |
| 5 placeholder views replaced with domain content | REQ-SAS-1 (MODIFIED) | AC-DEBT-15.8 (Bash + component tests) |
| ADR count ≤ 26 | (carried forward) | AC-15.8 (no new ADRs for slice 2; slot 26/26 stays reserved) |
| `cli-receipts.jsonl` argv/exit_code recorded per SC-POL-1 | (carried forward) | AC-INV-rdd (JSONL parse) |
| `MANIFEST.json` `_meta.regenerated_at` + `_meta.regeneration_reason` updated | (carried forward) | AC-15.8 + AC-15.10 |
| Block F doc-update tasks are first-class with verifiable oracles | (launch packet directive) | AC-15.10 (per-doc grep + jq) |

---

## Next Recommended

`sddk-design` to deepen the architectural commitments made here (R-001 Dexie scope, R-002 Build schema, R-003 Radix pin, R-008 isolation enforcement, R-009 Character tab composition) into the file-level architecture, then `sddk-tasks` to decompose Blocks 0+A+B+C+D+E+F into implementation tasks for `sddk-apply`. Acceptance gates for apply phase:

- All 21 ACs (AC-15.1..15.11 + AC-DEBT-15.1..15.8 + AC-INV-schema + AC-INV-serverless + AC-INV-rdd) MUST pass before archive.
- Block 0 commits first as `feat(control-plane): catalog-store-extension-registry-debt-absorptions` (~310 LoC across ~13 new + ~7 modified files).
- Block A commits as `feat(control-plane): catalog-page-catalog-feature` (~200 LoC).
- Block B commits as `feat(control-plane): entity-page-route-view-content` (~260 LoC).
- Block C commits as `feat(control-plane): character-nora-feature-tabs` (~340 LoC).
- Block D commits as `feat(golden): nora-build-catalog-entity-fixtures` (~120 LoC across 4 fixtures + 2 modified).
- Block E commits as `test(control-plane): extension-registry-catalog-store-isolation` (~250 LoC across 6 new specs + 1 modified).
- Block F commits as `docs(control-plane): catalog-entity-pages-docs-manifest-stack-closeout` + `chore(manifest): regen-cp-catalog-entities-entries` (~120 LoC across 7 doc edits + MANIFEST regen).

**M15+ pivot**: M15 may promote `golden/control-plane/expanded-fixtures` (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) into a follow-on slice; M15 may also add ADR-026 if a future slice-3+ irreversibility decision warrants it (currently: not warranted, slot 26/26 stays reserved). Recorded natural split line: Split 2a = Blocks 0+A / Split 2b = Blocks B+C+D+E+F — do NOT activate without orchestrator override.
