# m10-2-capability-catalog — Capability Catalog (M10.2 — read-only CP projections/pages for Skills, Packs, Profiles, Comfy workflows, Image providers, Recipes) — Delta Spec

## Source

- **Proposal SHA-256**: `2dc5a09a8331587a69819bebbb0594d8112098f754aee6baefdbccb94369e933` (`changes/m10-2-capability-catalog/proposal.md`, 838 LoC, committed `a48214d` on `feat/m10-2-capability-catalog`).
- **Roadmap anchor**: `docs/19-ROADMAP.md` § M10.2 ("Catalog projections/pages for Skills; Packs; Profiles; Comfy workflows; image providers/capabilities; recipes. Make the Studio explain the creative toolchain as well as individual books.") and § Exit.
- **Conceptual design**: `docs/29-NARRATIVE-CATALOG.md` §"Capability Catalog, M10.2" (lines 34-41) + §"Capability Catalog" prose template (lines 175-198) — the target rendering pattern (`Workflow: illustration-v4` → Capabilities → Usage → Current hash).
- **ADR bindings**: ADR-021 (catalog projection — `CatalogEntity` slot reused for capability kinds; `specs/catalog-entity.schema.json:23-30` already lists the 6 kinds in `kind` enum); ADR-022 (extension model — capabilities integrate via the existing Extension Registry; `apiVersion: 'control-plane.extensions/v1'` preserved verbatim); ADR-024 (client-side federated catalog — M10.2 is single-project, NOT multi-project; the catalog federation boundary is M10.3 territory per `docs/35-CATALOG-PROVIDERS.md` and Dexie-blocked per m10 invariant).
- **Stack binding**: `docs/28-CONTROL-PLANE-STACK.md` (Vite 8.2.2 / React 19.2.8 / TanStack Router 1.170.32 / Tailwind 4.3.3 / Ajv 8.20.0 / Vitest 4.1.11 baseline); `import.meta.glob` for build-time static file enumeration (Vite 8.2 supports `?raw` and `?url` import suffixes — m16 precedent at `docs/32-NARRATIVE-DOCS-SEARCH.md` §"Index persistence" confirms in-memory only).
- **Baseline**: branch `feat/m10-2-capability-catalog` HEAD `6c7a7aed09c74773cb2bd6e614336fe621d259aa` (one commit past the orchestrator-stated `364571c5e9685cc86775aed4e425d87e0e380e05`: the `chore(roadmap): serialize m10.2 capability-catalog cycle as in_progress` roadmap marker — **not** a content change).
- **Target branch** (apply): `feat/m10-2-capability-catalog` (cycle-local branch; no separate apply branch).
- **Path**: A-lite, execution mode `auto`; **version target**: **v0.10.0 (MINOR)** — incremental capability surface over v0.9.0. 0 new pinned deps expected (everything is `import.meta.glob` + already-pinned dependencies); 0 new ADRs.
- **Rounds**: 1 (m10.2; M10.3 multi-project is a separate future cycle, blocked by m10 invariant on Dexie/IndexedDB).
- **Capability IDs** (3 NEW; names reused verbatim from proposal §"Capabilities"): `capability-manifest-system` (NEW), `capability-catalog-feature` (NEW), `capability-detail-page` (NEW). 0 MODIFIED capabilities. The 6 m14/m15/m16/m10.1 capability surfaces are **consumed but not modified** at spec level (`catalog-and-entity-pages`, `safe-narrative-docs`, `serverless-app-shell`, `local-search-index`, `creation-recipe-system`, `recipe-wizard-feature`, `projection-loader-port`, `extension-registry`, `golden-fixture-corpus`, `schema-validation-pipeline`).
- **Binding exit criterion**: `uat/UAT-M10-06-capability-catalog.md` (NEW file authored in this phase per UAT-M10-03 / UAT-M10-04 precedent) — Given a loaded project snapshot, When the user navigates to `/capabilities`, Then 6 kind sections render with accurate counts (skills=3, packs=4, profiles=2, workflows=1, providers=0, recipes=1) enumerated from canonical sources at HEAD `364571c`, AND drilling into `/capabilities/{kind}/{namespace}/{name}` renders a read-only entity page using the m16 `EntityHeader` + `MetadataCard` + `RelationsList` projection; **Pass** = every kind renders ≥ 1 entry from the bundled seed data + no `fetch(`, no Dexie/IndexedDB, no `useProjectionStore` write paths, and the catalog reads do not mutate `ProjectionBundle`.
- **Test baseline (must remain green)**: 19 m10.1 vitest spec files (15 m16 specs + 3 new m10.1 specs `recipe-roundtrip.spec.ts` + `recipe-template-engine.spec.ts` + `recipe-wizard.feature.spec.ts` + 1 extended spec `extension-isolation.spec.ts`); final count grows by ≥ 3 new specs (`capability-catalog.spec.ts` + `capability-parsers.spec.ts` + `capability-isolation.spec.ts`) + 2 extended specs (`extension-isolation.spec.ts` test 4 grep oracle extended for `features/capability-catalog/`; `routes-router.spec.ts` F-004 oracle update).

## Purpose

M10.2 closes the binding gate `uat/UAT-M10-06-capability-catalog.md` on the m10.1 v0.9.0 + m16 v0.8.0 + m15 v0.7.0 + m14 v0.6.0 baseline. Slice 1 (m14) shipped the projection loader, 5 placeholder views, and the serverless SPA shell. Slice 2 (m15) shipped the catalog store + Extension Registry + entity pages + 8-tab composition. Slice 3a (m16) shipped Local Search + safe Narrative Docs + Decision projection + Markdown entity-doc rendering. Slice M10.1 shipped Creation Recipes (RJSF wizard + CLI `narrative init` + round-trip equivalence). **M10.2 ships the Capability Catalog**: a read-only CP surface that surfaces the creative toolchain (Skills, Packs, Profiles, Comfy Workflows, Image Providers, Recipes) as first-class catalog entities, enumerated from on-disk files via Vite's build-time `import.meta.glob` and rendered by reusing the m16 `EntityHeader` + `MetadataCard` + `RelationsList` projection via the existing Extension Registry. **No new schemas. No new dependencies. No new ADRs.** The capability manifest is purely a projection over existing schemas and existing files.

After this delta:

1. **`capability-manifest-system` (NEW)** — the build-time static manifest produced by 6 `import.meta.glob` calls: skills (`examples/skills/*/SKILL.md`), recipes (`recipes/*/recipe.yaml`), project-scoped profiles (`recipes/*/skeleton/profiles/*.yaml`), project-scoped pack markdown (`recipes/*/skeleton/packs/*/*.md`), Comfy workflows (`control-plane/workflows/comfyui/*.workflow.json`), and global profiles (`examples/*.yaml`, pre-filtered to profile-shape YAML only by `schema: profile/v1` const). The manifest is composed of 5 typed parsers (`parseSkillMarkdown`, `parsePackMarkdown`, `parseProfileYaml`, `parseWorkflowJson`, `parseRecipeYaml`) + 1 explicit empty-state function (`parseProvidersYaml` returning `[]`). The `CapabilityManifest` type + `loadManifest()` function live in `control-plane/src/features/capability-catalog/manifest.ts`; `useCapabilityManifest()` is a memoized React hook; `capabilitySelectors.{byKind,byEntityRef,crossReferences}` are pure selectors.
2. **`capability-catalog-feature` (NEW)** — the V1 read-only catalog UI surface: `/capabilities` overview + 6 per-kind pages (`/capabilities/{skills|packs|profiles|workflows|providers|recipes}`) + 1 shared parameterized detail route (`/capabilities/$kind/$namespace/$name`). The overview renders 6 kind sections with counts and "see all" links; per-kind pages enumerate entries with metadata badges (scope for profiles; pack-KIND for packs); the providers page renders an explicit empty-state fixture when 0 providers exist. The feature is the 7th independent feature folder under `control-plane/src/features/capability-catalog/` (the m15 grep invariant extended per m16 INC-008 fix precedent). 6 NEW `EntityCardExtension`s register against the existing Extension Registry (one per capability kind).
3. **`capability-detail-page` (NEW)** — the per-entity detail view at `/capabilities/$kind/$namespace/$name` that REUSES m16's `features/catalog/entity/{EntityHeader,MetadataCard,RelationsList}` (m15/m16 unchanged) via the Extension Registry (`extensionRegistry.resolveEntityCards`). The detail page synthesizes a `CatalogEntity` from the parsed `CapabilityEntry` (kind/namespace/name/title/description/annotations) and lets the existing extension surface render the projection. Markdown content (`SKILL.md`, pack `.md` files) renders through the m16 `docsSafeMarkdown` + `entityLinkPlugin` pipeline (GFM-safe; `[[Kind:namespace/name]]` cross-links resolved). **No direct import of `features/catalog/entity/`** — the isolation contract is preserved via Extension Registry resolution.

After this delta, `uat/UAT-M10-06-capability-catalog.md` is satisfied and the M10.2 closeout task in `docs/19-ROADMAP.md` §M10.2 advances to done.

---

## Capabilities

> CONTRACT with sddk-verify. All 3 capability names below are NET-NEW (no existing capability is modified at spec level; M10.2 is purely projection + UI). **Names MUST be reused verbatim in the vault by sddk-archive.**

| Capability | Status | Backing files | Invariants enforced |
|---|---|---|---|
| `capability-manifest-system` | **NEW** | `control-plane/src/features/capability-catalog/{manifest,parser,useCapabilityManifest,capabilitySelectors}.ts` + `golden/control-plane/snapshot-valid/capabilities/*.json` (12 fixtures) | serverless (build-time globs); no-Dexie (no persistence); static-build (`import.meta.glob` resolves at `vite build`) |
| `capability-catalog-feature` | **NEW** | `control-plane/src/features/capability-catalog/{index.tsx,views/{Overview,KindList}.tsx}` + `control-plane/src/styles.css` (~30 LoC new CSS) + `control-plane/src/routes/{router.ts,routes.tsx}` | no-write-CP (zero `useProjectionStore` import in `features/capability-catalog/`); additive-only-schema (no `specs/*.schema.json` modified) |
| `capability-detail-page` | **NEW** | `control-plane/src/features/capability-catalog/views/CapabilityDetail.tsx` (reuses m16 components via Extension Registry); no direct `import` of `features/catalog/entity/` | extension-isolation (reuse-via-registry); additive-only-schema; no-write-CP |

| Status | Count | Names |
|---|---:|---|
| NEW | 3 | `capability-manifest-system`, `capability-catalog-feature`, `capability-detail-page` |
| MODIFIED | 0 | — |
| REMOVED | 0 | — (m10 invariant: zero removals) |

---

## Requirements

### Requirement: REQ-CR-CAP-1 — Capability manifest system: 6 `import.meta.glob` calls + `CapabilityManifest` type + `loadManifest()` build-time enumeration

The system SHALL expose a pure `loadManifest()` function in `control-plane/src/features/capability-catalog/manifest.ts` that synchronously composes a `CapabilityManifest` record from 6 `import.meta.glob` calls at module-init:

