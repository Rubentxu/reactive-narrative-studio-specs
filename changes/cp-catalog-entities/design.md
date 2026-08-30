# Design: cp-catalog-entities — Control Plane slice 2 (catalog store + entity pages + internal Extension Registry)

- **Cycle**: `p-7c4aff45199a2069/m15-cp-catalog-entities` (A-lite, branch `feat/m15-cp-catalog-entities-2026-08-30`, base `484e02a`).
- **Proposal SHA-256**: `bca39004ebd18bce88de57a53cbf63339b9d9ba790b7451ee1db33d2b99a1f82` (244 LoC; SHRINK = Dexie OUT; 0 new ADRs; Option B; 7 atomic blocks).
- **Spec SHA-256**: `b1f7674be9561f1b21da433db1c9d524a15361b64d3eea3a02eeaeebf0cdcca0` (455 LoC, 19 REQs, 19 EVTs, 21 ACs incl. AC-DEBT-15.1..15.8 + AC-15.10 doc-update oracles).
- **Architecture impact**: `boundary` — Extension Registry module + independent feature folders cross the prose-contracts ↔ executable-code seam (ADR-022 "internal and statically linked", docs/30 §No dynamic remote code). Falls back to the element-level table below (no `sddk-c4-likec4` selected; `which likec4` → not found — same precedent as m14 design.md §"Architecture Model" `unavailable`).
- **Context quality**: C2 (explore-report `04c9a1fc…` 480 LoC, gates G1–G10 PASS); durable knowledge: m14 cycle + 25 ADRs + docs/{19,25,28,29,30,34,35} + UAT-M10-02.

## Technical Approach

Slice 2 of the M10 arc (`docs/19-ROADMAP.md` §M10) is a **boundary surface** in a single pnpm workspace: the existing `control-plane/` SPA (m14 v0.6.0, branch `feat/release/v0.6.0` merged) gains an **Extension Registry** module + four **independent feature folders** that compose entity pages through the registry. The catalogue store (`useProjectionStore.catalogEntities`) flips from dead-write to populated (REQ-PLP-1 MODIFIED). The 5 placeholder views get real domain content (REQ-SAS-1 MODIFIED). 8 M14 LOW P3 findings absorb as natural Block-0 side-effects. 5+ doc updates ship as first-class Block-F tasks per the launch packet directive.

Four cross-cutting rules bind every block (carried from m14 design.md, strengthened): (1) **store is bottleneck** — extension registry reads `useProjectionStore` + `ExtensionContext.getProjection(key)` only; no port access from views; (2) **diagnostic-not-throw** — `validate<T>` in `ajv.ts` is deleted; `registry.ts` `validate<T>` is canonical; (3) **zero network at runtime** — `AC-INV-serverless` extends to `/catalog` and `/entity/...`; (4) **every source file satisfies its scenario's grep oracle** — REQ-FEX-1 is the load-bearing UAT-M10-02 Pass clause enforced by `extension-isolation.spec.ts`.

## Requirement Coverage

All 19 REQs land in a decision and a file. No decision extends the requirement surface.

| REQ | Scenario | Decision | Primary artifact |
|---|---|---|---|
| REQ-EXR-1..3 | EVT-EXR-01..03 | **D1** Extension Registry contract | `control-plane/src/extensions/{types,registry,predicates,index}.ts` |
| REQ-FEX-1..3 | EVT-FEX-01..03 | **D2** Feature folder isolation | `control-plane/src/features/{story,visual,catalog,continuity}/**`; `extension-isolation.spec.ts` |
| REQ-CEP-1..4 | EVT-CEP-01..04 | **D3** Routes + EntityPage composition | `control-plane/src/views/{Catalog,EntityPage}.tsx`; `routes/{router.ts,routes.tsx}` |
| REQ-PLP-1 MODIFIED, REQ-PLP-4..5 | EVT-PLP-01, EVT-PLP-04..05 | **D4** Loader decomposition + `refresh?` removal + `validate<T>` deletion | `control-plane/src/loader/{ProjectSource,SnapshotProjectSource}.ts`; `schema/ajv.ts`; `store/projectionStore.ts` |
| REQ-SAS-1 MODIFIED, REQ-SAS-5..7 | EVT-SAS-01, EVT-SAS-05..07 | **D5** Placeholder content + `routerReady` removal + `sourceLabel` render | `app/{App,SourcePicker}.tsx`; `views/{Overview,Story,Visual,QA,History}.tsx` |
| REQ-GFC-5..6 | EVT-GFC-05..06 | **D6** Nora + Build fixtures | `golden/control-plane/{project-valid,snapshot-valid}/{catalog/,nora,build}.yaml` |
| AC-15.10 (doc-update oracles) | — | **D7** Doc-update content plan | `docs/{19,27,28,29}*.md` + `control-plane/STACK.md` + `MANIFEST.json` + `README.md` |
| REQ-CEP-1 (route ordering) | EVT-CEP-01 | **D8** Route tree (catalog before entity) | `routes/{router.ts,routes.tsx}` |

## Architecture Decisions

### D1 — Extension Registry: compile-time `ControlPlaneFeature[]`, `apiVersion: 'control-plane.extensions/v1'`, no dynamic mutation

**Choice**: `control-plane/src/extensions/{types.ts, registry.ts, predicates.ts, index.ts}` exports a `ControlPlaneFeature[]` array literal registered at module-evaluation time. `ControlPlaneFeature` is a discriminated union of `EntityTabExtension` (carries `id`, `kind: 'tab'`, `targetKind`, `priority: number`, `predicate: ExtensionPredicate`, `render(ctx): ReactNode`) and `EntityCardExtension` (same shape with `kind: 'card'`). Both consume `ExtensionContext` which exposes `{ entity, getProjection<T>(key), now() }` — **no** Zustand mutator handle (REQ-EXR-2 enforces this). `apiVersion` is a `const` literal (`'control-plane.extensions/v1'`) on every feature object literal — compile-time-enforced. The registry's `resolveEntityTabs(entity)` returns features filtered by `predicate(entity)` then sorted ascending by `priority`; `resolveEntityCards(entity)` mirrors it. The four predicates (`kindIs`, `and`, `or`, `always`) live in `predicates.ts`. **No** `import()`, `eval()`, `fetch`, telemetry, HTTP, or post-init mutation — serverless invariant + ADR-022 verbatim.

**Alternatives considered**: (i) **plugin-host runtime** — explicitly rejected: docs/30 §"No dynamic remote code" + ADR-022 `"internal and statically linked"`; (ii) **registry-as-class** — rejected: a class invites dynamic `register()` after init, breaking REQ-EXR-1; (iii) **per-feature-file `index.ts` re-export** — possible, but it forces consumers to know every feature; the array literal centralises the surface in one grep-able place.

**Rationale**: the registry is the **single mediator** (EVT-FEX-02) — features register against it, `EntityPage` reads from it, nothing else does. EVT-EXR-02 greps `interface EntityTabExtension|interface EntityCardExtension|interface ExtensionContext` ≥ 3 and `setState|set(` = 0 (compile-time guarantees the consumer cannot mutate the store from inside an extension). EVT-EXR-01 greps `apiVersion: 'control-plane.extensions/v1'` ≥ 4 (every feature literal + module-level registry carry the const) and `fetch(|http.|telemetry` = 0 (serverless invariant preserved). Ratified by ADR-022.

### D2 — Feature folder isolation: `features/{story,visual,catalog,continuity}/`, enforced by `extension-isolation.spec.ts` (grep, not AST)

