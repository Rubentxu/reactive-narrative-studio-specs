# Proposal: m10-1-creation-recipes — Creation Recipes (M10.1 — RJSF wizard + CLI `narrative init` with round-trip equivalence)

- **Change id**: `m10-1-creation-recipes`
- **Cycle**: `p-7c4aff45199a2069/m10-1-creation-recipes`
- **Roadmap anchor**: `docs/19-ROADMAP.md` § M10.1 ("recipe schema; RJSF wizard; same recipe consumable by CLI; initial middle-grade illustrated recipe") and § Exit ("Wizard and CLI create semantically equivalent project manifests/skeletons").
- **Conceptual design**: `docs/31-CREATION-RECIPES.md` (recipe contents, security model, recipe catalog).
- **ADR binding**: ADR-023 (Creation Recipes replace server-side scaffolding — declarative JSON-Schema-driven; same recipe drives CLI and Control Plane wizard; not a generic runtime WorkflowIR; no arbitrary scripts).
- **Stack binding**: `docs/28` §"Recipes/forms" (RJSF 6.8.x + AJV8 validator) and `docs/28` §"Filesystem access" (`ProjectSourcePort` + `DirectoryProjectSource` progressive enhancement over File System Access API + mandatory `SnapshotProjectSource` fallback).
- **Illustrative seed**: `examples/creation-recipe-middle-grade.yaml` (`schema: creation-recipe/v1`, profile alias dereference pattern `{{ audience }}` at line 42).
- **Existing schema**: `specs/creation-recipe.schema.json` (V1 envelope; `metadata` + `parameters` + `project` + optional `initialGoals`; `additionalProperties: false`; `schema: "creation-recipe/v1"` const).
- **Baseline**: branch `feat/m10-1-creation-recipes` HEAD `9289b61` (one commit past the orchestrator-stated `89629f2`: the `chore(roadmap): serialize m10.1 creation-recipes cycle as in_progress` roadmap marker — **not** a content change).
- **Target branch** (apply): `feat/m10-1-creation-recipes` (cycle-local branch; no separate apply branch).
- **Path**: A-lite, execution mode `auto`; **version target**: **v0.9.0 (MINOR)** — new capability surface (recipe schema refinement, RJSF wizard route, CLI `init` command, Python package `narrative-recipes`).
- **Rounds**: 1 (m10.1; M10.2 capability-catalog and M10.3 multi-project are separate future cycles).
- **UAT gate**: `uat/UAT-M10-04-creation-recipe.md` ("One Creation Recipe, CLI and UI"; Pass = "Semantic diff is empty for recipe-owned fields").

## Intent

Close the binding gate `uat/UAT-M10-04-creation-recipe.md`: **Given** the `middle-grade-illustrated` recipe **When** the same answers are supplied to (1) the CLI and (2) the Control Plane recipe wizard **Then** both outputs normalize to equivalent — project manifest, selected profiles, packs, skills, publishing targets. **Pass** = "Semantic diff is empty for recipe-owned fields".

`docs/19-ROADMAP.md` § M10.1 declares the four deliverables (recipe schema, RJSF wizard, same recipe consumable by CLI, initial middle-grade illustrated recipe). `docs/31-CREATION-RECIPES.md` is the conceptual design. ADR-023 fixes the architectural shape (declarative JSON-Schema recipes; not a generic WorkflowIR; same recipe drives both UIs; Backstage-style UX without a Scaffolder backend).

What is missing is the machine-executable surface:
- The recipe contents directory layout is described in prose (`docs/31` §Contents) but not pinned as a recipe-publisher contract.
- The skeleton's `{{var}}` substitution semantics (already shown at `examples/creation-recipe-middle-grade.yaml:42`) are not formalized as a **safe** templating micro-language — `docs/31` §Security says "validate against schema; never execute scripts; never install dependencies automatically" but does not pin the substitution grammar.
- The CLI's `narrative init --recipe ...` command is in `docs/16-CLI.md` §"Primary commands" but not implemented; the JSON Schema for `init --json` output is not authored.
- The RJSF wizard route (`/create` per `docs/28` §Routing) is not wired against the Extension Registry; no `RecipeWidgetExtension` is registered.
- The "recipe as the single source of truth; both UIs consume the same recipe + parameters schema" invariant is the foundation but has no shared library — today the schema lives in `specs/creation-recipe.schema.json` but no Python package loads it for CLI execution and no TS package loads it for the wizard.
- Round-trip equivalence is asserted as the exit criterion but has no defined oracle (byte-equal? AST-equal? order-stable?).

This change closes all six gaps in one reviewable A-lite cycle, adds **one NEW capability surface** (`creation-recipe-system`) and **one MODIFIED capability surface** (`recipe-schema-v1`), and ships a **shared Python+TypeScript core** (`narrative-recipes`) that makes round-trip equivalence a structural property rather than a tested coincidence.

## Scope

### In Scope

**A. Recipe directory layout — confirm and pin the contents contract.**
The `docs/31` §Contents layout (`recipes/<id>/{recipe.yaml, parameters.schema.json, ui.schema.json, skeleton/, README.md}`) is confirmed as the V1 contract. New refinement: a NEW `recipes/<id>/recipe.lock.json` (generated, NOT authored) recording `{recipeYamlSha256, parametersSchemaSha256, skeletonFileShas256, generatorVersion}` for reproducibility audits. The lock file is created on first publish and re-emitted on any recipe change. **Layout pinned in `docs/31` §Contents via a new "Layout contract" subsection** (no schema pack mutation).