```text
import.meta.glob('/examples/skills/*\/SKILL.md',                     { query: '?raw', import: 'default', eager: true })
import.meta.glob('/recipes/*/recipe.yaml',                           { query: '?raw', import: 'default', eager: true })
import.meta.glob('/recipes/*/skeleton/profiles/*.yaml',              { query: '?raw', import: 'default', eager: true })
import.meta.glob('/recipes/*/skeleton/packs/*/*.md',                 { query: '?raw', import: 'default', eager: true })
import.meta.glob('/control-plane/workflows/comfyui/*.workflow.json', { query: '?raw', import: 'default', eager: true })
import.meta.glob('/examples/*.yaml',                                 { query: '?raw', import: 'default', eager: true }) // pre-filtered to schema: 'profile/v1'
```

Each glob SHALL return a synchronous `Record<string, string>` keyed by file path. The manifest SHALL be embedded in the static bundle at `vite build` time; SHALL resolve to zero runtime I/O; SHALL NOT use IndexedDB, SHALL NOT use Orama, SHALL NOT issue any network request. The bundle-size impact SHALL be ≤ 15KB gzipped (well below the 1.5MB gzipped post-M10 budget per `docs/28-CONTROL-PLANE-STACK.md` §"Dependency governance"). The manifest SHALL expose `skills: CapabilityEntry[]`, `packs: CapabilityEntry[]`, `profiles: CapabilityEntry[]`, `workflows: CapabilityEntry[]`, `providers: CapabilityEntry[]`, `recipes: CapabilityEntry[]`. The `CapabilityEntry` shape SHALL carry `{ kind, namespace, name, title, description, sourcePath, scope, crossRefs }` (the full type per `control-plane/src/features/capability-catalog/manifest.ts:CapabilityEntry`).

#### Scenario: EVT-CAP-1a — All 6 globs produce non-empty records at HEAD 364571c (counts match proposal §"Data coverage")

- **GIVEN** apply Block 0 lands and `control-plane/src/features/capability-catalog/manifest.ts` declares the 6 `import.meta.glob` calls
- **WHEN** `pnpm test --run control-plane/test/capability-catalog.spec.ts` invokes `loadManifest()` against the bundled build
- **THEN** the returned manifest SHALL carry `skills.length === 3` (`examples/skills/{character-consistency,narrative-arc,scene-validator}/SKILL.md`) AND `packs.length === 4` (`recipes/middle-grade-illustrated/skeleton/packs/{story_core,characters,editorial,visual_core}/*.md`) AND `profiles.length === 2` (`examples/middle-grade-profile.yaml` + `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml`) AND `workflows.length === 1` (`control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json`) AND `providers.length === 0` (no `examples/*.provider.yaml` exists) AND `recipes.length === 1` (`recipes/middle-grade-illustrated/recipe.yaml`) — totals 11 entries (3+4+2+1+0+1)
- **AND** `grep -cE 'import\.meta\.glob' control-plane/src/features/capability-catalog/manifest.ts` SHALL be `>= 6` (all 6 globs present in source)
- **AND** `grep -cE 'indexeddb|Dexie|orama|fetch\(' control-plane/src/features/capability-catalog/manifest.ts` SHALL return `0` (no persistence, no remote code).
- **AND** `pnpm --filter control-plane build` SHALL succeed with bundle-size impact ≤ 15KB gzipped for the manifest module.

#### Scenario: EVT-CAP-1b — Manifest round-trip: `parseSkillMarkdown(rawSkill) === expectedFixture` for all 3 skills; same round-trip for the 4 packs + 2 profiles + 1 workflow + 1 recipe + 0 providers

- **GIVEN** apply Blocks 0 + 3 land and `golden/control-plane/snapshot-valid/capabilities/*.json` carries 12 fixtures (3 skill + 4 pack + 2 profile + 1 workflow + 0 provider + 1 recipe + 1 `providers-empty.json` empty-state fixture)
- **WHEN** `pnpm test --run control-plane/test/capability-parsers.spec.ts` invokes each of the 5 parsers against the raw glob content keyed by the same file path
- **THEN** for each skill, `parseSkillMarkdown(rawSkill) === expectedFixture.skill-character-consistency.json` (byte-equal canonical form)
- **AND** for each pack, `parsePackMarkdown(rawPack, kind) === expectedFixture.pack-<kind>.json`
- **AND** for each profile, `parseProfileYaml(rawProfile) === expectedFixture.profile-<name>.json`
- **AND** for the workflow, `parseWorkflowJson(rawWorkflow) === expectedFixture.workflow-sdxl-illustrated-page.json`
- **AND** for the recipe, `parseRecipeYaml(rawRecipe) === expectedFixture.recipe-middle-grade-illustrated.json`
- **AND** `parseProvidersYaml` SHALL return `[]` (empty array; matches `providers-empty.json`)
- **AND** `grep -cE 'parseSkillMarkdown|parsePackMarkdown|parseProfileYaml|parseWorkflowJson|parseRecipeYaml|parseProvidersYaml' control-plane/test/capability-parsers.spec.ts` SHALL be `>= 6` (all 6 parser names referenced in the round-trip oracle).

### Requirement: REQ-CR-CAP-2 — 5 typed parsers + 1 empty-state function (`parseSkillMarkdown`, `parsePackMarkdown`, `parseProfileYaml`, `parseWorkflowJson`, `parseRecipeYaml`, `parseProvidersYaml`)

The system SHALL provide 6 PURE parser functions in `control-plane/src/features/capability-catalog/parser.ts` — each SHALL accept a raw string + optional kind discriminator, SHALL return a typed `CapabilityEntry` (or array thereof), SHALL be deterministic (no timestamps, no random; same input → same output), SHALL NOT perform I/O, SHALL NOT execute scripts, SHALL NOT call `eval` / `exec` / `subprocess`. `parseSkillMarkdown(raw)` SHALL extract `{ name, description (from first heading or first paragraph), scope: 'examples', sourcePath, crossRefs: {} }` from a skill markdown body (Agent Skills structure per `docs/07-SKILLS-PACKS.md:9-19`). `parsePackMarkdown(raw, packKind)` SHALL extract `{ name, packKind, description, scope: 'recipe:<recipe-id>', sourcePath, crossRefs: { skills: string[] } }` (skills mentioned in the body are extracted via simple string match). `parseProfileYaml(raw)` SHALL parse via `js-yaml` + assert `schema: 'profile/v1'`; SHALL extract `{ name, audience, scope, sourcePath, crossRefs: { recipes: string[] } }`. `parseWorkflowJson(raw)` SHALL parse via `JSON.parse` + assert schema `control-plane/workflow/v1`; SHALL extract `{ name, sourcePath, crossRefs: { providers: string[] } }`. `parseRecipeYaml(raw)` SHALL parse via `js-yaml` + assert `schema: 'creation-recipe/v1'`; SHALL extract `{ name, title, sourcePath, crossRefs: { skills: string[], packs: string[], profiles: string[] } }`. `parseProvidersYaml(raw)` SHALL return `[]` (empty array; the explicit empty-state fixture per Decision 4 is consumed by the overview + per-kind page renderers).

#### Scenario: EVT-CAP-2a — Each parser is deterministic and rejects script-execution vectors

- **GIVEN** apply Block 0 lands and `control-plane/src/features/capability-catalog/parser.ts` declares all 6 parsers
- **WHEN** `parseSkillMarkdown(skillMarkdownA)` is invoked twice with the same input AND `parsePackMarkdown(packMarkdownStoryCore, 'story_core')` is invoked twice AND `parseProfileYaml(profileYaml)` is invoked twice
- **THEN** each invocation pair SHALL return `CapabilityEntry` objects that are deep-equal (no timestamp drift)
- **AND** when `parseSkillMarkdown` is fed a skill markdown whose body contains `<script>alert('xss')</script>`, the parser SHALL extract the text for the `description` field BUT SHALL NOT execute the script (parser is pure; rendering goes through m16 `docsSafeMarkdown` per REQ-CR-CAP-5)
- **AND** `grep -rE 'eval\(|exec\(|subprocess|os\.system' control-plane/src/features/capability-catalog/parser.ts` SHALL return `0` (no script execution vector).

### Requirement: REQ-CR-CAP-3 — Capability overview page at `/capabilities` renders 6 kind sections with accurate counts (skills=3, packs=4, profiles=2, workflows=1, providers=0, recipes=1)

The system SHALL register a TanStack Router route `path: '/capabilities'` (single-quoted; declared AFTER `/create` per F-004 oracle ordering) rendering `views/Overview.tsx`. The Overview SHALL consume `useCapabilityManifest()` (memoized hook), SHALL call `capabilitySelectors.byKind(<kind>)` for each of the 6 kinds, SHALL render 6 kind sections (one per `kind ∈ {Skill, Pack, Profile, Workflow, Provider, Recipe}`), each showing the count + first 5 entries + a "see all" link to `/capabilities/<kind>` when more than 5 entries exist. Each entry SHALL link to `/capabilities/<kind>/<namespace>/<name>`. The Overview SHALL render the explicit empty-state for the Provider section (per REQ-CR-CAP-7) when `providers.length === 0`. The Overview SHALL NOT import `useProjectionStore` (m10 no-write invariant; verified by `capability-isolation.spec.ts`).

#### Scenario: EVT-CAP-3a — `/capabilities` renders 6 kind sections at HEAD 364571c with the proposal §"Data coverage" counts

- **GIVEN** apply Blocks 0 + 1 land and `vite preview` serves the SPA against `golden/control-plane/snapshot-valid/`
- **WHEN** a Vitest spec asserts the rendered DOM for `<Overview />` mounted against the bundled manifest
- **THEN** the rendered DOM SHALL contain 6 elements with class `kind-section-<kind>` (one per kind) AND each section SHALL carry a count label matching the proposal (`Skills: 3`, `Packs: 4`, `Profiles: 2`, `Comfy Workflows: 1`, `Image Providers: 0`, `Recipes: 1`)
- **AND** the Skills section SHALL link each entry to `/capabilities/skill/<namespace>/<name>` (3 links)
- **AND** the Providers section SHALL render the empty-state per REQ-CR-CAP-7 (not a 0-row list)
- **AND** `pnpm test --run control-plane/test/capability-catalog.spec.ts` SHALL exit `0` asserting these expectations
- **AND** `grep -rE 'useProjectionStore' control-plane/src/features/capability-catalog/views/Overview.tsx` SHALL return `0` (no CP state mutation).

#### Scenario: EVT-CAP-3b — Overview renders 6 kind sections WITHOUT requiring `useProjectionStore.status === 'loaded'` (manifest is decoupled from the projection lifecycle)

- **GIVEN** apply Blocks 0 + 1 land and `useProjectionStore.status === 'empty'` (no loaded projection) AND the bundled manifest is built at module-init
- **WHEN** a Vitest spec mounts `<Overview />` against the bundled manifest WITHOUT loading any projection source
- **THEN** the rendered DOM SHALL still contain 6 elements with class `kind-section-<kind>` AND each section SHALL render the documented counts (3/4/2/1/0/1)
- **AND** the spec SHALL additionally assert that `useProjectionStore.getState().status` remains `'empty'` (the Overview does NOT require the projection to be loaded; the manifest is independent of the projection lifecycle — pure projection invariant)
- **AND** this scenario validates that the capability catalog is a READ-ONLY CP aggregate over a SINGLE PROJECT snapshot per ADR-024, NOT a federated catalog (M10.3 territory).

### Requirement: REQ-CR-CAP-4 — Per-kind list pages at `/capabilities/{skills|packs|profiles|workflows|providers|recipes}` enumerate entries with metadata badges

