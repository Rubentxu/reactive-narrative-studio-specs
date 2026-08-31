# M10.2 — Capability Catalog — Tasks

**Cycle**: `p-7c4aff45199a2069/m10-2-capability-catalog`
**Path**: A-lite
**Branch**: `feat/m10-2-capability-catalog`
**Base**: `364571c5e9685cc86775aed4e425d87e0e380e05` (m10.1 HEAD / v0.9.0)
**Estimated LoC budget**: ~1380 (within orchestrator-pre-authorized waiver)

---

## Block Plan

```
PF  Pre-Flight       (tooling check, baseline tsc/vitest/pytest green)
0   Foundation       (parsers + manifest infrastructure)
1   Overview+Kinds   (7 routes: overview + 6 per-kind lists)
2   Detail+Refs      (1 route + cross-reference resolution)
3   Tests+CI         (12 fixtures + 4 test files + F-004 + INC-008 + validate-profiles)
F   Final            (docs + MANIFEST regen + closeout)
```

**Atomic commit plan** (per-block):
- Block 0: `feat(m10.2): capability-catalog parsers + manifest infrastructure`
- Block 1: `feat(m10.2): capability-catalog overview + per-kind pages + 7 routes`
- Block 2: `feat(m10.2): capability-catalog detail page + cross-reference resolution`
- Block 3: `test(m10.2): capability-catalog fixtures + tests + F-004 oracle + isolation grep + CI`
- Block F: `docs(m10.2): glossary-catalog-roadmap-stack-readme-manifest-regen`

---

## Coverage Matrix

| REQ-ID | Tasks | AC |
|---|---|---|
| REQ-CR-CAP-1 (manifest system) | T0.1, T0.2, T0.3 | UAT-M10-06-1 |
| REQ-CR-CAP-2 (per-kind parsers) | T0.4, T0.5, T0.6, T0.7, T0.8, T0.9 | UAT-M10-06-1 |
| REQ-CR-CAP-3 (overview page) | T1.1, T1.2 | UAT-M10-06-1 |
| REQ-CR-CAP-4 (per-kind pages) | T1.3, T1.4, T1.5, T1.6, T1.7, T1.8 | UAT-M10-06-1 |
| REQ-CR-CAP-5 (detail page) | T2.1, T2.2, T2.3 | UAT-M10-06-2 |
| REQ-CR-CAP-6 (cross-references) | T2.4, T2.5 | UAT-M10-06-5 |
| REQ-CR-CAP-7 (empty-state providers) | T1.8, T3.10 | UAT-M10-06-4 |
| REQ-CR-CAP-8 (profile scopes) | T0.6, T3.9 | UAT-M10-06-1 |
| REQ-CR-CAP-9 (routes + F-004) | T1.9, T3.11 | UAT-M10-06-1 |
| REQ-CR-CAP-10 (isolation) | T3.12, T3.13 | UAT-M10-06-3 |
| REQ-CR-CAP-11 (CI guards) | T3.14, T3.15 | UAT-M10-06-1 |
| REQ-CR-CAP-12 (fixtures) | T3.1, T3.2, T3.3, T3.4, T3.5, T3.6, T3.7, T3.8, T3.9, T3.10 | UAT-M10-06-1, UAT-M10-06-4 |

**Coverage**: 12/12 REQ + 5/5 AC + 6/6 m10 invariants

| m10 invariant | Tasks | Mechanism |
|---|---|---|
| serverless | T0.10, T3.12 | `grep -rn 'fetch(' features/capability-catalog/` returns 0 |
| no-Dexie/IndexedDB/Orama | T3.12 | `grep -rn 'dexie\|indexeddb\|orama' features/capability-catalog/` returns 0 |
| no-write-CP | T3.12, T3.13 | `grep -rn 'useProjectionStore' features/capability-catalog/` returns 0 actual imports; UAT-M10-06-3 round-trip no-op |
| exact-pins | T0.11, T3.14 | `grep -E '(>=|<|~|\^)' pyproject.toml package.json` returns only `setuptools>=61.0` + `requires-python` |
| static-build | T3.16 | `pnpm build` exit 0 |
| additive-only-schema | T0.12, T3.17 | `git diff 364571c..HEAD -- specs/` returns empty |

---

## Apply Agent Warnings (lessons from m10.1)