**Choice**: each feature folder lives under `control-plane/src/features/<name>/{character,project,entity}/index.ts`. Each `index.ts` is a registration side-effect that calls `extensionRegistry.register(feature)` for every tab/card the feature owns. The folder contains only its own components + that `index.ts`. `extension-isolation.spec.ts` (Vitest) runs **`child_process.execSync('grep -rE "from\\s+['\\"].*features/(story|visual|catalog|continuity)/" control-plane/src/features/')`** once per source folder and asserts the result array is `[]` for each of the four folders. Additionally it greps `from\s+['"]\.\./\.\./(story|visual|catalog|continuity)/` to block relative-escape imports. The Vitest assertion runs in `node` env (no jsdom) — the test is just a synchronous child-process check.

**Alternatives considered**: (i) **AST-based isolation via `ts-morph`** — rejected: a TS AST is a heavier dependency (~25 MB), Vitest + node-only is faster, and `grep` is the *literal* oracle the spec authors wrote (EVT-FEX-01 + AC-15.3 grep-test language). The grep test is the **testable form of UAT-M10-02's Pass clause** — replacing it with an AST introduces a second oracle to keep in sync. (ii) **ESLint `no-restricted-imports`** — rejected: lint is opt-in per consumer and not part of `pnpm test`; Vitest is the release gate. (iii) **per-feature package (npm/pnpm workspace member)** — rejected: 1-package-per-feature is Backstage-scale (docs/30 §"Only extract packages after genuine external consumers appear"); we have zero external consumers.

**Rationale**: the test must be **observable** in CI, not enforced by lint alone. `grep -rE` is the most readable form of "no cross-feature import"; the spec authors chose it; this design ratifies it. EVT-FEX-03 additionally greps `setState|\.set\(` = 0 across `control-plane/src/features/` (features cannot mutate Zustand directly) and `useProjectionStore|\.getProjection\(` ≥ 6 (every feature reads through one of the two sanctioned channels). The single mediator (registry) + the two read channels (store selectors, `ExtensionContext.getProjection`) are the *Information Bottleneck* the entropy section deepens.

### D3 — Character:Nora 5-tab composition (4 UAT-M10-02 facets + Visual DNA); Radix Tabs implementation

**Choice**: `control-plane/src/views/EntityPage.tsx` is a thin orchestrator (~140 LoC). On mount: (a) reads `$kind/$namespace/$name` from `useParams()`; (b) parses via `parseEntityRef()` → `{kind, namespace, name}` (REQ-CEP-3); (c) calls `catalogSelectors.byEntityRef(ref)` to find the entity in the store (REQ-CEP-4); (d) calls `extensionRegistry.resolveEntityTabs(entity)` + `resolveEntityCards(entity)`; (e) renders an `<EntityHeader>` from the catalog feature, a card strip (above the tabs) of `EntityCardExtension`s, then a Radix `@radix-ui/react-tabs` strip of `EntityTabExtension`s. **No** domain logic in `EntityPage` — it only orchestrates.

For Character:Nora, the 5 tabs (sorted ascending by `priority`) and their owners:

| Tab id | Feature owner | Target kind | Predicate | Priority | Data source |
|---|---|---|---|---|---|
| `overview` | story | `Character` | `kindIs('Character')` | 10 | `cp-characters`, `cp-chapters` |
| `arc` | story | `Character` | `kindIs('Character')` | 20 | `cp-characters.arc` |
| `scenes` | story | `Character` | `kindIs('Character')` | 30 | `cp-chapters` filtered by `relations` |
| `visual-dna` | visual | `Character` | `kindIs('Character')` | 40 | `cp-characters.visualDNA` |
| `continuity` | continuity | `Character` | `kindIs('Character')` | 50 | `cp-visual-quality.continuityStatus` |

**Plus** the card strip (above the tabs) for Character:Nora: `VisualCard` (visual), `MetadataCard` (catalog), `RelationsList` (catalog), `EntityHeader` (catalog). All 9 features are registered through their feature folder's `index.ts` at module-init time (EVT-FEX-02 asserts the registry exposes them after `import 'control-plane/src/features/story/character/index'`).

**Alternatives considered**: (i) **4 facets only** — the UAT-M10-02 Given clause exercises 4 (Overview + Visual Card + Scene Relations + Continuity Status); adding Visual DNA is per `docs/13` §Character and the proposal (§R-009) budgets ~30 LoC; no scope creep; (ii) **headless-ui tabs** — rejected: `docs/28` §Styling baseline pins "Radix UI" for accessible primitives; (iii) **build our own tab strip** — rejected: Radix Tabs is WCAG-correct out-of-the-box (focus management, `aria-selected`, keyboard nav) and slice 2 ships at v0.6.1 with no a11y debt.

**Rationale**: the priority sort is observable (EVT-EXR-01 asserts `priority: 30, 10, 20` ⇒ resolved `[10, 20, 30]`); the predicate-only dispatch is testable in `extension-registry.spec.ts` (EVT-EXR-03). `entity-page-composition.spec.ts` mounts `<EntityPage/>` with `Character:demo/nora` params against `snapshot-valid/` corpus and asserts the 4 UAT-M10-02 facets render (EVT-CEP-02). Radix Tabs is the only new dep — pinned per D5.

### D4 — Build entity: NO `cp-build.schema.json` — metadata-only entity; catalog store is the projection-key

**Choice**: `Build` is **metadata-only** in slice 2. The catalog store (`useProjectionStore.catalogEntities: CatalogEntity[]`) populated by `loadCatalogEntities()` helper carries every catalog entity validated through `BY_API_VERSION['narrative.dev/v1alpha1']` → `catalog-entity.schema.json` (REQ-CEP-4). `Build` appears in `catalog-entity.schema.json` §`kind` enum (line 21), and `catalogSelectors.byKind('Build')` returns it. There is **no** `cp-build.schema.json` and **no** `Build` projection key on `ProjectionBundle`. The Build entity surfaces in `/catalog` (one row) and `/entity/Build/demo/v0.6.0` (renders `EntityHeader` + `MetadataCard` + `RelationsList` from the catalog feature; no per-feature Build tabs/cards).

`projectionStore.loadFrom()` (Block-0 surface) populates **both**:
```ts
result.data.bundle       // ProjectionBundle (7 keys — UNCHANGED, EVT-GFC-03 invariant)
result.data.catalogEntities  // CatalogEntity[] — NEW, populated by loadCatalogEntities(files, snapshot)
```
The split is explicit because the `bundle` is a typed 7-key shape (`ProjectionBundle` interface, EVT-PLP-01) and `catalogEntities` is an open array of entities. `useProjectionStore.loadFrom(source, projectId)` now sets `{ status, bundle, catalogEntities, diagnostics, sourceLabel }` (REQ-PLP-1 MODIFIED).

**Alternatives considered**: (i) **add `cp-build.schema.json`** — rejected per R-002: UAT-M10-02 only navigates to Character:Nora, no Build entity page is exercised; adding a projection schema now is `Build` capability surface area without a binding gate; (ii) **add `Build` to `ProjectionBundle`** — rejected: `ProjectionBundle` is a closed 7-key type and `EVT-GFC-03` asserts exactly 7 keys; (iii) **defer Build entirely** — rejected: the proposal requires the Build fixture to validate `catalogSelectors.byKind('Build')` works; metadata-only is the minimal commitment.

**Rationale**: `CatalogEntity` is the *single* contract surface for entities (`docs/29` §Entity envelope + `docs/34` §Catalog entity `narrative.dev/v1alpha1`). Projection keys (`cp-*`) are *typed slices of bundle content*; Build has no slice. Metadata-only Build is the minimum needed to validate the registry + selectors + routes; Build-as-projection waits for slice 3+ when a Build entity page needs its own projection data. R-002 mitigation enforced.

### D5 — Radix Tabs exact pin: `@radix-ui/react-tabs@1.1.21` (resolved at apply); STACK.md T1 deviation if drift > patch