The system SHALL register 6 TanStack Router routes — `path: '/capabilities/skills'`, `path: '/capabilities/packs'`, `path: '/capabilities/profiles'`, `path: '/capabilities/workflows'`, `path: '/capabilities/providers'`, `path: '/capabilities/recipes'` — each rendering `views/KindList.tsx`. The KindList SHALL consume `useCapabilityManifest()` + `capabilitySelectors.byKind(<kind>)`, SHALL render the full list of capabilities for that kind, SHALL render each entry as an `EntityHeader` (m15/m16 reused via Extension Registry) + per-kind-specific metadata (scope badge for profiles — `global` vs `recipe:<recipe-id>` per Decision 3; pack-KIND grouping for packs per Decision 5; workflow JSON key/value rendering per Decision 6). The Providers page SHALL render the explicit empty-state fixture per REQ-CR-CAP-7 when `providers.length === 0`. Each entry SHALL link to `/capabilities/<kind>/<namespace>/<name>`.

#### Scenario: EVT-CAP-4a — All 6 per-kind routes are registered; per-kind lists render full enumeration with metadata badges

- **GIVEN** apply Blocks 1 + 2 land and `control-plane/src/routes/router.ts` declares the 6 new routes
- **WHEN** `grep -cE "path:\s*'/capabilities/skills'|path:\s*'/capabilities/packs'|path:\s*'/capabilities/profiles'|path:\s*'/capabilities/workflows'|path:\s*'/capabilities/providers'|path:\s*'/capabilities/recipes'" control-plane/src/routes/router.ts` is invoked
- **THEN** stdout SHALL be `6` (all 6 per-kind routes present in `router.ts`)
- **AND** `pnpm test --run control-plane/test/capability-catalog.spec.ts` SHALL assert 6 separate tests (one per kind) ALL PASS — `kind-list-skills-3-entries` + `kind-list-packs-4-entries` + `kind-list-profiles-2-entries-with-scope-badges` + `kind-list-workflows-1-entry` + `kind-list-providers-empty-state` + `kind-list-recipes-1-entry`
- **AND** for the profiles page, the spec SHALL assert that the first profile carries `data-scope="global"` AND the second profile carries `data-scope="recipe:middle-grade-illustrated"` (Decision 3 scope badges honored)
- **AND** for the packs page, the spec SHALL assert that 4 entries are grouped under pack-KIND sections (`story_core`, `characters`, `editorial`, `visual_core`).

### Requirement: REQ-CR-CAP-5 — Per-capability detail page at `/capabilities/$kind/$namespace/$name` reuses m16 `EntityHeader` + `MetadataCard` + `RelationsList` via Extension Registry (no direct import)

The system SHALL register a TanStack Router route `path: '/capabilities/$kind/$namespace/$name'` (parameterized, single-quoted) rendering `views/CapabilityDetail.tsx`. The CapabilityDetail SHALL consume `useCapabilityManifest()` + `capabilitySelectors.byEntityRef({kind, namespace, name})` to locate the target `CapabilityEntry`. When the lookup returns `undefined`, the view SHALL render `<NotFound />`. When the lookup returns a `CapabilityEntry`, the view SHALL:

1. Synthesize a `CatalogEntity` (per `specs/catalog-entity.schema.json:23-30`; one of the 6 kinds in the existing enum) carrying `{ kind: entry.kind, metadata: { namespace: entry.namespace, name: entry.name, title: entry.title, description: entry.description, annotations: { 'narrative.dev/source-path': entry.sourcePath } } }`
2. Resolve cards via `extensionRegistry.resolveEntityCards(synthesizedEntity)` — the existing m16 `EntityHeader` + `MetadataCard` + `RelationsList` are reused unchanged
3. Render markdown content (for skills + packs) via m16 `docsSafeMarkdown` (GFM-safe; `[[Kind:namespace/name]]` cross-links resolved via `entityLinkPlugin`)
4. Render YAML/JSON content (for profiles + workflows + recipes) as a typed key/value list

**The CapabilityDetail.tsx SHALL NOT directly import from `features/catalog/entity/` or `features/docs/`** — reuse happens exclusively through the Extension Registry (m15/m16 isolation contract preserved; INC-008 grep oracle extended per Decision 7).

#### Scenario: EVT-CAP-5a — Detail page resolves the entry, renders m16 EntityHeader + MetadataCard + RelationsList via Extension Registry

- **GIVEN** apply Blocks 1 + 2 land and `control-plane/src/features/capability-catalog/views/CapabilityDetail.tsx` is committed
- **WHEN** `pnpm test --run control-plane/test/capability-catalog.spec.ts` mounts the detail view with `params={kind: 'Skill', namespace: 'examples', name: 'character-consistency'}` against the bundled manifest
- **THEN** the rendered DOM SHALL contain an `<EntityHeader>` element carrying the kind/namespace/name triple AND a `<MetadataCard>` element rendering the parsed description AND a `<RelationsList>` element (may be empty for the bundled seed)
- **AND** the spec SHALL additionally assert that `grep -rE "from\s+['\"]\.\.\/\.\.\/catalog\/entity|from\s+['\"]\.\.\/\.\.\/docs\/" control-plane/src/features/capability-catalog/` returns `0` matches (the reuse happens via the Extension Registry, NOT via direct import — INC-008 isolation invariant preserved).

#### Scenario: EVT-CAP-5b — Unknown entity ref renders `<NotFound />` (404-style fallback)

- **GIVEN** apply Block 1 lands
- **WHEN** the detail view is mounted with `params={kind: 'Skill', namespace: 'nonexistent', name: 'does-not-exist'}`
- **THEN** the rendered DOM SHALL contain a `<NotFound />` element AND SHALL NOT contain any `EntityHeader` element
- **AND** the spec SHALL additionally assert that `useProjectionStore.getState()` is unchanged before and after the lookup-miss render (m10 no-write invariant preserved on miss path too).

### Requirement: REQ-CR-CAP-6 — Cross-capability drill-down via `capabilitySelectors.crossReferences(ref)` + `RelationsList` cross-ref rendering as internal TanStack Router `<Link>`s

The system SHALL expose a pure `capabilitySelectors.crossReferences(ref): { packs: string[], skills: string[], profiles: string[], recipes: string[], workflows: string[], providers: string[] }` selector in `control-plane/src/features/capability-catalog/capabilitySelectors.ts`. The selector SHALL compute cross-references ONCE at module-init (memoized; O(n) cost in the number of capability entries, ~10 today) by:

- Reading the file-tree topology: a pack under `recipes/<recipe-id>/skeleton/packs/<pack-id>/*.md` whose content mentions another capability derives `crossRefs.skills: <skill-names>`
- Reading the recipe's `project.profiles` array to derive `Profile.crossRefs.recipes`
- Reading the recipe's `project.packs` array to derive `Pack.crossRefs.recipes`
- Reading the pack markdown content for skill mentions
- Reading the workflow JSON for provider mentions (V1 has 0 providers, so empty)
- Reading the recipe's `recipe.yaml` for skills + packs + profiles lists

The CapabilityDetail view SHALL render each non-empty `crossRefs` group via the m16 `RelationsList` component (reused via Extension Registry). Each cross-ref SHALL render as a TanStack Router `<Link to="/capabilities/<kind>/<namespace>/<name>">` (internal navigation; no `fetch(`; no remote URL).

#### Scenario: EVT-CAP-6a — Skill detail page renders cross-refs to packs that mention the skill (topologically derived)

- **GIVEN** apply Blocks 0 + 1 + 2 land and the bundled `examples/skills/character-consistency/SKILL.md` body mentions `character design` AND `recipes/middle-grade-illustrated/skeleton/packs/characters/character_design.md` mentions `character-consistency` in its body
- **WHEN** `capabilitySelectors.crossReferences({ kind: 'Skill', namespace: 'examples', name: 'character-consistency' })` is invoked
- **THEN** the returned object SHALL contain `packs: ['recipe:middle-grade-illustrated/characters/character_design']` (the pack markdown mentions the skill)
- **AND** the rendered `RelationsList` SHALL render `<Link to="/capabilities/pack/recipe:middle-grade-illustrated/characters/character_design">` (internal TanStack Router link; no fetch)
- **AND** `pnpm test --run control-plane/test/capability-catalog.spec.ts` SHALL exit `0` asserting this drill-down resolves to a navigable route.

#### Scenario: EVT-CAP-6b — After drill-down navigation, `useProjectionStore` snapshot identity is preserved

- **GIVEN** apply Blocks 1 + 2 land AND the user has navigated from `/capabilities/skill/examples/character-consistency` (with a cross-ref visible) to `/capabilities/pack/recipe:middle-grade-illustrated/characters/character_design`
- **WHEN** `useProjectionStore.getState()` is invoked BEFORE the navigation AND AFTER the navigation completes
- **THEN** the two snapshots SHALL be `Object.is`-equal (`status === 'loaded'`, `bundle` is the SAME object reference, `catalogEntities` is the SAME array reference, `diagnostics` is the SAME array reference, `sourceLabel` is the SAME string)
- **AND** the Vitest spec asserting this invariant SHALL pass (`capability-isolation.spec.ts` test "projection store identity preserved after drill-down").

### Requirement: REQ-CR-CAP-7 — Empty-state UX for the Providers section (Decision 4: explicit empty state + schema pointer, not synthetic content)

The system SHALL render the `/capabilities/providers` page + the providers section of `/capabilities` with an explicit empty-state component when `capabilitySelectors.byKind('Provider').length === 0`. The empty state SHALL carry:

- Heading: "No image providers configured"
- Body: "Image provider capabilities are declared against `specs/provider-capability.schema.json` (provider-neutral descriptor, RE-IMG-7, ADR-011). Future authoring lands with the image-provider configuration cycle."
- Pointer link to `docs/12-IMAGE-PIPELINE.md` §"Capability model" rendered as `<a href="/docs/12-IMAGE-PIPELINE.md" target="_blank" rel="noopener">View Image Pipeline Documentation</a>` (relative path; works under `vite preview`; zero-fetch)

The empty-state UI SHALL consume the fixture `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` (which carries `{ ok: false, reason: 'no-instances-configured', schemaPointer: 'specs/provider-capability.schema.json', docsPointer: 'docs/12-IMAGE-PIPELINE.md' }`). The system SHALL NOT auto-generate stub provider entries from the schema (Decision 4 rejects option (c) "generate stub from schema").

#### Scenario: EVT-CAP-7a — Providers page renders the explicit empty-state fixture when 0 providers exist

- **GIVEN** apply Blocks 0 + 1 land and the bundled manifest carries `providers.length === 0` (HEAD 364571c)
- **WHEN** a Vitest spec mounts `<KindList kind="Provider" />` against the bundled manifest
- **THEN** the rendered DOM SHALL contain `<div class="providers-empty-state">` AND SHALL contain the literal text "No image providers configured" AND SHALL contain an `<a>` element whose `href` attribute is `/docs/12-IMAGE-PIPELINE.md` AND `target="_blank"` AND `rel="noopener"`
- **AND** the spec SHALL additionally assert that the empty-state content matches `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` byte-for-byte (the fixture is the source of truth)
- **AND** the spec SHALL additionally assert that `grep -c 'examples/*.provider.yaml' control-plane/src/features/capability-catalog/manifest.ts` returns `0` (no synthetic provider glob exists; Decision 4 "no auto-stub" honored).