> **DO NOT trust your own envelope.** Orchestrator will independently run:
> 1. `git diff 364571c..HEAD -- specs/` → must be empty
> 2. `grep -c "path:" control-plane/src/routes/routes.tsx` → must be ≥18
> 3. `grep -c "path:" control-plane/test/routes-router.spec.ts` → must be ≥18
> 4. `grep -rn "useProjectionStore" control-plane/src/features/capability-catalog/` → 0 actual imports
> 5. `grep -rn "fetch(" control-plane/src/features/capability-catalog/` → 0
> 6. `pnpm test` (FULL) → all 12 spec files pass (21+ from m10.1)
> 7. `pnpm build` → exit 0
> 8. `python3 -m pytest tools/ -q` → 44+ tests pass
> 9. `ls golden/control-plane/snapshot-valid/capabilities/` → 12 fixtures
> 10. `grep -rn "capability-catalog" control-plane/test/extension-isolation.spec.ts` → ≥1 hit
> 11. `grep -E "(>=|<|~|\^)" tools/*/pyproject.toml` → only build-system + interpreter pins
> 12. Each per-block commit must be atomic (one type only) and conventional-commit format

---

## Tasks

### Block PF — Pre-Flight

#### Task PF.1 — Baseline tooling check
- **Block**: PF
- **REQs**: none
- **ACs**: none
- **m10 invariants**: all
- **Files**: none
- **Acceptance**:
  - [ ] `pnpm --filter control-plane tsc --noEmit` exit 0
  - [ ] `pnpm --filter control-plane test` exit 0 (full suite, all 21+ files)
  - [ ] `pnpm --filter control-plane build` exit 0
  - [ ] `python3 -m pytest tools/ -q` 44+ tests pass
- **Commit type**: chore
- **Conventional commit**: `chore(m10.2): pre-flight baseline green check` (only if needed; no-op commit forbidden)

---

### Block 0 — Foundation (Parsers + Manifest)

#### Task T0.1 — Create feature module skeleton + Extension Registry entry
- **Block**: 0
- **REQs**: REQ-CR-CAP-1
- **ACs**: UAT-M10-06-1
- **m10 invariants**: no-write-CP, serverless
- **Files**:
  - create: `control-plane/src/features/capability-catalog/index.tsx`
- **Acceptance**:
  - [ ] `index.tsx` exists with Extension Registry `register({ kind: 'capability-catalog', name: 'capability-catalog', load: () => Promise.resolve({...}) })`
  - [ ] No imports from `useProjectionStore`, `useQuery`, or any write-side hook
  - [ ] Exports `CapabilityCatalogExtension` as default export
- **Commit type**: feat
- **Conventional commit**: (part of block 0 atomic commit)

#### Task T0.2 — Manifest module (import.meta.glob + enumeration)
- **Block**: 0
- **REQs**: REQ-CR-CAP-1
- **ACs**: UAT-M10-06-1
- **m10 invariants**: serverless, static-build
- **Files**:
  - create: `control-plane/src/features/capability-catalog/manifest.ts`
- **Acceptance**:
  - [ ] Uses `import.meta.glob('/examples/skills/*/SKILL.md', { eager: true, query: '?raw', import: 'default' })` for skills
  - [ ] Uses `import.meta.glob('/examples/packs/**/*.md', { ... })` for global packs
  - [ ] Uses `import.meta.glob('/recipes/*/skeleton/packs/**/*.md', { ... })` for recipe-scoped packs
  - [ ] Uses `import.meta.glob('/examples/*.yaml', { eager: true })` for profiles
  - [ ] Uses `import.meta.glob('/control-plane/workflows/comfyui/*.workflow.json', { eager: true })` for workflows
  - [ ] Providers is hardcoded `[]` with TODO note in design.md (DD-4)
  - [ ] Uses `import.meta.glob('/recipes/*/recipe.yaml', { eager: true })` for recipes
  - [ ] Each manifest entry has: kind, id, namespace, name, path, origin, sha256
  - [ ] sha256 computed via `crypto.subtle.digest('SHA-256', ...)` at module init
- **Commit type**: feat

#### Task T0.3 — useCapabilityManifest React hook
- **Block**: 0
- **REQs**: REQ-CR-CAP-1
- **ACs**: UAT-M10-06-1, UAT-M10-06-3
- **m10 invariants**: no-write-CP
- **Files**:
  - create: `control-plane/src/features/capability-catalog/useCapabilityManifest.ts`