**Choice**: Block 0 adds `@radix-ui/react-tabs` with an **exact pin** (no `^`/`~`) per M14 D3 ladder. `pnpm view @radix-ui/react-tabs version` resolves to `1.1.21` at design time (Aug 2026). `peerDependencies` are `react ^16.8 || ^17.0 || ^18.0 || ^19.0` — fully compatible with the slice-1 `react@19.2.8`. The tier ladder (M14 D3):

| Tier | Condition vs `docs/28` baseline (Radix UI = pinned stable, no version) | Action |
|---|---|---|
| **T0** | patch drift inside the declared major (or `docs/28` baseline is itself unversioned, the default case) | Pin exact + record in `cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/resolved-versions.json`; no doc edit |
| **T1** | minor drift inside the declared major | Pin + record + append dated "resolved at m15 apply" line to `control-plane/STACK.md` |
| **T2** | major drift, undeclared baseline, or incompatible `engines` floor | Do not pin; escalate to orchestrator with evidence |

`docs/28` baseline declares "Radix UI pinned stable" with no version — apply defaults to **T0** (pin exact, no doc edit). If apply's `pnpm view` returns a different version, T1 deviation fires and `STACK.md` §"T1 Deviations (resolved at m15 apply)" appends a `- **@radix-ui/react-tabs**: docs/28 unversioned → resolved 1.X.Y (resolved at m15 apply)` entry.

**Alternatives considered**: (i) **no pin (use `^`)** — rejected: M14 D3 (`grep -cE '\^|~'` = 0 is EVT-CPS-01); (ii) **caret pin** — rejected same; (iii) **drop Radix Tabs** — rejected: see D3 (iii); (iv) **build our own tab strip** — rejected: same reason.

**Rationale**: M14 D3 ladder is the **decision procedure**, not a frozen version. `docs/28` §Styling baseline explicitly authorises adding "accessible primitives (tabs/dialogs/dropdowns/etc.)"; the pin + receipt is the executable form of "never silently". Apply re-resolves via `pnpm view @radix-ui/react-tabs version --json` and records `cli-receipts.jsonl` per AC-INV-rdd. Zero new transitive risks: `@radix-ui/react-tabs` is CSS-only consumer (no `framer-motion`, no `@radix-ui/react-presence`, no `@emotion/*`); R-012 mitigation recorded.

### D6 — `catalogSelectors` + `entityRef` modules; store slot populated inside `loadFrom`; `refresh?()` removal blast radius

**Choice**: two new pure-function modules:

```ts
// control-plane/src/store/catalogSelectors.ts (~60 LoC)
export const catalogSelectors = {
  byKind(kind: string): CatalogEntity[]
  byEntityRef(ref: EntityRef): CatalogEntity | undefined
  byNamespace(namespace: string): CatalogEntity[]
  count(kind: string): number
} as const;

// control-plane/src/store/entityRef.ts (~40 LoC)
export interface EntityRef { kind: string; namespace: string; name: string; }
export function parseEntityRef(s: string): EntityRef              // throws EntityRefParseError on malformed
export function formatEntityRef(ref: EntityRef): string           // inverts parse
export function toEntityRef(entity: CatalogEntity): EntityRef
export class EntityRefParseError extends Error { /* typed, carries input */ }
```

`useProjectionStore.loadFrom` (modified) populates `catalogEntities` from the new `loadCatalogEntities(files, snapshot)` helper inside `SnapshotProjectSource.load` (REFACTORED). `DirectoryProjectSource.load` follows the same path because it delegates to `SnapshotProjectSource.load`. The `refresh?()` method is **removed** from the `ProjectSource` port (REQ-PLP-1 MODIFIED; AC-DEBT-15.3 enforces `grep -cE 'refresh\?' control-plane/src/loader/ProjectSource.ts` = 0; `pnpm exec tsc --noEmit` exit 0 is compile-time proof no caller remains). Removal blast radius: **zero in-tree callers** — `useProjectionStore.loadFrom` is the only consumer and never calls `refresh`. Slice 3+ reintroduces `refresh?()` if an LSP-shaped contract warrants it.

**`SnapshotProjectSource.load` refactor** (DEBT-SMELLS-M14-001 + DEBT-OVERENG-M14-002 absorptions; REQ-PLP-4 NEW):

```ts
// Four named helpers exported from SnapshotProjectSource.ts:
export function parseManifest(files: ReadonlyArray<File>): Diagnostic<{ version?: string; projections: string[] }>
export function validateAndLoadProjections(files, names): Diagnostic<Record<string, unknown>>  // per-projection
export function loadCatalogEntities(files, snapshot): Diagnostic<CatalogEntity[]>                // REQ-CEP-4
export function assembleBundle(projections): ProjectionBundle                                      // 7-key

// Inside load():
const m = parseManifest(files);
if (!m.ok) return m;
const projDiag = validateAndLoadProjections(files, m.data.projections);
const catDiag = loadCatalogEntities(files);                              // NEW: catalog store population
if (!catDiag.ok) return catDiag;
// KNOWN_KEYS regex fallback DROPPED: unknown projName surfaces synthetic('unknown-schema', …)
// (DEBT-OVERENG-M14-002 absorption; AC-DEBT-15.6 enforces KNOWN_KEYS grep = 0)
return { ok: true, data: { bundle: assembleBundle(projDiag.data), catalogEntities: catDiag.data } };
```

`loadFrom` now sets `catalogEntities: result.data.catalogEntities` on success (alongside `bundle`); `DirectoryProjectSource.load` returns the same shape.

**Alternatives considered**: (i) **`refresh?()` stays but throws** — rejected: REQ-PLP-1 MODIFIED explicit; throwing is worse than removing; (ii) **`loadCatalogEntities` as private method** — rejected: REQ-PLP-4 EVT-PLP-04 requires the four helpers be **exported** for unit-test isolation (`grep -cE 'export function (parseManifest|validateAndLoadProjections|loadCatalogEntities|assembleBundle)'` ≥ 4); (iii) **single-monolith load with comments** — rejected: that's the smell; decomposition is the absorption.

**Rationale**: the helpers compose cleanly, each is testable, and the loader's path-traversal guard (`isSafeRelativePath`, `isAbsolutePath`) is preserved **verbatim** (AC-15.7 + EVT-PLP-01 enforces `grep -cE '\.\.|path\.resolve|isAbsolute'` ≥ 2). `ajv.ts` `validate<T>` unreachable export is **deleted** (REQ-PLP-5 NEW); the canonical `validate<T>` in `registry.ts` (which uses lazy compile via `get(id)`) remains the only validator entry point; AC-DEBT-15.5 enforces `grep -cE 'export function validate' control-plane/src/schema/ajv.ts` = 0 and `pnpm exec tsc --noEmit` exit 0.

### D7 — Doc-update content plan (AC-15.10 oracles)

Block F is first-class. Each update has a verifiable oracle (not a no-op). Per-document plan:

| Doc / File | Action | Verifiable oracle (AC-15.10) |
|---|---|---|
| `docs/29-NARRATIVE-CATALOG.md` | Add §"Catalog as implemented (m15 slice 2)" subsection documenting the `CatalogEntity` slot pattern + `/catalog` page rendering grouped by kind | `grep -cE 'CatalogEntity\|/catalog\|m15 slice 2' docs/29-NARRATIVE-CATALOG.md` ≥ 3 |
| `docs/27-GLOSSARY.md` | Add 5 terms: `CatalogEntity Store`, `Extension Registry`, `Entity Page`, `Feature Extension`, `Entity Reference` (each with one-paragraph definition referencing docs/30 + docs/34) | `grep -cE '^### (CatalogEntity Store|Extension Registry|Entity Page|Feature Extension|Entity Reference)' docs/27-GLOSSARY.md` == 5 |
| `docs/28-CONTROL-PLANE-STACK.md` | Add §"Radix Tabs pin (m15 slice 2)" line noting the `accessible primitives` baseline is now executable via `@radix-ui/react-tabs` exact pin per M14 D3 ladder | `grep -cE '@radix-ui/react-tabs\|Radix Tabs\|M14 D3' docs/28-CONTROL-PLANE-STACK.md` ≥ 2 |
| `control-plane/STACK.md` | Append T1 deviation entry **only if** apply's `pnpm view @radix-ui/react-tabs version` differs from design-time `1.1.21` (T0 default = no edit; T1 = append dated line per D5 ladder) | `grep -cE '## T1 Deviations\|@radix-ui/react-tabs' control-plane/STACK.md` ≥ 1 (T0 baseline already exists from m14) |
| `MANIFEST.json` | Regen per m13/m14 precedent: append entries for new files + update `_meta.regenerated_at` + `_meta.regeneration_reason: "m15: added cp-catalog-entities extension-registry, feature folders, views, tests, fixtures; 8 M14 debt findings absorbed"` | `jq -r '._meta.regenerated_at' MANIFEST.json` is newer than `._meta.created` |
| `docs/19-ROADMAP.md` §M10 | Add `### Slice 2 — done (m15)` sub-section marking UAT-M10-02 satisfied; advance M10 status indicator | `grep -cE 'Slice 2\|m15\|UAT-M10-02' docs/19-ROADMAP.md` ≥ 2 (in §M10) |
| `README.md` | Add `## Control Plane — Catalog + Entity Pages` section after the existing `## Control Plane — Foundation` section; link to `docs/13`, `docs/29`, `docs/30`, `UAT-M10-02` | `grep -cE 'Catalog + Entity Pages\|UAT-M10-02\|Extension Registry' README.md` ≥ 2 |

**Rationale**: each oracle is a `grep -cE` returning a definite number — the launch packet's "substantive not no-op" directive is enforceable at verify. AC-15.10 + AC-15.11 are first-class; `debt-verify` will re-grep them.

### D8 — Route tree: `/catalog` BEFORE `/entity/$kind/$namespace/$name` (F-004 oracle preservation)

**Choice**: in `control-plane/src/routes/{router.ts,routes.tsx}`, route declaration order is:

```ts
// routes.tsx (literal order — F-004 oracle: grep -nE "path:\\s*'/(catalog|entity/\\$kind)" routes.tsx)
export const routePaths = [
  "path: '/'",                              // existing
  "path: '/overview'",                      // existing
  "path: '/story'",                         // existing
  "path: '/visual'",                        // existing
  "path: '/qa'",                            // existing
  "path: '/history'",                       // existing
  "path: '/catalog'",                       // NEW — BEFORE entity wildcard (AC-15.4 + R-011)
  "path: '/entity/$kind/$namespace/$name'", // NEW — AFTER /catalog
] as const;
```

`router.ts` declares `createRoute(...)` for each in the same order (TanStack Router matches first-match-wins; the static `/catalog` path MUST precede the dynamic `/entity/$kind/$namespace/$name`). F-004 oracle (preserved from m14 — `grep -cE "path:\\s*'/…" routes.tsx` ≥ 6 for slice 1; AC-15.4 extends to ≥ 8 and enforces `/catalog` line number LESS than `/entity/...` line number).

**Alternatives considered**: (i) **TanStack Router pathless layout + nested children** — rejected: nesting complicates the F-004 grep oracle without buying clarity; the flat list is the established m14 pattern. (ii) **`/entity/$kind/...` route constraint (pre-parsing $kind against catalog-entity.schema.json enum)** — rejected: TanStack Router doesn't validate path params at compile-time; slice 3+ adds a constraint layer if needed; (iii) **`/catalog/:kind` + `/catalog/:kind/:namespace/:name`** — rejected: out of scope; the UAT-M10-02 only navigates `/catalog` (flat list) + `/entity/Character/demo/nora`.

**Rationale**: route ordering is a load-bearing oracle for the F-004 invariant (wildcard does not shadow static path). The `routes.tsx` literal-comment + matching TanStack Router declaration in `router.ts` is the smallest possible surface that satisfies the spec's grep test (AC-15.4 EVT-CEP-01) and the underlying routing semantics. The literal-string `routePaths` array in `routes.tsx` (from m14) becomes the grep oracle — Apply MUST keep the new entries inside the same `as const` literal.

## Data Flow

```
   golden/control-plane/snapshot-valid/                    specs/*.schema.json (16, READ-ONLY)
   manifest.json + projections/*.json + catalog/*.yaml                 │
           │                                                          │ import.meta.glob + 3 static imports (m14 D5)
           │  File[] | FileList                                        ▼
           ▼                                                 ┌────────────────────────┐
   ┌─────────────────────────┐   guard(..,abs) — VERBATIM   │ schema/registry.ts     │
   │ SnapshotProjectSource   │                              │  BY_API_VERSION        │  ← NEW: 'narrative.dev/v1alpha1' dispatches to catalog-entity
   │  parseManifest          │──── reject ──────┐           │  → CATALOG_ENTITY_ID   │
   │  validateAndLoadProjs   │                  │           └──────────┬─────────────┘
   │  loadCatalogEntities  ◄─┼── NEW (Block 0)  │                      │
   │  assembleBundle         │                  │                      │ AJV validate (lazy get(id))
   └────────────┬────────────┘                  │                      ▼
                │ Diagnostic<{bundle, catEntities}>                  ajv (no loadSchema, no http)
                │ ─────────────────────────────►                     │
                ▼                                                      │
       ┌──────────────────────────────────────────────────────────────┘
       │ store/projectionStore.ts (Zustand — THE BOTTLENECK)
       │  loadFrom sets: { bundle, catalogEntities, diagnostics, sourceLabel }
       │            ▲                                       ▲
       │            │                                       │
       │   useProjectionStore.getState()                    │
       │   + catalogSelectors.{byKind,byEntityRef,byNamespace,count}
       │   + parseEntityRef / formatEntityRef / toEntityRef
       ▼
   ┌─────────────────────────────┐    ┌─────────────────────────────────────┐
   │ views/Catalog.tsx           │    │ views/EntityPage.tsx               │
   │  /catalog (list by kind)    │    │  /entity/$kind/$namespace/$name     │
   │  rows → /entity/.../$name   │    │  parse → catalogSelectors          │
   └─────────────────────────────┘    │  → extensionRegistry.resolveEntityTabs/Cards
                                       │  → EntityHeader + card strip +     │
                                       │    Radix Tabs strip                │
                                       └────────────┬────────────────────────┘
                                                    │
                          extensionRegistry (the SOLE mediator)  ◄── register(feature) at module-init
                          ┌──────────────────────────────────────┘
                          │
   ┌──────────────────────┴───────────────────────────────────────────────────────┐
   │ features/story/character/{OverviewTab, ArcTab, ScenesTab}                    │
   │ features/visual/character/{VisualCard, VisualDNATab}                          │
   │ features/catalog/entity/{MetadataCard, RelationsList, EntityHeader}           │
   │ features/continuity/character/ContinuityStatusTab                             │
   │                                                                                │
   │  Each reads ONLY from: useProjectionStore (selectors) or ExtensionContext.  │
   │  ZERO cross-import (extension-isolation.spec.ts grep = 0, EVT-FEX-01).      │
   └───────────────────────────────────────────────────────────────────────────────┘
```

`docs/34` pipeline mapping: `bytes` (File) → `parse` (JSON.parse / YAML) → `schema select` (registry dispatch) → `AJV validate` → `normalize` (bundle assemble + catalogEntities) → `store` (Zustand with `catalogEntities` slot populated) → `render` (`/catalog` flat list + `/entity/...` composed of extensions). No arrow leaves the process; no fetch, no telemetry, no CDN — `AC-INV-serverless` extends to slice-2 pages.

## File Changes