### Requirement: REQ-CR-CAP-8 — Profile coverage surfaces BOTH global and project-scoped profiles distinctly with scope badges (Decision 3)

The system SHALL enumerate profiles from TWO locations via `import.meta.glob` calls:

- `import.meta.glob('/examples/*.yaml', { query: '?raw', import: 'default', eager: true })` — pre-filtered at the loader level to profile-shape YAML only (matching `schema: 'profile/v1'` const)
- `import.meta.glob('/recipes/*/skeleton/profiles/*.yaml', { query: '?raw', import: 'default', eager: true })` — project-scoped profiles

The Profiles section of `/capabilities` and the `/capabilities/profiles` page SHALL render each profile with a `data-scope` attribute (`"global"` for `examples/<name>.yaml`; `"recipe:<recipe-id>"` for `recipes/<recipe-id>/skeleton/profiles/<name>.yaml`). The `CapabilityDetail` view for a profile SHALL render the scope in the `MetadataCard` metadata section. Each profile entry SHALL validate against `specs/profile.schema.json` (Ajv 2020-12) — enforced by the new `tools/validate-profiles/validate.py` CI gate (Decision 8).

#### Scenario: EVT-CAP-8a — Profile enumeration surfaces both scopes; CI gate validates every profile against `specs/profile.schema.json`

- **GIVEN** apply Block 0 lands and the bundled manifest carries `profiles.length === 2` (`examples/middle-grade-profile.yaml` global + `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` project-scoped) AND `tools/validate-profiles/validate.py` is committed
- **WHEN** `pnpm test --run control-plane/test/capability-catalog.spec.ts` mounts `<KindList kind="Profile" />`
- **THEN** the rendered DOM SHALL contain 2 entries, the first with `data-scope="global"` AND the second with `data-scope="recipe:middle-grade-illustrated"`
- **AND** `python tools/validate-profiles/validate.py` SHALL exit `0` AND SHALL validate BOTH profiles against `specs/profile.schema.json` (recursive walk across `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml`)
- **AND** `grep -cE "schema:\s*'profile/v1'" examples/middle-grade-profile.yaml recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` SHALL be `>= 2` (both profiles declare the const).

### Requirement: REQ-CR-CAP-9 — Routes registration (8 new routes) + F-004 oracle extension (8 new entries added; total `routePaths.length === 16`)

The system SHALL register 8 NEW routes in `control-plane/src/routes/router.ts` (single-quoted `path: '/...'`; declared AFTER `/create` and AFTER `/entity/$kind/$namespace/$name` per F-004 oracle ordering):

```text
1. '/capabilities'
2. '/capabilities/skills'
3. '/capabilities/packs'
4. '/capabilities/profiles'
5. '/capabilities/workflows'
6. '/capabilities/providers'
7. '/capabilities/recipes'
8. '/capabilities/$kind/$namespace/$name'
```

The system SHALL extend `control-plane/src/routes/routes.tsx` (the F-004 oracle `routePaths` const array) by adding the 8 new entries above. The m10.1 baseline of 8 entries SHALL grow to **16 entries**. NO existing m10.1 route entry SHALL be removed (additive only; m10 invariant). The `routes-router.spec.ts` F-004 oracle test SHALL be updated to assert `routePaths.length === 16` exactly AND SHALL assert all 8 new path literals are present in the array.

#### Scenario: EVT-CAP-9a — router.ts declares 8 new routes; routes.tsx `routePaths` array grows from 8 to 16 (F-004 oracle)

- **GIVEN** apply Block 2 lands and `control-plane/src/routes/router.ts` declares the 8 new routes AND `control-plane/src/routes/routes.tsx` extends `routePaths`
- **WHEN** `grep -cE "path:\s*'/.*'" control-plane/src/routes/routes.tsx` is invoked
- **THEN** stdout SHALL be `16` (was 8 in m10.1; +8 for the 8 new routes)
- **AND** `grep -cE "path:\s*'/capabilities"|path:\s*'/capabilities/skills"|path:\s*'/capabilities/packs"|path:\s*'/capabilities/profiles"|path:\s*'/capabilities/workflows"|path:\s*'/capabilities/providers"|path:\s*'/capabilities/recipes"|path:\s*'/capabilities/\\\$kind/\\\$namespace/\\\$name'" control-plane/src/routes/routes.tsx` SHALL be `>= 8`
- **AND** `pnpm test --run control-plane/test/routes-router.spec.ts` SHALL exit `0` asserting `routePaths.length === 16`
- **AND** `grep -cE "path:\s*'/" control-plane/src/routes/routes.tsx` SHALL NOT be `0` for any of: `/overview`, `/story`, `/visual`, `/qa`, `/history`, `/search`, `/create` (m10.1 baseline preserved; additive only).

### Requirement: REQ-CR-CAP-10 — Isolation invariant: zero `useProjectionStore` import + zero cross-folder imports in `features/capability-catalog/`

The system SHALL enforce the following isolation invariants in `control-plane/src/features/capability-catalog/`:

- `useProjectionStore` SHALL NOT be imported anywhere under `features/capability-catalog/` (m10 no-write-CP invariant; verified by `capability-isolation.spec.ts` grep oracle)
- `features/capability-catalog/` SHALL NOT directly import from any other `features/<other>/` folder (m15 + m16 INC-008 isolation invariant; verified by `extension-isolation.spec.ts` test 4 grep oracle extended for `features/capability-catalog/`)
- The Extension Registry module (`control-plane/src/extensions/`) SHALL remain the SOLE mediator for cross-feature composition

The `extension-isolation.spec.ts` test 4 grep oracle SHALL be EXTENDED to add `capability-catalog` to the prohibited-folder list (matches the m16 INC-008 fix precedent + the m10.1 `recipes/` precedent). The NEW `capability-isolation.spec.ts` SHALL assert zero `useProjectionStore` imports in `features/capability-catalog/` via a grep oracle (`grep -rE 'useProjectionStore' control-plane/src/features/capability-catalog/` SHALL return `0`).

#### Scenario: EVT-CAP-10a — `capability-isolation.spec.ts` finds 0 `useProjectionStore` imports; `extension-isolation.spec.ts` test 4 finds 0 cross-folder imports in 7 feature folders

- **GIVEN** apply Block 2 + Block 3 land AND `control-plane/test/capability-isolation.spec.ts` is committed AND `control-plane/test/extension-isolation.spec.ts` is updated
- **WHEN** `pnpm test --run control-plane/test/capability-isolation.spec.ts` is invoked
- **THEN** the spec SHALL pass AND the embedded grep oracle SHALL assert `grep -rE 'useProjectionStore' control-plane/src/features/capability-catalog/` returns `0` matches
- **AND** `pnpm test --run control-plane/test/extension-isolation.spec.ts` SHALL exit `0` with `8` tests passing (was `5` in m10.1; +3 new tests for the 7th feature folder + INC-008 extension + 1 cross-folder-import oracle extension)
- **AND** `grep -rE "from\s+['\"]\.\./\.\./(story|visual|catalog|continuity|docs|recipes|capability-catalog)/" control-plane/src/features/` SHALL return `0` matches (production invariant; INC-008 fully closed across all 7 feature folders).

#### Scenario: EVT-CAP-10b — After visiting any of the 8 new routes, `useProjectionStore.getState()` returns the SAME object identity (round-trip no-op proof)

- **GIVEN** apply Blocks 1 + 2 + 3 land AND `useProjectionStore` is in `status: 'loaded'` state with `bundle` populated AND `catalogEntities` populated (the m16 + m10.1 baseline)
- **WHEN** a Vitest spec visits each of the 8 new routes (`/capabilities` + `/capabilities/skills` + `/capabilities/packs` + `/capabilities/profiles` + `/capabilities/workflows` + `/capabilities/providers` + `/capabilities/recipes` + a sample `/capabilities/skill/examples/character-consistency`)
- **THEN** `useProjectionStore.getState()` BEFORE the visits and AFTER the visits SHALL be `Object.is`-equal (status unchanged; bundle same reference; catalogEntities same reference; diagnostics same reference; sourceLabel same string)
- **AND** the spec SHALL additionally assert that `useProjectionStore.setState` is never called by any component under `features/capability-catalog/` (grep oracle: `grep -rE 'useProjectionStore\.setState|\.set\(' control-plane/src/features/capability-catalog/` SHALL return `0`).

### Requirement: REQ-CR-CAP-11 — CI guards: tsc 0 + Vitest N/N + Vite build static + ajv-cli profile validation + Vitest preview smoke

The system SHALL enforce the following CI gates on every PR:

1. `tsc --noEmit -p control-plane/tsconfig.json` exits `0` (TypeScript strict; no type errors)
2. `pnpm --filter control-plane test` (Vitest) passes N/N — the 19 m10.1 specs + 3 new specs (`capability-catalog.spec.ts` + `capability-parsers.spec.ts` + `capability-isolation.spec.ts`) + 2 extended specs (`extension-isolation.spec.ts` + `routes-router.spec.ts`) = 22 specs minimum
3. `pnpm --filter control-plane build` (Vite static build) succeeds; `control-plane/dist/index.html` exists; assets are content-hashed; bundle-size impact ≤ 15KB gzipped for the capability manifest
4. `python tools/validate-profiles/validate.py` exits `0` for every profile under `examples/*.yaml` + `recipes/*/skeleton/profiles/*.yaml` (recursive; the build fails on any invalid profile — NEW CI gate specific to M10.2)
5. `python tools/validate-recipes/validate.py` exits `0` for every recipe under `recipes/*/recipe.yaml` (m10.1 gate continues to enforce)
6. `pnpm --filter control-plane preview & curl http://localhost:4173/capabilities` smoke: the `/capabilities` route renders without JS errors; the DevTools Network panel shows zero outbound application-API requests after SPA load (m14 serverless invariant holds + extended to capability-catalog pages)

#### Scenario: EVT-CAP-11a — Every CI gate exits 0 on the post-apply tree; 22+ Vitest specs pass; ajv-cli validates every bundled profile; `vite preview /capabilities` smoke renders the overview without fetch

- **GIVEN** apply Blocks 0+1+2+3+F land
- **WHEN** the `just check` (or equivalent) recipe is invoked AND `python tools/validate-profiles/validate.py` is invoked
- **THEN** `tsc --noEmit -p control-plane/tsconfig.json` SHALL exit `0` AND `pnpm --filter control-plane test` SHALL pass with `22/22` specs (or higher) AND `pnpm --filter control-plane build` SHALL succeed with `dist/index.html` present
- **AND** `python tools/validate-profiles/validate.py` SHALL exit `0` for BOTH bundled profiles (`examples/middle-grade-profile.yaml` + `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml`)
- **AND** `pnpm --filter control-plane preview` against `golden/control-plane/snapshot-valid/` SHALL serve `/capabilities` returning HTTP `200` AND the rendered HTML SHALL contain the `<div class="view-capabilities">` element AND the DevTools Network panel SHALL show zero outbound application-API requests after `/capabilities` load (m14 serverless invariant extended to capability-catalog).

### Requirement: REQ-CR-CAP-12 — Capability fixtures: 12 NEW files in `golden/control-plane/snapshot-valid/capabilities/` (11 enumerated + 1 explicit empty-state)