- **Acceptance**:
  - [ ] Returns synchronous `CapabilityManifest` from cached import.meta.glob results
  - [ ] No async/Promise in the hook (m16 sync-at-module-init pattern)
  - [ ] Memoized via `useMemo` to prevent re-computation
  - [ ] Zero side-effects (no useEffect)
- **Commit type**: feat

#### Task T0.4 — Skill parser
- **Block**: 0
- **REQs**: REQ-CR-CAP-2
- **ACs**: UAT-M10-06-1
- **Files**:
  - create: `control-plane/src/features/capability-catalog/parser.ts` (or split into per-kind files)
- **Acceptance**:
  - [ ] Exports `parseSkill(markdownContent, sourcePath): ParsedSkill`
  - [ ] Parses H1 title (`# <name>`) → `name`
  - [ ] Parses first `## Purpose` section → `purpose` (first paragraph)
  - [ ] Returns `{ id, namespace: 'default', name, purpose, path, sha256, origin: 'global' }`
  - [ ] Unit-testable with 3 fixtures
- **Commit type**: feat

#### Task T0.5 — Pack parser
- **Block**: 0
- **REQs**: REQ-CR-CAP-2, REQ-CR-CAP-8
- **ACs**: UAT-M10-06-1
- **Files**: (parser.ts)
- **Acceptance**:
  - [ ] Exports `parsePack(markdownContent, sourcePath, origin): ParsedPack`
  - [ ] Parses H1 title → `name`
  - [ ] Parses first paragraph after H1 → `description`
  - [ ] For `origin: 'recipe:<id>'` → namespace = `<id>`; otherwise 'default'
  - [ ] Returns `{ id, namespace, name, description, path, sha256, origin }`
- **Commit type**: feat

#### Task T0.6 — Profile parser
- **Block**: 0
- **REQs**: REQ-CR-CAP-2, REQ-CR-CAP-8
- **ACs**: UAT-M10-06-1
- **Files**: (parser.ts)
- **Acceptance**:
  - [ ] Exports `parseProfile(yamlContent, sourcePath): ParsedProfile`
  - [ ] Uses `js-yaml` (already pinned) for safe YAML parsing
  - [ ] Reads `schema: profile/v1`, `profileId`, `audience`, `format`, `voice`, `guardrails`
  - [ ] For `examples/middle-grade-profile.yaml` → namespace='default'
  - [ ] For `recipes/*/skeleton/profiles/*.yaml` → namespace='<recipe-id>'
  - [ ] Returns `{ id, namespace, name, audience, format, voice, guardrails, path, sha256 }`
- **Commit type**: feat

#### Task T0.7 — Workflow parser
- **Block**: 0
- **REQs**: REQ-CR-CAP-2
- **ACs**: UAT-M10-06-1
- **Files**: (parser.ts)
- **Acceptance**:
  - [ ] Exports `parseWorkflow(jsonContent, sourcePath): ParsedWorkflow`
  - [ ] Parses `workflowId`, `provider`, `model`, `description`
  - [ ] Returns `{ id, namespace: 'default', name, provider, model, description, path, sha256 }`
- **Commit type**: feat

#### Task T0.8 — Provider parser (no-op stub for empty state)
- **Block**: 0
- **REQs**: REQ-CR-CAP-2, REQ-CR-CAP-7
- **ACs**: UAT-M10-06-4
- **Files**: (parser.ts)
- **Acceptance**:
  - [ ] Exports `parseProvider(): never` or returns empty array always
  - [ ] Hardcoded empty until first provider yaml exists
  - [ ] TODO comment referencing DD-4 empty-state decision
- **Commit type**: feat

#### Task T0.9 — Recipe parser (delegate to m10.1 recipeLoader)
- **Block**: 0
- **REQs**: REQ-CR-CAP-2
- **ACs**: UAT-M10-06-1
- **Files**:
  - modify: parser.ts
- **Acceptance**:
  - [ ] Imports `loadRecipe` from `@recipes/recipeLoader`
  - [ ] Wraps each loaded recipe in `{ kind: 'recipe', id, namespace: 'default', name, ... }`
  - [ ] No modifications to `recipeLoader.ts`