| File | Action | Est. LoC | Description |
|---|---|---|---|
| `changes/cp-catalog-entities/design.md` | Create | this file | Technical design (canonical) |
| `changes/cp-catalog-entities/tasks.md` | Create (sddk-tasks) | ~330 | Block decomposition |
| `control-plane/src/extensions/types.ts` | Create | ~80 | `ControlPlaneFeature`, `EntityTabExtension`, `EntityCardExtension`, `ExtensionContext`, `EntityRef`, `EntityRefParseError` interfaces |
| `control-plane/src/extensions/predicates.ts` | Create | ~45 | `kindIs`, `and`, `or`, `always` predicate helpers |
| `control-plane/src/extensions/registry.ts` | Create | ~100 | `register(feature)`, `resolveEntityTabs(entity)`, `resolveEntityCards(entity)`, the `ControlPlaneFeature[]` array literal |
| `control-plane/src/extensions/index.ts` | Create | ~20 | Re-export the public surface; import all feature folder `index.ts` to register at app boot |
| `control-plane/src/store/catalogSelectors.ts` | Create | ~60 | `byKind`, `byEntityRef`, `byNamespace`, `count` (REQ-CEP-4) |
| `control-plane/src/store/entityRef.ts` | Create | ~40 | `parseEntityRef`, `formatEntityRef`, `toEntityRef`, `EntityRefParseError` (REQ-CEP-3) |
| `control-plane/src/store/projectionStore.ts` | Modify | +15 | Populate `catalogEntities` in `loadFrom` (REQ-PLP-1 MODIFIED; DEBT-COUPLING-M14-001) |
| `control-plane/src/loader/ProjectSource.ts` | Modify | -1 | **Remove** `refresh?()` from port (DEBT-ARCH-M14-001); keep exactly-7 bundle keys |
| `control-plane/src/loader/SnapshotProjectSource.ts` | Modify | +30 net | Refactor into 4 named exported helpers; drop `KNOWN_KEYS` regex fallback (DEBT-SMELLS-M14-001 + DEBT-OVERENG-M14-002); add `loadCatalogEntities` |
| `control-plane/src/loader/DirectoryProjectSource.ts` | Modify | +5 | Delegate to SnapshotProjectSource for both `bundle` + `catalogEntities` |
| `control-plane/src/schema/ajv.ts` | Modify | -10 | **Delete** unreachable `validate<T>` (DEBT-OVERENG-M14-001); keep `ajv` export for `get`/`compile` access |
| `control-plane/src/app/App.tsx` | Modify | -10 | **Remove** `routerReady` ghost state-effect; render `<RouterProvider>` directly (DEBT-OVERENG-M14-003) |
| `control-plane/src/app/SourcePicker.tsx` | Modify | +5 | Render `sourceLabel` in header (DEBT-COUPLING-M14-002) |
| `control-plane/src/views/Catalog.tsx` | Create | ~120 | `/catalog` page — `catalogSelectors.byKind` per kind; row links to `/entity/...` |
| `control-plane/src/views/EntityPage.tsx` | Create | ~140 | Orchestrator: parse ref → resolve entity → resolve tabs/cards → render header + card strip + Radix Tabs strip |
| `control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` | Modify (5) | ~80 net | Replace placeholders with domain content reading from bundle (DEBT-DUPLICATION-M14-001) |
| `control-plane/src/features/catalog/entity/{MetadataCard,RelationsList,EntityHeader}.tsx` | Create (3) | ~180 | Catalog feature cards |
| `control-plane/src/features/catalog/entity/index.ts` | Create | ~25 | Side-effect registration of the 3 catalog cards |
| `control-plane/src/features/story/character/{OverviewTab,ArcTab,ScenesTab}.tsx` | Create (3) | ~280 | Story feature tabs |
| `control-plane/src/features/story/character/index.ts` | Create | ~35 | Side-effect registration |
| `control-plane/src/features/visual/character/{VisualCard,VisualDNATab}.tsx` | Create (2) | ~220 | Visual feature card + tab |
| `control-plane/src/features/visual/character/index.ts` | Create | ~25 | Side-effect registration |
| `control-plane/src/features/continuity/character/ContinuityStatusTab.tsx` | Create | ~110 | Continuity feature tab |
| `control-plane/src/features/continuity/character/index.ts` | Create | ~20 | Side-effect registration |
| `control-plane/src/routes/router.ts` | Modify | +25 | Add `catalogRoute` + `entityRoute` in the F-004 ordering |
| `control-plane/src/routes/routes.tsx` | Modify | +2 | Append `'path: '/catalog'` and `'path: '/entity/$kind/$namespace/$name'` to `routePaths` literal |
| `control-plane/src/main.tsx` | Modify | +1 | Import `'./extensions'` (so all feature folders register at module-init) |
| `control-plane/package.json` | Modify | +2 | `@radix-ui/react-tabs` exact pin (D5); zero `^`/`~` (M14 D3) |
| `control-plane/pnpm-lock.yaml` | Modify (regen) | n/a | `pnpm install --frozen-lockfile` accepts the new dep |
| `control-plane/STACK.md` | Modify (conditional) | +1..3 | T1 deviation entry ONLY if Radix drift > patch (D5) |
| `control-plane/test/extension-registry.spec.ts` | Create | ~80 | EVT-EXR-01/02/03 |
| `control-plane/test/catalog-store.spec.ts` | Create | ~70 | EVT-CEP-03/04 + parseEntityRef round-trip |
| `control-plane/test/entity-page-composition.spec.ts` | Create | ~80 | EVT-CEP-02 (4 facets on Character:Nora) |
| `control-plane/test/extension-isolation.spec.ts` | Create | ~60 | EVT-FEX-01/02/03 grep tests |
| `control-plane/test/source-picker.spec.tsx` | Create | ~50 | EVT-SAS-06 |
| `control-plane/test/app.spec.tsx` | Create | ~40 | EVT-SAS-05 (no routerReady, no Loading…) |
| `control-plane/test/loader.snapshot.spec.ts` | Modify | +30 | EVT-PLP-01 + EVT-PLP-04 coverage (catalogEntities.length ≥ 3 + unknown-schema diagnostic) |
| `golden/control-plane/project-valid/nora.yaml` | Create | ~30 | Character entity with `name: nora`, populated `visualDNA` |
| `golden/control-plane/project-valid/build.yaml` | Create | ~25 | Build entity referencing `latestBuild` |
| `golden/control-plane/snapshot-valid/catalog/nora.yaml` | Create | ~30 | Mirror of project-valid/nora.yaml for snapshot UAT |
| `golden/control-plane/snapshot-valid/catalog/build.yaml` | Create | ~25 | Mirror of project-valid/build.yaml for snapshot UAT |
| `MANIFEST.json` | Modify (regen) | +~50 entries | m13/m14 precedent; `_meta.regenerated_at` + `_meta.regeneration_reason` updated |
| `docs/29-NARRATIVE-CATALOG.md` | Modify | +~30 | §Catalog as implemented (m15 slice 2) |
| `docs/27-GLOSSARY.md` | Modify | +~50 | 5 new terms |
| `docs/28-CONTROL-PLANE-STACK.md` | Modify | +~10 | §Radix Tabs pin (m15 slice 2) |
| `docs/19-ROADMAP.md` | Modify | +~20 | §M10 Slice 2 done |
| `README.md` | Modify | +~30 | §Control Plane — Catalog + Entity Pages |

**Net**: 30 new files, ~14 modified, 0 deleted. **LoC total**: ~1,840 (spec under-budget vs the ~1,570 proposal estimate because D7 doc-update tasks gained ~120 LoC and the entity-page test grew slightly). A-lite 6-block ceiling exceeded by 1 (Block F is mandatory doc closeout, per proposal §"Approach" + INC-002 size-exception precedent).

## Interfaces / Contracts