**B. Recipe schema refinement (`specs/creation-recipe.schema.json`) — additive evolution, NOT a breaking change.**
The existing V1 envelope is the foundation. ADDS three optional top-level keys (per AC-INV-additive-only-schema): `uiHints` (presentation metadata consumed by the wizard's RJSF adapter — NOT schema-validated by Ajv, but parsed by `uiHintsSchema: { type: object, additionalProperties: true }`); `publishing` (recipe-default publishing options: `{ defaultTarget, options[] }`); `packs`/`skills`/`profiles` enrichment via `recipeProfileAliasResolution` enum (lets a recipe opt into profile-alias dereferencing per `specs/profile-aliases.yaml`). **All ADDS are backward-compatible**: every existing key remains required-as-before; the three new keys are OPTIONAL with `additionalProperties: true` only on `uiHints` (the others use `additionalProperties: false` and only enumerate the new optional properties). **Existing schema version constant `"creation-recipe/v1"` is unchanged.** The seed file `examples/creation-recipe-middle-grade.yaml` validates against the refined schema as the round-trip oracle.

**C. `narrative-recipes` shared core (Python + TypeScript).**
A NEW Python package `tools/narrative-recipes/` (in-repo, vendored under `tools/` per `docs/28` §`tools/sddk-pack-audit` precedent for in-pack tooling) with:
- `recipe_loader.py` — loads `recipes/<id>/recipe.yaml` + `parameters.schema.json` + `skeleton/` tree; validates via Ajv against `specs/creation-recipe.schema.json`.
- `template_engine.py` — safe `{{var}}` substitution with the deterministic grammar pinned in Decision 3 (mustache-subset); pure function; zero I/O; pure-Python implementation (no `eval`, no `exec`); rejects any `{{ ... }}` form containing `{{` nested or any non-whitelisted identifier.
- `parameter_validator.py` — Ajv-driven validation of user-supplied parameters against `parameters.schema.json`.
- `project_renderer.py` — composes the canonical project manifest (per `specs/project.schema.json`) + skeleton files from the template engine.
- `equivalence_oracle.py` — canonical-JSON equality test helper (Decision 5).

A NEW TypeScript mirror `control-plane/src/recipes/` with:
- `recipeLoader.ts` — same contract as Python; uses `ajv` (already pinned at `8.20.0` in `control-plane/package.json`).
- `templateEngine.ts` — pure TS port of the Python engine, with a **shared test corpus** (5 mustache-subset fixtures) that BOTH the Python and TS implementations must satisfy (Decision 5 oracle).
- `parameterValidator.ts` — Ajv wrapper.
- `projectRenderer.ts` — manifest + skeleton composer.

The Python and TS implementations MUST produce identical canonical-JSON output for identical inputs. This is enforced by the **shared test corpus** (Decision 5).

**D. CLI command — `narrative init`.**
A NEW Python CLI module `tools/narrative-cli/` (entry point `narrative`) implementing:
- `narrative init --recipe <id> [--params-file <json> | --param k=v ...] --out <dir> [--dry-run] [--force]`
- `narrative init --plan <create-plan.json> --out <dir> [--dry-run] [--force]`
- `narrative init --json` — emits canonical JSON of `{ ok, manifest, skeleton[], plan }` for agent consumption.
- Exit codes per Decision 4.
- Validates the recipe against `specs/creation-recipe.schema.json` (Ajv) before any write.
- Validates parameters against the recipe's `parameters.schema.json` (Ajv) before any write.
- Writes a `create-plan.json` artifact alongside the project root (in `<out>/.narrative/create-plan.json`) recording the exact skeleton files produced, the resolved substitutions, and the recipe lock digest.

**E. RJSF wizard route + Extension Registry wiring.**
- `control-plane/src/views/Create.tsx` — NEW RJSF-driven wizard view at `/create` route.
- `control-plane/src/routes/{router,routes}.tsx` — MODIFIED to register `/create` (additive; F-004 oracle list updated — natural side-effect for `routes.tsx`).
- `control-plane/src/features/recipes/` — NEW 6th feature folder (`features/recipes/`) mirroring the `features/{story,visual,catalog,continuity,docs}/` precedent from m15/m16. Contains:
  - `recipes/CreateWizard.tsx` — RJSF form rendered from `recipe.parameters` + `recipe.uiHints`.
  - `recipes/useRecipeLoader.ts` — loads `recipes/<id>/recipe.yaml` + parameter schema from a user-selected source (bundled `examples/` for V1; `recipes/` for catalog-page future cycle).
  - `recipes/RecipePlanEmitter.ts` — emits `create-plan.json` (the CLI-consumable artifact).
  - `recipes/FileSystemAccessSink.ts` — uses `window.showDirectoryPicker()` (File System Access API) to request explicit user-grant for `<out>` directory, then writes the rendered skeleton + manifest + `create-plan.json` via `FileSystemDirectoryHandle.getFileHandle()` + `createWritable()`. **No CP state mutation**: the sink writes to a USER-SELECTED directory outside the loaded project. The wizard itself NEVER writes to the loaded `ProjectionBundle` (read-only invariant holds; `useProjectionStore` is untouched).
  - `recipes/DownloadPlanSink.ts` — alternative sink: emits `create-plan.json` as a browser download via `URL.createObjectURL(blob)` + `<a download>` for users on browsers without File System Access API (Firefox/Safari). The CLI then consumes the downloaded plan.
  - `recipes/index.tsx` — feature module init that registers `RecipeWidgetExtension` against the Extension Registry with `kind: 'recipe-wizard'` discriminator (additive; matches the m16 `kind: 'docs'` pattern).
- `control-plane/src/extensions/types.ts` — MODIFIED to add the `RecipeWidgetExtension` shape (additive discriminator on the existing extension model; ADR-022 holds; `apiVersion: 'control-plane.extensions/v1'` unchanged).

**F. Initial middle-grade illustrated recipe — bundled.**
A NEW `recipes/middle-grade-illustrated/` directory:
- `recipe.yaml` (refined from `examples/creation-recipe-middle-grade.yaml` + the three additive keys)
- `parameters.schema.json` (the `audience` enum + `imagePolicy` enum + `title` + `projectId` from the existing example, plus new optional `genre` enum + `outputLanguage`)
- `ui.schema.json` (RJSF `uiSchema`: widget overrides for `audience` as a radio group, `imagePolicy` as a select, `genre` as a checkbox group, `outputLanguage` as a select)
- `skeleton/` (per Decision 6 contents)
- `README.md` (recipe-driven starter docs; documents the recipe's purpose, parameters, expected outputs)
- `recipe.lock.json` (generated on first publish by the recipe loader; content-addressed)
- `tests/` (the round-trip equivalence oracle fixtures — Decision 5)

**G. CI guards (Decision 7).**
- `tsc --noEmit -p control-plane/tsconfig.json` exit 0
- `pnpm test` (Vitest) N/N
- `pnpm build` (Vite static) succeeds; `dist/` contains `index.html` + hashed assets
- `python -m ajv-cli validate --schema specs/creation-recipe.schema.json --data recipes/middle-grade-illustrated/recipe.yaml` exit 0 for every recipe under `recipes/` (recursive; fails the build on any invalid recipe)
- `python -m pytest tools/narrative-recipes/tests/` N/N (Python tests for template engine + loader + equivalence oracle)
- The shared test corpus (5 mustache-subset fixtures) runs in BOTH Python (`pytest`) AND TypeScript (`vitest`) and asserts canonical-JSON equivalence.

**H. Doc updates (first-class per m16/m15 precedent).**
- `docs/31-CREATION-RECIPES.md` § Contents — add "Layout contract" subsection pinning the directory layout + recipe.lock.json generation; § Security — pin the mustache-subset grammar as the safe substitution language.
- `docs/27-GLOSSARY.md` — add `Creation Recipe`, `Recipe Skeleton`, `Round-trip Equivalence Oracle`, `Canonical-JSON Equality`, `Mustache-subset Template Engine`, `File System Access Sink`, `Recipe Plan`.
- `docs/28-CONTROL-PLANE-STACK.md` — note `RJSF` + `ajv-cli` exact pins resolved at m10-1 apply; record `tools/narrative-cli` + `tools/narrative-recipes` as in-pack tooling.
- `docs/16-CLI.md` — `narrative init` becomes a documented command with flag set, exit codes, `--json` agent interface; new `narrative plan` companion command (emits `create-plan.json` without writing).
- `docs/19-ROADMAP.md` — mark M10.1 done; advance M10.1 status.
- `README.md` — add "Create a project" section documenting the wizard + CLI paths.
- `MANIFEST.json` — regen following m13/m14/m15/m16 precedent.

### Out of Scope (explicit deferrals)

- **Capability catalog (M10.2)** — `docs/19` § M10.2 (Skills/Packs/Profiles/Comfy/Recipes providers catalog pages) — separate cycle.
- **Multi-project local Studio (M10.3)** — `docs/19` § M10.3 (IndexedDB recent-project registry, favorites, multi-project catalog, local Studio Home) — separate cycle; **NO Dexie introduced in m10-1** (m10 invariant; the wizard's recent-targets are an in-memory Zustand slice only).
- **RecipeWidgetExtension beyond the V1 RJSF path** — V1 ships only the `CreateWizard` widget; per-recipe custom widget overrides land with M10.2 capability catalog.
- **Recipe inheritance (`extends: recipe-id`)** — `docs/31` §"Recipe inheritance" defers to "after a spike defines deterministic merge semantics"; m10-1 ships V1 without `extends`; the recipe loader emits a clear error if `extends` is encountered.
- **TUI / CLI interactive form** — V1 CLI accepts only `--param k=v`, `--params-file <json>`, or `--plan <create-plan.json>`; no TUI form wizard. Interactive form rendering lives in the CP wizard; the CLI's surface is JSON-first (per `docs/16` §"JSON-first agent interface").
- **Recipe publishing / discovery** — recipes ship in `recipes/` (vendored) and `examples/` (illustrative); a recipe catalog index page lands with M10.2.
- **Recipe versioning beyond `recipe.lock.json`** — no `recipeVersion`, no `extends: recipe-id@<version>`; `metadata.id` is the only version discriminator in V1.
- **Network fetch of remote recipes** — recipes are local files in V1; remote recipe registries are explicitly forbidden (m10 no-fetch invariant + `docs/31` §Security).
- **Recipe-driven ActiveGraph initialization** — `docs/31` §"Relationship to ActiveGraph" clarifies "Recipe initializes state/config. ActiveGraph behaviors manage subsequent reactive evolution." m10-1 does not touch ActiveGraph; the wizard writes the initial `narrative.yaml` + skeleton only; the runtime boots later.
- **External provider enabling** — `docs/31` §Security: "external provider enabling requires explicit user action". The wizard's `imagePolicy` parameter selects a default but does NOT enable a SaaS provider; provider enablement is a separate project-state mutation that the runtime handles (M7 territory).
- **Orama collator / Orama V2 search** — M10.1 does not touch search; the recipe's metadata does not index into search.
- **Graph lenses for recipes** — recipe-graph visualisations (e.g. "what does this recipe enable?") are M10.2 territory.
- **Telemetry / analytics on recipe consumption** — deferred.

## Capabilities

> CONTRACT with sddk-spec. Vault research: this project has NO capability entries in the vault beyond `capability-m2-init-2026-08-28` (invalidated by m14's Vitest introduction). All capability names below are net-new or additive. **Names MUST be reused verbatim in `{cycle-artifacts-dir}/specs/<name>/spec.md` by sddk-spec.**

### New Capabilities

- **`creation-recipe-system`** — the unified wizard + CLI surface driven by `recipes/<id>/recipe.yaml` + `parameters.schema.json` + `skeleton/`. Covers: (i) the recipe directory layout contract (`recipes/<id>/{recipe.yaml, parameters.schema.json, ui.schema.json, skeleton/, recipe.lock.json, README.md}`); (ii) the safe mustache-subset template engine (V1 grammar — Decision 3); (iii) the canonical-JSON-equality round-trip oracle (Decision 5); (iv) the V1 CLI command surface (`narrative init` flag set, exit codes, JSON output — Decision 4); (v) the V1 wizard route (`/create`) + `RecipeWidgetExtension` (additive Extension Registry kind); (vi) the File System Access sink (Chromium) + Download sink (Firefox/Safari); (vii) the bundled `recipes/middle-grade-illustrated/` recipe (Decision 6 contents). Backing implementation: `tools/narrative-recipes/` (Python core) + `tools/narrative-cli/` (Python CLI entry point `narrative`) + `control-plane/src/recipes/` (TS mirror + wizard) + `control-plane/src/features/recipes/` (RJSF wizard feature folder). NO Dexie; NO IndexedDB; NO remote recipe fetch; NO mutation of CP's loaded projection state. RJSF `6.8.x` + `ajv-cli` exact pins resolved at apply per M14 D3 ladder. Two new specs: `recipe-roundtrip.spec.ts` (Vitest — wizard headless mode vs CLI subprocess) + `recipe-template-engine.spec.ts` (Vitest + pytest — shared 5-fixture corpus).

- **`recipe-wizard-feature`** — the Extension Registry wiring for the V1 RJSF wizard. NEW `RecipeWidgetExtension` interface (additive; `apiVersion: 'control-plane.extensions/v1'` preserved per ADR-022; matches the m16 `kind: 'docs'` discriminator pattern). NEW `features/recipes/` folder as the 6th independent feature folder (the existing m15 grep invariant `from\s+['"]\.\./\.\./(story|visual|catalog|continuity|docs)/` is EXTENDED — INC-008 closure already in m16 — to add `recipes` to the prohibited-list, AND a NEW relative-escape pattern `from\s+['"]\.\./\.\./recipes/` is asserted for `features/recipes/` itself). NEW `/create` TanStack Router route; F-004 oracle list updated (matches the m16 `/search` natural side-effect precedent). NEW `useRecipeLoader()` hook consuming the bundled `recipes/middle-grade-illustrated/recipe.yaml` (V1 source: `examples/` + `recipes/` via `import.meta.glob`; future: `recipes/` index from M10.2 catalog). NEW `RecipePlanEmitter` emitting canonical `create-plan.json` (the CLI-consumable artifact). NEW `FileSystemAccessSink` (Chromium) + `DownloadPlanSink` (Firefox/Safari) — neither mutates CP state. NEW specs: `recipe-wizard.feature.spec.ts` (5-step wizard flow + 2 sinks + plan emission + round-trip emission).

### Modified Capabilities

- **`recipe-schema-v1`** (V1 NEW → m10-1 MODIFIED) — `specs/creation-recipe.schema.json` gains three OPTIONAL top-level keys: `uiHints` (object, `additionalProperties: true` — wizard-only metadata; not schema-validated), `publishing` (object, `additionalProperties: false`, optional properties: `defaultTarget: string`, `options: string[]`), and `recipeProfileAliasResolution` (object, optional, governs alias dereferencing per `specs/profile-aliases.yaml`). The existing four REQUIRED keys (`schema`, `metadata`, `parameters`, `project`) are UNCHANGED. The `schema:` const `"creation-recipe/v1"` is UNCHANGED (semver additive; no V2 bump). The seed `examples/creation-recipe-middle-grade.yaml` validates against the refined schema (round-trip oracle); the bundled `recipes/middle-grade-illustrated/recipe.yaml` also validates. NEW scenario: EVT-RSV-02 (refined schema validates seed + bundled recipe + 3 negative fixtures); EVT-RSV-03 (`uiHints` accepts arbitrary keys; `publishing` rejects unknown keys; `recipeProfileAliasResolution` defaults to safe).

### Unchanged (consumed but not modified at spec level)

- **`projection-loader-port`** (m15) — consumed by the wizard's `useRecipeLoader` for catalog-side recipe discovery (M10.2 territory); m10-1 uses static `import.meta.glob` only.
- **`extension-registry`** (m15+m16) — consumed by `features/recipes/index.tsx`; the registry's existing compile-time/static-linking model holds.
- **`serverless-app-shell`** (m14+m15+m16) — `/create` route is additive to the existing F-004 oracle pattern; the m16 INC-009 closure (oracle update on `/search`) provides the precedent for this cycle's `/create` oracle update.
- **`schema-validation-pipeline`** (m14) — extended by adding `recipe-schema-v1` to the registry; no registry-shape mutation; Ajv 8.20.0 is unchanged.
- **`golden-fixture-corpus`** (m14+m15+m16) — V1 does NOT add new fixture corpora; the bundled `recipes/middle-grade-illustrated/` is the canonical V1 fixture; future recipe fixtures land with M10.2.

## Decision Points (the proposal MUST surface these — see top-of-task constraints)

### Decision 1 — Wizard host: **Option B (File System Access API in CP) + Option C (CLI bridge) as canonical-for-agents companion**

**Choice**:
- **Human path**: RJSF wizard rendered in the existing CP static SPA at `/create`; uses `window.showDirectoryPicker()` to get explicit user-grant on a target directory; writes the rendered skeleton + manifest + `create-plan.json` via `FileSystemDirectoryHandle.getFileHandle('manifest.yaml').createWritable()`. **NO CP state mutation**: the wizard writes to a USER-SELECTED directory outside the loaded `ProjectionBundle`. `useProjectionStore` is never written by the wizard.
- **Agent/CI path**: Wizard can also emit `create-plan.json` as a browser download (Firefox/Safari fallback) OR as a side-effect of the wizard's preview step; the CLI consumes the plan via `narrative init --plan <create-plan.json>`. The CLI is canonical for scripted use (per `docs/16` §"JSON-first agent interface").

**Justification**:
- Option (a) "separate React app" is rejected: duplicates the CP build, the recipe schema, the Ajv setup, the Tailwind design tokens; violates the "same recipe drives both UIs" invariant (ADR-023).
- Option (c) "CLI bridge-only" is rejected as the ONLY path: requires either a TUI form (heavy; outside `docs/16` §"No creative writing in CLI" precedent) OR a download-and-run handoff that breaks the "wizard in the browser" UX. However, option (c) is INCLUDED as the **canonical-for-agents companion**: the wizard always emits `create-plan.json`, and the CLI always accepts `--plan <file>` so an agent can run the CP wizard headless and consume the plan.
- Option (b) File System Access API is the right choice: it is the existing CP filesystem primitive (`docs/28` §"Filesystem access" + `DirectoryProjectSource` from m14); it provides explicit per-write user-grant; it is browser-native (no server); it preserves the no-write-CP invariant because the writes target a USER-SELECTED directory (not the loaded projection).

**Invariants honored**:
- **Serverless / no-fetch**: File System Access API is browser-native; the wizard never POSTs to a backend.
- **No Dexie / IndexedDB / Orama**: the wizard's "recent target directories" is a `localStorage` entry (browser-native, NOT IndexedDB); no Orama.
- **No-write CP**: `useProjectionStore` is read-only inside `features/recipes/`; the only writes are to a user-selected directory handle.
- **Static build**: `vite build` produces a static bundle; no SSR; no server actions.

### Decision 2 — Recipe directory layout: **CONFIRM `docs/31` § Contents + ONE refinement**

**Choice**: The layout in `docs/31` § Contents is confirmed:

```text
recipes/<id>/
├── recipe.yaml              # recipe schema v1
├── parameters.schema.json   # Ajv 2020-12 schema for user-supplied parameters
├── ui.schema.json           # RJSF uiSchema for wizard presentation
├── skeleton/                # templated filesystem tree (mustache-subset)
├── README.md                # recipe documentation
├── recipe.lock.json         # generated; content-addressed reproducibility
└── tests/                   # round-trip equivalence oracle fixtures
```

**One refinement** (additive; not breaking): `recipe.lock.json` is a NEW generated file recording `{recipeYamlSha256, parametersSchemaSha256, skeletonFileShas256, generatorVersion}` — emitted on first publish and re-emitted on any recipe change. The lock is the reproducibility handle (a recipe's skeleton outputs are byte-stable when the lock is unchanged). The lock is created by `tools/narrative-recipes/recipe_loader.py::publish(recipe_id)` and committed alongside the recipe.

**Justification**: The `docs/31` layout is well-designed; `recipe.lock.json` adds reproducibility (an explicit UAT-M10-04 prerequisite — without it, the "Semantic diff is empty for recipe-owned fields" assertion is weakened by drift). `tests/` ships the round-trip oracle fixtures at the recipe level (so each recipe can ship its own equivalence test).

### Decision 3 — Skeleton templating micro-language: **mustache-subset (deterministic, safe)**

**Choice**: V1 grammar is a strict subset of Mustache:

```mustache
{{var}}                     # variable substitution; whitespace-trimmed
{{#each items}}...{{/each}} # iteration over an array parameter
{{#if flag}}...{{/if}}      # conditional on truthy parameter
{{! comment }}              # comment (stripped from output)
```

**Explicitly forbidden**:
- `{{> partial }}` (no partials)
- `{{{ raw }}}` (no raw HTML; always escape)
- `{{& unescaped }}` (no unescaped)
- Function calls (`{{ upper(name) }}` is REJECTED at parse time)
- Nested expressions (`{{ a.b.c }}` is REJECTED; only top-level parameter references)
- Custom delimiters (only `{{` and `}}`)
- ANY form containing the substring `{{` nested (the parser emits a `TemplateError`)

**Implementation**: Both Python (`tools/narrative-recipes/template_engine.py`) and TypeScript (`control-plane/src/recipes/templateEngine.ts`) implement the same grammar. The shared 5-fixture corpus (`tests/fixtures/mustache-subset/*.yaml` — each fixture has `{input, expected_output, expected_error?}`) is the equivalence oracle. **Both implementations must produce identical canonical-JSON output for every fixture.**

**Justification**:
- The `examples/creation-recipe-middle-grade.yaml` line 42 already uses `{{ audience }}` — the grammar must support this.
- Mustache is well-known; the subset grammar keeps the attack surface bounded.
- The forbidden list rules out every known XSS / arbitrary-code vector (`docs/31` §Security: "never execute scripts").
- The shared Python+TS implementation guarantees round-trip equivalence by construction.

### Decision 4 — CLI command surface: **confirm `narrative init --recipe <id> ...` + add `narrative plan` companion**

**Choice**:

```text
narrative init
    --recipe <recipe-id>             # required unless --plan is given
    --params-file <params.json>      # OR (mutually exclusive with --param)
    --param <key>=<value>            # repeatable; OR with --params-file
    --out <directory>                # required; target directory
    --dry-run                        # print plan, do not write
    --force                          # overwrite existing files
    --json                           # canonical JSON output for agents
    [--recipes-root <path>]          # default: ./recipes (cwd-relative)

narrative init --plan <create-plan.json>
    --out <directory>                # required; target directory
    --dry-run
    --force
    --json

narrative plan
    --recipe <recipe-id>
    --params-file <params.json> | --param k=v ...
    [--out <directory>]              # default: stdout if omitted
    --json                           # canonical JSON output: create-plan.json
```

**Exit codes** for `narrative init`:

| Code | Condition |
|---:|:---|
| 0 | Project created successfully |
| 1 | Validation error: recipe doesn't validate against schema, parameters don't validate against `parameters.schema.json`, template engine error |
| 2 | Conflict: target directory contains conflicting files (use `--force` to overwrite) |
| 3 | Missing recipe: `--recipe <id>` not found in any `--recipes-root` |
| 4 | Internal error (template engine exception, filesystem error beyond EACCES) |

**JSON output shape** (`--json`):

```json
{
  "ok": true,
  "recipe": "middle-grade-illustrated",
  "recipeLockSha256": "...",
  "manifest": { /* canonical narrative.yaml as JSON */ },
  "skeleton": [
    { "path": "canon/characters/nora.yaml", "sha256": "...", "bytes": 1234 },
    ...
  ],
  "createPlanSha256": "..."
}
```

**Justification**:
- `docs/16` §"Primary commands" already lists `narrative init`; this proposal pins its V1 flag set.
- `docs/16` §"JSON-first agent interface" requires `--json` on every primary command.
- `docs/16` §"check" exit code table provides the precedent for the 0–4 mapping.
- `narrative plan` companion emits the same `create-plan.json` artifact the wizard emits — agent/CI path without the wizard's UI overhead.

### Decision 5 — Round-trip equivalence oracle: **canonical-JSON-equality + skeleton-bytes SHA-256**

**Choice**: A project created by the wizard and a project created by the CLI are **equivalent** iff:

1. **Manifest equivalence**: the `narrative.yaml` (per `specs/project.schema.json`) parses to canonical-JSON (sorted keys, no whitespace, UTF-8, recursive) and the two canonical-JSON strings are byte-equal. The manifest's `createdAt` field is EXCLUDED from equivalence (it is a timestamp); `id`, `title`, `language`, `format`, `audience`, `runtime`, `scm`, `images`, `publishing` are INCLUDED.
2. **Skeleton equivalence**: for every path in the rendered skeleton, the SHA-256 of the file's bytes is identical between the two outputs. Timestamps in skeleton files (if any) are normalized via `LF` line endings + UTF-8 + no-trailing-whitespace.
3. **Recipe-owned fields**: per `uat/UAT-M10-04-creation-recipe.md` ("Semantic diff is empty for recipe-owned fields"), the diff is computed over the set `{manifest.audience.profile, manifest.format, manifest.publishing, project.profiles, project.packs, project.skills, project.publishingTargets, initialGoals}` — exactly the recipe-owned field set. Non-recipe-owned fields (timestamps, runtime persistence path, scm provider) are excluded.

**Implementation**: The oracle ships as:
- `tools/narrative-recipes/tests/test_roundtrip.py` (pytest) — invokes the Python loader + renderer on the bundled recipe; emits `out_python/`.
- `control-plane/test/recipe-roundtrip.spec.ts` (Vitest) — invokes the TS loader + renderer in headless mode; emits `out_ts/`.
- A NEW shared test corpus (`tests/fixtures/mustache-subset/*.yaml` + `tests/fixtures/recipe-equivalence/*.yaml`) drives both implementations with the SAME inputs.
- The oracle asserts: `manifest_python == manifest_ts` (canonical-JSON byte-equal) AND `sha256(sorted_python_files) == sha256(sorted_ts_files)`.

**Justification**:
- Byte-identical is too strict (different line endings, different timestamps).
- AST-equal alone is too lax (`{a:1, b:2}` would pass as equivalent to `{b:2, a:1}` — but order matters in arrays, which IS recipe-owned).
- Canonical-JSON-equality is the standard contract for cross-runtime equivalence (RFC 8785 JSON Canonicalization Scheme is the formal reference; V1 implements the minimal subset: sorted keys, no insignificant whitespace, UTF-8, NFC-normalized).
- Skeleton-bytes SHA-256 catches file-content drift without depending on filesystem ordering.

### Decision 6 — Initial recipe scope: **middle-grade illustrated with 2 characters + 3 chapter skeletons + 1 profile + print-pdf**

**Choice**: The bundled `recipes/middle-grade-illustrated/` skeleton contains:

```text
narrative.yaml                  # manifest per specs/project.schema.json
profiles/
  profile-middle-grade-10-11.yaml   # resolved from specs/profile-aliases.yaml
canon/
  characters/
    <protagonist>.yaml          # 1 placeholder character; user fills in name
    <deuteragonist>.yaml        # 1 placeholder character; user fills in name
  chapters/
    01-opening.md               # 3 placeholder chapter skeletons
    02-incident.md
    03-resolution.md
packs/
  story_core/
    story_intake.md             # skill instruction stub
  characters/
    character_design.md
  editorial/
    editorial_pass.md
  visual_core/
    visual_bible_seed.md
goals.yaml                      # initialGoals: establish-story-bible, establish-main-cast, outline-story
README.md                       # recipe-driven starter docs
```

**Decisions per axis**:
- **Characters**: 2 (matches example initialGoal `establish-main-cast`; named `<protagonist>` and `<deuteragonist>` placeholders the user fills in via wizard parameters).
- **Chapters**: 3 (matches `outline-story` initial goal; numbered `01-opening` / `02-incident` / `03-resolution` — the classic three-act skeleton).
- **Profiles**: `profile-middle-grade-10-11` (the canonical example; resolved from `specs/profile-aliases.yaml`).
- **Image policy default**: `local_preferred` (matches the example parameter default).
- **Publishing target**: `print-pdf` (matches the example).
- **Output language default**: `es-ES` (matches `examples/middle-grade-profile.yaml`).
- **Genre**: wizard parameter `genre` enum `["fantasy", "mystery", "adventure", "realistic"]` (default `fantasy` — per the `docs/31` §"Example flow": "Fantasy + Mystery").

**Justification**:
- The example file (`examples/creation-recipe-middle-grade.yaml`) is the canonical seed; V1 recipe contents match its declared intent.
- `docs/31` §"Example flow" explicitly enumerates "Illustrated Middle Grade + Audience 10-11 + Fantasy + Mystery + Local preferred images + Print PDF"; the V1 recipe matches this flow.
- 2 characters + 3 chapters is the minimum coherent skeleton that demonstrates the round-trip oracle without overfitting to a single genre.

### Decision 7 — CI guards: **tsc 0 + Vitest N/N + Vite build static + ajv-cli recipe schema validation**

**Choice**: The following CI gates MUST pass on every PR:

1. `tsc --noEmit -p control-plane/tsconfig.json` exit 0 (TypeScript strict, no type errors).
2. `pnpm --filter control-plane test` (Vitest) N/N (all tests pass; the new specs `recipe-roundtrip.spec.ts` + `recipe-template-engine.spec.ts` + `recipe-wizard.feature.spec.ts` are part of this run).
3. `pnpm --filter control-plane build` (Vite static build) succeeds; `control-plane/dist/index.html` exists; assets are content-hashed; bundle size ≤ 1.5 MB gzipped (post-M10 budget from `docs/28` §"Dependency governance").
4. `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/middle-grade-illustrated/recipe.yaml` exit 0 for EVERY recipe under `recipes/**/recipe.yaml` (recursive; the build fails on any invalid recipe). Implemented as `tools/validate-recipes/validate.py` (in-pack tooling per `tools/sddk-pack-audit` precedent).
5. `python -m pytest tools/narrative-recipes/tests/` N/N (Python core tests).
6. `python -m pytest tools/narrative-cli/tests/` N/N (CLI command tests).
7. `pnpm --filter control-node preview & curl http://localhost:4173/create` smoke: the `/create` route renders without JS errors (m14 serverless invariant holds — no fetch).

**Justification**:
- tsc 0 + Vitest N/N + Vite build static are the m14/m15/m16 precedent (per `docs/28` §"Testing" + M14 D3 ladder).
- ajv-cli recipe schema validation is a NEW gate specific to M10.1; it enforces the additive-only schema evolution invariant at CI time.
- Python pytest gates are NEW for m10-1; the Python core (`tools/narrative-recipes/`) and CLI (`tools/narrative-cli/`) ship with their own test surfaces.

## Approach

**Option B** from the decision matrix (File System Access API in CP + CLI companion) is the chosen path. A-lite single reviewable unit with **6 atomic per-block commits** (m15/m16 precedent-supported size-exception):

| Block | Path | Files | Est. LoC | Risk |
|---|---|---|---|---|
| **PF** Pre-flight (D3 ladder per M14) — `pnpm view` + `pip index versions` resolve exact pins for RJSF + ajv-cli + `pystache` (optional) + the shared fixture corpus; write `$CA/resolved-versions.json`; classify T0/T1/T2 | `$CA/resolved-versions.json` only | 0 in repo | ~30 receipts | Med |
| **0** Recipe schema refinement + bundled `recipes/middle-grade-illustrated/` + `recipe.lock.json` generator | `specs/creation-recipe.schema.json` + `recipes/middle-grade-illustrated/{recipe.yaml,parameters.schema.json,ui.schema.json,README.md,recipe.lock.json,skeleton/,tests/}` + `tools/narrative-recipes/recipe_loader.py::publish()` + `tools/validate-recipes/validate.py` | ~1 modified + ~12 new + 1 generator | ~360 | Low |
| **1** `narrative-recipes` Python core (loader + template engine + parameter validator + project renderer + equivalence oracle) | `tools/narrative-recipes/{recipe_loader,template_engine,parameter_validator,project_renderer,equivalence_oracle}.py` + `tests/fixtures/{mustache-subset,recipe-equivalence}/` + `tests/test_*.py` | ~5 new modules + ~10 fixtures + ~6 test files | ~580 | Med |
| **2** `narrative-cli` Python CLI (`narrative init` + `narrative plan` + `--json` + exit codes) | `tools/narrative-cli/{__init__,cli,init,plan,output,exit_codes}.py` + `tests/test_cli.py` + `pyproject.toml` + `tools/narrative-cli/README.md` | ~7 new | ~480 | Med |
| **3** TS mirror (`control-plane/src/recipes/`) + wizard route (`/create`) + `features/recipes/` feature folder + `RecipeWidgetExtension` + F-004 oracle update + INC-008-extended grep invariant | `control-plane/src/recipes/{recipeLoader,templateEngine,parameterValidator,projectRenderer}.ts` + `control-plane/src/views/Create.tsx` + `control-plane/src/features/recipes/{index,CreateWizard,useRecipeLoader,RecipePlanEmitter,FileSystemAccessSink,DownloadPlanSink}.tsx` + `control-plane/src/extensions/types.ts` (additive `RecipeWidgetExtension`) + `control-plane/src/routes/{router,routes}.tsx` (F-004 oracle update) + `control-plane/test/extension-isolation.spec.ts` (INC-008 extended for `recipes/`) + 3 new specs + RJSF + ajv-cli exact pins in `control-plane/package.json` | ~12 new + 4 modified + 2 dep pins | ~860 | Med |
| **4** Tests + CI guard wiring (`tools/validate-recipes/validate.py` + GitHub Actions YAML extensions OR local-CI `just check` recipe addition) | `control-plane/test/{recipe-roundtrip,recipe-template-engine,recipe-wizard.feature}.spec.ts` + `tools/narrative-recipes/tests/test_roundtrip.py` + `tools/narrative-cli/tests/test_cli.py` + `tools/validate-recipes/validate.py` + `justfile` recipe addition (or `.github/workflows/*.yml` doc update per CI-policy) | ~3 new TS specs + ~3 new Python test files + 1 validate script + 1 CI doc | ~520 | Low |
| **F** Closeout — `docs/31` Layout contract + Security pinning + `docs/27` glossary + `docs/28` pins + `docs/16` CLI surface + `docs/19` M10.1 done + `README.md` + `MANIFEST.json` regen | `docs/{16,19,27,28,31}-*.md` + `README.md` + `MANIFEST.json` | ~6 doc edits + 1 MANIFEST regen | ~140 | Low |

Total ~38 new files + ~12 modified files, ~2970 LoC, **2 new pinned deps** (RJSF + ajv-cli), **1 schema refined (additive-only)**, **0 new ADRs**, **1 NEW capability** + **1 MODIFIED capability**, **5+ doc updates (first-class)**. Exceeds the 400-line review budget by ~7.4× — same size-exception treatment M14/M15/M16 used (per-block commits ~860 LoC max for Block 3; 6 atomic commits keep individual commits reviewable). A-lite 6-block ceiling NOT exceeded (Block PF is pre-flight, not a production block).

### M10 invariant compliance map

| Invariant | How honored |
|---|---|
| **Serverless / no-fetch** | Wizard uses File System Access API (browser-native) + local JSON files. CLI is a local Python script. No network calls. |
| **No Dexie / IndexedDB / Orama** | No Dexie/IndexedDB introduced. Wizard's "recent target directories" is `localStorage` (browser-native, NOT IndexedDB). No Orama. |
| **No-write Control Plane** | `useProjectionStore` is READ-ONLY inside `features/recipes/`. The wizard's only writes are to a user-selected `FileSystemDirectoryHandle` (a NEW directory the user grants; NOT the loaded projection). |
| **Exact dependency pins** | RJSF + ajv-cli pinned exact at apply per M14 D3 ladder (Block PF.2–PF.4); existing `control-plane/package.json` pins remain (Vite 8.2.2, React 19.2.8, etc.). `pyproject.toml` for `narrative-cli` pins exact. |
| **Static build path** | `vite build` produces a static bundle (m14 precedent). Python CLI is a separate runtime, not bundled into the SPA. |
| **Additive-only schema evolution** | `specs/creation-recipe.schema.json` adds 3 OPTIONAL keys (`uiHints`, `publishing`, `recipeProfileAliasResolution`); existing 4 REQUIRED keys unchanged; `schema:` const unchanged. |
| **Round-trip equivalence** | Enforced by structural shared library + canonical-JSON-equality test oracle (Decision 5). The wizard's TS engine and the CLI's Python engine share the same 5-fixture corpus; both implementations must satisfy identical outputs. |

## Quality Intent

- **Production surfaces**:
  - `tools/narrative-recipes/` (Python core; 5 modules + fixtures + tests)
  - `tools/narrative-cli/` (Python CLI; entry point `narrative`)
  - `tools/validate-recipes/validate.py` (CI gate)
  - `recipes/middle-grade-illustrated/` (bundled recipe)
  - `specs/creation-recipe.schema.json` (refined)
  - `control-plane/src/recipes/` (TS mirror)
  - `control-plane/src/views/Create.tsx` (wizard view)
  - `control-plane/src/features/recipes/` (RJSF feature folder)
  - `control-plane/src/extensions/types.ts` (additive `RecipeWidgetExtension`)
  - `control-plane/src/routes/{router,routes}.tsx` (additive `/create` route + F-004 oracle update)
  - 5 NEW Vitest specs + 3 NEW pytest files + 1 NEW validate script
  - Doc updates: `docs/{16,19,27,28,31}-*.md` + `README.md` + `MANIFEST.json`
- **Changed public APIs**:
  - `narrative init [--recipe|--plan] [--params-file|--param] --out [--dry-run] [--force] [--json]` (NEW CLI surface)
  - `narrative plan --recipe [--params-file|--param] [--out] [--json]` (NEW CLI surface)
  - `RecipeWidgetExtension` interface (NEW Extension Registry additive shape)
  - `useRecipeLoader()` hook (NEW React surface)
  - `recipeLoader.load(recipeId, source): Diagnostic<RecipeBundle>` (NEW pure TS surface)
  - `recipeLoader.publish(recipeId, sourcePath): RecipeLock` (NEW Python generator)
  - `templateEngine.render(template, params): string` (NEW pure function — Python + TS)
  - `equivalenceOracle.canonicalJsonEqual(a, b): boolean` (NEW pure function — Python + TS)
  - `FileSystemAccessSink.write(plan, handle)` (NEW browser-only sink)
  - `DownloadPlanSink.write(plan, filename)` (NEW browser-only sink)
  - `specs/creation-recipe.schema.json` adds 3 OPTIONAL keys (additive; semver MINOR-compatible)
- **Readiness dimensions**:
  - **contract completeness** — every CLI subcommand has `--json`; every wizard step emits a canonical intermediate representation; the `create-plan.json` schema is the same shape the CLI consumes.
  - **internal consistency** — no existing `specs/*.schema.json` is modified (AC-INV-schema binding holds); the refined `creation-recipe.schema.json` is the SAME file with additive keys; `MANIFEST.json` regen follows m13/m14/m15/m16 precedent; route ordering preserves F-004 oracle pattern (matches `/search` precedent from m16).
  - **testability** — 3 NEW Vitest specs + 3 NEW pytest files + 1 NEW ajv-cli validate script; the shared 5-fixture mustache corpus is the round-trip oracle; UAT-M10-04 Given clause satisfied by the bundled `middle-grade-illustrated` recipe + a single set of test parameters; Pass clause satisfied by canonical-JSON equivalence on the rendered manifest + skeleton-bytes SHA-256 equivalence on the rendered skeleton.
  - **security** — `docs/31` §Security holds: recipe validation against schema; NO script execution in template engine (Decision 3 forbidden list); NO automatic dependency installation; external provider enabling requires explicit user action (handled at runtime, NOT in the wizard). File System Access sink requires explicit `showDirectoryPicker()` user-grant per session.
  - **isolation** — `features/recipes/` does NOT import any other `features/` folder (m15/m16 grep invariant extended); the TS mirror in `control-plane/src/recipes/` is consumed only by `views/Create.tsx` + `features/recipes/`; the Python core has zero coupling to the TS code.
- **Required real boundaries**:
  - `pnpm install --frozen-lockfile && pnpm build && pnpm test` MUST succeed against the real `specs/*.schema.json` files including the refined `creation-recipe.schema.json`.
  - `python -m pytest tools/narrative-recipes/tools/narrative-cli` MUST succeed; the shared 5-fixture corpus MUST pass in BOTH Python (`pytest`) and TypeScript (`vitest`).
  - `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/middle-grade-illustrated/recipe.yaml` MUST exit 0 for every recipe under `recipes/`.
  - `vite preview` against `control-plane/` MUST serve `/create` and render the wizard with the bundled recipe loaded (with the example parameters yielding a renderable wizard).
  - `narrative init --recipe middle-grade-illustrated --param title='X' --param projectId='x' --param audience='profile-middle-grade-10-11' --out /tmp/x` MUST exit 0 and produce a project tree matching `recipes/middle-grade-illustrated/skeleton/`.
  - `narrative init --plan <create-plan.json> --out /tmp/y` MUST produce the same project tree (round-trip equivalence oracle).
  - DevTools Network panel MUST show zero outbound application-API requests after `/create` load (m14/m15/m16 invariants preserved + extended to wizard).
  - `control-plane/package.json` declares RJSF + ajv-cli exact pins per M14 D3 ladder; `pnpm install --frozen-lockfile` succeeds on Node 24 LTS.
  - `tools/narrative-cli/pyproject.toml` declares `click` (or `typer`) + `pydantic` + `pyyaml` + `ajv` (Python) exact pins.

## Architecture Impact

- **Level**: `boundary` — M10.1 crosses the prose-contracts ↔ executable-code seam in two new directions (Python↔TypeScript shared core + File System Access API write sink + CLI command surface) AND introduces a NEW Extension Registry kind (`RecipeWidgetExtension`, additive).
- **Evidence**:
  - **Inputs**: `docs/19-ROADMAP.md` § M10.1, `docs/31-CREATION-RECIPES.md` (recipe contents + security model), `docs/16-CLI.md` (`narrative init` listed), `docs/28-CONTROL-PLANE-STACK.md` (RJSF 6.8.x + AJV8 validator + File System Access API), `docs/30-CONTROL-PLANE-EXTENSIONS.md` (`RecipeWidgetExtension` kind listed but not registered), `ADR-023` (declarative recipes; same recipe drives CLI + wizard), `specs/creation-recipe.schema.json` (V1 envelope), `specs/project.schema.json` (manifest), `specs/profile.schema.json` + `specs/profile-aliases.yaml` (profile alias dereferencing), `examples/creation-recipe-middle-grade.yaml` (illustrative seed), `examples/middle-grade-profile.yaml` (profile seed), `examples/catalog-project.yaml` (project manifest pattern), `control-plane/STACK.md` (RJSF 6.8.x pinned at design baseline).
  - **Outputs**: NEW `tools/narrative-recipes/` (Python core); NEW `tools/narrative-cli/` (Python CLI entry `narrative`); NEW `tools/validate-recipes/validate.py` (CI gate); NEW `recipes/middle-grade-illustrated/` (bundled recipe + skeleton + lock); MODIFIED `specs/creation-recipe.schema.json` (additive 3 optional keys); NEW `control-plane/src/recipes/` (TS mirror); NEW `control-plane/src/views/Create.tsx` (wizard); NEW `control-plane/src/features/recipes/` (RJSF feature folder + 2 sinks); MODIFIED `control-plane/src/extensions/types.ts` (additive `RecipeWidgetExtension`); MODIFIED `control-plane/src/routes/{router,routes}.tsx` (additive `/create` + F-004 oracle update); MODIFIED `control-plane/test/extension-isolation.spec.ts` (INC-008 extended for `recipes/`); NEW `control-plane/test/{recipe-roundtrip,recipe-template-engine,recipe-wizard.feature}.spec.ts`; NEW `tools/narrative-recipes/tests/test_*.py` (5 fixtures); NEW `tools/narrative-cli/tests/test_cli.py`; `control-plane/package.json` (2 new pins: RJSF + ajv-cli); `tools/narrative-cli/pyproject.toml` (NEW file with exact pins); doc updates (`docs/{16,19,27,28,31}-*.md` + `README.md` + `MANIFEST.json`).
  - **ADRs consumed (no new ones)**: ADR-023 (declarative recipes — fully honoured; same recipe drives CLI + wizard; no arbitrary scripts); ADR-022 (extension model — `RecipeWidgetExtension` is additive, carries `apiVersion: 'control-plane.extensions/v1'` preserved, no dynamic remote code, compile-time registry); ADR-009 (profiles — profile alias dereferencing via `recipeProfileAliasResolution`); ADR-005 (project-local — recipes are vendored in `recipes/`, no remote fetch).
- **Architecture intent**: explore-report not produced for this cycle (the orchestrator explicitly delegated "do NOT re-research; consume directly"). The decision matrix above (7 decision points) is the canonical intent for design phase to deepen. The fallback table (7 blocks, 6 atomic commits) is the canonical intent for tasks phase. No architectural reversibility decision is introduced by M10.1; no ADR-026 (slot 26/26 reserved per m15/m16 precedent) needed.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `changes/m10-1-creation-recipes/{proposal,spec,design,tasks}.md` | New | The change record (4 files; this proposal + spec + design + tasks) |
| `specs/creation-recipe.schema.json` | Modified (additive) | Add 3 OPTIONAL top-level keys (`uiHints`, `publishing`, `recipeProfileAliasResolution`); existing 4 REQUIRED keys unchanged; `schema:` const `"creation-recipe/v1"` unchanged |
| `tools/narrative-recipes/__init__.py` | New | Python package init |
| `tools/narrative-recipes/recipe_loader.py` | New | Loads `recipes/<id>/recipe.yaml` + `parameters.schema.json` + `skeleton/`; validates via Ajv; emits `recipe.lock.json` via `publish()` |
| `tools/narrative-recipes/template_engine.py` | New | Safe mustache-subset substitution (Decision 3 grammar); pure function; zero I/O |
| `tools/narrative-recipes/parameter_validator.py` | New | Ajv wrapper for `parameters.schema.json` |
| `tools/narrative-recipes/project_renderer.py` | New | Composes the canonical project manifest + skeleton files from template engine |
| `tools/narrative-recipes/equivalence_oracle.py` | New | Canonical-JSON equality (RFC 8785 subset) |
| `tools/narrative-recipes/tests/fixtures/mustache-subset/*.yaml` | New | 5 shared fixtures (variable, each, if, comment, error cases) |
| `tools/narrative-recipes/tests/fixtures/recipe-equivalence/*.yaml` | New | 1 bundled `middle-grade-illustrated` equivalence fixture (inputs + expected outputs) |
| `tools/narrative-recipes/tests/test_*.py` | New | pytest: loader, template engine (5 fixtures), parameter validator, project renderer, equivalence oracle |
| `tools/narrative-cli/pyproject.toml` | New | Python project metadata; exact pins for click/typer + pydantic + pyyaml + ajv (Python) |
| `tools/narrative-cli/narrative_cli/__init__.py` | New | CLI package init |
| `tools/narrative-cli/narrative_cli/cli.py` | New | Click/Typer entry point; subcommand dispatch |
| `tools/narrative-cli/narrative_cli/init.py` | New | `narrative init` subcommand: --recipe / --plan / --params-file / --param / --out / --dry-run / --force / --json |
| `tools/narrative-cli/narrative_cli/plan.py` | New | `narrative plan` subcommand: emit `create-plan.json` |
| `tools/narrative-cli/narrative_cli/output.py` | New | Canonical JSON output formatter |
| `tools/narrative-cli/narrative_cli/exit_codes.py` | New | Exit code mapping (Decision 4) |
| `tools/narrative-cli/tests/test_cli.py` | New | pytest: CLI subcommand flows, exit codes, --json output, --plan consumption |
| `tools/validate-recipes/validate.py` | New | CI gate: ajv-cli validate every recipe under `recipes/**/recipe.yaml` |
| `recipes/middle-grade-illustrated/recipe.yaml` | New | Refined from `examples/creation-recipe-middle-grade.yaml` + 3 additive keys |
| `recipes/middle-grade-illustrated/parameters.schema.json` | New | Audience/imagePolicy/title/projectId + new genre/outputLanguage |
| `recipes/middle-grade-illustrated/ui.schema.json` | New | RJSF uiSchema for wizard presentation |
| `recipes/middle-grade-illustrated/skeleton/narrative.yaml` | New | Project manifest per `specs/project.schema.json` |
| `recipes/middle-grade-illustrated/skeleton/profiles/profile-middle-grade-10-11.yaml` | New | Profile (resolved from alias) |
| `recipes/middle-grade-illustrated/skeleton/canon/characters/{protagonist,deuteragonist}.yaml` | New | 2 placeholder character skeletons |
| `recipes/middle-grade-illustrated/skeleton/canon/chapters/{01-opening,02-incident,03-resolution}.md` | New | 3 placeholder chapter skeletons |
| `recipes/middle-grade-illustrated/skeleton/packs/{story_core,characters,editorial,visual_core}/*.md` | New | 4 pack instruction stubs |
| `recipes/middle-grade-illustrated/skeleton/goals.yaml` | New | initialGoals list |
| `recipes/middle-grade-illustrated/skeleton/README.md` | New | Recipe-driven starter docs |
| `recipes/middle-grade-illustrated/recipe.lock.json` | New (generated) | Content-addressed reproducibility handle |
| `recipes/middle-grade-illustrated/tests/test_roundtrip.yaml` | New | Round-trip equivalence fixture (Decision 5 oracle) |
| `recipes/middle-grade-illustrated/README.md` | New | Recipe documentation |
| `control-plane/src/recipes/recipeLoader.ts` | New | TS mirror of `recipe_loader.py` (Ajv-driven validation) |
| `control-plane/src/recipes/templateEngine.ts` | New | TS port of `template_engine.py`; same grammar |
| `control-plane/src/recipes/parameterValidator.ts` | New | TS mirror of `parameter_validator.py` |
| `control-plane/src/recipes/projectRenderer.ts` | New | TS mirror of `project_renderer.py` |
| `control-plane/src/recipes/equivalenceOracle.ts` | New | TS mirror of `equivalence_oracle.py` |
| `control-plane/src/views/Create.tsx` | New | RJSF-driven wizard view at `/create` |
| `control-plane/src/features/recipes/CreateWizard.tsx` | New | RJSF form rendered from `recipe.parameters` + `recipe.uiHints` |
| `control-plane/src/features/recipes/useRecipeLoader.ts` | New | React hook: loads `recipes/<id>/recipe.yaml` via `import.meta.glob` |
| `control-plane/src/features/recipes/RecipePlanEmitter.ts` | New | Emits `create-plan.json` (the CLI-consumable artifact) |
| `control-plane/src/features/recipes/FileSystemAccessSink.ts` | New | `window.showDirectoryPicker()` + `FileSystemDirectoryHandle.getFileHandle().createWritable()` |
| `control-plane/src/features/recipes/DownloadPlanSink.ts` | New | Browser download fallback for Firefox/Safari |
| `control-plane/src/features/recipes/index.tsx` | New | Feature module init; registers `RecipeWidgetExtension` |
| `control-plane/src/extensions/types.ts` | Modified (additive) | Add `RecipeWidgetExtension` interface (carries `apiVersion`; `kind: 'recipe-wizard'` discriminator field) |
| `control-plane/src/extensions/registry.ts` | Unmodified | Discriminator field is read at filter time only; dispatch contract unchanged |
| `control-plane/src/extensions/predicates.ts` | Unmodified | Reuses existing `kindIs` predicate |
| `control-plane/src/routes/router.ts` | Modified (additive) | Add `/create` route + component wiring |
| `control-plane/src/routes/routes.tsx` | Modified (additive) | Update F-004 oracle list to include `/create` (matches `/search` precedent from m16) |
| `control-plane/src/store/projectionStore.ts` | UNMODIFIED (read-only) | The wizard does NOT mutate CP state; `useProjectionStore` is read-only inside `features/recipes/` |
| `control-plane/package.json` | Modified (additive) | Add RJSF + ajv-cli exact pins (2 deps; M14 D3 ladder pre-flight at apply) |
| `control-plane/pnpm-lock.yaml` | Modified | Regen for 2 new pins |
| `control-plane/STACK.md` | Modified | T1 deviation notes from Block PF (if any, per M14 D3 ladder) |
| `control-plane/test/recipe-roundtrip.spec.ts` | New | Vitest: TS mirror vs Python subprocess (Decision 5 oracle) |
| `control-plane/test/recipe-template-engine.spec.ts` | New | Vitest: TS engine satisfies 5-fixture corpus |
| `control-plane/test/recipe-wizard.feature.spec.ts` | New | Vitest: 5-step wizard flow + 2 sinks + plan emission |
| `control-plane/test/extension-isolation.spec.ts` | Modified | INC-008 fix extended: `recipes/` added to prohibited-folder list; relative-escape oracle covers `recipes/` too |
| `control-plane/src/styles.css` | Modified (additive) | Add `.view-create` + `.recipe-wizard-step` + `.recipe-plan-preview` styles (~30 LoC; preserves Tailwind 4.3 baseline) |
| `MANIFEST.json` | Modified (regen) | + entries for new files; `_meta.regenerated_at` + `_meta.regeneration_reason` per m13/m14/m15/m16 precedent |
| `docs/31-CREATION-RECIPES.md` | Modified (additive) | § Contents — add "Layout contract" subsection pinning the directory layout + `recipe.lock.json` generation; § Security — pin the mustache-subset grammar as the safe substitution language |
| `docs/27-GLOSSARY.md` | Modified (additive) | Add `Creation Recipe`, `Recipe Skeleton`, `Round-trip Equivalence Oracle`, `Canonical-JSON Equality`, `Mustache-subset Template Engine`, `File System Access Sink`, `Recipe Plan` |
| `docs/28-CONTROL-PLANE-STACK.md` | Modified (additive) | Note RJSF + ajv-cli exact pins resolved at m10-1 apply; record `tools/narrative-cli` + `tools/narrative-recipes` as in-pack tooling |
| `docs/16-CLI.md` | Modified (additive) | `narrative init` flag set + exit codes + `--json` agent interface; new `narrative plan` companion |
| `docs/19-ROADMAP.md` | Modified (additive) | Mark M10.1 done; advance M10.1 status |
| `README.md` | Modified (additive) | Add "Create a project" section |
| `docs/adrs/ADR-026-*.md` | NOT REQUIRED | M10.1 does NOT introduce architectural reversibility decisions; `RecipeWidgetExtension` is additive metadata (ADR-022 holds); the safe template grammar is pinned in `docs/31` §Security (not a new ADR); the round-trip oracle is a test contract (not a new ADR). Slot 26/26 stays reserved per m15/m16 precedent. |
| `specs/` (other than `creation-recipe.schema.json`) | UNCHANGED | AC-INV-schema binding holds |
| `examples/`, `uat/`, `templates/`, `golden/` | UNCHANGED | The bundled recipe lives in `recipes/`; the existing `examples/creation-recipe-middle-grade.yaml` is the illustrative seed (preserved) |
| Capability catalog (M10.2), Multi-project (M10.3) | NOT TOUCHED | Deferred per launch packet scope focus |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **R-001** RJSF + ajv-cli bring transitive deps that exceed the M14 D3 ladder budget | MED | Block PF (PF.2–PF.4) verifies exact pins + transitive count; if any pin drifts > patch (T1) the Block F appends the deviation to `control-plane/STACK.md`; if drift is major (T2) STOP and escalate to re-proposal per D3 ladder |
| **R-002** RJSF + JSON Schema 2020-12 edge cases (e.g. `oneOf`/`anyOf`/`if-then-else`) may not render cleanly | MED | V1 RJSF `uiSchema` only uses `enum` + `default` + simple types; complex combinators are documented as out-of-scope for V1 wizard; the CLI accepts all valid JSON Schema inputs (no UI constraint) |
| **R-003** Template engine escape vulnerability (XSS via unescaped substitution) | LOW | Triple-brace `{{{ var }}}` is REJECTED at parse time; all substitutions are HTML/JSON-escaped by default; the forbidden list (Decision 3) rules out every known XSS vector; security spec asserts no `<script>` survives substitution |
| **R-004** Round-trip equivalence breaks across Python/TypeScript boundary (e.g. YAML serialization differs, JSON ordering differs) | MED | The 5-fixture mustache-subset corpus + 1 recipe-equivalence fixture enforce byte-identical canonical-JSON output; if a divergence is found, both implementations are fixed to converge (RFC 8785 subset is the formal oracle); the round-trip spec runs both Python (pytest) AND TS (Vitest) and asserts equality |
| **R-005** File System Access API not available in Firefox/Safari | MED | `DownloadPlanSink` provides the fallback (browser-native download of `create-plan.json`); users on non-Chromium browsers download the plan and run the CLI; the wizard detects capability via `if ('showDirectoryPicker' in window)` and routes accordingly |
| **R-006** Recipe schema refinement could break existing recipes | LOW | The refinement is ADDITIVE-ONLY (3 OPTIONAL keys); the existing 4 REQUIRED keys are unchanged; the seed `examples/creation-recipe-middle-grade.yaml` validates against the refined schema (round-trip oracle); CI gate `tools/validate-recipes/validate.py` enforces this on every PR |
| **R-007** Wizard could accidentally mutate CP state via `useProjectionStore` | LOW | The wizard's `features/recipes/` does NOT import `store/projectionStore.ts`; the TS mirror in `control-plane/src/recipes/` is consumed only by `views/Create.tsx` + `features/recipes/`; the grep invariant (INC-008-extended) covers `recipes/`; an explicit "no-write" test asserts `useProjectionStore` is never imported from `features/recipes/` |
| **R-008** Recipe directory layout mismatch between docs/31 prose and machine contract | LOW | Block 0 pins the layout in `docs/31` §Contents "Layout contract" subsection; the recipe loader enforces the layout (`recipe_loader.py::load()` raises `RecipeLayoutError` if a required file is missing) |
| **R-009** Recipe `recipeProfileAliasResolution` opt-in could conflict with `specs/profile-aliases.yaml` dereferencing | LOW | V1 ships a single opt-in flag (`enabled: true | false`); when enabled, the loader dereferences `{{ profiles.<alias-id> }}` per `specs/profile-aliases.yaml`; when disabled, the literal placeholder passes through; the round-trip oracle asserts the disabled-by-default behavior |
| **R-010** CLI `--param k=v` parsing for values containing `=` or spaces | LOW | The CLI uses `--params-file <json>` as the canonical path (no shell parsing); `--param k=v` is a convenience for simple key=value pairs; values containing `=` are rejected at parse time with a clear error |
| **R-011** Recipe `recipe.lock.json` drift (recipe changes without lock regeneration) | LOW | The recipe loader's `publish()` regenerates the lock on every recipe change; the validate script checks that every recipe has a `recipe.lock.json` matching its current SHA-256s; CI fails on mismatch |
| **R-012** Review budget 400 lines — M10.1 exceeds ~7.4× (~2970 LoC) | HIGH | Same size-exception pattern as m14/m15/m16: 6 atomic per-block commits (~860 LoC max for Block 3); review per commit; A-lite 6-block ceiling NOT exceeded (Block PF is pre-flight); recorded natural split line (Split i = Blocks 0+1 = recipe schema + bundled recipe; Split ii = Blocks 2+3 = Python core + TS mirror; Split iii = Blocks 4+F = tests + CI + closeout) for orchestrator override |
| **R-013** Doc-update obligation adds ~140 LoC across 6+ docs (m15/m16 precedent first-class directive) | HIGH | Block F dedicated closeout; one task per doc + oracle verifying substantive change (not no-op); `MANIFEST.json` regen follows m13/m14/m15/m16 precedent |
| **R-014** Python CLI entry-point collision with `narrative` package on PyPI | LOW | The CLI's Python package name is `narrative-cli` (hyphen); the importable module name is `narrative_cli` (underscore); the entry point script name is `narrative` (matches docs/16); pip-installable but the source is in-pack under `tools/narrative-cli/`; no PyPI publication in m10-1 |
| **R-015** `vite preview` smoke test for `/create` may not match Chromium-only behavior | LOW | The wizard's `FileSystemAccessSink` is gated by capability detection (`if ('showDirectoryPicker' in window)`); the `DownloadPlanSink` is always available; the smoke test only asserts the route renders + the wizard form appears (no write operation) |

## Rollback Plan

This is content + tooling change with no runtime state. Per the A-lite contract:

1. Every block lands as its own commit:
   - Block PF: `chore(sddk): m10-1-pf-preflight-resolved-versions` (writes `$CA/resolved-versions.json`; no tracked source mutation)
   - Block 0: `feat(recipes): schema-refinement-bundled-recipe-lock-generator`
   - Block 1: `feat(python): narrative-recipes-core-fixtures-tests`
   - Block 2: `feat(python): narrative-cli-init-plan-subcommands`
   - Block 3: `feat(control-plane): create-route-recipes-feature-extension`
   - Block 4: `test(control-plane): recipe-roundtrip-template-wizard-specs`
   - Block F: `docs(control-plane): creation-recipes-glossary-stack-roadmap-cli-readme-closeout` + `chore(manifest): regen-m10-1-entries`
2. Released under tag `v0.9.0` (MINOR bump per semver for incremental control-plane slice + new tooling surface); release notes link to `UAT-M10-04` evidence (`recipe-roundtrip.spec.ts` PASS + `recipe-template-engine.spec.ts` PASS + `narrative init` end-to-end smoke + canonical-JSON-equality PASS).
3. **Full rollback**: `git revert v0.8.0..v0.9.0` — or `--no-commit <first>..<last>` for selective revert.
4. **Partial rollback**: each block revertible independently. Block 0's recipe schema refinement + bundled recipe + lock generator are removable without affecting Blocks 1–F (the lock is generated, not authored). Block 1's Python core is removable without affecting Blocks 2+3 (the Python core is independent). Block 2's CLI is removable without affecting Block 3 (the wizard can emit plans for later manual execution). Block 3's wizard + feature folder + route are removable without affecting Blocks 0+1+2+4+F. Block 4's tests are removable without affecting Blocks 0–3+F. Block F's doc/MANIFEST updates are removable without affecting Blocks 0–4.
5. **No remote dependency**: no CI integration to undo, no DB migration (Dexie OUT per m10 invariant), no telemetry backend, no Orama collator framework, no remote recipe fetch.
6. **No spec-pack mutation** beyond the additive `creation-recipe.schema.json` refinement: rollback never reverts `docs/`, `specs/`, `examples/`, `uat/`, `templates/` (the refined `creation-recipe.schema.json` is the SAME file with additive keys; the bundled recipe lives in NEW `recipes/`; the doc updates in Block F are post-pack surface updates, not schema mutations).

## Dependencies

- **Baseline** `9289b61` (one commit past orchestrator-stated `89629f2`; the single commit `9289b61` is the `chore(roadmap): serialize m10.1 creation-recipes cycle as in_progress` roadmap marker — **NOT** a content change to be respected; the proposal baseline is `9289b61`).
- **17 schemas** in `specs/` (16 existing + the additive refinement to `creation-recipe.schema.json`); **0 existing schemas are broken** (additive-only); the new `recipe.lock.json` is generated content, not a schema.
- **Slice-1 surfaces** (m14 v0.6.0) — `control-plane/` workspace, `ProjectSource` port, `SnapshotProjectSource`, Ajv 8.20.0 setup, TanStack Router, 6 placeholder views, 5 Vitest specs, golden corpus — all consumed.
- **Slice-2 surfaces** (m15 v0.7.0) — Extension Registry module, feature folders (`features/{story,visual,catalog,continuity}/`), `entityRef` helpers, catalog routes — all consumed; the `features/recipes/` folder is the 6th additive feature folder.
- **Slice-3a surfaces** (m16 v0.8.0) — Search + safe Narrative Docs + Decision projection, `kind: 'docs'` discriminator pattern on `EntityTabExtension`, INC-008-fix grep invariant — all consumed; the `RecipeWidgetExtension` mirrors the `kind: 'docs'` additive-discriminator pattern.
- **`docs/28-CONTROL-PLANE-STACK.md` baseline** (Vite 8.1/8.2.2 / React 19.2.8 / TanStack Router / Tailwind 4.3 / Zustand / Ajv 8.20.0 / Vitest 4.1.11 / `react-markdown`/`rehype-sanitize`/`remark-gfm`/`unist-util-visit` exact pins) — locked at proposal time; **RJSF 6.8.x + ajv-cli exact pins** added in Block PF pre-flight (M14 D3 ladder).
- **`docs/31-CREATION-RECIPES.md`** (recipe contents + security model + recipe catalog + acceptance) — authoritative for M10.1 surface.
- **`docs/30-CONTROL-PLANE-EXTENSIONS.md`** (`RecipeWidgetExtension` listed but not registered; compile-time registry; no dynamic remote code) — authoritative for the `RecipeWidgetExtension` shape (additive; no new `apiVersion`).
- **`docs/16-CLI.md`** (`narrative init` listed in primary commands; exit code table for `check`; JSON-first agent interface) — authoritative for the CLI surface; the `init` command becomes a documented command with V1 flag set + exit codes + `--json`.
- **`docs/04-DOMAIN-MODEL.md`** / `docs/13-CONTROL-PLANE.md` §"Creation Recipes" — authoritative for the "same recipe drives CLI + wizard" invariant.
- **`ADR-023`** (declarative recipes; same recipe drives CLI + wizard; not a generic WorkflowIR) — authoritative for the architectural shape.
- **`specs/profile-aliases.yaml`** + `ADR-005` (project-local) + `ADR-009` (profiles) — authoritative for `recipeProfileAliasResolution` opt-in.

## Key Decisions (mirror of decision matrix above, for `key_decisions` envelope field)

| Topic | Choice | Justification |
|---|---|---|
| Wizard host | **Option B (File System Access API in CP) + Option C (CLI companion)** | Honors no-write-CP invariant (writes target user-selected dir, NOT loaded projection); preserves "same recipe drives both UIs" invariant (ADR-023); uses existing filesystem primitive (`DirectoryProjectSource` from m14); no server, no SSR |
| Recipe directory layout | **Confirm `docs/31` § Contents + `recipe.lock.json` additive** | Pin reproducibility handle (UAT-M10-04 prerequisite); minimal drift from `docs/31` prose |
| Skeleton templating | **Mustache-subset (deterministic, safe)** | Honors `examples/creation-recipe-middle-grade.yaml:42` precedent (`{{ audience }}`); rules out every known XSS vector via forbidden list; shared Python+TS implementation enforces round-trip equivalence |
| CLI command surface | **`narrative init` flag set + exit codes + `--json` + `narrative plan` companion** | Matches `docs/16` §"Primary commands" + §"JSON-first agent interface" + §"check" exit code table precedent |
| Round-trip equivalence | **Canonical-JSON-equality + skeleton-bytes SHA-256** | Standard RFC 8785 subset; structural property (shared Python+TS core) rather than tested coincidence; catches file-content drift without depending on filesystem ordering |
| Initial recipe scope | **2 characters + 3 chapters + 1 profile + print-pdf + local_preferred** | Matches `docs/31` §"Example flow" exactly; minimum coherent skeleton that demonstrates round-trip oracle |
| CI guards | **tsc 0 + Vitest N/N + Vite build + ajv-cli recipe validation + pytest** | M14/m15/m16 precedent (tsc/Vitest/Vite); new gates specific to M10.1 (ajv-cli recipe validation + pytest for Python core) |

## Success Criteria (exit criteria tying to UAT-M10-04)

- [ ] `UAT-M10-04` Given clause satisfied: `recipes/middle-grade-illustrated/recipe.yaml` validates against `specs/creation-recipe.schema.json` AND the refined schema accepts the existing `examples/creation-recipe-middle-grade.yaml` as a valid recipe.
- [ ] `UAT-M10-04` When clause satisfied: `narrative init --recipe middle-grade-illustrated --param title='Test' --param projectId='test' --param audience='profile-middle-grade-10-11' --out /tmp/test` exits 0; the CP wizard at `/create` renders the same form fields from `recipe.parameters` + `recipe.uiHints`.
- [ ] `UAT-M10-04` Then clause satisfied: the manifest produced by the CLI and the manifest produced by the wizard (downloaded as `create-plan.json` and consumed via `narrative init --plan <file>`) are **canonical-JSON byte-equal** for the recipe-owned fields (`manifest.audience.profile`, `manifest.format`, `manifest.publishing`, `project.profiles`, `project.packs`, `project.skills`, `project.publishingTargets`, `initialGoals`).
- [ ] `UAT-M10-04` Pass clause satisfied: the `recipe-roundtrip.spec.ts` Vitest spec + the `test_roundtrip.py` pytest file both PASS with 0 failures, asserting canonical-JSON equivalence on the rendered manifest + skeleton-bytes SHA-256 equivalence on the rendered skeleton.
- [ ] M10 invariants all hold: serverless (no fetch in DevTools); no Dexie/IndexedDB/Orama introduced; `useProjectionStore` is read-only inside `features/recipes/`; RJSF + ajv-cli exact pins in `control-plane/package.json`; `vite build` produces static `dist/`; `specs/creation-recipe.schema.json` refinement is additive-only (semver MINOR-compatible); round-trip equivalence is structural (shared Python+TS core).
- [ ] `tsc --noEmit -p control-plane/tsconfig.json` exits 0.
- [ ] `pnpm --filter control-plane test` passes N/N (including the 3 NEW specs).
- [ ] `pnpm --filter control-plane build` succeeds; `control-plane/dist/index.html` exists.
- [ ] `python -m pytest tools/narrative-recipes/tests/ tools/narrative-cli/tests/` passes N/N.
- [ ] `python tools/validate-recipes/validate.py` exits 0 for every recipe under `recipes/**/recipe.yaml`.
- [ ] `vite preview` against `control-plane/` serves `/create` and renders the wizard without JS errors.
- [ ] `narrative init --recipe middle-grade-illustrated --param ... --out /tmp/test` produces a project tree matching `recipes/middle-grade-illustrated/skeleton/`.
- [ ] DevTools Network panel shows zero outbound application-API requests after `/create` load (serverless invariant).

## Open Questions (forwarded to design/spec phase)

1. **RJSF 6.8.x peer compatibility**: Block PF will verify exact compatibility with React 19.2.8 (peer range may have tightened since `docs/28` baseline). If incompatible, the fallback is a minimal hand-rolled JSON-Schema-driven form (smaller surface, no RJSF dependency). The fallback is documented as the "no-RJSF" path.
2. **`ajv-cli` Python vs Node**: there are multiple `ajv-cli` implementations. The proposal defaults to `ajv-cli` (Node) for the validate script; if a Python equivalent is preferred, `pyproject.toml` will pin `ajv-py` instead.
3. **File System Access API browser-share in target audience**: if the audience skews heavily toward Firefox/Safari, the `DownloadPlanSink` becomes the primary path; the `FileSystemAccessSink` becomes a progressive enhancement. V1 ships both; telemetry on which sink is used lands in a future cycle.
4. **Recipe catalog page scope**: when M10.2 lands, the `recipes/` directory becomes browsable in the CP catalog. V1 ships `recipes/middle-grade-illustrated/` only; future recipes land with M10.2.
5. **CLI distribution**: in m10-1, the CLI is in-pack under `tools/narrative-cli/`. Future cycles may publish it to PyPI; for V1, users `pip install -e tools/narrative-cli` (editable install) or invoke it directly via `python -m narrative_cli`.

## Recommended Next Step

**`sddk-spec`**: author the SDDK spec for `creation-recipe-system` (NEW) and `recipe-schema-v1` (MODIFIED additive) from this proposal. The spec phase will:
1. Translate the 7 decision points into concrete behavioral scenarios.
2. Author the `create-plan.json` JSON Schema (NEW file in `specs/` — additive per AC-INV-schema).
3. Author the `recipe.lock.json` JSON Schema (NEW file — additive).
4. Pin the mustache-subset grammar in a new `specs/recipe-template-grammar.spec.ts` (TypeScript BNF-style spec).
5. Document the round-trip equivalence oracle contract in `specs/recipe-equivalence-oracle.spec.json` (NEW file — additive).

The proposal does NOT block spec phase; all 7 decision points have explicit chosen paths; all m10 invariants are honored; the cycle is ready for `sddk-spec` to deepen the contract surface.