- **Commit type**: feat

#### Task T0.10 — Serverless invariant guard
- **Block**: 0
- **REQs**: REQ-CR-CAP-10
- **ACs**: UAT-M10-06-3
- **m10 invariants**: serverless
- **Files**:
  - modify: control-plane/src/features/capability-catalog/manifest.ts
- **Acceptance**:
  - [ ] No `fetch(`, `axios.`, `XMLHttpRequest`, or `http.get` calls in any of the 4 parser files
  - [ ] Verified via grep
- **Commit type**: feat

#### Task T0.11 — No-new-dependency verification
- **Block**: 0
- **REQs**: none
- **ACs**: none
- **m10 invariants**: exact-pins
- **Files**:
  - modify: control-plane/package.json (if needed — should NOT be)
- **Acceptance**:
  - [ ] `git diff 364571c..HEAD -- control-plane/package.json` shows no new dependencies added
  - [ ] All imports use existing pinned deps
- **Commit type**: feat

#### Task T0.12 — Additive-only schema guard
- **Block**: 0
- **REQs**: REQ-CR-CAP-10
- **ACs**: none
- **m10 invariants**: additive-only-schema
- **Files**: none
- **Acceptance**:
  - [ ] No `specs/*.schema.json` files modified during this block
  - [ ] Verified via `git diff 364571c..HEAD -- specs/`
- **Commit type**: feat

**Block 0 commit**: `feat(m10.2): capability-catalog parsers + manifest infrastructure (~280 LoC)`
**Files touched**: 3 new (index.tsx, manifest.ts, useCapabilityManifest.ts, parser.ts split)

---

### Block 1 — Overview + Per-Kind Pages

#### Task T1.1 — Overview view component
- **Block**: 1
- **REQs**: REQ-CR-CAP-3
- **ACs**: UAT-M10-06-1
- **Files**:
  - create: `control-plane/src/features/capability-catalog/views/Overview.tsx`
- **Acceptance**:
  - [ ] Renders 6 kind sections: Skills, Packs, Profiles, Workflows, Providers, Recipes
  - [ ] Each section header has count (e.g., "Skills (3)")
  - [ ] Each section lists capabilities as links to `/capabilities/{kind}/...`
  - [ ] Uses m16 docsSafeMarkdown for any markdown previews
- **Commit type**: feat

#### Task T1.2 — Overview route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-3, REQ-CR-CAP-9
- **ACs**: UAT-M10-06-1
- **Files**:
  - modify: `control-plane/src/routes/router.ts`
  - modify: `control-plane/src/routes/routes.tsx`
- **Acceptance**:
  - [ ] `router.ts` has `createRoute({ path: '/capabilities', component: CapabilitiesOverview })`
  - [ ] `routes.tsx` has `path: '/capabilities'` entry (F-004 oracle)
- **Commit type**: feat

#### Task T1.3 — KindList view component
- **Block**: 1
- **REQs**: REQ-CR-CAP-4
- **ACs**: UAT-M10-06-1
- **Files**:
  - create: `control-plane/src/features/capability-catalog/views/KindList.tsx`
- **Acceptance**:
  - [ ] Generic component accepting `kind` prop
  - [ ] Lists all capabilities of that kind
  - [ ] Each entry links to `/capabilities/{kind}s/{namespace}/{name}`
- **Commit type**: feat

#### Task T1.4 — Skills route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-9
- **Files**:
  - modify: `control-plane/src/routes/router.ts`, `routes.tsx`
- **Acceptance**: `path: '/capabilities/skills'` registered in both files
- **Commit type**: feat

#### Task T1.5 — Packs route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-9
- **Files**: (router.ts, routes.tsx)
- **Acceptance**: `path: '/capabilities/packs'` registered in both files
- **Commit type**: feat

#### Task T1.6 — Profiles route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-9
- **Files**: (router.ts, routes.tsx)
- **Acceptance**: `path: '/capabilities/profiles'` registered in both files
- **Commit type**: feat

#### Task T1.7 — Workflows route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-9
- **Files**: (router.ts, routes.tsx)
- **Acceptance**: `path: '/capabilities/workflows'` registered in both files
- **Commit type**: feat

