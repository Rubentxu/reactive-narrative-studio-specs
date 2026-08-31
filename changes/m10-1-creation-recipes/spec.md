# m10-1-creation-recipes — Creation Recipes (M10.1 — RJSF wizard + CLI `narrative init` with round-trip equivalence) — Delta Spec

## Source

- **Proposal SHA-256**: `b94bfc36…` (`changes/m10-1-creation-recipes/proposal.md`, 606 LoC, committed `d21955c` on `feat/m10-1-creation-recipes`).
- **Roadmap anchor**: `docs/19-ROADMAP.md` § M10.1 ("recipe schema; RJSF wizard; same recipe consumable by CLI; initial middle-grade illustrated recipe") and § Exit ("Wizard and CLI create semantically equivalent project manifests/skeletons").
- **Conceptual design**: `docs/31-CREATION-RECIPES.md` (recipe contents + security model + recipe catalog).
- **ADR binding**: [[ADR-023]] (Creation Recipes replace server-side scaffolding — declarative JSON-Schema-driven; same recipe drives CLI and Control Plane wizard; not a generic runtime WorkflowIR; no arbitrary scripts).
- **Stack binding**: `docs/28-CONTROL-PLANE-STACK.md` §"Schema-driven recipe forms" (RJSF 6.8.x + AJV8 validator) and §"Filesystem access" (`ProjectSourcePort` + `DirectoryProjectSource` progressive enhancement over File System Access API + mandatory `SnapshotProjectSource` fallback).
- **Illustrative seed**: `examples/creation-recipe-middle-grade.yaml` (`schema: creation-recipe/v1`, profile alias dereference pattern `{{ audience }}` at line 42).
- **Existing schema**: `specs/creation-recipe.schema.json` (V1 envelope; `metadata` + `parameters` + `project` + optional `initialGoals`; `additionalProperties: false`; `schema: "creation-recipe/v1"` const).
- **Cycle**: `p-7c4aff45199a2069/m10-1-creation-recipes` (A-lite; design step SKIPPED — spec IS the contract for apply; branch `feat/m10-1-creation-recipes`).
- **Path**: A-lite, execution mode `auto`; **version target**: v0.9.0 (MINOR).
- **Capability IDs (2 NEW + 1 MODIFIED, names reused verbatim from proposal §"Capabilities")**: `creation-recipe-system` (NEW), `recipe-wizard-feature` (NEW), `recipe-schema-v1` (MODIFIED — additive evolution of `specs/creation-recipe.schema.json`).
- **Binding exit criterion**: `uat/UAT-M10-04-creation-recipe.md` ("One Creation Recipe, CLI and UI") — Given the `middle-grade-illustrated` recipe; When the same answers are supplied to (1) the CLI and (2) the Control Plane recipe wizard; Then both outputs normalize to equivalent — project manifest, selected profiles, packs, skills, publishing targets. **Pass = "Semantic diff is empty for recipe-owned fields"**.
- **Test baseline (must remain green)**: 15 m16 vitest spec files (extension-isolation + extension-registry + catalog-store + entity-page-composition + ajv + app + cp-decisions-schema + decision-projection.schema-fixtures + docs-sanitization + loader.diagnostics + loader.snapshot + loader.snapshot.extension + routes-router + schema-fixtures + search-index); final count grows by ≥ 3 new specs (`recipe-roundtrip.spec.ts` + `recipe-template-engine.spec.ts` + `recipe-wizard.feature.spec.ts`) + 1 extended spec (`extension-isolation.spec.ts`).

## Purpose

M10.1 closes the binding gate `uat/UAT-M10-04-creation-recipe.md` on the m15 v0.7.0 + m16 v0.8.0 baseline. Slice 1 (m14) shipped the projection loader, 5 placeholder views, and the serverless SPA shell. Slice 2 (m15) shipped the catalog store + Extension Registry + entity pages + 8-tab composition. Slice 3a (m16) shipped Local Search + safe Narrative Docs + Decision projection + Markdown entity-doc rendering. **M10.1 ships the Creation Recipes capability**: a unified wizard + CLI surface driven by `recipes/<id>/recipe.yaml` + `parameters.schema.json` + `skeleton/`. The wizard renders in the existing CP static SPA at `/create`; the CLI is the canonical-for-agents path. Both consume the SAME recipe; round-trip equivalence is a STRUCTURAL property (shared Python+TypeScript core) rather than a tested coincidence. The bundled `recipes/middle-grade-illustrated/` recipe ships as the V1 canonical fixture.

After this delta:

1. **`creation-recipe-system` (NEW)** — recipe directory layout contract (`recipes/<id>/{recipe.yaml, parameters.schema.json, ui.schema.json, skeleton/, recipe.lock.json, README.md}`); the safe mustache-subset template engine (V1 grammar — Decision 3); the canonical-JSON-equality round-trip oracle (Decision 5); the V1 CLI command surface (`narrative init` flag set, exit codes, JSON output — Decision 4); the V1 wizard route + `RecipeWidgetExtension` (additive Extension Registry kind); the File System Access sink (Chromium) + Download sink (Firefox/Safari); the bundled `recipes/middle-grade-illustrated/` recipe (Decision 6 contents). Backing implementation: `tools/narrative-recipes/` (Python core) + `tools/narrative-cli/` (Python CLI entry point `narrative`) + `control-plane/src/recipes/` (TS mirror + wizard) + `control-plane/src/features/recipes/` (RJSF wizard feature folder). NO Dexie; NO IndexedDB; NO remote recipe fetch; NO mutation of CP's loaded projection state. RJSF `6.8.x` + `ajv-cli` exact pins resolved at apply per M14 D3 ladder.
2. **`recipe-wizard-feature` (NEW)** — Extension Registry wiring for the V1 RJSF wizard. NEW `RecipeWidgetExtension` interface (additive; `apiVersion: 'control-plane.extensions/v1'` preserved per [[ADR-022]]; matches the m16 `kind: 'docs'` discriminator pattern). NEW `features/recipes/` folder as the 6th independent feature folder (the existing m15+m16 grep invariant `from\s+['"]\.\./\.\./(story|visual|catalog|continuity|docs)/` is EXTENDED — INC-008 closure already in m16 — to add `recipes` to the prohibited-list). NEW `/create` TanStack Router route; F-004 oracle list updated (matches the m16 `/search` natural side-effect precedent).
3. **`recipe-schema-v1` (MODIFIED)** — `specs/creation-recipe.schema.json` gains three OPTIONAL top-level keys: `uiHints` (object, `additionalProperties: true` — wizard-only metadata), `publishing` (object, `additionalProperties: false`, optional properties `defaultTarget: string`, `options: string[]`), and `recipeProfileAliasResolution` (object, optional, governs alias dereferencing per `specs/profile-aliases.yaml`). The existing four REQUIRED keys (`schema`, `metadata`, `parameters`, `project`) are UNCHANGED. The `schema:` const `"creation-recipe/v1"` is UNCHANGED.

After this delta, `uat/UAT-M10-04-creation-recipe.md` is satisfied and the M10.1 closeout task in `docs/19-ROADMAP.md` §M10.1 advances to done.

---

## Capability: `creation-recipe-system` (NEW)

### Requirement: REQ-CR-1 — Recipe directory layout pinned as `recipes/<id>/{recipe.yaml, parameters.schema.json, ui.schema.json, skeleton/, recipe.lock.json, README.md, tests/}`