```ts
// control-plane/src/extensions/types.ts
export const EXTENSIONS_API_VERSION = 'control-plane.extensions/v1' as const;
export type ExtensionApiVersion = typeof EXTENSIONS_API_VERSION;

export interface EntityRef {
  readonly kind: string;
  readonly namespace: string;
  readonly name: string;
}

export interface ExtensionContext {
  readonly entity: CatalogEntity;                       // REQ-EXR-2
  readonly entityRef: EntityRef;
  getProjection<T = unknown>(key: string): T | undefined; // 'cp-characters' | 'cp-chapters' | …
  now(): Date;                                          // frozen clock for testability
}

export type ExtensionPredicate = (entity: CatalogEntity) => boolean;

export interface EntityTabExtension {
  readonly apiVersion: ExtensionApiVersion;             // const literal; compile-time enforced
  readonly id: string;                                  // 'overview' | 'arc' | 'scenes' | 'visual-dna' | 'continuity'
  readonly kind: 'tab';
  readonly targetKind: string;                          // 'Character' | 'Build' | 'NarrativeProject' | …
  readonly priority: number;                            // ascending; lower = earlier
  readonly predicate: ExtensionPredicate;               // kindIs('Character') | always() | and(...) | or(...)
  readonly title: string;                               // shown on the tab
  render(ctx: ExtensionContext): React.ReactElement;
}

export interface EntityCardExtension {
  readonly apiVersion: ExtensionApiVersion;
  readonly id: string;
  readonly kind: 'card';
  readonly targetKind: string;
  readonly priority: number;
  readonly predicate: ExtensionPredicate;
  render(ctx: ExtensionContext): React.ReactElement;
}

export type ControlPlaneFeature = EntityTabExtension | EntityCardExtension;

// control-plane/src/extensions/registry.ts
export interface ExtensionRegistry {
  register(feature: ControlPlaneFeature): void;
  resolveEntityTabs(entity: CatalogEntity): readonly EntityTabExtension[];
  resolveEntityCards(entity: CatalogEntity): readonly EntityCardExtension[];
}
export const extensionRegistry: ExtensionRegistry;     // module-singleton array literal

// control-plane/src/extensions/predicates.ts
export function kindIs(kind: string): ExtensionPredicate;
export function and(...preds: ExtensionPredicate[]): ExtensionPredicate;
export function or(...preds: ExtensionPredicate[]): ExtensionPredicate;
export function always(): ExtensionPredicate;

// control-plane/src/store/entityRef.ts
export function parseEntityRef(input: string): EntityRef;          // throws EntityRefParseError
export function formatEntityRef(ref: EntityRef): string;          // 'Character:demo/nora'
export function toEntityRef(entity: CatalogEntity): EntityRef;
export class EntityRefParseError extends Error { constructor(input: string); }

// control-plane/src/store/catalogSelectors.ts
export const catalogSelectors: {
  byKind(kind: string): CatalogEntity[];
  byEntityRef(ref: EntityRef): CatalogEntity | undefined;
  byNamespace(namespace: string): CatalogEntity[];
  count(kind: string): number;
};
```

Registry keying: `BY_API_VERSION['narrative.dev/v1alpha1']` (m14 D4) already routes catalog entities to `catalog-entity.schema.json`; slice 2 adds **no new schema entry** (REQ-CEP-4). The 7-key `ProjectionBundle` invariant is preserved (REQ-PLP-1 MODIFIED: `catalogEntities` lives alongside `bundle`, not inside it). Radix Tabs: `<Tabs.Root defaultValue="overview"><Tabs.List>{tabs.map(...)}</Tabs.List>{tabs.map(t => <Tabs.Content value={t.id} key={t.id}>{...}</Tabs.Content>)}</Tabs.Root>` — no state library wrapper, no `framer-motion` dependency.

## AC-Driven Source Constraints (normative for apply)

The EVT-* scenarios grep source text. `grep -c` counts **lines**. Apply MUST honour these or the ACs fail on correct code.

| Scenario | Oracle | Constraint on the source |
|---|---|---|
| EVT-EXR-01 | `grep -cE "apiVersion:\\s*'control-plane.extensions/v1'" control-plane/src/extensions/*.ts` ≥ 4 | Every feature literal + the module-level registry literal carry the const; no string variable. |
| EVT-EXR-01 | `grep -cE 'fetch\\(\|http\\.\|telemetry' control-plane/src/extensions/*.ts` = 0 | No remote code, no telemetry, no `http.` substring in extensions module. |
| EVT-EXR-02 | `grep -cE 'interface EntityTabExtension\|interface EntityCardExtension\|interface ExtensionContext' extensions/types.ts` ≥ 3 | Three interfaces declared. |
| EVT-EXR-02 | `grep -cE 'setState\|set\(' extensions/types.ts` = 0 | No Zustand mutator surface in `ExtensionContext`. |
| EVT-EXR-03 | `grep -cE 'export function (kindIs\|and\|or\|always)' extensions/predicates.ts` ≥ 4 | All four predicates exported. |
| EVT-FEX-01 | `grep -rE "from\\s+['\"].*features/(story\|visual\|catalog\|continuity)/" control-plane/src/features/` = 0 | The **load-bearing UAT-M10-02 Pass clause** — zero cross-folder imports. |
| EVT-FEX-01 | `grep -rE "from\\s+['\"]\\.\\./\\.\\./(story\|visual\|catalog\|continuity)/" control-plane/src/features/` = 0 | Relative-escape imports blocked. |
| EVT-FEX-03 | `grep -rE 'setState\|\.set\(' control-plane/src/features/` = 0 | Features cannot mutate Zustand. |
| EVT-FEX-03 | `grep -rE "useProjectionStore\|\.getProjection\(" control-plane/src/features/` ≥ 6 | Every feature reads through sanctioned channels. |
| EVT-CEP-01 | `grep -nE "path:\\s*'/(catalog\|entity/\\$kind)" routes/routes.tsx` ⇒ `/catalog` line number LESS than `/entity/...` line number | Route ordering oracle (F-004). |
| EVT-CEP-01 | `grep -cE "path:\\s*'/" routes/routes.tsx` ≥ 8 | Six slice-1 + `/catalog` + `/entity/...`. |
| EVT-CEP-01 | `grep -cE 'projectionStore\\(.+\\)\\.catalogEntities\|catalogSelectors\\.(byKind\|count)' views/Catalog.tsx` ≥ 2 | Catalog view consumes populated slot via selectors. |
| EVT-CEP-02 | `grep -cE "resolveEntityTabs\|resolveEntityCards" control-plane/src/` = 2 | Only `EntityPage.tsx` and `extensions/registry.ts` invoke them. |
| EVT-PLP-01 | `grep -cE 'refresh\\?' control-plane/src/loader/ProjectSource.ts` = 0 | Refresh method removed from port. |
| EVT-PLP-01 | `grep -cE '\\.\\.\|path\\.resolve\|isAbsolute' control-plane/src/loader/SnapshotProjectSource.ts` ≥ 2 | Path-traversal guard PRESERVED verbatim. |
| EVT-PLP-04 | `grep -cE 'export function (parseManifest\|validateAndLoadProjections\|loadCatalogEntities\|assembleBundle)' control-plane/src/loader/SnapshotProjectSource.ts` ≥ 4 | Four named helpers exported. |
| EVT-PLP-04 | `grep -cE 'KNOWN_KEYS' control-plane/src/loader/SnapshotProjectSource.ts` = 0 | Regex fallback dropped. |
| EVT-PLP-05 | `grep -cE 'export function validate' control-plane/src/schema/ajv.ts` = 0 | Unreachable export deleted. |
| EVT-PLP-05 | `grep -rE "from.*schema/ajv['\"]" control-plane/src/ \| grep -v 'ajv\\.(get\|compile\|errors)'` = 0 | No surviving importer of the deleted API. |
| EVT-SAS-01 | `grep -cE "path:\\s*'/" routes/routes.tsx` ≥ 8 (same as CEP-01) | Route count |
| EVT-SAS-01 | `grep -cE 'fetch\\(\|axios\|XMLHttpRequest\|http\\.get' control-plane/src/views/*.tsx` = 0 | Serverless invariant across slice-2 views. |
| EVT-SAS-05 | `grep -cE 'routerReady' control-plane/src/app/App.tsx` = 0 | Ghost state removed. |
| EVT-SAS-05 | `grep -cE '<RouterProvider' control-plane/src/app/App.tsx` ≥ 1 | Direct render. |
| EVT-SAS-06 | `grep -cE 'sourceLabel' control-plane/src/app/SourcePicker.tsx` ≥ 1 | Component reads from store. |
| EVT-SAS-07 | `grep -cE 'telemetry\|analytics\|google-fonts\|cdn\\.\|@sentry\|datadog\|axios\|fetch-polyfill' control-plane/package.json control-plane/src/**/*.{ts,tsx}` = 0 | Serverless invariant extended to slice-2 pages. |
| EVT-GFC-06 | `git diff --stat 484e02a..HEAD -- golden/control-plane/project-valid/ golden/control-plane/project-invalid-schema/ golden/control-plane/snapshot-valid/projections/` empty | Slice-1 fixtures preserved verbatim. |
| AC-INV-schema | `git diff --stat 484e02a..HEAD -- specs/*.schema.json` empty | No schema modified (m13/m14 AC-INV-schema binding). |