#### Task T1.8 — Providers route wiring + empty-state
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-7, REQ-CR-CAP-9
- **ACs**: UAT-M10-06-4
- **Files**: (router.ts, routes.tsx)
- **Acceptance**:
  - [ ] `path: '/capabilities/providers'` registered in both files
  - [ ] When `manifest.providers.length === 0`, renders empty-state per design DD-4:
    - Header "Image Providers (0 configured)"
    - Link to `specs/provider-capability.schema.json`
    - CTA "Open schema documentation" (no-op or future-route placeholder)
- **Commit type**: feat

#### Task T1.9 — Recipes route wiring
- **Block**: 1
- **REQs**: REQ-CR-CAP-4, REQ-CR-CAP-9
- **Files**: (router.ts, routes.tsx)
- **Acceptance**: `path: '/capabilities/recipes'` registered in both files
- **Commit type**: feat

**Block 1 commit**: `feat(m10.2): capability-catalog overview + per-kind pages + 7 routes (~250 LoC)`
**Files touched**: 1 new (KindList.tsx), 1 new (Overview.tsx), 2 modified (router.ts, routes.tsx)

---

### Block 2 — Detail Page + Cross-References

#### Task T2.1 — CapabilityDetail view component
- **Block**: 2
- **REQs**: REQ-CR-CAP-5
- **ACs**: UAT-M10-06-2
- **Files**:
  - create: `control-plane/src/features/capability-catalog/views/CapabilityDetail.tsx`
- **Acceptance**:
  - [ ] Reads `kind`, `namespace`, `name` from route params
  - [ ] Looks up capability from manifest
  - [ ] Renders EntityHeader (reused from m16) with name + id + origin
  - [ ] Renders MetadataCard (reused from m16) with kind-specific fields
  - [ ] Renders RelationsList (reused from m16) with cross-references
- **Commit type**: feat

#### Task T2.2 — Detail route wiring
- **Block**: 2
- **REQs**: REQ-CR-CAP-5, REQ-CR-CAP-9
- **Files**:
  - modify: router.ts, routes.tsx
- **Acceptance**: `path: '/capabilities/$kind/$namespace/$name'` registered in both files
- **Commit type**: feat

#### Task T2.3 — m16 entity component reuse (Extension Registry pattern)
- **Block**: 2
- **REQs**: REQ-CR-CAP-5
- **ACs**: UAT-M10-06-2
- **Files**: (CapabilityDetail.tsx)
- **Acceptance**:
  - [ ] Imports `EntityHeader`, `MetadataCard`, `RelationsList` from `m16-catalog-entity` Extension Registry, NOT direct paths
  - [ ] No direct imports from `control-plane/src/features/catalog/entity/*`
- **Commit type**: feat

#### Task T2.4 — Cross-reference resolution in entityLinkPlugin
- **Block**: 2
- **REQs**: REQ-CR-CAP-6
- **ACs**: UAT-M10-06-5
- **Files**:
  - modify: `control-plane/src/features/docs/entityLinkPlugin.ts`
- **Acceptance**:
  - [ ] Extends (does NOT replace) the m16 entity link plugin
  - [ ] Recognizes `[[Skill:default/character-consistency]]` → `/capabilities/skills/default/character-consistency`
  - [ ] Recognizes `[[Pack:editorial/story_core]]` → `/capabilities/packs/editorial/story_core`
  - [ ] Recognizes `[[Profile:default/middle-grade-10-11]]` → `/capabilities/profiles/default/middle-grade-10-11`
  - [ ] Recognizes `[[Workflow:default/sdxl-illustrated-page]]` → `/capabilities/workflows/default/sdxl-illustrated-page`
  - [ ] Recognizes `[[Recipe:default/middle-grade-illustrated]]` → `/capabilities/recipes/default/middle-grade-illustrated`
  - [ ] Unknown refs render as plain text (graceful fallback)
  - [ ] m16 entity refs (Character, Chapter, etc.) continue to work
- **Commit type**: feat

#### Task T2.5 — Cross-reference drill-down verification
- **Block**: 2
- **REQs**: REQ-CR-CAP-6
- **ACs**: UAT-M10-06-5
- **Files**: (CapabilityDetail.tsx)
- **Acceptance**:
  - [ ] Skill detail page shows links to packs it powers (if present in markdown)
  - [ ] Pack detail page shows links to recipes that bundle it (origin tag)
- **Commit type**: feat