The system SHALL ship 12 NEW fixture files under `golden/control-plane/snapshot-valid/capabilities/` carrying the parsed-and-canonicalized form of each enumerated capability:

- `skill-character-consistency.json` (parsed from `examples/skills/character-consistency/SKILL.md`)
- `skill-narrative-arc.json`
- `skill-scene-validator.json`
- `pack-story_core.json`
- `pack-characters.json`
- `pack-editorial.json`
- `pack-visual_core.json`
- `profile-middle-grade-10-11.json` (global, parsed from `examples/middle-grade-profile.yaml`)
- `profile-middle-grade-10-11-recipe.json` (project-scoped, parsed from `recipes/.../skeleton/profiles/profile-middle-grade-10-11.yaml`)
- `workflow-sdxl-illustrated-page.json`
- `recipe-middle-grade-illustrated.json`
- `providers-empty.json` (explicit empty-state fixture per Decision 4)

Each fixture SHALL carry `{ kind, namespace, name, title, description, sourcePath, scope, crossRefs }` (the canonical `CapabilityEntry` shape). The fixtures SHALL be the round-trip oracle for `capability-parsers.spec.ts` (REQ-CR-CAP-1 scenario EVT-CAP-1b).

#### Scenario: EVT-CAP-12a — All 12 fixtures exist; `capability-manifest-snapshot.ts` exports the bundled manifest as a Vitest fixture

- **GIVEN** apply Block 0 lands and the 12 fixtures are committed
- **WHEN** `ls golden/control-plane/snapshot-valid/capabilities/*.json | wc -l` is invoked
- **THEN** stdout SHALL be `12`
- **AND** `grep -cE '"kind":\s*"Skill"' golden/control-plane/snapshot-valid/capabilities/skill-*.json` SHALL be `>= 3` (3 skill fixtures)
- **AND** `grep -cE '"kind":\s*"Pack"' golden/control-plane/snapshot-valid/capabilities/pack-*.json` SHALL be `>= 4` (4 pack fixtures)
- **AND** `cat golden/control-plane/snapshot-valid/capabilities/providers-empty.json | jq '.reason'` SHALL be `"no-instances-configured"` (the empty-state fixture carries the documented reason)
- **AND** `control-plane/test/fixtures/capability-manifest-snapshot.ts` SHALL export a constant `MANIFEST_SNAPSHOT` matching the bundled build-time manifest (the round-trip oracle for `capability-catalog.spec.ts`).

#### Scenario: EVT-CAP-12b — Fixture round-trip at MODULE-INIT: `MANIFEST_SNAPSHOT === loadManifest()` byte-equal (the fixture is the canonical reference)

- **GIVEN** apply Block 0 lands and `control-plane/test/fixtures/capability-manifest-snapshot.ts` exports `MANIFEST_SNAPSHOT` AND `control-plane/src/features/capability-catalog/manifest.ts` exports `loadManifest()`
- **WHEN** a Vitest spec invokes `loadManifest()` at module-init AND compares the result to `MANIFEST_SNAPSHOT` via deep-equal assertion
- **THEN** the deep-equal assertion SHALL pass (`MANIFEST_SNAPSHOT` matches the bundled build-time manifest byte-for-byte — the fixture is the canonical reference for future regression detection)
- **AND** the spec SHALL additionally assert that `JSON.stringify(MANIFEST_SNAPSHOT.skills.map(s => s.namespace + '/' + s.name).sort()) === JSON.stringify(['examples/character-consistency', 'examples/narrative-arc', 'examples/scene-validator'])` (the 3 skill IDs are in canonical order)
- **AND** the spec SHALL additionally assert that `MANIFEST_SNAPSHOT.providers.length === 0` (the providers empty-state fixture is the canonical reference; Decision 4 "no auto-stub" honored).

---

## Capability Surfaces (the 6 enumerated kinds)

The 6 capability kinds enumerated by V1 are catalog entities that reuse the existing `CatalogEntity` slot pattern (per `specs/catalog-entity.schema.json:23-30`; the 6 kinds are already in the `kind` enum). M10.2 does NOT add new schema entries.

| Kind | Count (HEAD 364571c) | Source path pattern | Parser | Source file |
|---|---:|---|---|---|
| **Skill** | 3 | `examples/skills/<id>/SKILL.md` | `parseSkillMarkdown(raw)` | `control-plane/src/features/capability-catalog/parser.ts` |
| **Pack** | 4 (KINDs) | `recipes/<recipe-id>/skeleton/packs/<pack-id>/*.md` | `parsePackMarkdown(raw, packKind)` | `control-plane/src/features/capability-catalog/parser.ts` |
| **Profile** | 2 (1 global + 1 project-scoped) | `examples/*.yaml` (filtered to `schema: 'profile/v1'`) + `recipes/<recipe-id>/skeleton/profiles/*.yaml` | `parseProfileYaml(raw)` | `control-plane/src/features/capability-catalog/parser.ts` |
| **Workflow** | 1 | `control-plane/workflows/comfyui/*.workflow.json` | `parseWorkflowJson(raw)` | `control-plane/src/features/capability-catalog/parser.ts` |
| **Provider** | 0 (empty state) | (none) | `parseProvidersYaml(raw)` → `[]` | `control-plane/src/features/capability-catalog/parser.ts` |
| **Recipe** | 1 | `recipes/<recipe-id>/recipe.yaml` | `parseRecipeYaml(raw)` | `control-plane/src/features/capability-catalog/parser.ts` |

