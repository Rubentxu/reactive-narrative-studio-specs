# UAT-M10-06 — Capability Catalog

## Scope

The M10.2 Capability Catalog surfaces every discoverable studio capability
(skills, packs, profiles, workflows, providers, recipes) as a read-only
Control Plane projection at `/capabilities/*`.

## Acceptance Criteria

### UAT-M10-06-1 — Overview counts match canonical sources

**Given** the studio contains canonical capability files at:
- `examples/skills/{character-consistency,narrative-arc,scene-validator}/SKILL.md`
- `recipes/middle-grade-illustrated/skeleton/packs/{characters,editorial,story_core,visual_core}/*.md`
- `examples/middle-grade-profile.yaml` (canonical) + `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` (recipe-scoped)
- `control-plane/workflows/comfyui/sdxl-illustrated-page.workflow.json`
- `recipes/middle-grade-illustrated/recipe.yaml`

**When** the user navigates to `/capabilities`

**Then** the overview page renders 6 kind sections with the counts:
- Skills (3)
- Packs (4)
- Profiles (2)
- Workflows (1)
- Providers (0)
- Recipes (1)

**Pass** verified by:
- `control-plane/test/capability-catalog.spec.ts` — 19 tests asserting exact counts and structure
- `golden/control-plane/snapshot-valid/capabilities/` — 12 JSON fixtures (3+4+2+1+1+1)

### UAT-M10-06-2 — Detail page composes m16 components

**Given** the user navigates to `/capabilities/skill/default/character-consistency`

**When** the detail page renders

**Then** it composes:
- `EntityHeader` (m16) with name + id + origin
- `MetadataCard` (m16) with kind-specific fields
- `RelationsList` (m16) with cross-references

**Pass** verified by:
- `control-plane/test/capability-catalog.spec.ts` — "skill entries" describe block asserts all m16 components compose

### UAT-M10-06-3 — Round-trip no-op proof

**Given** `useProjectionStore.getState()` snapshot at app boot

**When** the user mounts and unmounts each of the 8 new routes:
- `/capabilities`
- `/capabilities/skills`
- `/capabilities/packs`
- `/capabilities/profiles`
- `/capabilities/workflows`
- `/capabilities/providers`
- `/capabilities/recipes`
- `/capabilities/$kind/$namespace/$name`

**Then** the store snapshot is byte-identical before and after (deep equality)

**Pass** verified by:
- `control-plane/test/capability-isolation.spec.ts` — round-trip no-op test

### UAT-M10-06-4 — Providers empty-state UX

**Given** `manifest.providers.length === 0` (no providers configured today)

**When** the user navigates to `/capabilities/providers`

**Then** the page renders an explicit empty-state with:
- Header: "Image Providers (0 configured)"
- Body: explanation that providers are configurable
- Link to `specs/provider-capability.schema.json`
- CTA: "Open schema documentation" placeholder

**Pass** verified by:
- `golden/control-plane/snapshot-valid/capabilities/providers-empty.json` fixture
- `control-plane/test/capability-catalog.spec.ts` — "providers page renders empty state" test
- `tools/validate-profiles/validate.py` (separately validates profile sources; providers have no schema-level validation today)

### UAT-M10-06-5 — Cross-reference drill-down

**Given** the m16 `entityLinkPlugin` is extended for capability-kind references

**When** a capability detail page renders markdown containing `[[Kind:namespace/name]]` refs

**Then**:
- `[[Skill:default/character-consistency]]` resolves to `/capabilities/skills/default/character-consistency`
- `[[Pack:editorial/story_core]]` resolves to `/capabilities/packs/editorial/story_core`
- `[[Profile:default/middle-grade-10-11]]` resolves to `/capabilities/profiles/default/middle-grade-10-11`
- `[[Workflow:default/sdxl-illustrated-page]]` resolves to `/capabilities/workflows/default/sdxl-illustrated-page`
- `[[Recipe:default/middle-grade-illustrated]]` resolves to `/capabilities/recipes/default/middle-grade-illustrated`
- Unknown refs render as plain text (graceful fallback per spec §REQ-CR-CAP-6)
- m16 entity refs (Character, Chapter, etc.) continue to resolve to `/entity/...`

**Pass** verified by:
- `control-plane/test/capability-catalog.spec.ts` — "cross-references resolve to entity detail routes" test

## m10 Invariants — Re-asserted

| Invariant | Verification |
|---|---|
| serverless | `grep -rn 'fetch(' features/capability-catalog/` returns 0 |
| no Dexie / IndexedDB / Orama | `grep -rn 'dexie\|indexeddb\|orama' features/capability-catalog/` returns 0 |
| no-write Control Plane | `grep -rn 'useProjectionStore' features/capability-catalog/` returns 0 actual imports; round-trip no-op test (UAT-M10-06-3) |
| exact dependency pins | 0 new dependencies in `package.json`; new `tools/validate-profiles/pyproject.toml` uses `==` exact pins |
| static build | `pnpm build` produces static `dist/` (verified in Block 3 acceptance) |
| additive-only schema evolution | `git diff 364571c..HEAD -- specs/` returns empty |

## Executable Proof

```bash
# All checks green
cd control-plane
pnpm tsc --noEmit                # 0 errors
pnpm test                        # 24 files / 199 tests pass
pnpm build                       # exit 0, static dist/

cd ..
python3 -m pytest tools/ -q      # 44 tests pass
python3 tools/validate-profiles/validate.py examples/  # All checks passed for 1 profile(s)

# Invariant sweep
git diff 364571c..HEAD -- specs/    # empty (additive-only)
grep -rn 'fetch(' control-plane/src/features/capability-catalog/  # 0 hits
grep -rn 'useProjectionStore' control-plane/src/features/capability-catalog/  # 0 actual imports
grep -c 'path:' control-plane/src/routes/routes.tsx  # 16
grep -c 'path:' control-plane/test/routes-router.spec.ts  # 16
ls golden/control-plane/snapshot-valid/capabilities/ | wc -l  # 12
```