The system SHALL load a recipe from a directory that contains, at minimum: `recipe.yaml` (the recipe document), `parameters.schema.json` (Ajv 2020-12 schema for the recipe's user-supplied parameters), `ui.schema.json` (RJSF `uiSchema` for wizard presentation), and `skeleton/` (the templated filesystem tree using the mustache-subset micro-language per REQ-CR-3). The system SHALL additionally recognize the GENERATED file `recipe.lock.json` recording `{recipeYamlSha256, parametersSchemaSha256, skeletonFileShas256, generatorVersion}` as the reproducibility handle. The recipe MAY additionally contain `README.md` (recipe-driven starter docs) and `tests/` (round-trip equivalence oracle fixtures at the recipe level). **A missing required file SHALL surface a `RecipeLayoutError` diagnostic** BEFORE any Ajv validation runs; the recipe loader SHALL NOT proceed past the layout check. The `recipe.lock.json` file SHALL be regenerated by the loader's `publish()` function on every recipe change AND the validate script SHALL reject any recipe whose `recipe.lock.json` SHA-256s do not match the current recipe content.

#### Scenario: EVT-CR-1a — Loader rejects a recipe missing `recipe.yaml` with `RecipeLayoutError` BEFORE Ajv runs

- **GIVEN** `recipes/middle-grade-illustrated/recipe.yaml` is removed (or relocated to `recipes/middle-grade-illustrated/_missing/recipe.yaml`)
- **WHEN** a Vitest spec invokes `recipeLoader.load('middle-grade-illustrated', recipesRoot)` OR `python -c "from narrative_recipes.recipe_loader import load; load('middle-grade-illustrated')"`
- **THEN** the loader SHALL return a `Diagnostic` whose `code` is `'recipe-layout-error'` AND `message` references the missing `recipe.yaml` path
- **AND** the loader SHALL NOT invoke Ajv validation on a non-existent `recipe.yaml`
- **AND** `grep -cE 'recipe-layout-error' control-plane/src/recipes/recipeLoader.ts tools/narrative-recipes/recipe_loader.py` SHALL be `>= 2` (the diagnostic code is declared in both languages).

#### Scenario: EVT-CR-1b — Bundled `middle-grade-illustrated` recipe carries all 5 required files + `recipe.lock.json` matching current SHA-256s

- **GIVEN** apply Block 0 lands and `recipes/middle-grade-illustrated/` carries `recipe.yaml`, `parameters.schema.json`, `ui.schema.json`, `skeleton/`, `README.md`, `recipe.lock.json`, and `tests/test_roundtrip.yaml`
- **WHEN** a Vitest spec invokes `recipeLoader.load('middle-grade-illustrated', recipesRoot)`
- **THEN** the loader SHALL return a `RecipeBundle` carrying the recipe document + the parsed `parameters.schema.json` + the parsed `ui.schema.json` + the `skeleton/` file tree + the parsed `recipe.lock.json`
- **AND** `python tools/validate-recipes/validate.py recipes/middle-grade-illustrated/` SHALL exit `0` AND SHALL recompute SHA-256s and confirm `recipe.lock.json` matches
- **AND** when `recipe.lock.json` is REMOVED from the recipe, `recipeLoader.publish()` SHALL regenerate it with current SHA-256s.

### Requirement: REQ-CR-2 — Additive evolution of `specs/creation-recipe.schema.json` (3 new OPTIONAL top-level keys, existing 4 REQUIRED keys UNCHANGED)

The system SHALL extend `specs/creation-recipe.schema.json` (the V1 envelope; `schema: "creation-recipe/v1"` const; `additionalProperties: false` on the root) with three NEW OPTIONAL top-level keys:

- `uiHints` (`type: object`, `additionalProperties: true`) — wizard-only presentation metadata consumed by the RJSF adapter; NOT validated by Ajv; the wizard parses arbitrary keys under this object.
- `publishing` (`type: object`, `additionalProperties: false`, optional properties `defaultTarget: string`, `options: string[]`) — recipe-default publishing options surfaced by the wizard as a select widget.
- `recipeProfileAliasResolution` (`type: object`, `additionalProperties: false`, optional properties `enabled: boolean` (default `true`), `aliasesFile: string` (default `specs/profile-aliases.yaml`)) — governs alias dereferencing per `specs/profile-aliases.yaml`.

The four existing REQUIRED keys (`schema`, `metadata`, `parameters`, `project`) SHALL remain UNCHANGED. The `schema:` const `"creation-recipe/v1"` SHALL remain UNCHANGED (semver MINOR-compatible; no V2 bump). The seed `examples/creation-recipe-middle-grade.yaml` SHALL validate against the refined schema. The bundled `recipes/middle-grade-illustrated/recipe.yaml` SHALL validate against the refined schema. The refine SHALL be ADDITIVE-ONLY: no existing key SHALL be removed, renamed, type-changed, or constraint-tightened; NO `additionalProperties` change on existing keys.

#### Scenario: EVT-CR-2a — Refined schema accepts `examples/creation-recipe-middle-grade.yaml` AND bundled `recipes/middle-grade-illustrated/recipe.yaml`; rejects unknown top-level key

- **GIVEN** apply Block 0 lands and `specs/creation-recipe.schema.json` declares the three optional keys
- **WHEN** `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data examples/creation-recipe-middle-grade.yaml` is invoked AND `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/middle-grade-illustrated/recipe.yaml` is invoked
- **THEN** both Ajv validations SHALL exit `0`
- **AND** when a synthetic recipe `{"schema": "creation-recipe/v1", "metadata": {"id": "x", "title": "X"}, "parameters": {"type": "object"}, "project": {}, "unknown-key": "forbidden"}` is validated, Ajv SHALL reject it with `additionalProperties` error referencing `unknown-key`
- **AND** `git diff --stat HEAD~6..HEAD -- specs/*.schema.json` SHALL list EXACTLY `specs/creation-recipe.schema.json` as the ONLY modified schema (no other schema is touched).

#### Scenario: EVT-CR-2b — `uiHints` accepts arbitrary keys; `publishing` rejects unknown keys; `recipeProfileAliasResolution` defaults `enabled` to `true`

- **GIVEN** apply Block 0 lands
- **WHEN** a recipe declares `"uiHints": {"any-key": "any-value", "nested": {"deep": [1, 2, 3]}}` the Ajv validation SHALL pass (uiHints allows arbitrary keys per `additionalProperties: true`)
- **AND** when a recipe declares `"publishing": {"defaultTarget": "print-pdf", "options": ["print-pdf"], "unknownOption": true}` the Ajv validation SHALL fail with `additionalProperties` error referencing `unknownOption`
- **AND** when a recipe omits `recipeProfileAliasResolution`, the wizard SHALL default `enabled` to `true` AND `aliasesFile` to `specs/profile-aliases.yaml` (the loader substitutes defaults at parse time)
- **AND** when a recipe declares `"recipeProfileAliasResolution": {"enabled": false}` the loader SHALL NOT dereference profile aliases and SHALL pass `{{ audience }}` placeholders through verbatim.

### Requirement: REQ-CR-3 — Mustache-subset templating micro-language with deterministic substitution rules and explicit forbidden list

The system SHALL provide a pure `templateEngine.render(template: string, params: object): string` function in BOTH Python (`tools/narrative-recipes/template_engine.py`) AND TypeScript (`control-plane/src/recipes/templateEngine.ts`) implementing the following deterministic grammar:

- `{{var}}` — variable substitution; whitespace-trimmed; top-level parameter reference only (no `{{a.b.c}}`); rejected at parse time as `TemplateError`
- `{{#each items}}...{{/each}}` — iteration over an array parameter
- `{{#if flag}}...{{/if}}` — conditional on truthy parameter
- `{{! comment }}` — comment (stripped from output)

The following patterns SHALL be REJECTED at parse time as `TemplateError`: `{{> partial }}` (no partials), `{{{ raw }}}` (no raw HTML), `{{& unescaped }}` (no unescaped), function calls (e.g. `{{ upper(name) }}`), nested expressions (`{{ a.b.c }}`), custom delimiters, AND any `{{ ... }}` form containing a nested `{{` substring. The engine SHALL NOT execute scripts; SHALL NOT call `eval` or `exec`; SHALL NOT load files from disk. ALL substitutions SHALL be HTML/JSON-escaped by default (no XSS vector survives substitution). The shared 5-fixture corpus (`tools/narrative-recipes/tests/fixtures/mustache-subset/*.yaml`) drives BOTH implementations with identical inputs; both implementations SHALL produce identical canonical-JSON output for every fixture.

#### Scenario: EVT-CR-3a — `{{var}}` and `{{#each items}}` and `{{#if flag}}` and `{{! comment }}` render correctly across all 5 shared fixtures (Python + TS)

- **GIVEN** apply Blocks 1 + 3 land and `tools/narrative-recipes/tests/fixtures/mustache-subset/{variable,each,if,comment,error}.yaml` carry `{input, params, expected_output}` tuples
- **WHEN** `python -m pytest tools/narrative-recipes/tests/test_template_engine.py` is invoked AND `pnpm --filter control-plane test --run control-plane/test/recipe-template-engine.spec.ts` is invoked
- **THEN** both test suites SHALL pass with `5/5` fixtures satisfied in each language
- **AND** `canonicalJson(pythonRender) === canonicalJson(tsRender)` SHALL hold for every fixture (the round-trip oracle contract)
- **AND** `grep -cE 'eval|exec|subprocess|os\.system' tools/narrative-recipes/template_engine.py control-plane/src/recipes/templateEngine.ts` SHALL return `0` (no script execution vector).

#### Scenario: EVT-CR-3b — Forbidden patterns are rejected at parse time; nested `{{` is a hard error

- **GIVEN** apply Blocks 1 + 3 land
- **WHEN** the template `{{> partial}}` is fed to the engine AND the template `{{{ raw }}}` is fed AND the template `{{ a.b.c }}` is fed AND the template `{{ {{nested}} }}` is fed AND the template `{{ upper(name) }}` is fed
- **THEN** every input SHALL raise `TemplateError` whose `code` is one of `'forbidden-partial' | 'forbidden-raw' | 'forbidden-dotted-path' | 'forbidden-nested' | 'forbidden-function-call'`
- **AND** the rendered output SHALL NOT contain the forbidden token (no script survived substitution)
- **AND** `grep -cE 'TemplateError' tools/narrative-recipes/template_engine.py control-plane/src/recipes/templateEngine.ts` SHALL be `>= 4` (the typed error is declared).

### Requirement: REQ-CR-4 — `narrative init` CLI command (flag set, exit codes, JSON output, dry-run, idempotency)

The system SHALL provide a Python CLI `narrative init` (entry point `narrative` in `tools/narrative-cli/`) with the following flag set:

```text
narrative init --recipe <recipe-id> [--params-file <params.json> | --param k=v ...] --out <directory> [--dry-run] [--force] [--json] [--recipes-root <path>]
narrative init --plan <create-plan.json> --out <directory> [--dry-run] [--force] [--json]
```

`--params-file` and `--param` SHALL be mutually exclusive; `--recipe` and `--plan` SHALL be mutually exclusive; `--out` SHALL be required. The system SHALL validate the recipe against `specs/creation-recipe.schema.json` (Ajv) AND SHALL validate the user-supplied parameters against the recipe's `parameters.schema.json` (Ajv) BEFORE any filesystem write. Exit codes SHALL be: `0` success; `1` validation error (recipe or parameters); `2` conflict (target directory contains conflicting files — `--force` overwrites); `3` missing recipe (the `--recipe <id>` is not found in any `--recipes-root`); `4` internal error (template engine exception, filesystem error beyond EACCES). The `--json` flag SHALL emit canonical JSON to stdout of shape `{ ok: true, recipe: "<id>", recipeLockSha256: string, manifest: {...}, skeleton: [{path, sha256, bytes}], createPlanSha256: string }`. `--dry-run` SHALL print the plan WITHOUT touching the filesystem; `--force` SHALL overwrite conflicting files. The CLI SHALL emit a `create-plan.json` artifact under `<out>/.narrative/create-plan.json` recording the exact skeleton files produced + the resolved substitutions + the recipe lock digest.

#### Scenario: EVT-CR-4a — Happy path: `narrative init --recipe middle-grade-illustrated --param title='X' --param projectId='x' --param audience='profile-middle-grade-10-11' --out /tmp/x --json` exits 0 and emits canonical manifest + skeleton list

- **GIVEN** apply Blocks 0 + 2 land and `recipes/middle-grade-illustrated/` is committed + `tools/narrative-cli/` is installed (`pip install -e tools/narrative-cli`)
- **WHEN** the CLI is invoked with the parameters enumerated in the scenario above
- **THEN** exit code SHALL be `0` AND `/tmp/x/narrative.yaml` SHALL exist AND conform to `specs/project.schema.json` AND `/tmp/x/profiles/profile-middle-grade-10-11.yaml` SHALL exist AND `/tmp/x/canon/characters/<protagonist>.yaml` SHALL exist AND `/tmp/x/canon/chapters/01-opening.md` SHALL exist AND `/tmp/x/.narrative/create-plan.json` SHALL exist
- **AND** the `--json` stdout SHALL be valid canonical JSON carrying the `{ ok: true, recipe: "middle-grade-illustrated", manifest, skeleton[], createPlanSha256 }` shape
- **AND** `python -m pytest tools/narrative-cli/tests/test_cli.py::test_init_happy_path` SHALL exit `0`.

#### Scenario: EVT-CR-4b — Validation error exits with code 1 BEFORE any write; `--dry-run` does not write; `--force` overwrites; missing recipe exits with code 3

- **GIVEN** apply Blocks 0 + 2 land
- **WHEN** `narrative init --recipe middle-grade-illustrated --param title='X' --param projectId='INVALID PROJECT ID WITH SPACES' --param audience='profile-middle-grade-10-11' --out /tmp/x` is invoked (parameters fail `pattern: "^[a-z0-9][a-z0-9_-]*$"` validation)
- **THEN** exit code SHALL be `1` AND `/tmp/x/` SHALL NOT exist (no partial writes) AND stderr SHALL carry the Ajv pattern error referencing `projectId`
- **AND** when invoked with `--dry-run --out /tmp/x`, exit code SHALL be `0` AND `/tmp/x/` SHALL NOT exist AND the rendered manifest + skeleton list SHALL be printed to stdout
- **AND** when invoked with `--force --out /tmp/x` after a prior successful invocation, exit code SHALL be `0` AND the conflicting files SHALL be overwritten
- **AND** when invoked with `--recipe nonexistent-recipe --out /tmp/x`, exit code SHALL be `3` AND stderr SHALL carry `recipe-not-found: nonexistent-recipe`.

### Requirement: REQ-CR-5 — `narrative plan` companion CLI command (emits `create-plan.json` without writing the project tree)

The system SHALL provide a Python CLI `narrative plan --recipe <recipe-id> [--params-file <params.json> | --param k=v ...] [--out <directory>] [--json]` that emits a `create-plan.json` artifact WITHOUT writing the rendered skeleton to disk. The `--out` flag SHALL default to stdout. The plan SHALL encode the SAME manifest + skeleton list + recipe lock digest that `narrative init` would have written, packaged as canonical JSON. The `narrative init --plan <create-plan.json> --out <dir>` form SHALL consume the plan and reproduce the same project tree (round-trip via the plan artifact). The `narrative plan` command is the canonical-for-agents companion: an agent can run the wizard, download the plan, then run `narrative plan` to reproduce the wizard's output on a CI box.

#### Scenario: EVT-CR-5a — `narrative plan --json` emits canonical plan; `narrative init --plan <plan>` reproduces the project tree

- **GIVEN** apply Blocks 0 + 2 land
- **WHEN** `narrative plan --recipe middle-grade-illustrated --param title='X' --param projectId='x' --param audience='profile-middle-grade-10-11' --json` is invoked
- **THEN** exit code SHALL be `0` AND stdout SHALL be canonical JSON containing `{ recipe, recipeLockSha256, manifest, skeleton[], createPlanSha256 }` AND the createPlanSha256 SHALL be the SHA-256 of the canonical plan itself
- **AND** when the same plan is fed to `narrative init --plan /tmp/plan.json --out /tmp/x` then to `narrative init --recipe middle-grade-illustrated --param ... --out /tmp/y` (same parameters)
- **THEN** `equivalenceOracle.canonicalJsonEqual(stripRecipeOwned(/tmp/x), stripRecipeOwned(/tmp/y))` SHALL return `true` AND `sha256(sortByPath(skeletonFiles(/tmp/x))) === sha256(sortByPath(skeletonFiles(/tmp/y)))` (the plan-based and recipe-based invocations produce equivalent outputs)
- **AND** `python -m pytest tools/narrative-cli/tests/test_cli.py::test_plan_roundtrip` SHALL exit `0`.

### Requirement: REQ-CR-6 — Round-trip equivalence oracle (canonical-JSON equality + skeleton-bytes SHA-256; shared Python+TS test corpus)

The system SHALL provide an equivalence oracle `equivalenceOracle.canonicalJsonEqual(a, b): boolean` (Python + TypeScript) implementing the RFC 8785 JSON Canonicalization Scheme SUBSET (sorted keys, no insignificant whitespace, UTF-8, NFC-normalized). A wizard output and a CLI output SHALL be EQUIVALENT iff:

1. `canonicalJsonEqual(stripRecipeOwned(manifestWizard), stripRecipeOwned(manifestCLI)) === true` where `stripRecipeOwned` removes `createdAt` (timestamp) and other non-recipe-owned fields
2. For every path in the rendered skeleton, the SHA-256 of the file's bytes is identical between the two outputs
3. The recipe-owned field set is EXACTLY `{manifest.audience.profile, manifest.format, manifest.publishing, project.profiles, project.packs, project.skills, project.publishingTargets, initialGoals}` (per UAT-M10-04)

The oracle SHALL be backed by:

- `tools/narrative-recipes/tests/test_roundtrip.py` (pytest) — invokes Python loader + renderer; emits `out_python/`
- `control-plane/test/recipe-roundtrip.spec.ts` (Vitest) — invokes TS loader + renderer in headless mode; emits `out_ts/`
- A SHARED test corpus (`tools/narrative-recipes/tests/fixtures/mustache-subset/*.yaml` — 5 fixtures) AND `tools/narrative-recipes/tests/fixtures/recipe-equivalence/middle-grade-illustrated.yaml` (1 equivalence fixture) drive BOTH implementations with identical inputs.

The assertion is: `canonicalJson(stripRecipeOwned(manifest_python)) === canonicalJson(stripRecipeOwned(manifest_ts))` AND `sha256(sortByPath(skeleton_python)) === sha256(sortByPath(skeleton_ts))`.

#### Scenario: EVT-CR-6a — Equivalence oracle: same parameters → same canonical-JSON output (Python and TS produce byte-equal canonical form for the bundled recipe)

- **GIVEN** apply Blocks 1 + 3 land and `tools/narrative-recipes/tests/fixtures/recipe-equivalence/middle-grade-illustrated.yaml` carries `{parameters: {title: "X", projectId: "x", audience: "profile-middle-grade-10-11"}, expected_manifest_subset, expected_skeleton_paths}` AND `recipes/middle-grade-illustrated/` is committed
- **WHEN** the pytest invokes Python `projectRenderer.render(recipe, parameters)` AND the Vitest spec invokes TS `projectRenderer.render(recipe, parameters)`
- **THEN** `canonicalJson(stripRecipeOwned(manifest_python)) === canonicalJson(stripRecipeOwned(manifest_ts))` SHALL be `true` (byte-equal)
- **AND** the sorted SHA-256 list of skeleton files SHALL be identical between Python and TS
- **AND** `pnpm test --run control-plane/test/recipe-roundtrip.spec.ts` SHALL exit `0` AND `python -m pytest tools/narrative-recipes/tests/test_roundtrip.py` SHALL exit `0`.

#### Scenario: EVT-CR-6b — Timestamps and non-recipe-owned fields are excluded from equivalence; arrays preserve order

- **GIVEN** apply Block 1 lands
- **WHEN** two manifests differ ONLY in `createdAt` (different timestamps) AND are otherwise byte-identical for recipe-owned fields
- **THEN** `canonicalJsonEqual(stripRecipeOwned(manifest_a), stripRecipeOwned(manifest_b))` SHALL return `true` (timestamps excluded)
- **AND** when the `project.packs` array order differs (`["story_core", "characters"]` vs `["characters", "story_core"]`) the oracle SHALL return `false` (array order is recipe-owned)
- **AND** `grep -cE 'RFC 8785|canonicalize|JCS' tools/narrative-recipes/equivalence_oracle.py control-plane/src/recipes/equivalenceOracle.ts` SHALL be `>= 1` (the canonical-JSON contract is documented in source).

### Requirement: REQ-CR-10 — Initial `recipes/middle-grade-illustrated/` recipe (2 characters + 3 chapters + 1 profile + print-pdf + local_preferred)

The system SHALL ship a bundled recipe `recipes/middle-grade-illustrated/` whose skeleton contains:

- `narrative.yaml` — manifest per `specs/project.schema.json` (substituted via mustache-subset)
- `profiles/profile-middle-grade-10-11.yaml` — resolved from `specs/profile-aliases.yaml`
- `canon/characters/<protagonist>.yaml` — 1 placeholder character (user fills in name)
- `canon/characters/<deuteragonist>.yaml` — 1 placeholder character
- `canon/chapters/01-opening.md` — placeholder chapter skeleton
- `canon/chapters/02-incident.md` — placeholder chapter skeleton
- `canon/chapters/03-resolution.md` — placeholder chapter skeleton
- `packs/story_core/story_intake.md`, `packs/characters/character_design.md`, `packs/editorial/editorial_pass.md`, `packs/visual_core/visual_bible_seed.md` — 4 pack instruction stubs
- `goals.yaml` — `initialGoals: [establish-story-bible, establish-main-cast, outline-story]`
- `README.md` — recipe-driven starter docs

The recipe SHALL declare (per `parameters.schema.json`): `title: string`, `projectId: string` (pattern `^[a-z0-9][a-z0-9_-]*$`), `audience: enum[middle-grade-8-9, middle-grade-9-10, profile-middle-grade-10-11, middle-grade-11-12]` (default `profile-middle-grade-10-11`), `imagePolicy: enum[local_only, local_preferred, hybrid, saas_allowed]` (default `local_preferred`), `genre: enum[fantasy, mystery, adventure, realistic]` (default `fantasy`), `outputLanguage: string` (default `es-ES`). The `ui.schema.json` SHALL declare RJSF widget overrides: `audience` as a radio group, `imagePolicy` as a select, `genre` as a checkbox group, `outputLanguage` as a select. The `publishing` key SHALL declare `{ defaultTarget: "print-pdf", options: ["print-pdf"] }`.

#### Scenario: EVT-CR-10a — Bundled `middle-grade-illustrated` recipe validates against refined schema; skeleton matches Decision 6 contents; default parameters yield a renderable project

- **GIVEN** apply Block 0 lands and `recipes/middle-grade-illustrated/` carries all the files enumerated above
- **WHEN** `python tools/validate-recipes/validate.py recipes/middle-grade-illustrated/` is invoked
- **THEN** exit code SHALL be `0`
- **AND** `find recipes/middle-grade-illustrated/skeleton -type f | sort | wc -l` SHALL return `>= 12` (1 narrative.yaml + 1 profile + 2 characters + 3 chapters + 4 pack stubs + 1 goals.yaml)
- **AND** `grep -cE "^name:|^description:|^status:" recipes/middle-grade-illustrated/skeleton/canon/characters/<protagonist>.yaml` SHALL be `>= 1` (the character stub has at least one metadata field)
- **AND** `narrative plan --recipe middle-grade-illustrated --json` with default parameters SHALL produce a plan whose `skeleton[].path` list has length `>= 12` and whose `manifest.audience.profile` equals `profile-middle-grade-10-11`.

### Requirement: REQ-CR-11 — CI guards: tsc 0 + Vitest N/N + Vite build static + ajv-cli recipe validation + pytest shared-core tests

The system SHALL enforce the following CI gates on every PR:

1. `tsc --noEmit -p control-plane/tsconfig.json` exits `0` (TypeScript strict, no type errors)
2. `pnpm --filter control-plane test` (Vitest) passes `N/N` — the 15 m16 specs + 3 new specs (`recipe-roundtrip.spec.ts` + `recipe-template-engine.spec.ts` + `recipe-wizard.feature.spec.ts`) + 1 extended spec (`extension-isolation.spec.ts`) = 19 specs minimum
3. `pnpm --filter control-plane build` (Vite static build) succeeds; `control-plane/dist/index.html` exists; assets are content-hashed
4. `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data <recipe.yaml>` exits `0` for EVERY recipe under `recipes/**/recipe.yaml` (recursive; the build fails on any invalid recipe); implemented as `tools/validate-recipes/validate.py`
5. `python -m pytest tools/narrative-recipes/tests/` passes N/N (Python core tests — loader, template engine, parameter validator, project renderer, equivalence oracle)
7. `python -m pytest tools/narrative-cli/tests/` passes N/N (CLI command tests)
8. `pnpm --filter control-plane preview & curl http://localhost:4173/create` smoke: the `/create` route renders without JS errors (m14 serverless invariant holds — no fetch)

#### Scenario: EVT-CR-11a — Every CI gate exits 0 on the post-apply tree; 19 Vitest specs pass; ajv-cli validates every bundled recipe; pytest passes both Python packages

- **GIVEN** apply Blocks 0+1+2+3+4 land
- **WHEN** the `just check` (or equivalent) recipe is invoked AND `python tools/validate-recipes/validate.py` is invoked
- **THEN** `tsc --noEmit -p control-plane/tsconfig.json` SHALL exit `0` AND `pnpm --filter control-plane test` SHALL pass with `19/19` specs (or higher) AND `pnpm --filter control-plane build` SHALL succeed with `dist/index.html` present
- **AND** `python -m pytest tools/narrative-recipes/tests/ tools/narrative-cli/tests/` SHALL pass with `N/N`
- **AND** `python tools/validate-recipes/validate.py` SHALL exit `0` for the bundled `recipes/middle-grade-illustrated/recipe.yaml`
- **AND** `pnpm --filter control-plane preview` against `golden/control-plane/snapshot-valid/` SHALL serve `/create` returning HTTP `200` AND the HTML SHALL include the wizard form element.

### Requirement: REQ-CR-12 — Security: schema validation before any write; no script execution; no auto-install; external provider enabling requires explicit user action

The system SHALL enforce the following security invariants in BOTH the CLI and the wizard:

- The recipe SHALL be validated against `specs/creation-recipe.schema.json` (Ajv) BEFORE any filesystem write
- The user-supplied parameters SHALL be validated against the recipe's `parameters.schema.json` (Ajv) BEFORE any filesystem write
- The mustache-subset template engine (REQ-CR-3) SHALL NOT execute scripts, SHALL NOT call `eval` / `exec` / `subprocess` / `os.system`, SHALL NOT load files from disk, SHALL reject every known XSS / arbitrary-code vector (per the forbidden list in REQ-CR-3)
- The system SHALL NOT install npm or pip packages automatically as a side effect of recipe rendering
- The recipe's `imagePolicy` parameter SHALL select a default but SHALL NOT enable a SaaS provider; provider enablement is a separate project-state mutation that the runtime handles (M7 territory)
- The wizard's `FileSystemAccessSink` SHALL require explicit `window.showDirectoryPicker()` user-grant per session
- The wizard SHALL NOT mutate CP state: `useProjectionStore` is read-only inside `features/recipes/`

#### Scenario: EVT-CR-12a — Malicious recipe is rejected by Ajv; malicious template is rejected by template engine; external provider is NOT enabled by recipe render

- **GIVEN** apply Blocks 0+1+3 land
- **WHEN** `narrative init --recipe malicious-recipe-with-script-tag --out /tmp/x` is invoked with a synthetic recipe whose `recipe.yaml` contains a `<script>` tag in a description field (Ajv-allowed but XSS-bearing when echoed into narrative.yaml)
- **THEN** the recipe loader SHALL succeed (Ajv allows) BUT the template engine SHALL HTML-escape the `<script>` tag to `&lt;script&gt;` before writing to disk AND the rendered `/tmp/x/narrative.yaml` SHALL NOT contain a literal `<script>` element
- **AND** when a recipe template contains `{{ upper(name) }}` (forbidden function call) the template engine SHALL reject with `TemplateError('forbidden-function-call')` BEFORE any write
- **AND** when the recipe's `imagePolicy` parameter is `saas_allowed`, the rendered `narrative.yaml` SHALL carry the value `saas_allowed` as DATA but SHALL NOT enable any provider (no `saas` runtime flag set; provider enablement is a separate M7 concern)
- **AND** `grep -rE 'eval\(|exec\(|subprocess|os\.system' control-plane/src/features/recipes/ tools/narrative-recipes/ tools/narrative-cli/` SHALL return `0` (no script execution vector anywhere).

---

## Capability: `recipe-wizard-feature` (NEW)

### Requirement: REQ-CR-7 — RJSF wizard route (`/create`) + `RecipeWidgetExtension` wiring with `kind: 'recipe-wizard'` discriminator

The system SHALL register a NEW TanStack Router route `/create` (single-quoted `path: '/create'`, component `views/Create.tsx`) declared AFTER `/search` and AFTER `/entity/$kind/$namespace/$name` (per F-004 oracle ordering). The system SHALL extend `control-plane/src/extensions/types.ts` with a NEW additive `RecipeWidgetExtension` interface carrying `apiVersion: 'control-plane.extensions/v1'` (preserved verbatim per [[ADR-022]]) + `kind: 'recipe-wizard'` discriminator field + `targetKind?: string` + `priority: number` + `predicate: ExtensionPredicate` + `render(ctx): ReactNode`. The system SHALL register a single `RecipeWidgetExtension` named `CreateWizard` from `control-plane/src/features/recipes/index.tsx` against the existing Extension Registry. The `extension-isolation.spec.ts` grep invariant SHALL be EXTENDED to include `recipes` in the prohibited-folder list (matches the m15 INC-008 closure pattern + the m16 `docs` extension). The `routes.tsx` F-004 oracle list SHALL be extended with `path: '/create'` (matches the m16 `/search` natural side-effect precedent that closed INC-009).

#### Scenario: EVT-CR-7a — `/create` route registered in router.ts; `RecipeWidgetExtension` registered; `extension-isolation.spec.ts` finds 0 hits for `features/recipes/` cross-folder imports

- **GIVEN** apply Blocks 0 + 3 land and `control-plane/src/views/Create.tsx` + `control-plane/src/features/recipes/index.tsx` are committed
- **WHEN** `grep -nE "path:\s*'/create'" control-plane/src/routes/router.ts` is invoked
- **THEN** the line number SHALL be GREATER than the `/search` and `/entity/...` line numbers (route ordering preserved per F-004)
- **AND** `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/extensions/types.ts control-plane/src/features/recipes/index.tsx` SHALL be `>= 2` (the const literal is preserved)
- **AND** `grep -cE "kind:\s*'recipe-wizard'" control-plane/src/extensions/types.ts control-plane/src/features/recipes/index.tsx` SHALL be `>= 2` (the discriminator is declared and set on the registration)
- **AND** `pnpm test --run control-plane/test/extension-isolation.spec.ts` SHALL exit `0` with the grep oracle extended to cover `recipes/` (5 of 5 source folders produce 0 hits) AND the spec SHALL additionally assert that `grep -rE "from\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs|recipes)/" control-plane/src/features/` returns `0` matches (relative-escape oracle extended per INC-008 closure).

#### Scenario: EVT-CR-7b — F-004 oracle list extended; `routes.tsx` array length grows from 7 to 8; `useProjectionStore` is NOT imported from `features/recipes/`

- **GIVEN** apply Block 3 lands
- **WHEN** `grep -cE "path:\s*'/.*'" control-plane/src/routes/routes.tsx` is invoked
- **THEN** stdout SHALL be `8` (was 7 in m16; +1 for `/create`)
- **AND** `grep -cE "path:\s*'/create'" control-plane/src/routes/routes.tsx` SHALL be `>= 1`
- **AND** `grep -cE "path:\s*'/search'|path:\s*'/catalog'|path:\s*'/entity" control-plane/src/routes/routes.tsx` SHALL remain at the m16 baseline count (no m15/m16 entries removed; additive only)
- **AND** `grep -rE "useProjectionStore" control-plane/src/features/recipes/` SHALL return `0` matches (the wizard does NOT mutate CP state).

### Requirement: REQ-CR-8 — `FileSystemAccessSink` writes via File System Access API with explicit user-grant; no CP state mutation

The system SHALL provide `control-plane/src/features/recipes/FileSystemAccessSink.ts` exposing `write(plan: CreatePlan, handle: FileSystemDirectoryHandle): Promise<Diagnostic<{ written: SkeletonFile[], createPlanSha256: string }>>`. The sink SHALL use `FileSystemDirectoryHandle.getFileHandle(path, { create: true }).createWritable()` to write each skeleton file (LF line endings, UTF-8, no trailing whitespace). The sink SHALL require explicit `window.showDirectoryPicker()` user-grant per session (the wizard MUST detect capability via `if ('showDirectoryPicker' in window)` before invoking the sink). The sink SHALL NOT mutate CP state: the `handle` is a USER-SELECTED directory handle acquired at the wizard's "Choose target directory" step; the writes target ONLY that directory; `useProjectionStore` is NEVER written by the sink. The sink SHALL write a `.narrative/create-plan.json` artifact at the target root recording the same `create-plan.json` shape the CLI consumes.

#### Scenario: EVT-CR-8a — `FileSystemAccessSink` writes skeleton files to user-selected directory; `create-plan.json` artifact is written; CP state is untouched

- **GIVEN** apply Block 3 lands and a Vitest spec mocks `window.showDirectoryPicker` AND mocks `FileSystemDirectoryHandle.getFileHandle().createWritable()`
- **WHEN** the spec invokes `FileSystemAccessSink.write(plan, mockHandle)` with a plan containing 5 skeleton files
- **THEN** `mockHandle.getFileHandle` SHALL be called `>= 6` times (5 skeleton files + `.narrative/create-plan.json`)
- **AND** every written file SHALL be UTF-8 encoded with LF line endings AND no trailing whitespace
- **AND** the sink SHALL return a `Diagnostic` whose `ok` is `true` AND whose `value` carries `{ written: SkeletonFile[], createPlanSha256 }`
- **AND** `grep -cE "useProjectionStore|setState|\.set\(" control-plane/src/features/recipes/FileSystemAccessSink.ts` SHALL return `0` (no CP state mutation)
- **AND** `grep -cE "showDirectoryPicker" control-plane/src/features/recipes/FileSystemAccessSink.ts` SHALL be `>= 1` (capability detection is present).

### Requirement: REQ-CR-9 — `DownloadPlanSink` fallback for Firefox/Safari (no File System Access API)

The system SHALL provide `control-plane/src/features/recipes/DownloadPlanSink.ts` exposing `write(plan: CreatePlan, filename: string): Promise<Diagnostic<{ downloadUrl: string }>>`. The sink SHALL emit the plan as a browser download via `URL.createObjectURL(blob)` + `<a download>` element click. The sink SHALL be the FALLBACK when `'showDirectoryPicker' in window` evaluates to `false` (Firefox/Safari). The downloaded file SHALL be `create-plan.json` (canonical JSON, indented for human review). The user runs `narrative init --plan <downloaded-plan.json> --out <dir>` on their local machine to materialize the project tree.

#### Scenario: EVT-CR-9a — `DownloadPlanSink` emits `create-plan.json` download; CLI consumes the downloaded plan and reproduces the project tree

- **GIVEN** apply Blocks 2 + 3 land and a Vitest spec mocks `URL.createObjectURL` and the `HTMLAnchorElement.click` invocation
- **WHEN** the spec invokes `DownloadPlanSink.write(plan, 'create-plan.json')`
- **THEN** `URL.createObjectURL` SHALL be called with a `Blob` whose type is `'application/json'` AND whose body is the canonical JSON of the plan
- **AND** the anchor's `download` attribute SHALL be `'create-plan.json'`
- **AND** when the user runs `narrative init --plan <downloaded-plan.json> --out /tmp/x` on a separate process, exit code SHALL be `0` AND `/tmp/x/narrative.yaml` SHALL exist AND `/tmp/x/.narrative/create-plan.json` SHALL exist (round-trip via download plan + CLI)
- **AND** the round-trip output SHALL satisfy the equivalence oracle (REQ-CR-6a).

---

## Capability: `recipe-schema-v1` (MODIFIED)

> (Previously: V1 NEW — `specs/creation-recipe.schema.json` envelope with `metadata` + `parameters` + `project` + optional `initialGoals`; `additionalProperties: false`; `schema: "creation-recipe/v1"` const.)

### Requirement: REQ-CR-2 (MODIFIED) — `specs/creation-recipe.schema.json` gains 3 OPTIONAL top-level keys (`uiHints`, `publishing`, `recipeProfileAliasResolution`); existing 4 REQUIRED keys unchanged

The system SHALL modify `specs/creation-recipe.schema.json` to ADD three OPTIONAL top-level keys: `uiHints` (`{ type: object, additionalProperties: true }`), `publishing` (`{ type: object, additionalProperties: false, properties: { defaultTarget: { type: string }, options: { type: array, items: { type: string } } } }`), and `recipeProfileAliasResolution` (`{ type: object, additionalProperties: false, properties: { enabled: { type: boolean, default: true }, aliasesFile: { type: string, default: "specs/profile-aliases.yaml" } } }`). The existing four REQUIRED keys (`schema`, `metadata`, `parameters`, `project`) SHALL remain UNCHANGED. The `schema:` const `"creation-recipe/v1"` SHALL remain UNCHANGED. The seed `examples/creation-recipe-middle-grade.yaml` SHALL validate against the refined schema. The bundled `recipes/middle-grade-illustrated/recipe.yaml` SHALL validate against the refined schema. **ADDITIVE-ONLY**: no existing key SHALL be removed, renamed, type-changed, or constraint-tightened.

(Previously: V1 envelope; `additionalProperties: false` at root; no `uiHints`, no `publishing`, no `recipeProfileAliasResolution`.)

#### Scenario: EVT-RSV-01 — Refined schema accepts the seed AND the bundled recipe AND 3 negative fixtures; existing keys unchanged

- **GIVEN** apply Block 0 lands and the three new optional keys are added to `specs/creation-recipe.schema.json`
- **WHEN** `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data examples/creation-recipe-middle-grade.yaml` is invoked AND `python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data recipes/middle-grade-illustrated/recipe.yaml` is invoked
- **THEN** both Ajv validations SHALL exit `0`
- **AND** a synthetic recipe omitting `metadata.title` SHALL fail Ajv (existing required-key enforcement preserved)
- **AND** a synthetic recipe declaring `{"schema": "creation-recipe/v2"}` SHALL fail Ajv (existing const enforcement preserved)
- **AND** `git diff --stat HEAD~6..HEAD -- specs/creation-recipe.schema.json` SHALL show ONLY additive changes (3 new optional keys; no removal/rename/type-change/constraint-tightening).

#### Scenario: EVT-RSV-02 — `uiHints` accepts arbitrary keys; `publishing` rejects unknown keys; `recipeProfileAliasResolution` defaults to safe

- **GIVEN** apply Block 0 lands
- **WHEN** a recipe declares `"uiHints": {"anyArbitraryKey": "anyValue", "deeply": {"nested": ["a", "b"]}}` the Ajv validation SHALL pass (`uiHints` has `additionalProperties: true`)
- **AND** a recipe declaring `"publishing": {"defaultTarget": "print-pdf", "unknownOption": true}` SHALL fail Ajv with `additionalProperties` error referencing `unknownOption` (`publishing` has `additionalProperties: false`)
- **AND** a recipe declaring `"recipeProfileAliasResolution": {"enabled": false}` SHALL pass; when the loader processes this recipe, `{{ audience }}` placeholders SHALL pass through verbatim (no alias dereferencing)
- **AND** when `recipeProfileAliasResolution` is omitted, the loader SHALL default `enabled` to `true` AND `aliasesFile` to `"specs/profile-aliases.yaml"`.

---

## M10 Invariant Compliance Map

Every m10 invariant declared in `docs/19-ROADMAP.md` §M10 is honored by the REQ clauses enumerated below. The map is exhaustive (6 invariants × REQ pointers).

| m10 invariant | How honored | Spec clause |
|---|---|---|
| **serverless / no-fetch** | Wizard uses File System Access API (browser-native) + local JSON files via `import.meta.glob`; CLI is a local Python script. NO `fetch(`, no telemetry, no remote schema. `vite preview` smoke test asserts the wizard renders with zero outbound application-API requests after `/create` load. | REQ-CR-7 (route + wizard host) + REQ-CR-8 (FileSystemAccessSink is browser-native) + REQ-CR-9 (DownloadPlanSink is browser-native) + REQ-CR-11 (CI gate #7 vite preview smoke) + REQ-CR-12 (security: no script execution, no remote fetch) |
| **no Dexie / IndexedDB / Orama** | N/A declaration: the wizard does NOT introduce any persistent client-side store. Recent target directories (V1 deferred — no V1 wizard persists recent targets) is `localStorage` (browser-native, NOT IndexedDB). No Orama collator. The search index (m16) is in-memory; the recipe loader is in-memory. Reaffirmed by the load-bearing EVT-CR-7a grep oracle (no `useProjectionStore` mutation) + the load-bearing EVT-CR-12a grep oracle (no `eval` / `exec` / `subprocess`). | REQ-CR-7 (`useProjectionStore` is NOT imported from `features/recipes/`) + REQ-CR-12 (no script execution anywhere) |
| **no-write Control Plane** | The wizard's `features/recipes/` does NOT import `useProjectionStore`. The wizard's only writes are to a USER-SELECTED `FileSystemDirectoryHandle` (a directory the user explicitly grants) or to a browser download blob. The CLI writes to a user-specified `--out` directory (filesystem). Neither path mutates the loaded `ProjectionBundle`. | REQ-CR-7 (`useProjectionStore` is read-only inside `features/recipes/`) + REQ-CR-8 (`FileSystemAccessSink` writes only to user-selected `handle`; never `useProjectionStore`) + REQ-CR-9 (`DownloadPlanSink` writes only to browser blob) |
| **exact dependency pins** | RJSF + ajv-cli pinned EXACT at apply per M14 D3 ladder (Block PF pre-flight). Existing `control-plane/package.json` pins remain (Vite 8.2.2, React 19.2.8, TanStack Router, Tailwind 4.3, Ajv 8.20.0, Vitest 4.1.11). `tools/narrative-cli/pyproject.toml` pins `click` (or `typer`) + `pydantic` + `pyyaml` + `ajv` (Python) EXACT. `pyproject.toml` for `narrative-recipes` pins EXACT. NO caret (`^`) or tilde (`~`) in any version constraint for the new dependencies. | REQ-CR-11 (CI gate #1 enforces tsc 0; the resolved versions are recorded in `cycle-artifacts/p-7c4aff45199a2069/m10-1-creation-recipes/resolved-versions.json`) |
| **static build** | `vite build` produces a static `dist/` bundle. The Python CLI is a SEPARATE runtime (not bundled into the SPA). The wizard's sinks (FileSystemAccessSink + DownloadPlanSink) are pure browser APIs — no server required. | REQ-CR-11 (CI gate #3 enforces `pnpm --filter control-plane build` succeeds; `control-plane/dist/index.html` exists; assets are content-hashed) |
| **additive-only schema evolution** | `specs/creation-recipe.schema.json` adds 3 OPTIONAL top-level keys (`uiHints`, `publishing`, `recipeProfileAliasResolution`); existing 4 REQUIRED keys unchanged; `schema:` const unchanged. NO `additionalProperties` change on existing keys. NO existing schema in `specs/` other than `creation-recipe.schema.json` is modified. | REQ-CR-2 (refined schema clause: ADDITIVE-ONLY) + REQ-CR-2 (MODIFIED capability: scenario EVT-RSV-01 enforces git diff stat scope) |

---

## Acceptance Criteria

The following acceptance criteria MUST be satisfied for `uat/UAT-M10-04-creation-recipe.md` Pass clause. Each criterion is numerically testable.

### AC-M10-04-1 — Round-trip equivalence (the binding Pass clause)

**Given** the bundled `recipes/middle-grade-illustrated/recipe.yaml` AND the same parameter set `{title: "Test", projectId: "test", audience: "profile-middle-grade-10-11", imagePolicy: "local_preferred", genre: "fantasy", outputLanguage: "es-ES"}` AND `equivalenceOracle.canonicalJsonEqual(a, b)` is implemented per REQ-CR-6

**When** (1) `narrative init --recipe middle-grade-illustrated --param title='Test' --param projectId='test' --param audience='profile-middle-grade-10-11' --param imagePolicy='local_preferred' --param genre='fantasy' --param outputLanguage='es-ES' --out /tmp/cli-out --json` is invoked AND (2) the same parameters are entered into the CP wizard at `/create` (verified via headless Vitest spec that drives `CreateWizard.render()` with the parameter values + then `FileSystemAccessSink.write(plan, mockHandle)` to a mock handle yielding `/tmp/wiz-out`)

**Then** `equivalenceOracle.canonicalJsonEqual(stripRecipeOwned(/tmp/cli-out/narrative.yaml), stripRecipeOwned(/tmp/wiz-out/narrative.yaml)) === true` AND `sha256(sortByPath(find /tmp/cli-out -type f -not -path '*/.narrative/*')) === sha256(sortByPath(find /tmp/wiz-out -type f -not -path '*/.narrative/*'))`

### AC-M10-04-2 — Recipe schema validates bundled recipe + seed + 3 negative fixtures

`python -m ajv.cli validate --schema specs/creation-recipe.schema.json --data examples/creation-recipe-middle-grade.yaml` exits `0` AND the same validate against `recipes/middle-grade-illustrated/recipe.yaml` exits `0` AND the 3 negative fixtures (missing `metadata.title`, declaring `"schema": "creation-recipe/v2"`, declaring an unknown top-level key) each fail with Ajv errors AND `git diff --stat HEAD~6..HEAD -- specs/creation-recipe.schema.json` shows ONLY additive changes (no removals/renames/type-changes/constraint-tightening).

### AC-M10-04-3 — Mustache-subset template engine passes 5-fixture corpus in both languages

`python -m pytest tools/narrative-recipes/tests/test_template_engine.py` exits `0` with 5 fixtures PASS AND `pnpm --filter control-plane test --run control-plane/test/recipe-template-engine.spec.ts` exits `0` with 5 fixtures PASS AND `canonicalJson(python_render) === canonicalJson(ts_render)` for every fixture AND `grep -rE 'eval\(|exec\(|subprocess|os\.system' tools/narrative-recipes/template_engine.py control-plane/src/recipes/templateEngine.ts` returns `0` matches.

### AC-M10-04-4 — CI guards all green on post-apply tree

`tsc --noEmit -p control-plane/tsconfig.json` exits `0` AND `pnpm --filter control-plane test` exits `0` with `19/19` specs (or higher) AND `pnpm --filter control-plane build` succeeds with `dist/index.html` present AND `python -m pytest tools/narrative-recipes/tests/ tools/narrative-cli/tests/` exits `0` AND `python tools/validate-recipes/validate.py` exits `0` AND `pnpm --filter control-plane preview` against `golden/control-plane/snapshot-valid/` serves `/create` returning HTTP `200`.

### AC-M10-04-5 — m10 invariants all hold

DevTools Network panel shows zero outbound application-API requests after `/create` load (serverless invariant) AND `grep -rE 'dexie|indexeddb|orama' control-plane/src/features/recipes/ tools/narrative-recipes/ tools/narrative-cli/` returns `0` matches (no Dexie/IndexedDB/Orama) AND `grep -rE 'useProjectionStore\.setState|\.set\(' control-plane/src/features/recipes/` returns `0` matches (no CP state mutation) AND RJSF + ajv-cli are pinned EXACT in `control-plane/package.json` (no caret/tilde) AND `pnpm --filter control-plane build` produces a static `dist/` (no SSR, no server actions) AND `specs/creation-recipe.schema.json` refinement is additive-only (semver MINOR-compatible).

---

## Invariant Preservation

All 11 project invariants from `milestones/m1-onboard-2026-08-28.md` L28–50 are preserved unchanged. The m12 + m13 + m14 + m15 + m16 invariants (`AC-INV-schema`, `AC-INV-serverless`, `AC-INV-no-write`, `AC-INV-no-Dexie`, `AC-INV-extension-isolation`, `AC-INV-API-version`, `AC-INV-static-build`, `AC-INV-test-baseline`, `AC-INV-doc-discipline`, `AC-INV-rdd`) are **preserved and extended**:

- `AC-INV-schema` — preserved; `specs/creation-recipe.schema.json` is the ONLY modified schema; 3 additive optional keys; no REMOVALS, RENAMES, TYPE CHANGES, or CONSTRAINT TIGHTENING. Re-asserted via REQ-CR-2 + EVT-CR-2a + EVT-RSV-01.
- `AC-INV-serverless` — preserved; the wizard uses File System Access API (browser-native); the CLI is local Python; no `fetch(`, no telemetry, no remote schema. Re-asserted via REQ-CR-7 + REQ-CR-8 + REQ-CR-9 + REQ-CR-11.
- `AC-INV-no-write` — preserved AND extended; the wizard's only writes are to a user-selected directory handle; the CLI writes to a user-specified `--out` directory; neither path mutates the loaded projection. Re-asserted via REQ-CR-7 + REQ-CR-8 + REQ-CR-9 + EVT-CR-7b.
- `AC-INV-no-Dexie` — preserved; the wizard does NOT introduce persistent client-side storage; recent target directories (V1 deferred) will be `localStorage` (NOT IndexedDB). Re-asserted via REQ-CR-7 + REQ-CR-12.
- `AC-INV-extension-isolation` — preserved AND extended; `features/recipes/` is the 6th independent feature folder; the m16 INC-008 closure grep oracle is EXTENDED to cover `recipes/`; the F-004 oracle list extends by `/create`. Re-asserted via REQ-CR-7 + EVT-CR-7a + EVT-CR-7b.
- `AC-INV-API-version` — preserved; `RecipeWidgetExtension.apiVersion: 'control-plane.extensions/v1'` is unchanged; `kind: 'recipe-wizard'` is additive metadata. Re-asserted via REQ-CR-7 + EVT-CR-7a.
- `AC-INV-static-build` — preserved; `pnpm build` produces static `dist/`; size recorded in Block F (no gate). Re-asserted via REQ-CR-11.
- `AC-INV-test-baseline` — preserved; the 15 m16 vitest specs remain green; final count grows by ≥ 3 new specs + 1 extended spec. Re-asserted via REQ-CR-11 + EVT-CR-11a.
- `AC-INV-doc-discipline` — preserved; Block F mandatory closeout across `docs/{16,19,27,28,31}-*.md` + `README.md` + `MANIFEST.json` regen. First-class per launch packet directive.
- `AC-INV-rdd` — preserved; cli-receipts.jsonl argv/exit_code recorded per SC-POL-1 (in apply phase).

The new invariants introduced by this cycle:

| Invariant | Source | Enforcement |
|---|---|---|
| Recipe directory layout pinned at `recipes/<id>/{recipe.yaml, parameters.schema.json, ui.schema.json, skeleton/, recipe.lock.json, README.md, tests/}` | REQ-CR-1 | EVT-CR-1a + EVT-CR-1b |
| Refined schema is ADDITIVE-ONLY (3 optional keys; existing 4 REQUIRED unchanged) | REQ-CR-2 | EVT-CR-2a (git diff stat) + EVT-RSV-01 |
| Mustache-subset grammar forbidden list rejects every XSS / arbitrary-code vector | REQ-CR-3 | EVT-CR-3a (5-fixture corpus) + EVT-CR-3b (forbidden patterns) + EVT-CR-12a (no `eval`/`exec`/`subprocess` in source) |
| `narrative init` exit codes 0–4 per Decision 4; `--json` emits canonical manifest + skeleton list | REQ-CR-4 | EVT-CR-4a (happy path) + EVT-CR-4b (error paths) |
| `narrative plan` emits `create-plan.json` consumed by `narrative init --plan` | REQ-CR-5 | EVT-CR-5a (plan + plan-based invocation) |
| Round-trip equivalence oracle (canonical-JSON + skeleton SHA-256) holds across Python and TS | REQ-CR-6 | EVT-CR-6a (byte-equal canonical form) + EVT-CR-6b (timestamp/order semantics) |
| `RecipeWidgetExtension` registered; `/create` route registered; `extension-isolation.spec.ts` extended for `recipes/` | REQ-CR-7 | EVT-CR-7a (registration) + EVT-CR-7b (F-004 oracle extension) |
| `FileSystemAccessSink` writes via File System Access API with explicit user-grant; no CP state mutation | REQ-CR-8 | EVT-CR-8a (write to mock handle; no `useProjectionStore`) |
| `DownloadPlanSink` fallback for Firefox/Safari | REQ-CR-9 | EVT-CR-9a (browser download + CLI round-trip) |
| Bundled `middle-grade-illustrated` recipe (2 chars + 3 chapters + 1 profile + print-pdf + local_preferred) | REQ-CR-10 | EVT-CR-10a (skeleton match + default parameters renderable) |
| CI guards all green: tsc 0 + Vitest 19/19 + Vite build + ajv-cli + pytest | REQ-CR-11 | EVT-CR-11a (every gate exits 0) |
| Security: schema validation before any write; no script execution; no auto-install; external provider enabling requires explicit user action | REQ-CR-12 | EVT-CR-12a (no `eval`/`exec`/`subprocess` in source) |

---

## Open Questions (forwarded to apply phase)

1. **RJSF 6.8.x peer compatibility with React 19.2.8** — Block PF will verify exact compatibility (peer range may have tightened since `docs/28` baseline). If incompatible, the fallback is a minimal hand-rolled JSON-Schema-driven form (smaller surface, no RJSF dependency).
2. **`ajv-cli` Python vs Node** — proposal defaults to `ajv-cli` (Node) for the validate script; if a Python equivalent is preferred, `pyproject.toml` will pin `ajv-py` instead.
3. **File System Access API browser-share** — if the audience skews heavily toward Firefox/Safari, `DownloadPlanSink` becomes the primary path; `FileSystemAccessSink` becomes a progressive enhancement. V1 ships both; telemetry on which sink is used lands in a future cycle.
4. **Recipe catalog page scope** — when M10.2 lands, the `recipes/` directory becomes browsable in the CP catalog. V1 ships `recipes/middle-grade-illustrated/` only; future recipes land with M10.2.
5. **CLI distribution** — in m10-1, the CLI is in-pack under `tools/narrative-cli/`. Future cycles may publish it to PyPI; for V1, users `pip install -e tools/narrative-cli` (editable install) or invoke it directly via `python -m narrative_cli`.

---

## Next Recommended

`A-lite` path — design phase SKIPPED. Spec IS the contract for apply. **`sddk-tasks`** to decompose Blocks PF + 0 + 1 + 2 + 3 + 4 + F into implementation work units. Acceptance gates for apply phase:

- All 12 REQ-IDs (REQ-CR-1 through REQ-CR-12) MUST pass before archive.
- Block PF commits first as `chore(sddk): m10-1-pf-preflight-resolved-versions` (no tracked source mutation; writes `cycle-artifacts/p-7c4aff45199a2069/m10-1-creation-recipes/resolved-versions.json`).
- Block 0 commits as `feat(recipes): schema-refinement-bundled-recipe-lock-generator` (~360 LoC across ~1 modified + ~12 new + 1 generator; includes additive schema refinement + bundled recipe + lock generator).
- Block 1 commits as `feat(python): narrative-recipes-core-fixtures-tests` (~580 LoC across ~5 new modules + ~10 fixtures + ~6 test files).
- Block 2 commits as `feat(python): narrative-cli-init-plan-subcommands` (~480 LoC across ~7 new files + pyproject.toml).
- Block 3 commits as `feat(control-plane): create-route-recipes-feature-extension` (~860 LoC across ~12 new + ~4 modified + 2 dep pins; includes RJSF wizard + 2 sinks + `RecipeWidgetExtension` + F-004 oracle update + INC-008 extended for `recipes/`).
- Block 4 commits as `test(control-plane): recipe-roundtrip-template-wizard-specs` (~520 LoC across ~3 new TS specs + ~3 new pytest files + 1 validate script + 1 CI doc).
- Block F commits as `docs(control-plane): creation-recipes-glossary-stack-roadmap-cli-readme-closeout` + `chore(manifest): regen-m10-1-entries` (~140 LoC across 6 doc edits + MANIFEST regen).
- Baseline 15 m16 vitest spec files MUST remain green; final count grows to ≥ 19 vitest specs across 19 spec files.
- A-lite 6-block ceiling NOT exceeded (Block PF is pre-flight, not a production block); recorded natural split line for orchestrator override: Split i = Blocks 0+1 = recipe schema + bundled recipe + Python core; Split ii = Blocks 2+3 = Python CLI + TS mirror + wizard; Split iii = Blocks 4+F = tests + CI + closeout.