**Block 2 commit**: `feat(m10.2): capability-catalog detail page + cross-reference resolution (~300 LoC)`
**Files touched**: 1 new (CapabilityDetail.tsx), 1 modified (entityLinkPlugin.ts), 2 modified (router.ts, routes.tsx)

---

### Block 3 — Tests + CI Guards

#### Task T3.1 — Skill fixtures (3)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12
- **ACs**: UAT-M10-06-1
- **Files**:
  - create: `golden/control-plane/snapshot-valid/capabilities/skill-character-consistency.json`
  - create: `golden/control-plane/snapshot-valid/capabilities/skill-narrative-arc.json`
  - create: `golden/control-plane/snapshot-valid/capabilities/skill-scene-validator.json`
- **Acceptance**: Each fixture has `{ kind, id, namespace, name, purpose, path, sha256, origin }`
- **Commit type**: test

#### Task T3.2 — Pack fixtures (4)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12
- **Files**:
  - create: `golden/.../pack-story_core.json`, `pack-characters.json`, `pack-editorial.json`, `pack-visual_core.json`
- **Acceptance**: Each fixture has `{ kind, id, namespace, name, description, path, sha256, origin }` with `origin: 'recipe:middle-grade-illustrated'`
- **Commit type**: test

#### Task T3.3 — Profile fixtures (2)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12, REQ-CR-CAP-8
- **Files**:
  - create: `golden/.../profile-middle-grade-10-11.json` (from `examples/middle-grade-profile.yaml`, namespace=default)
  - create: `golden/.../profile-middle-grade-10-11-recipe.json` (from recipe skeleton, namespace=middle-grade-illustrated)
- **Commit type**: test

#### Task T3.4 — Workflow fixture (1)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12
- **Files**: create: `golden/.../workflow-sdxl-illustrated-page.json`
- **Commit type**: test

#### Task T3.5 — Recipe fixture (1)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12
- **Files**: create: `golden/.../recipe-middle-grade-illustrated.json`
- **Commit type**: test

#### Task T3.6 — Provider empty-state fixture (1)
- **Block**: 3
- **REQs**: REQ-CR-CAP-12, REQ-CR-CAP-7
- **ACs**: UAT-M10-06-4
- **Files**: create: `golden/.../providers-empty.json`
- **Acceptance**: `{ kind: 'provider', count: 0, empty_state: { header, body, cta } }`
- **Commit type**: test

#### Task T3.7 — Manifest snapshot test
- **Block**: 3
- **REQs**: REQ-CR-CAP-1, REQ-CR-CAP-12
- **ACs**: UAT-M10-06-1
- **Files**:
  - create: `control-plane/test/fixtures/capability-manifest-snapshot.ts`
- **Acceptance**: Exports the expected manifest snapshot at HEAD 364571c
- **Commit type**: test

#### Task T3.8 — Capability catalog spec
- **Block**: 3
- **REQs**: REQ-CR-CAP-3, REQ-CR-CAP-4, REQ-CR-CAP-5
- **ACs**: UAT-M10-06-1, UAT-M10-06-2
- **Files**:
  - create: `control-plane/test/capability-catalog.spec.ts`
- **Acceptance**:
  - [ ] Test: overview renders 6 sections with correct counts (skills=3, packs=4, profiles=2, workflows=1, providers=0, recipes=1)
  - [ ] Test: each per-kind page renders expected items
  - [ ] Test: detail page composes m16 EntityHeader + MetadataCard + RelationsList
  - [ ] Test: provider page renders empty-state fixture
  - [ ] Test: cross-references resolve to entity detail routes
- **Commit type**: test

#### Task T3.9 — Capability parsers spec
- **Block**: 3
- **REQs**: REQ-CR-CAP-2
- **Files**:
  - create: `control-plane/test/capability-parsers.spec.ts`
- **Acceptance**:
  - [ ] Test: parseSkill handles real SKILL.md files
  - [ ] Test: parsePack handles both global and recipe-scoped packs
  - [ ] Test: parseProfile handles both scopes
  - [ ] Test: parseWorkflow reads workflow JSON
  - [ ] Test: parseProvider returns empty array
- **Commit type**: test

