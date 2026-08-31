# M10.2 — Capability Catalog — Design (A-lite)

## Status
synthetic (A-lite path: spec IS the design)

## Reference
For the full technical design, see `changes/m10-2-capability-catalog/spec.md`. This document captures ONLY the design-deepening decisions that emerged after the spec was reviewed by the orchestrator.

## Design Deepening — 4 clarifications after spec review

### DD-1: `import.meta.glob` mode for capability files

**Decision**: use `import.meta.glob('/path/to/pattern', { eager: true, query: '?raw', import: 'default' })` for files that need raw string content (SKILL.md, pack markdown), and `import.meta.glob('/path/**/*.yaml', { eager: true })` for YAML files. The `eager: true` is required because Vite's lazy mode returns Promises and the manifest must be available synchronously at module init.

**Why not lazy**: lazy mode would force async rendering and break the m16 "extension registry loads synchronously at module init" pattern.

### DD-2: Capability manifest hashing strategy

**Decision**: each capability manifest entry includes:
- `kind` (skill | pack | profile | workflow | provider | recipe)
- `id` (canonical: e.g., `skill-character-consistency`, `pack-editorial-recipe-skeleton`)
- `namespace` (always `default` for global capabilities; `<recipe-id>` for project-scoped packs)
- `name` (display name from frontmatter or filename)
- `path` (source file path relative to repo root)
- `origin` (global | recipe:<id>)
- `sha256` (sha256 of file content; cached at module init)

**Why sha256**: enables EVT-CAP-12b fixture round-trip test and UAT-M10-06-01 drift detection.

### DD-3: Cross-reference resolution algorithm

**Decision**: parse markdown body for `[[Kind:namespace/name]]` pattern. Resolution order:
1. If `Kind` ∈ {skill, pack, profile, workflow, provider, recipe}: resolve to `/capabilities/{kind}s/{namespace}/{name}`
2. If `Kind` ∈ entity kinds (Character, Chapter, etc. — from m16): resolve to `/entity/{kind}/{namespace}/{name}`
3. If unresolved: render as plain text (graceful fallback per spec §REQ-CR-CAP-6)

**Why not a generic entity-link plugin**: m16 already has `entityLinkPlugin.ts` for entity-kind refs. M10.2 extends it (NOT duplicates) to recognize capability-kind refs by checking `kind` enum.

### DD-4: Empty-state UX for providers page

**Decision**: when `manifest.providers.length === 0`, render:
- Header: "Image Providers (0 configured)"
- Body: link to `specs/provider-capability.schema.json` with explanatory text "Configure providers by authoring a `<provider>.yaml` file matching this schema. See `specs/README.md` for examples."
- CTA button: "Open schema documentation" → routes to a future `/docs/specs/provider-capability` page (out of scope for M10.2)

**Why not just hide the section**: per UAT-M10-06-04, the empty state must be EXPLICIT so users understand providers are configurable, not absent.

## Reuse Map (carried from spec.md)

| From | Reused as |
|---|---|
| `control-plane/src/features/catalog/entity/{EntityHeader, MetadataCard, RelationsList}` | Capability detail page header/metadata/relations (via Extension Registry `kind: 'capability-detail'`) |
| `control-plane/src/features/docs/docsSafeMarkdown.tsx` | SKILL.md + pack markdown rendering |
| `control-plane/src/features/docs/entityLinkPlugin.ts` | Cross-reference resolution (extended for capability kinds) |
| `control-plane/src/recipes/recipeLoader.ts` | Recipe manifest enumeration (no modification) |
| `control-plane/test/extension-isolation.spec.ts` | INC-008 grep oracle extended for `features/capability-catalog/` |

## Routes Summary

| Route | Component | Source kind |
|---|---|---|
| `/capabilities` | `Overview.tsx` | All 6 kinds |
| `/capabilities/skills` | `KindList.tsx` (kind=skill) | skills only |
| `/capabilities/packs` | `KindList.tsx` (kind=pack) | packs only |
| `/capabilities/profiles` | `KindList.tsx` (kind=profile) | profiles only |
| `/capabilities/workflows` | `KindList.tsx` (kind=workflow) | workflows only |
| `/capabilities/providers` | `KindList.tsx` (kind=provider, empty-state) | providers |
| `/capabilities/recipes` | `KindList.tsx` (kind=recipe) | recipes only |
| `/capabilities/$kind/$namespace/$name` | `CapabilityDetail.tsx` | One specific capability |