**Total: 11 capability entries** (3 + 4 + 2 + 1 + 0 + 1 = 11) + 1 explicit empty-state fixture (`providers-empty.json`) = 12 fixtures. V1 ships zero provider instances; the providers page renders an explicit empty state per Decision 4. Profile scope badges distinguish `global` vs `recipe:<recipe-id>` per Decision 3. Pack-KIND grouping aggregates 4 pack markdown files into 4 pack-KIND groups per Decision 5. The capability detail page synthesizes a `CatalogEntity` from each `CapabilityEntry` and reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` via the existing Extension Registry (per Decision 7).

---

## m10 Invariants Compliance Map

Every m10 invariant declared in `docs/19-ROADMAP.md` §M10 is honored by the REQ clauses enumerated below. The map is exhaustive (6 invariants × REQ pointers).

| m10 invariant | Constraint statement | M10.2 compliance mechanism | Tests/oracles verifying compliance |
|---|---|---|---|
| **serverless / no-fetch** | Wizard + UI shall NOT issue network requests after SPA load; DevTools Network panel SHALL show zero outbound application-API requests | Capability manifest resolves at `vite build` time via `import.meta.glob`; zero runtime I/O; no `fetch(`; no telemetry; no remote schema; m16 `docsSafeMarkdown` + `entityLinkPlugin` reused unchanged (already GFM-safe + zero-fetch) | REQ-CR-CAP-1 (EVT-CAP-1a grep oracle: `grep -cE 'fetch\(' manifest.ts → 0`) + REQ-CR-CAP-2 (EVT-CAP-2a: `grep -rE 'eval\(|exec\(|subprocess' parser.ts → 0`) + REQ-CR-CAP-11 (EVT-CAP-11a: `vite preview /capabilities` smoke with zero outbound requests) |
| **no Dexie / IndexedDB / Orama** | No persistent client-side store introduced; capability state is build-time | Capability manifest is in-memory and static post-build; no IndexedDB; no Orama; no Dexie | REQ-CR-CAP-1 (EVT-CAP-1a: `grep -cE 'indexeddb\|Dexie\|orama' manifest.ts → 0`) + REQ-CR-CAP-10 (EVT-CAP-10a: capability-isolation.spec.ts grep oracle) |
| **no-write Control Plane** | `useProjectionStore` SHALL NOT be mutated by capability-catalog components | `useProjectionStore` is NEVER imported in `features/capability-catalog/`; the detail page renders from `useCapabilityManifest()`, not from `useProjectionStore`; cross-ref navigation is a no-op for the projection store | REQ-CR-CAP-10 (EVT-CAP-10a: grep oracle `useProjectionStore → 0` in `features/capability-catalog/`) + REQ-CR-CAP-10 (EVT-CAP-10b: state-identity assertion across 8 routes) + REQ-CR-CAP-6 (EVT-CAP-6b: state-identity after drill-down) |
| **exact dependency pins** | Existing `control-plane/package.json` pins remain (Vite 8.2.2, React 19.2.8, TanStack Router 1.170.32, Tailwind 4.3.3, Ajv 8.20.0, Vitest 4.1.11) | 0 new runtime deps; all imports use already-pinned dependencies (`react`, `react-dom`, `react-markdown@9.1.0`, `rehype-sanitize@6.0.0`, `remark-gfm@4.0.1`, `@tanstack/react-router@1.170.32`, `ajv@8.20.0`, `tailwindcss@4.3.3`); `import.meta.glob` is a Vite 8.2 first-party feature | REQ-CR-CAP-11 (EVT-CAP-11a: `tsc --noEmit -p control-plane/tsconfig.json → exit 0`; `pnpm install --frozen-lockfile` succeeds on Node 24 LTS) |
| **static build** | `vite build` SHALL produce a static `dist/` bundle | `import.meta.glob` is a build-time Vite feature; `vite build` resolves the globs and embeds the contents; no SSR; no server actions; bundle-size impact ≤ 15KB gzipped | REQ-CR-CAP-1 (EVT-CAP-1a: bundle-size assertion) + REQ-CR-CAP-11 (EVT-CAP-11a: `pnpm --filter control-plane build → success with dist/index.html present`) |
| **additive-only schema evolution** | No `specs/*.schema.json` SHALL be removed, renamed, type-changed, or constraint-tightened | NO schema file in `specs/` is modified; `specs/catalog-entity.schema.json:23-30` already lists the 6 capability kinds in `kind` enum; `specs/provider-capability.schema.json`, `specs/profile.schema.json`, `specs/creation-recipe.schema.json` are unmodified; M10.2 is purely projection + UI | REQ-CR-CAP-3 (no schema mention) + REQ-CR-CAP-7 (the empty-state references `specs/provider-capability.schema.json` READ-ONLY; no mutation) + REQ-CR-CAP-11 (EVT-CAP-11a: ajv-cli validates against UNMODIFIED `specs/profile.schema.json`) + REQ-CR-CAP-8 (EVT-CAP-8a: ajv-cli validates against UNMODIFIED `specs/profile.schema.json`) |

---

## Decisions

### Decision 1 — Catalog topology: overview + per-kind detail pages (status: ACCEPTED)

**Title**: Catalog topology (Option A from proposal D1)

**Rationale**: One `/capabilities` overview page + 6 per-kind detail pages + 1 shared parameterized entity detail route. This pattern aligns with the m15 `/catalog` (overview) + m16 `/entity/$kind/$namespace/$name` (parameterized detail) precedent; URL-shareable per kind; clean separation of concerns; total 8 new routes.

**Rejected alternatives**:
- Option (a) "single `/capabilities` page with kind-filtered sections" — rejected: bundles 6 disparate content types on one page; large page; no clean URL for sharing a specific capability; breaks the m15 `/catalog` → `/entity/...` precedent.
- Option (b) "tab-based single page" — rejected: TanStack Router does not natively do tab-based routing without a query-string hack; per-kind URLs are a stronger contract; tab UX would require 6 tabs at all times (poor information density when the user knows what they want).
- Option (c) "only overview + per-entity detail (no per-kind list)" — rejected: forces all kind discovery through one page; loses the "show me all packs" UX; doesn't scale to 100+ capabilities per kind.

**Consequences**: 8 new routes in `router.ts`; F-004 oracle grows from 8 to 16 entries; per-kind pages share a single `views/KindList.tsx` component parameterized by `kind`; the overview page renders 6 kind sections in a single `views/Overview.tsx` component.

### Decision 2 — Discovery mechanism: build-time `import.meta.glob` (status: ACCEPTED)

**Title**: Capability discovery (Option A from proposal D2)

**Rationale**: Vite's `import.meta.glob` with `{ query: '?raw', import: 'default', eager: true }` for all 6 capability kinds. The 6 globs resolve at build time and embed the contents in the static bundle. Bundle-size impact ~15KB gzipped (well below the 1.5MB gzipped post-M10 budget).

**Rejected alternatives**:
- Option (a) "file-system glob walk at runtime" — rejected: requires either the File System Access API (requires user-grant per session; clobbers the "instant catalog" UX) or a backend (forbidden by m10 serverless invariant). The m10.1 wizard uses File System Access for SINK writes to user-selected directories; M10.2 has no user-selected directory.
- Option (b) "static index JSON generated at build time" — rejected: requires a build script outside Vite + a custom Vite plugin; `import.meta.glob` is Vite's first-party equivalent with no additional toolchain surface.
- Option (c) "lazy-loaded via dynamic import" — rejected: lazy loading would mean the user waits on a network round-trip to discover capabilities; with `import.meta.glob` the cost is paid once at build time and zero at runtime.

**Consequences**: `manifest.ts` declares 6 `import.meta.glob` calls; the manifest is composed at module-init; no runtime fetch; no runtime filesystem read; bundle-size impact bounded by 15KB gzipped.

### Decision 3 — Profile coverage: unified view across `examples/*.yaml` (global) + `recipes/*/skeleton/profiles/*.yaml` (project-scoped) (status: ACCEPTED)

**Title**: Profile surface (Option B from proposal D3)

**Rationale**: Profiles are enumerated from TWO locations and rendered with a `data-scope` attribute (`"global"` vs `"recipe:<recipe-id>"`). The 2 bundled profiles are surfaced distinctly; the scope badge makes the distinction explicit; matches the m15 `CatalogEntity.relations` pattern (per-entity provenance metadata).

**Rejected alternatives**:
- Option (a) "single unified view (project-scoped + global collapsed)" — rejected: collapses semantically distinct scopes; the user cannot tell which profiles are bundled examples vs. per-recipe; `specs/profile-aliases.yaml` already treats the alias as a forward-looking registry, not a flat enumeration.
- Option (c) "only global profiles; project-scoped profiles are reachable only via the recipe detail page" — rejected: projects ARE the unit of work in M10; a user working on `middle-grade-illustrated` reasonably wants to see its skeleton profiles directly.

**Consequences**: 2 `import.meta.glob` calls for profiles (one for `examples/*.yaml`, one for `recipes/*/skeleton/profiles/*.yaml`); the `examples/*.yaml` glob is pre-filtered at the loader level to `schema: 'profile/v1'`; profile entries carry `data-scope` attributes in the rendered DOM; ajv-cli validates every bundled profile against `specs/profile.schema.json` (the new CI gate).

### Decision 4 — Image providers handling: empty-state fixture + schema pointer (status: ACCEPTED)

**Title**: Providers empty-state (Option B from proposal D4)

**Rationale**: `/capabilities/providers` renders an explicit empty state with a heading, body, and pointer to `docs/12-IMAGE-PIPELINE.md`. The empty state is a fixed fixture in `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` carrying `{ ok: false, reason: 'no-instances-configured', schemaPointer: 'specs/provider-capability.schema.json', docsPointer: 'docs/12-IMAGE-PIPELINE.md' }`.

**Rejected alternatives**:
- Option (a) "ship example providers" — rejected: provider instances are deployment/runtime configuration (per `docs/12-IMAGE-PIPELINE.md`); shipping example instances would mislead authors into thinking they are static defaults. Provider authoring belongs to the runtime configuration cycle (M7 territory) — not M10.2 catalog territory.
- Option (c) "generate stub from schema" — rejected: `specs/provider-capability.schema.json` describes a typed shape; generating a "stub" instance would be a synthetic entity with no real provider backing — violates the "catalog is a read-model of real things" principle at `docs/29-NARRATIVE-CATALOG.md:9-13`.

**Consequences**: `parseProvidersYaml(raw)` returns `[]` (empty array); the providers section of `/capabilities` + the `/capabilities/providers` page render the empty-state fixture; no synthetic provider entries are generated; the schema is referenced as a documentation pointer (READ-ONLY).

### Decision 5 — Pack ownership: union of `examples/packs/**` + `recipes/*/skeleton/packs/**`; origin tag shown on detail page (status: ACCEPTED)

**Title**: Pack ownership (Option B from proposal D5)

**Rationale**: Packs are enumerated ONLY from `recipes/<id>/skeleton/packs/<pack-id>/*.md` (project-scoped via the bundled recipe). The `examples/packs/` path is NOT created in V1; future pack-authoring cycles may create it. The 4 pack-KINDs are grouped on `/capabilities/packs` by pack-KIND (not by recipe); each pack-KIND section shows the contributing recipes.

**Rejected alternatives**:
- Option (a) "catalog-level packs (a new `examples/packs/<id>/*.md` tree separate from recipes)" — rejected: V1 has no authoring use case; `docs/07-SKILLS-PACKS.md:106-127` lists 12 pack kinds as design intent, but only 4 ship in the bundled recipe; creating `examples/packs/` with 0 files in V1 would be a dead directory.
- Option (c) "only project-scoped; the catalog shows packs grouped under their parent recipe" — rejected: hides packs from the `/capabilities` overview; breaks the "make the Studio explain the toolchain" goal — users want to see packs as first-class capabilities, not as nested recipe children.

**Consequences**: The pack manifest glob is `recipes/*/skeleton/packs/*/*.md`; packs carry `scope: 'recipe:<recipe-id>'`; pack-KIND grouping (`story_core`, `characters`, `editorial`, `visual_core`) is rendered on the per-kind page; orphan risk (`RISK-R-PACK-ORPHAN` per proposal §Risks) is documented for future pack-authoring cycles.

### Decision 6 — Cross-capability navigation: `[[Kind:namespace/name]]` markdown links → `/entity/...` or `/capabilities/...` (status: ACCEPTED)

**Title**: Cross-capability drill-down (Option A from proposal D6)

**Rationale**: The `CapabilityManifest` carries cross-kind relations computed at module-init from file-tree topology (a pack under `recipes/<id>/skeleton/packs/<pack-id>/*.md` that mentions a skill in its content; profiles that declare the skill in their `voice.skills` array; etc.). Drill-down renders via the m16 `RelationsList` component (reused via Extension Registry). Each cross-ref renders as a TanStack Router `<Link to="/capabilities/<kind>/<namespace>/<name>">` (internal navigation; no fetch).

**Rejected alternatives**:
- Option (a) "no cross-references; users browse by kind" — rejected: fails the "make the Studio explain the toolchain" goal — a user looking at the `character-consistency` skill cannot discover "what packs power it" or "what profiles consume it" without manually opening each pack/profile/recipe. The m15 `RelationsList` is the standard projection for relations.
- Option (b) "deep content-indexing (parse every skill/pack/recipe for `uses-skill`/`provides-pack` semantic tags)" — rejected: out of scope for V1; would require a content schema addition; the M10.2 cycle is meant to be projection-only.

**Consequences**: `capabilitySelectors.crossReferences(ref)` is pure + memoized at module-init; cost O(n) in the number of capability entries (~10 today); cross-refs are rendered via m16 `RelationsList` (unchanged); cross-ref `<Link>`s use TanStack Router internal navigation (no `fetch(`).

### Decision 7 — Reuse strategy: m16 `EntityHeader` + `MetadataCard` + `RelationsList` + `docsSafeMarkdown` via Extension Registry; m10.1 `recipeLoader` reused without modification (status: ACCEPTED)

**Title**: Load-bearing reuse (Option A from proposal D7)

**Rationale**: M10.2 does NOT reimplement `EntityHeader` / `MetadataCard` / `RelationsList` / `docsSafeMarkdown`. The `CapabilityDetail.tsx` view synthesizes a `CatalogEntity` from each `CapabilityEntry` and resolves cards via `extensionRegistry.resolveEntityCards(...)` (per-entity mode). The Extension Registry dispatch contract is unchanged (filter by `predicate`, sort by `priority`); `apiVersion: 'control-plane.extensions/v1'` is preserved verbatim per ADR-022. **No direct import of `features/catalog/entity/`** — reuse happens exclusively through the Extension Registry (m15/m16 isolation contract preserved).

**Rejected alternatives**:
- Option (b) "re-implement per-kind" — rejected: duplicates ~150 LoC of m16 entity projection; the cycle intent is "reuse from m16".
- Option (c) "no entity-page reuse; render capabilities as plain lists" — rejected: loses the cross-kind navigation (Decision 6); loses the consistent UX with `/catalog` entities.

**Consequences**: 6 NEW `EntityCardExtension`s register against the existing Extension Registry (one per capability kind); `CapabilityDetail.tsx` does NOT directly import from `features/catalog/entity/` or `features/docs/`; the isolation invariant is preserved (capability-isolation.spec.ts oracle).

### Decision 8 — Performance budget: `import.meta.glob` with `eager:false` alternative not needed; ~15KB gzipped delta; 1.5MB gzipped total post-M10 budget (status: ACCEPTED)

**Title**: Performance budget (Option A from proposal D8)

**Rationale**: 0 new pinned deps; bundle-size impact ~15KB gzipped (well under the 1.5MB gzipped post-M10 limit per `docs/28-CONTROL-PLANE-STACK.md` §"Dependency governance"). The 6 `import.meta.glob` results are synchronous at module-init. No service worker needed (rejected: would require dynamic content loading, violating the build-time static discovery choice).

**Rejected alternatives**:
- "Runtime fetch with service worker" — rejected: violates the serverless invariant; would require dynamic content loading per route; would complicate the static build path.
- "Lazy-loaded via dynamic import" — rejected: lazy loading would mean the user waits on a network round-trip to discover capabilities.
- "`import.meta.glob` with `eager:false`" — rejected: lazy loading offers no benefit since the manifest is bounded by ~10 entries today; eager loading is the simplest and smallest-bundle option.

**Consequences**: `vite build` resolves the 6 globs and embeds the contents; the `dist/` bundle is static; no service worker; no runtime fetch; bundle-size check in CI (≤ 15KB gzipped cap for the capability manifest); if exceeded in a future cycle, the fallback is `eager:false` + per-route code-splitting (a future M10.2.x cycle).

---

## UAT-M10-06 Acceptance Criteria

The following 5 acceptance criteria MUST be satisfied for `uat/UAT-M10-06-capability-catalog.md` Pass clause. Each criterion is numerically testable.

### AC-M10-06-1 — Overview renders 6 kind sections with accurate counts

**Given** a project snapshot at HEAD `364571c` with the bundled seed data (3 skills, 4 packs, 2 profiles, 1 workflow, 0 providers, 1 recipe)

**When** the user navigates to `/capabilities`

**Then** the page renders 6 kind sections, each showing the count + entries + (when count > 5) a "see all" link

**Pass**:
- The page shows the "Skills" section with 3 entries (no "see all" link; all 3 fit in the preview)
- The page shows the "Packs" section with 4 entries grouped by pack-KIND
- The page shows the "Profiles" section with 2 entries (1 global + 1 project-scoped, distinguished by `data-scope` attribute)
- The page shows the "Comfy Workflows" section with 1 entry
- The page shows the "Image Providers" section with the empty-state per REQ-CR-CAP-7 (NOT a 0-row list)
- The page shows the "Recipes" section with 1 entry

**Verifiable proof clause**: `vite preview /capabilities` renders the page; `capability-catalog.spec.ts` test "overview renders 6 kind sections" PASS; the DOM SHALL contain 6 elements with class `kind-section-<kind>` and the counts SHALL match the proposal §"Data coverage" table.

### AC-M10-06-2 — Per-capability detail renders m16 `EntityHeader` + `MetadataCard` + `RelationsList` via Extension Registry (no direct import)

**Given** the bundled `Skill:examples/character-consistency` capability (or any other capability)

**When** the user navigates to `/capabilities/skill/examples/character-consistency`

**Then** the detail page renders:
1. `EntityHeader` (from `features/catalog/entity/EntityHeader.tsx`) showing `Skill` / `examples` / `character-consistency`
2. `MetadataCard` (from `features/catalog/entity/MetadataCard.tsx`) showing the parsed metadata
3. `RelationsList` (from `features/catalog/entity/RelationsList.tsx`) showing cross-references (e.g., the packs that mention this skill)
4. The full `SKILL.md` content rendered through m16 `docsSafeMarkdown` (GFM-safe; entity-link-aware via `entityLinkPlugin`)

**Pass**:
- The detail page reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` components WITHOUT modification
- The detail page reuses `docsSafeMarkdown` for markdown rendering WITHOUT modification
- The detail page does NOT directly import from `features/catalog/entity/` or `features/docs/` (reuse happens via Extension Registry; isolation invariant preserved)

**Verifiable proof clause**: `capability-catalog.spec.ts` test "detail page composes m16 components" PASS; `extension-isolation.spec.ts` test "features/capability-catalog/ does not import features/catalog/entity/ directly" PASS; `grep -rE "from\s+['\"]\.\.\/\.\.\/catalog\/entity|from\s+['\"]\.\.\/\.\.\/docs\/" control-plane/src/features/capability-catalog/` returns `0` matches.

### AC-M10-06-3 — ROUND-TRIP NO-OP PROOF: visiting any of the 8 new routes does NOT mutate `useProjectionStore.getState()` (snapshot identity preserved)

**Given** a loaded project with `useProjectionStore.status === 'loaded'`, `useProjectionStore.bundle` populated, `useProjectionStore.catalogEntities` populated (e.g., the bundled 4 entity kinds from `golden/control-plane/snapshot-valid/`)

**When** the user navigates through all 8 new M10.2 routes (`/capabilities` + the 6 per-kind pages + a sample `/capabilities/skill/examples/character-consistency` detail page)

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
- DevTools Network panel shows zero outbound application-API requests after `/capabilities` load (serverless invariant extended to capability-catalog)

**Verifiable proof clause**: `capability-isolation.spec.ts` test "projection store identity preserved across 8 routes" PASS; `grep -c "useProjectionStore" control-plane/src/features/capability-catalog/**/*.ts*` returns `0`; `grep -rE "useProjectionStore\.setState|\.set\(" control-plane/src/features/capability-catalog/` returns `0`.

### AC-M10-06-4 — Provider page renders explicit empty-state fixture (`golden/.../providers-empty.json`) with "configure via provider-capability.schema.json" prompt

**Given** the bundled manifest carries `providers.length === 0` (HEAD `364571c`)

**When** the user navigates to `/capabilities/providers`

**Then** the page renders the explicit empty-state component consuming the `providers-empty.json` fixture

**Pass**:
- The page renders a `<div class="providers-empty-state">` element
- The element carries the literal heading "No image providers configured"
- The element carries the body "Image provider capabilities are declared against `specs/provider-capability.schema.json` (provider-neutral descriptor, RE-IMG-7, ADR-011). Future authoring lands with the image-provider configuration cycle."
- The element carries an `<a href="/docs/12-IMAGE-PIPELINE.md" target="_blank" rel="noopener">` link to the Image Pipeline Documentation
- The empty-state content matches `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` byte-for-byte

**Verifiable proof clause**: `capability-catalog.spec.ts` test "providers page renders empty state" PASS; `grep -c "examples/*.provider.yaml" control-plane/src/features/capability-catalog/manifest.ts` returns `0` (no synthetic provider glob; Decision 4 "no auto-stub" honored).

### AC-M10-06-5 — Cross-references: A skill's "Pack:editorial" link navigates to `/capabilities/packs/editorial` (entity route resolution)

**Given** the `Skill:examples/character-consistency` detail page has a `RelationsList` cross-reference to `Pack:recipe:middle-grade-illustrated/characters/character_design`

**When** the user clicks the cross-reference in the `RelationsList`

**Then** the user is navigated to `/capabilities/pack/recipe:middle-grade-illustrated/characters/character_design`

**Pass**:
- The cross-reference renders as a TanStack Router `<Link to="/capabilities/pack/recipe:middle-grade-illustrated/characters/character_design">` (internal navigation; no `fetch(`)
- The drill-down resolves to the bundled pack markdown (`recipes/middle-grade-illustrated/skeleton/packs/characters/character_design.md`)
- After the drill-down, `useProjectionStore` state is STILL UNCHANGED (this is a no-op navigation; same as AC-M10-06-3)
- The drill-down destination renders m16's `EntityHeader` + `MetadataCard` + `RelationsList` (same pattern as the origin detail page)

**Verifiable proof clause**: `capability-catalog.spec.ts` test "cross-references resolve to entity detail routes" PASS; `capability-isolation.spec.ts` test "projection store identity preserved after drill-down" PASS; `grep -cE 'fetch\(' control-plane/src/features/capability-catalog/views/CapabilityDetail.tsx` returns `0` (no remote URL navigation).

---

## F-004 Oracle Extension

M10.1 added `/create` to `routes.tsx` and `routes-router.spec.ts` (8 routes in `routePaths` const array at `control-plane/src/routes/routes.tsx:2-11`). M10.2 extends the F-004 oracle with 8 new entries (the new capability-catalog routes) for a total of **16 entries**.

### Expected post-apply `routePaths` array (verbatim, 16 entries)

```ts
export const routePaths = [
  // m14 baseline (6 entries) — preserved verbatim
  "path: '/'",
  "path: '/overview'",
  "path: '/story'",
  "path: '/visual'",
  "path: '/qa'",
  "path: '/history'",
  // m16 ADDITIVE (1 entry) — preserved verbatim
  "path: '/search'",
  // m10.1 ADDITIVE (1 entry) — preserved verbatim
  "path: '/create'",
  // M10.2 ADDITIVE (8 entries) — NEW
  "path: '/capabilities'",
  "path: '/capabilities/skills'",
  "path: '/capabilities/packs'",
  "path: '/capabilities/profiles'",
  "path: '/capabilities/workflows'",
  "path: '/capabilities/providers'",
  "path: '/capabilities/recipes'",
  "path: '/capabilities/$kind/$namespace/$name'",
] as const;
```

### `routes-router.spec.ts` expectations

- The F-004 oracle test SHALL assert `routePaths.length === 16` exactly (was `8` in m10.1; +8 new entries)
- The F-004 oracle test SHALL assert all 8 new path literals are present in the array (matching the regex pattern above)
- The F-004 oracle test SHALL assert NO m14/m15/m16/m10.1 entries are removed (additive only)
- The test SHALL additionally assert that `grep -nE "path:\s*'/capabilities'" control-plane/src/routes/router.ts` returns a line number GREATER than the `/create` and `/entity/$kind/$namespace/$name` line numbers (route ordering preserved per F-004)

### Verification oracles

- `grep -cE "path:\s*'/.*'" control-plane/src/routes/routes.tsx` SHALL return `16`
- `grep -cE "path:\s*'/capabilities'|path:\s*'/capabilities/skills'|path:\s*'/capabilities/packs'|path:\s*'/capabilities/profiles'|path:\s*'/capabilities/workflows'|path:\s*'/capabilities/providers'|path:\s*'/capabilities/recipes'|path:\s*'/capabilities/\\\$kind/\\\$namespace/\\\$name'" control-plane/src/routes/routes.tsx` SHALL be `>= 8`
- `pnpm test --run control-plane/test/routes-router.spec.ts` SHALL exit `0`

---

## Verifier Preemptions

M10.1 had 15 verifier findings (`verify-findings.json` F-01 through F-16 + SF-01 through SF-02). M10.2 preempts the following analogous findings by construction (mapped from proposal §"Verifications / preempted verifier findings" + extended with m10.1 specific patterns):

| Pre-empted finding ID | What sddk-verify might look for | How M10.2 preemptively resolves it | Test/oracle |
|---|---|---|---|
| **`V-06-01-routecount`** | `routePaths.length === N` (N is the expected route count after M10.2) | `routes-router.spec.ts` asserts `routePaths.length === 16` exactly | EVT-CAP-9a |
| **`V-06-02-cross-folder-imports`** | grep oracle for `from '../../story/'` (and other feature folders) inside `features/capability-catalog/` | `extension-isolation.spec.ts` test 4 grep oracle EXTENDED for `features/capability-catalog/` (INC-008 fix precedent from m16) | EVT-CAP-10a |
| **`V-06-03-no-write-invariant`** | `useProjectionStore` is never imported in `features/capability-catalog/` | NEW `capability-isolation.spec.ts` grep oracle asserts `0` matches for `useProjectionStore` in `features/capability-catalog/` | EVT-CAP-10a |
| **`V-06-04-schema-mutation`** | NO `specs/*.schema.json` modified by M10.2 | Cycle is purely projection + UI; no schema mutations; `MANIFEST.json` shows no schema file modifications; ajv-cli validates against UNMODIFIED `specs/profile.schema.json` | EVT-CAP-8a + EVT-CAP-11a |
| **`V-06-05-no-new-deps`** | NO new entries in `control-plane/package.json` dependencies | 0 new pinned deps; all imports use already-pinned dependencies (`react@19.2.8`, `react-dom@19.2.8`, `react-markdown@9.1.0`, `rehype-sanitize@6.0.0`, `remark-gfm@4.0.1`, `@tanstack/react-router@1.170.32`, `ajv@8.20.0`, `tailwindcss@4.3.3`) | EVT-CAP-11a (tsc 0) + grep oracle on `package.json` |
| **`V-06-06-static-build`** | `vite build` succeeds and produces a static bundle | `import.meta.glob` is Vite first-party build-time feature; `vite build` produces a static bundle; no SSR | EVT-CAP-11a (build success) |
| **`V-06-07-bundle-size-budget`** | bundle size impact ≤ 15KB gzipped | 6 `import.meta.glob` results are ~15KB gzipped; well below the 1.5MB gzipped post-M10 budget | EVT-CAP-1a |
| **`V-06-08-fixture-coverage`** | every enumerated capability has a snapshot-valid fixture | 12 NEW fixtures in `golden/control-plane/snapshot-valid/capabilities/` (11 enumerated + 1 empty-state fixture) | EVT-CAP-12a |
| **`V-06-09-doc-discipline`** | doc updates are substantive (not no-op) | Block F dedicated closeout block; one task per doc + oracle verifying substantive change; `docs/29` §"Capability Catalog as implemented (m10.2 slice)" | Block F commit message + MANIFEST.json regen |
| **`V-06-10-cross-language-equivalence`** | Python and TypeScript produce identical output | M10.2 does NOT have a Python component (no `tools/` additions besides `tools/validate-profiles/validate.py`); the validate script is a CI gate, NOT a parallel implementation; no cross-language equivalence needed | N/A (out of scope) |
| **`V-06-11-route-param-collision`** | the shared `/capabilities/$kind/$namespace/$name` route does not collide with future routes | TanStack Router routes are strictly typed; the `$kind/$namespace/$name` parameter pattern matches m15's `/entity/$kind/$namespace/$name` precedent; future route additions follow the same pattern | EVT-CAP-9a (route registration oracle) |
| **`V-06-12-entity-isolation-via-extension-registry`** | the capability detail page does not import `features/catalog/entity/` directly (must use Extension Registry) | `CapabilityDetail.tsx` uses `extensionRegistry.resolveEntityCards(...)` to render `EntityHeader` + `MetadataCard` + `RelationsList`; NEW `capability-isolation.spec.ts` test asserts no direct imports | EVT-CAP-5a |
| **`V-06-13-empty-state-coverage`** | the providers empty state is rendered when 0 providers exist | `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` fixture + `capability-catalog.spec.ts` test "providers page renders empty state" | EVT-CAP-7a |
| **`V-06-14-cross-references-completeness`** | `crossReferences` is computed for all capability entries | `capability-catalog.spec.ts` test "cross-references resolve to entity detail routes"; topological derivation verified at module-init | EVT-CAP-6a + EVT-CAP-6b |
| **`V-06-15-F-004-oracle-coverage`** | the F-004 oracle at `routes.tsx` covers all new routes | `routes.tsx` F-004 oracle EXTENDED with 8 new entries; total `16`; `routes-router.spec.ts` test asserts `routePaths.length === 16` | EVT-CAP-9a |
| **`V-06-16-incantation-numbers-m10-1-pattern`** (m10.1 carry-over) | the 7 m10.1 find-patterns continue to hold (recipe schema additive-only; `recipe-loader-error` code declared in both languages; etc.) | M10.2 does NOT modify `specs/creation-recipe.schema.json`; m10.1 grep oracles remain valid | `git diff HEAD~6..HEAD -- specs/creation-recipe.schema.json` is empty for M10.2 commits |

---

## Open Questions

The proposal surfaced 0 BLOCKING + 0 NON-BLOCKING questions at propose-time. The following emerged during specification and are listed for completeness:

1. **NON-BLOCKING: F-004 oracle parameterized-route policy** — the proposal's user-visible-surface section (lines 521-523) claims `routePaths` grows from 8 to 16 entries with all 8 new routes added (including the parameterized `/capabilities/$kind/$namespace/$name`). The same proposal elsewhere states "the parameterized routes are not in the F-004 list per the m15 precedent at `routes.tsx`" (line 523 paren). This spec documents the user-task-description interpretation (8 new entries added, total 16) which INCLUDES the parameterized route in `routePaths` — this is a deliberate departure from the m15 precedent (which excluded `/entity/$kind/$namespace/$name` from `routePaths`). **Resolution path**: if sddk-design prefers to keep the m15 precedent (parameterized routes excluded), the F-004 oracle grows to 15 entries and the parameterized route is added to `routes-router.spec.ts` as a separate assertion (out-of-band). The spec records this as NON-BLOCKING because both interpretations preserve the route ordering invariant and the verifier preemption contracts.
2. **NON-BLOCKING: Topological cross-reference depth for packs** — `capabilitySelectors.crossReferences` derives pack→skill cross-refs via simple string match (`grep -F <skill-name> <pack-markdown>`). Future skill names that appear as substrings of unrelated words (e.g., a skill named `art` would match `start` in any pack body) could produce false-positive cross-refs. **Resolution path**: a future M10.2.x cycle may introduce word-boundary matching or semantic tags; V1 accepts the false-positive rate as bounded by the small data set (~10 entries).
3. **NON-BLOCKING: `examples/packs/` future author path** — `RISK-R-PACK-ORPHAN` per proposal §Risks records that a future cycle deleting `recipes/middle-grade-illustrated/` would orphan the 4 packs. The fix (lifting packs to `examples/packs/`) is deferred to a future pack-authoring cycle. V1 ships with the risk documented; no V1 action required.
4. **NON-BLOCKING: Provider-authoring cycle timing** — `RISK-R-EMPTY-PROVIDERS` records that the providers page renders an empty state that users may find confusing. The fix (a real M7 provider-authoring cycle) is out of scope for V1; the empty-state UX + schema pointer per Decision 4 is the documented interim.
5. **NON-BLOCKING: Markdown excerpt extraction policy** — `parseSkillMarkdown` extracts a 200-char description from the first heading or first paragraph. A skill markdown with only frontmatter (no body) produces a "no description" placeholder. `capability-parsers.spec.ts` covers the empty case per `RISK-R-EMPTY-MARKDOWN`; no V1 action required.

0 BLOCKING; 5 NON-BLOCKING.

---

## References

### Cycle artifacts (this change)

- This spec: `$CA/spec.md` (to be authored by sddk-spec)
- Approved proposal: `changes/m10-2-capability-catalog/proposal.md` SHA-256 `2dc5a09a8331587a69819bebbb0594d8112098f754aee6baefdbccb94369e933` (committed `a48214d` on `feat/m10-2-capability-catalog`)
- (To be authored in subsequent phases) `changes/m10-2-capability-catalog/{design,tasks}.md`
- (To be authored in this phase per precedent) `uat/UAT-M10-06-capability-catalog.md`
- (Cycle artifacts dir) `/var/home/rubentxu/.local/share/sddk/projects/p-7c4aff45199a2069/cycle-artifacts/p-7c4aff45199a2069/m10-2-capability-catalog/`

### Reference cycles (precedents consumed)

- **m10.1 (m10-1-creation-recipes)**: `changes/m10-1-creation-recipes/proposal.md` + `spec.md` — A-lite precedent for spec structure (mirror this spec); consumed `recipes/recipeLoader.ts` for recipe-kind enumeration (unchanged); pattern reused: 6 atomic per-block commits; F-004 oracle update for `/create`; INC-008 fix precedent for `recipes/`
- **m16 (m16-cp-studio-search-docs)**: `changes/m16-cp-studio-search-docs/proposal.md` + `spec.md` + `design.md` — INC-008 grep oracle extension precedent for new feature folders; `/search` route as F-004 oracle update precedent; `[[Kind:namespace/name]]` entity-link plugin pattern
- **m15 (m15-cp-catalog-entities)**: `changes/m15-cp-catalog-entities/proposal.md` — `/catalog` overview + `/entity/$kind/$namespace/$name` parameterized detail pattern (the m10.2 capability-catalog mirrors this pattern)
- **m14 (m14-cp-foundation)**: `changes/m14-cp-foundation/` — F-004 oracle at `routes.tsx:2-11`; `extension-isolation.spec.ts` grep invariant; serverless SPA shell

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
- `docs/28-CONTROL-PLANE-STACK.md` §"Dependency governance" — bundle-size budget (1.5MB gzipped post-M10)
- `docs/28-CONTROL-PLANE-STACK.md` §"Docs pipeline" — markdown rendering pipeline (m16)
- `docs/32-NARRATIVE-DOCS-SEARCH.md` §"Index persistence" — V1 substring index (NOT extended by M10.2)
- `docs/33-STUDIO-HOME-WORKBENCH.md` — Studio Home (out of scope; M10.3)
- `docs/34-CONTROL-PANE-DATA-CONTRACTS.md` §Entity references — `Kind:namespace/name` canonical string pattern
- `docs/35-CATALOG-PROVIDERS.md` — client-side federated catalog architecture (M10.2 is single-project)
- `docs/adrs/ADR-021-narrative-catalog-projection.md` — catalog projection model
- `docs/adrs/ADR-022-control-plane-extension-model.md` — extension model (M10.2 reuses without modification)
- `docs/adrs/ADR-024-client-side-federated-catalog.md` — federated catalog (M10.3 territory)

### Schemas

- `specs/catalog-entity.schema.json` lines 23-30 — 6 capability kinds in the `kind` enum (`Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`)
- `specs/profile.schema.json` — profile shape (V1 enumerates 2 profiles against this schema)
- `specs/creation-recipe.schema.json` — recipe shape (V1 enumerates 1 recipe; m10.1 gate continues to enforce)
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
- `control-plane/src/routes/router.ts` — MODIFIED (8 new routes)
- `control-plane/src/routes/routes.tsx` — MODIFIED (F-004 oracle update: 8 new entries)
- `control-plane/test/extension-isolation.spec.ts` — MODIFIED (INC-008 grep oracle extended for `features/capability-catalog/`)
- `control-plane/test/routes-router.spec.ts` — MODIFIED (F-004 oracle update: 16 entries)
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

Per `~/.config/opencode/AGENTS.md` §"CI Policy — Local CI Is the Source of Truth": local validation is the gate; GitHub Actions is the release gate. The M10.2 cycle validates locally via `pnpm --filter control-plane {typecheck,test,build}` + `python tools/validate-profiles/validate.py` (the 2 profile schema validations) + `python tools/validate-recipes/validate.py` (the m10.1 recipe validation); the GitHub Actions workflow is updated to add the `validate-profiles` step at the release gate only.

### Engram memory topics

- `architecture/capability-catalog` — to be created at apply-time via `engram_mem_save` with the M10.2 architectural decisions
- `pattern/import-meta-glob-discovery` — to be created at apply-time as a reusable pattern
- `decision/empty-state-for-zero-instances` — to be created at apply-time as a reusable UX pattern

### Glossary additions (codified in this phase per launch packet)

- **Capability Manifest (V1)**: The build-time static record of all capabilities (Skills, Packs, Profiles, Comfy Workflows, Image Providers, Recipes) enumerated from on-disk files via `import.meta.glob`. Resolves at Vite build time; ~15KB gzipped; embedded in the static bundle.
- **Build-time Static Discovery**: The pattern of using Vite's `import.meta.glob` with `{ query: '?raw', import: 'default', eager: true }` to enumerate file-tree contents at build time. Preserves the m10 serverless invariant (no runtime fetch); zero bundle-time I/O at runtime.
- **Cross-capability Drill-down**: The capability-catalog navigation pattern where `capabilitySelectors.crossReferences(ref)` returns per-kind cross-reference groups (packs/skills/profiles/recipes/workflows/providers) and the `RelationsList` component renders each as a TanStack Router `<Link>` to the target capability's detail route. Internal navigation only; no `fetch(`.
- **Capability Detail Page**: The M10.2 view at `/capabilities/$kind/$namespace/$name` that synthesizes a `CatalogEntity` from a `CapabilityEntry` and reuses the m16 `EntityHeader` + `MetadataCard` + `RelationsList` via the existing Extension Registry. Zero direct imports from `features/catalog/entity/` (isolation invariant preserved).