#### Task T3.10 — Capability isolation spec
- **Block**: 3
- **REQs**: REQ-CR-CAP-10
- **ACs**: UAT-M10-06-3
- **m10 invariants**: no-write-CP, serverless, no-Dexie/IndexedDB/Orama
- **Files**:
  - create: `control-plane/test/capability-isolation.spec.ts`
- **Acceptance**:
  - [ ] Test 1: `grep -rn 'fetch(' features/capability-catalog/` returns 0
  - [ ] Test 2: `grep -rn 'dexie\|indexeddb\|orama' features/capability-catalog/` returns 0
  - [ ] Test 3: `grep -rn 'useProjectionStore' features/capability-catalog/` returns 0 actual imports (only comments allowed)
  - [ ] Test 4: `useProjectionStore.getState()` identity preserved across rendering all 8 new routes (round-trip no-op)
- **Commit type**: test

#### Task T3.11 — F-004 oracle update (routes-router.spec.ts)
- **Block**: 3
- **REQs**: REQ-CR-CAP-9
- **Files**:
  - modify: `control-plane/test/routes-router.spec.ts`
- **Acceptance**:
  - [ ] Updated expected routePaths array from 10 to 18 entries (was 10: existing 9 + /create; now 10 + 8 new = 18)
  - [ ] Each new path has explicit assertion (capabilities, capabilities/skills, capabilities/packs, capabilities/profiles, capabilities/workflows, capabilities/providers, capabilities/recipes, capabilities/$kind/$namespace/$name)
- **Commit type**: test

#### Task T3.12 — INC-008 oracle extension
- **Block**: 3
- **REQs**: REQ-CR-CAP-10
- **Files**:
  - modify: `control-plane/test/extension-isolation.spec.ts`
- **Acceptance**:
  - [ ] Cross-folder import grep pattern extended: `(story|visual|catalog|continuity|docs|capability-catalog)`
  - [ ] Relative-escape grep pattern extended: `(story|visual|catalog|continuity|docs|capability-catalog)`
- **Commit type**: test

#### Task T3.13 — Round-trip no-op test (UAT-M10-06-3)
- **Block**: 3
- **REQs**: REQ-CR-CAP-10
- **ACs**: UAT-M10-06-3
- **m10 invariants**: no-write-CP
- **Files**:
  - modify: capability-isolation.spec.ts
- **Acceptance**:
  - [ ] Test: snapshot `useProjectionStore.getState()` before mounting any of the 8 new routes
  - [ ] Test: mount each route via MemoryRouter
  - [ ] Test: snapshot after — must be `===` to before (deep equality)
- **Commit type**: test

#### Task T3.14 — Profile validation tool
- **Block**: 3
- **REQs**: REQ-CR-CAP-11
- **Files**:
  - create: `tools/validate-profiles/validate.py`
  - create: `tools/validate-profiles/README.md`
- **Acceptance**:
  - [ ] Python script validates any `examples/*.yaml` with `schema: profile/v1` against `specs/profile.schema.json`
  - [ ] Mirrors `tools/validate-recipes/validate.py` structure
  - [ ] Exact-pin deps in pyproject.toml (jsonschema==4.23.0, pyyaml==6.0.3, pytest==9.1.1)
- **Commit type**: test

#### Task T3.15 — CI guard wiring
- **Block**: 3
- **REQs**: REQ-CR-CAP-11
- **Files**:
  - modify: `control-plane/justfile` (or `.github/workflows/*.yml`)
- **Acceptance**:
  - [ ] Add `validate-profiles` step to CI
  - [ ] Add `capability-isolation` test to CI
- **Commit type**: test

#### Task T3.16 — Static build verification
- **Block**: 3
- **REQs**: none
- **ACs**: none
- **m10 invariants**: static-build
- **Acceptance**:
  - [ ] `pnpm --filter control-plane build` exit 0
  - [ ] `dist/` size delta ≤ 100KB
- **Commit type**: test

#### Task T3.17 — Additive-only schema verification
- **Block**: 3
- **REQs**: REQ-CR-CAP-10
- **m10 invariants**: additive-only-schema
- **Acceptance**:
  - [ ] `git diff 364571c..HEAD -- specs/` returns empty
  - [ ] No file in `specs/` modified
- **Commit type**: test

**Block 3 commit**: `test(m10.2): capability-catalog fixtures + tests + F-004 oracle + isolation grep + CI (~350 LoC)`
**Files touched**: 12 new (10 fixtures + 2 spec files + 1 fixture file + 2 tool files), 2 modified (routes-router.spec.ts, extension-isolation.spec.ts)