## Architecture Model

- **Impact**: `boundary`.
- **Observed baseline** (`484e02a`, post-v0.6.0 merge): `control-plane/` contains the slice-1 SPA (1 root + 13 `src/` + 5 `test/` + 16 fixtures + 2 manifest entries); no `extensions/`, no `features/`, no `views/Catalog.tsx`, no `views/EntityPage.tsx`. Element-level table follows.
- **Planned intent** (post-m15 apply): element-level table follows.
- **Render**: `unavailable` — `sddk-c4-likec4` was not selected by the launch plan; no LikeC4 renderer is on `PATH` (`which likec4` → not found). Fallback: the proposal's "Affected Areas" table is the canonical intent; this design deepens it to element level.

| Stable ID | Element | Observed (`484e02a`) | Planned (post-m15) |
|---|---|---|---|
| `cmp.extension-registry` | Extension Registry module | absent | `extensions/{types,predicates,registry,index}.ts` (4 files, ~245 LoC) — sole mediator |
| `cmp.feature-extensions` | Feature folders | absent | `features/{story,visual,catalog,continuity}/` — 11 components + 4 registration files |
| `cmp.catalog-store` | Catalog store slot | `catalogEntities: []` dead-write | populated by `loadCatalogEntities`; `catalogSelectors` + `entityRef` modules expose 4 selectors + 3 helpers |
| `cmp.entity-page` | Entity page surface | absent | `views/{Catalog,EntityPage}.tsx`; 5 placeholder views gain domain content |
| `cmp.routes` | Routes | 6 (slice 1) | 8 (add `/catalog` + `/entity/$kind/$namespace/$name`; F-004 ordering preserved) |
| `cmp.debt-absorptions` | M14 LOW P3 surface | 8 OPEN | 8 RESOLVED in Block 0 (catalogEntities, sourceLabel, refresh?, load helpers, validate<T> delete, KNOWN_KEYS drop, routerReady) |
| `ext.radix-tabs` | New pinned dep | absent | `@radix-ui/react-tabs@1.1.21` (T0 default; T1 if drift) |
| `ext.golden` | Fixture corpus | 16 (slice 1) | 20 (+ `nora.yaml`, `build.yaml` × 2 locations) |

**Evidence gaps**: no runtime C4 baseline exists for the new `extensions/` and `features/` modules because they are net-new in m15; the "Observed" column is filesystem evidence only (no executable behaviour at `484e02a` for those paths).

## Testing Strategy

| Layer | What | Approach | Env |
|---|---|---|---|
| Unit | `extensionRegistry.resolveEntityTabs` sort-by-priority, `kindIs`/`and`/`or`/`always` predicates, `apiVersion` const on every feature literal, no `fetch|http|telemetry` in extensions | `test/extension-registry.spec.ts` — `expect(extensionRegistry.resolveEntityTabs(nora)).toHaveLength(5)`; `expect(apiVersion).toBe<'control-plane.extensions/v1'>('control-plane.extensions/v1')`; grep snapshot | node |
| Unit | `parseEntityRef` round-trip; `formatEntityRef` inverts; malformed throws `EntityRefParseError`; `toEntityRef` derives from `CatalogEntity`; `catalogSelectors.{byKind,byEntityRef,byNamespace,count}` return correct projections over snapshot-valid corpus | `test/catalog-store.spec.ts` + `test/support/fixtures.ts` | node |
| Component | `<EntityPage/>` mounted with `Character:demo/nora` params renders `EntityHeader` + `VisualCard` + `MetadataCard` + `RelationsList` + 5 tabs (Overview + Arc + Scenes + Visual DNA + Continuity); 4 UAT-M10-02 facets explicit | `test/entity-page-composition.spec.ts` — Testing Library `render(<EntityPage params={{kind:'Character',namespace:'demo',name:'nora'}}/>)` | jsdom |
| Component | `<SourcePicker/>` renders `sourceLabel` from store (or empty fallback when `null`); `<App/>` renders `<RouterProvider/>` synchronously without `routerReady` | `test/source-picker.spec.tsx`, `test/app.spec.tsx` | jsdom |
| Isolation | `grep -rE "from\\s+['\"].*features/(story\|visual\|catalog\|continuity)/" control-plane/src/features/` returns `[]` per source folder; `grep -rE 'setState\\|\\.set\\('` returns 0; `grep -rE "useProjectionStore\\|\\.getProjection\\("` ≥ 6 | `test/extension-isolation.spec.ts` — `child_process.execSync` + assertions | node |
| Integration | `SnapshotProjectSource.load(snapshot-valid)` returns `ok:true` with `bundle` (7 keys) + `catalogEntities` (≥ 3: NarrativeProject:demo-project + Character:demo/nora + Build:demo/v0.6.0); unknown `projName` ⇒ `synthetic('unknown-schema', …)`; path-traversal guard PRESERVED | `test/loader.snapshot.spec.ts` (extended) + `test/support/fixtures.ts` | node |
| Build | `pnpm exec tsc --noEmit` (3 strict flags); `pnpm build` ⇒ `dist/index.html`; `pnpm exec vite preview` serves `/catalog` + `/entity/Character/demo/nora` | Bash, each command receipted to `cli-receipts.jsonl` | Node 24 LTS |
| Manual UAT | UAT-M10-02: `vite preview`, load `snapshot-valid/`, navigate `/catalog` then `/entity/Character/demo/nora`, confirm 4 facets render through independently-registered extensions; DevTools Network panel shows zero outbound application-API requests | `control-plane/README.md` smoke recipe | browser |

Every command appends `{"argv": […], "exit_code": N, "command": "…", "timestamp": "…"}` to `cycle-artifacts/p-7c4aff45199a2069/m15-cp-catalog-entities/cli-receipts.jsonl` (AC-INV-rdd). Slice-1 22/22 vitest must remain green throughout Block 0 (AC-15.9 + AC-DEBT-15.x); slice-2 adds 6 new spec files (extension-registry, catalog-store, entity-page-composition, extension-isolation, source-picker, app) plus extends loader.snapshot.spec.ts.

## Migration / Rollout

No data migration, no feature flag, no runtime state. Seven atomic per-block commits (M14 precedent-supported size-exception; A-lite 6-block ceiling exceeded by 1):