Total: 8 new routes. With existing 10 routes (m16+m10.1): 18 routes in `routes-router.spec.ts`.

## m10 Invariants — Re-asserted

- **serverless**: `import.meta.glob` is Vite build-time; runtime never calls `fetch()` in `features/capability-catalog/`. Verified by `capability-isolation.spec.ts` test 1.
- **no Dexie/IndexedDB/Orama**: N/A. Manifest is computed at module init from filesystem.
- **no-write Control Plane**: `useProjectionStore` zero imports in `features/capability-catalog/`. Verified by `capability-isolation.spec.ts` test 2.
- **exact dependency pins**: 0 new deps; all imports use already-pinned dependencies from m10.1 + m16.
- **static build**: `pnpm build` produces static `dist/`. Verified by `pnpm build` exit 0.
- **additive-only schema evolution**: 0 schema files modified. Verified by `git diff 364571c..HEAD -- specs/` returning empty.

## Files Created (Apply Block Plan)

```
control-plane/src/features/capability-catalog/
  index.tsx                                  # extension registry entry
  manifest.ts                                # import.meta.glob + parser orchestration
  parser.ts                                  # per-kind parser functions
  useCapabilityManifest.ts                   # React hook (sync, returns cached manifest)
  capabilitySelectors.ts                     # memoized selectors
  views/Overview.tsx                         # /capabilities
  views/KindList.tsx                         # /capabilities/{kind}
  views/CapabilityDetail.tsx                 # /capabilities/$kind/$namespace/$name
control-plane/test/
  capability-catalog.spec.ts                 # overview + per-kind page rendering
  capability-parsers.spec.ts                 # per-kind parser unit tests
  capability-isolation.spec.ts               # INVARIANT enforcement (no-write, isolation)
  fixtures/capability-manifest-snapshot.ts   # manifest snapshot for round-trip test
golden/control-plane/snapshot-valid/capabilities/
  skill-character-consistency.json
  skill-narrative-arc.json
  skill-scene-validator.json
  pack-story_core.json
  pack-characters.json
  pack-editorial.json
  pack-visual_core.json
  profile-middle-grade-10-11.json
  profile-middle-grade-10-11-recipe.json
  workflow-sdxl-illustrated-page.json
  recipe-middle-grade-illustrated.json
  providers-empty.json
tools/validate-profiles/
  validate.py
  README.md
uat/
  UAT-M10-06-capability-catalog.md
```

## Files Modified

```
control-plane/src/routes/router.ts                  # +8 createRoute calls
control-plane/src/routes/routes.tsx                 # +8 path: '/capabilities/*' entries (F-004 oracle)
control-plane/src/styles.css                        # ~30 LoC new CSS classes
control-plane/test/routes-router.spec.ts            # F-004 oracle: 18 entries (was 10)
control-plane/test/extension-isolation.spec.ts      # INC-008 grep extended for capability-catalog
docs/29-NARRATIVE-CATALOG.md                        # NEW §Capability Catalog as implemented
docs/27-GLOSSARY.md                                 # +4 entries
docs/28-CONTROL-PLANE-STACK.md                      # note on import.meta.glob
docs/19-ROADMAP.md                                  # mark M10.2 done (during release)
README.md                                           # Capability Catalog section
MANIFEST.json                                       # regen
justfile (or .github/workflows/*.yml)               # validate-profiles step
```

## Out-of-Scope (Re-asserted)

- **Indexing capability content into search** (m16's substring index handles that)
- **Authoring/editing capabilities** (M17 candidate)
- **Multi-project capability sharing** (M10.3, blocked)
- **Service-worker proxy for capabilities** (M10.3 dependency)

## Notes for Apply Phase

Apply agent: **DO NOT trust your own envelope**. The orchestrator will independently verify:
- All 8 routes are wired in `router.ts` AND `routes.tsx` AND `routes-router.spec.ts` (3-way grep)
- `useProjectionStore` has 0 actual imports in `features/capability-catalog/` (grep with comment-only filter)
- `pnpm test` runs FULL suite (not just the changed files)
- All 12 fixtures exist in `golden/control-plane/snapshot-valid/capabilities/`
- Provider page renders the empty-state fixture (not just renders `null`)