---

### Block F — Final (Docs + Manifest Regen)

#### Task TF.1 — Glossary entries (4 new)
- **Block**: F
- **REQs**: none
- **Files**:
  - modify: `docs/27-GLOSSARY.md`
- **Acceptance**:
  - [ ] `### **Capability Manifest**` (with DD-2 sha256 reference)
  - [ ] `### **Capability Detail Route**` (with `/capabilities/$kind/$namespace/$name` pattern)
  - [ ] `### **Empty-State UX**` (with DD-4 providers reference)
  - [ ] `### **import.meta.glob**` (Vite build-time, with DD-1 reference)
- **Commit type**: docs

#### Task TF.2 — Roadmap closeout
- **Block**: F
- **Files**:
  - modify: `docs/19-ROADMAP.md`
- **Acceptance**:
  - [ ] Move M10.2 from in_progress to done in Active Milestones
  - [ ] Add cycle reference: `Cycle: m10-2-capability-catalog`
- **Commit type**: docs

#### Task TF.3 — Narrative Catalog doc update
- **Block**: F
- **Files**:
  - modify: `docs/29-NARRATIVE-CATALOG.md`
- **Acceptance**:
  - [ ] New §Capability Catalog as implemented (1-2 paragraphs + route table + REQ pointer)
- **Commit type**: docs

#### Task TF.4 — Control Plane Stack note
- **Block**: F
- **Files**:
  - modify: `docs/28-CONTROL-PLANE-STACK.md`
- **Acceptance**:
  - [ ] Note on `import.meta.glob` usage with `eager: true, query: '?raw', import: 'default'`
- **Commit type**: docs

#### Task TF.5 — README update
- **Block**: F
- **Files**:
  - modify: `README.md`
- **Acceptance**:
  - [ ] Add "Capability Catalog" section with route table + screenshot placeholder
- **Commit type**: docs

#### Task TF.6 — MANIFEST regen
- **Block**: F
- **Files**:
  - modify: `MANIFEST.json`
- **Acceptance**:
  - [ ] M10.2 cycle entries added with sha256 of artifacts
- **Commit type**: chore

#### Task TF.7 — UAT document
- **Block**: F
- **Files**:
  - create: `uat/UAT-M10-06-capability-catalog.md`
- **Acceptance**:
  - [ ] 5 ACs documented with Given/When/Then/Pass and executable proof clauses
- **Commit type**: docs

**Block F commit**: `docs(m10.2): glossary-catalog-roadmap-stack-readme-manifest-regen (~200 LoC)`
**Files touched**: 5 modified (glossary, roadmap, catalog, stack, readme, manifest), 1 new (UAT doc)

---

## Total LoC Budget
- Block 0: ~280
- Block 1: ~250
- Block 2: ~300
- Block 3: ~350 (mostly fixtures + tests)
- Block F: ~200 (mostly docs)
- **Total**: ~1380 LoC (within orchestrator-pre-authorized waiver for read-only catalog)

## Preempted Verifier Findings (carried from proposal)
| ID | Finding | Test/Oracle |
|---|---|---|
| V-06-01 | Route count mismatch | T3.11 |
| V-06-02 | Cross-folder imports | T3.12 |
| V-06-03 | No-write invariant | T3.10, T3.13 |
| V-06-04 | Schema mutation | T3.17 |
| V-06-05 | New deps | T0.11 |
| V-06-06 | Static build | T3.16 |
| V-06-07 | Bundle budget | T3.16 |
| V-06-08 | Fixture coverage | T3.1-T3.10 |
| V-06-09 | Doc discipline | TF.1-TF.7 |
| V-06-11 | Route param collision | T2.2 |
| V-06-12 | Entity isolation | T2.3 |
| V-06-13 | Empty-state coverage | T3.6, T3.8 |
| V-06-14 | Cross-references completeness | T3.8 |
| V-06-15 | F-004 oracle coverage | T3.11 |
| V-06-16 | Carry-over patterns | T0.12 |

## Recommendation
**proceed-to-apply** — all tasks machine-verifiable, REQ/AC/invariant coverage complete, 5 atomic per-block commits planned within LoC budget.