| Block | Commit | LoC |
|---|---|---|
| **0** | `feat(control-plane): catalog-store-extension-registry-debt-absorptions` | ~310 |
| **A** | `feat(control-plane): catalog-page-catalog-feature` | ~200 |
| **B** | `feat(control-plane): entity-page-route-view-content` | ~260 |
| **C** | `feat(control-plane): character-nora-feature-tabs` | ~340 |
| **D** | `feat(golden): nora-build-catalog-entity-fixtures` | ~120 |
| **E** | `test(control-plane): extension-registry-catalog-store-isolation` | ~250 |
| **F** | `docs(control-plane): catalog-entity-pages-docs-manifest-stack-closeout` + `chore(manifest): regen-cp-catalog-entities-entries` | ~120 |

Released under tag `v0.6.1` (PATCH bump per semver for incremental control-plane slice); release notes link to UAT-M10-02 evidence (`extension-isolation.spec.ts` PASS + `entity-page-composition.spec.ts` PASS). Full rollback: `git revert v0.6.0..v0.6.1` or `--no-commit <first>..<last>`. Block 0's foundation (catalog store + extension registry) is removable without Blocks A–F (registry falls back to "no extensions registered" → empty page). Block F doc/MANIFEST updates removable without A–E.

## Entropy Delta (extends spec §Entropy Metrics)

- **CoN ↓** — feature identity is now a typed dispatch table (`extensionRegistry` with `apiVersion: 'control-plane.extensions/v1'` const + `priority` sort + `predicate` filter) instead of placeholder-IDs; the `control-plane/project/v1` collision (m14 D4) is unchanged.
- **CoV ↓** — `extension-isolation.spec.ts` enforces zero cross-folder imports in each direction; the load-bearing UAT-M10-02 Pass clause is now an executable oracle.
- **CoT ↓** — `catalogEntities: CatalogEntity[]` flips from dead-write to typed slot; `CatalogEntity` is validated through `BY_API_VERSION['narrative.dev/v1alpha1']` (m14 D4) with no schema mutation.
- **IB ↑** — exactly one bottleneck per side: `useProjectionStore` (loader → store), `extensionRegistry` (cross-feature composition); `EntityPage` reads ONLY from these two; features read ONLY from store selectors + `ExtensionContext`.
- **SOLID entropy** (SRP/OCP at the boundary layer) — `SnapshotProjectSource.load` 82-LoC monolith decomposed into 4 named helpers (`parseManifest`, `validateAndLoadProjections`, `loadCatalogEntities`, `assembleBundle`); `EntityPage` orchestrates features but contains no domain logic; each feature folder has one responsibility; new feature added via one `index.ts` registration.
- **DQS ↑** — 7 new components (Catalog + EntityPage + 4 feature folders), 6 new Vitest specs, Extension Registry module, 4 fixtures, 8 M14 debt findings absorbed, 5+ doc updates.

## Open Questions

- [ ] None blocking. Radix Tabs exact pin + transitive risks are resolved procedurally by D5 (M14 D3 ladder); apply records which tier it took. TypeScript 7.0.2 from m14 is unchanged.

## ADR Candidates

- **None.** Each candidate was tested against all three criteria (hard to reverse + surprising + real trade-off):
  - D1's `apiVersion: 'control-plane.extensions/v1'` const + `compile-time` registration are forced by ADR-022 + docs/30 §No dynamic remote code (no trade-off, only one implementable option per the prose contract).
  - D2's grep-based isolation (vs AST) ratifies the spec author's oracle verbatim — same rationale.
  - D4's metadata-only Build (no `cp-build.schema.json`) is R-002-mitigated and deferred per launch packet.
  - D5's Radix Tabs pin + ladder is M14 D3 precedent — already accepted.
  - D6's `refresh?()` removal is `ProjectSource` port simplification, not a reversal.
  - D7's doc-update oracles are launch packet directive, not architectural decisions.
  - D8's route ordering is F-004 preservation, not new.
  ADR count stays at **25**, slot 26/26 reserved (AC-15.8).

## Block Decomposition

| Block | Capability | Files | Est. LoC | Commit |
|---|---|---|---|---|
| **0** | `extension-registry` + `feature-extensions` (foundation) + 8 M14 debt absorptions + Radix Tabs pin | ~13 new + ~7 modified | ~310 | `feat(control-plane): catalog-store-extension-registry-debt-absorptions` |
| **A** | `catalog-and-entity-pages` (catalog page + catalog feature + route wiring) | ~6 new + 2 modified | ~200 | `feat(control-plane): catalog-page-catalog-feature` |
| **B** | `catalog-and-entity-pages` (entity page route + view + 5 placeholder domain-content) | ~1 new + 6 modified | ~260 | `feat(control-plane): entity-page-route-view-content` |
| **C** | `feature-extensions` (Character:Nora composition: story + visual + continuity) | ~6 new | ~340 | `feat(control-plane): character-nora-feature-tabs` |
| **D** | `golden-fixture-corpus` (Nora + Build fixtures, project-valid + snapshot-valid) | ~4 new + 2 modified | ~120 | `feat(golden): nora-build-catalog-entity-fixtures` |
| **E** | tests (extension-registry + catalog-store + entity-page-composition + extension-isolation + source-picker + app + loader.snapshot extension) | ~6 new + 1 modified | ~250 | `test(control-plane): extension-registry-catalog-store-isolation` |
| **F** | doc-update closeout + MANIFEST regen | ~10 doc edits + 3 new change artifacts | ~120 | `docs(control-plane): catalog-entity-pages-docs-manifest-stack-closeout` + `chore(manifest): regen-cp-catalog-entities-entries` |

Ordering constraint: **0 before A,B,C,D,E** (foundation: extension registry + populated catalog slot + decomposed loader + removed `refresh?`); **D before E** (tests consume fixtures); **A,B,C,D interleaved before E** (entity-page test requires A+B+C features); **F last** (closeout consumes resolved block state). A-lite 6-block ceiling exceeded by 1 due to mandatory Block F (recorded natural split line: Split 2a = Blocks 0+A / Split 2b = Blocks B+C+D+E+F — do NOT activate without orchestrator override).

## Design-Time Evidence

| Probe | Source | Result | Feeds |
|---|---|---|---|
| Catalog schema `kind` enum | `jq '.properties.kind.enum' specs/catalog-entity.schema.json` | 11 values incl. `Build` (line 21) | D4 |
| Existing catalog slot dead-write | `grep -cE 'catalogEntities' control-plane/src/store/projectionStore.ts` | 2 (state init + reset only; never populated) | D6 |
| `refresh?()` callers | `grep -rE '\.refresh\?\(' control-plane/src/` | 0 (zero in-tree callers; removal is safe) | D6 |
| `validate<T>` importers | `grep -rE "from.*schema/ajv['\"]" control-plane/src/ \| grep -v 'ajv\\.(get\\|compile\\|errors)'` | 0 (unreachable export) | D6 |
| `routerReady` callers | `grep -rE 'routerReady' control-plane/src/` | 1 (only App.tsx) | D6 |
| 5 placeholder views | `wc -l control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` | 8..15 LoC each (placeholders) | D6 |
| Radix Tabs version | `pnpm view @radix-ui/react-tabs version` | 1.1.21 (Aug 2026) | D5 |
| Radix Tabs peerDeps | `pnpm view @radix-ui/react-tabs peerDependencies` | `react ^16.8 \|\| ^17.0 \|\| ^18.0 \|\| ^19.0` (compatible with 19.2.8) | D5 |
| C4 renderer | `which likec4` | not found | §Architecture Model |
| Build kind presence | `grep -cE 'Build' specs/catalog-entity.schema.json` | ≥ 1 (in enum) | D4 |

## Next Recommended

`sddk-tasks` — decompose Blocks 0/A–F into apply tasks, carrying §"AC-Driven Source Constraints" verbatim into the task acceptance text, and gating Block A on the D5 resolution + smoke-gate receipts.