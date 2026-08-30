# cp-foundation — Control Plane Foundation slice 1 — Delta Spec (5 NEW capabilities)

## Source

- **Proposal SHA-256**: `d2f1f9748f82fa14d0b79003fa8ca03e28bfdd9d1657ec329dc0ff860dcb73ac` (`changes/cp-foundation/proposal.md`, 244 LoC; cycle artifact `art-d2f1f9748f82-61f6a672`).
- **Explore-report SHA-256**: `a07e42755d07813b4399fae311ba62cde2da8ac305206e742a1dcbe2bbc24318` (`cycle-artifacts/p-7c4aff45199a2069/m14-cp-foundation/explore-report.md`, 518 LoC, C3, gates G1–G8 PASS, hypothesis HOLDS, Option B recommended).
- **Cycle**: `p-7c4aff45199a2069/m14-cp-foundation` (A-lite, branch `feat/m14-cp-foundation-2026-08-30`, base `3d1176e`).
- **Path**: A-lite; **version target**: v0.6.0 (MINOR — `control-plane/` is net-new product surface).
- **Capability IDs (all 5 NEW, reused verbatim from proposal §"Capabilities")**: `control-plane-shell`, `projection-loader-port`, `schema-validation-pipeline`, `golden-fixture-corpus`, `serverless-app-shell`. No MODIFIED capabilities.
- **Affected surfaces** (from proposal `production_surfaces`): `control-plane/{package.json,pnpm-workspace.yaml,pnpm-lock.yaml,tsconfig.json,vite.config.ts,index.html,.gitignore}`; `control-plane/src/{main.tsx,app/,loader/,schema/,diagnostics/,store/,routes/,views/}`; `control-plane/test/{loader.snapshot,loader.diagnostics,ajv,schema-fixtures}.spec.ts`; `golden/control-plane/{project-valid,project-invalid-schema,snapshot-valid}/`; root `.gitignore` (EXTEND additively); `MANIFEST.json` (regen, +control-plane/* + golden/control-plane/*); `tools/install-pnpm.sh` (new helper); `control-plane/README.md`.

## Purpose

m14 opens the M10 arc with **slice 1 only**: scaffold `control-plane/` as a static TypeScript/React SPA per `docs/28-CONTROL-PLANE-STACK.md`; implement a projection loader with `DirectoryProjectSource` + `SnapshotProjectSource`; validate catalog entities and projections against the 16 `specs/*.schema.json` schemas with **diagnostic-not-crash** on invalid input; ship a 6-fixture golden corpus per `docs/24-TESTING-GOLDEN-DATASET.md` §Schema fixtures; and prove end-to-end loading via a minimal app shell satisfying the core path of `uat/UAT-M10-01.md` (serverless loading — no application API calls, Overview/Story/Visual/QA/History views render from a loaded projection).

The m13 cycle retired the pack-only invariant and shipped the first post-pack-only `tools/` entry (`tools/sddk-pack-audit`). m14 extends that precedent into a second post-pack surface — `control-plane/` — but stays strictly read-only on tracked sources until apply. After this delta:

1. **`control-plane-shell`** — pins `engines.node >=24.0.0`, `packageManager pnpm@11.9.0`, exact-pinned versions for the 7 critical slice-1 deps; ships `tsconfig.json` strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`; ships `vite.config.ts` with the React plugin and **NO PWA plugin**; mounts `src/main.tsx` + `src/app/App.tsx` with provider tree + error boundary.
2. **`projection-loader-port`** — `ProjectSource` port + `SnapshotProjectSource` (mandatory, path-traversal guard per `docs/24` §Security) + `DirectoryProjectSource` (File System Access API progressive enhancement with snapshot fallback).
3. **`schema-validation-pipeline`** — Ajv 8 instance (`strict: true`, `allErrors: true`, JSON Schema 2020-12, known formats, no remote schema fetching) + lazy-compile registry keyed by `schema:` const + `Diagnostic<T>` shape `{ ok: true, data: T } | { ok: false, errors: AjvError[] }` that never throws on invalid input.
4. **`golden-fixture-corpus`** — minimum 6 fixtures under `golden/control-plane/` (`project-valid/`, `project-invalid-schema/`, `snapshot-valid/`) + an in-pack test fixture for path-traversal guard (not committed). Deferred families (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) listed in §"Out of Scope" per `docs/24` §Fixture expansion.
5. **`serverless-app-shell`** — 5 view components rendering from the loaded projection + 6 TanStack Router routes (`/`, `/overview`, `/story`, `/visual`, `/qa`, `/history`) consuming the Zustand store, NOT remote APIs. Satisfies `UAT-M10-01` core path: "Network panel shows no required application API request."

After this delta, the cycle's exit criteria from `docs/19-ROADMAP.md` M10 arc + `uat/UAT-M10-01.md` are partially satisfied at the slice-1 surface (serverless loading + invalid-fixture diagnostic + 5-view rendering); M10 exit as a whole remains open until slice N completes the catalog entity pages, extension registry, search, recipes, and graph lenses.

---

## Capability: `control-plane-shell`

### Requirement: REQ-CPS-1 — Runtime Pinned (`engines.node`, `packageManager`, exact-pinned deps, frozen-lockfile install)

The system SHALL declare its runtime as `engines.node: ">=24.0.0"` and its package manager as `packageManager: "pnpm@11.9.0"` in `control-plane/package.json`. The 7 critical slice-1 dependencies (Vite, React, TypeScript, TanStack Router, Tailwind, Zustand, Ajv) SHALL be pinned to exact versions with **no** `^` or `~` prefix. A `pnpm-lock.yaml` SHALL be committed. `pnpm install --frozen-lockfile` SHALL succeed on Node 24 LTS.

#### Scenario: EVT-CPS-01 — Engines field + exact-pinned deps + frozen-lockfile install succeed on Node 24 LTS

- **GIVEN** the apply phase lands Block A and Node 24 LTS is the active runtime
- **WHEN** `node --version` reports `v24.x.y` AND `pnpm --version` reports `11.9.x`
- **THEN** `jq '.engines.node, .packageManager' control-plane/package.json` SHALL output `">=24.0.0"` and `"pnpm@11.9.0"` (verbatim)
- **AND** `grep -cE '\^|~' control-plane/package.json` SHALL return `0` (no semver ranges in the 7 critical deps)
- **AND** `cd control-plane && pnpm install --frozen-lockfile` SHALL exit `0`
- **AND** `test -f control-plane/pnpm-lock.yaml` SHALL succeed
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cycle-artifacts/p-7c4aff45199a2069/m14-cp-foundation/cli-receipts.jsonl` in JSONL form `{"argv": ["pnpm","install","--frozen-lockfile"], "exit_code": 0, "command": "frozen-install", "timestamp": "..."}` per SC-POL-1.

### Requirement: REQ-CPS-2 — TypeScript strict + Vite build produces static `dist/`

The system SHALL compile with `tsconfig.json` enabling `strict: true`, `exactOptionalPropertyTypes: true`, and `noUncheckedIndexedAccess: true`. `pnpm build` SHALL produce a static `dist/` bundle (Vite 8.1 + React 19.2 plugin); the build script MUST NOT enable the PWA plugin.

#### Scenario: EVT-CPS-02 — `tsc --noEmit` strict-mode passes and `pnpm build` produces static `dist/`

- **GIVEN** the apply phase lands Block A with Vite 8.1 + React 19.2 + TypeScript strict toolchain
- **WHEN** `cd control-plane && pnpm exec tsc --noEmit` and `cd control-plane && pnpm build` are invoked
- **THEN** `jq '.compilerOptions.strict, .compilerOptions.exactOptionalPropertyTypes, .compilerOptions.noUncheckedIndexedAccess' control-plane/tsconfig.json` SHALL output `true`, `true`, `true` (verbatim)
- **AND** `pnpm exec tsc --noEmit` SHALL exit `0`
- **AND** `pnpm build` SHALL exit `0`
- **AND** `test -f control-plane/dist/index.html` SHALL succeed
- **AND** `grep -cE 'vite-plugin-pwa|workbox' control-plane/vite.config.ts` SHALL return `0` (no PWA plugin)
- **AND** the recorded argv/exit_code receipts SHALL be appended to `cli-receipts.jsonl` for both `tsc --noEmit` and `pnpm build` per SC-POL-1.

### Requirement: REQ-CPS-3 — Vitest test runner + minimal app shell + error boundary

The system SHALL include Vitest as the test runner (introducing the first in-tree test runner; the m2 capability node "no test runner present" is invalidated) and SHALL mount `src/main.tsx` (React 19.2 root) and `src/app/App.tsx` (provider tree + error boundary that catches any uncaught render exception and routes it to a diagnostic panel rather than crashing the SPA).

#### Scenario: EVT-CPS-03 — Vitest discovers at least 4 spec files and App.tsx exports an error boundary class

- **GIVEN** the apply phase lands Blocks A + E
- **WHEN** `cd control-plane && pnpm test --run` is invoked
- **THEN** `test -f control-plane/test/{loader.snapshot,loader.diagnostics,ajv,schema-fixtures}.spec.ts` SHALL succeed for all 4 spec files
- **AND** `pnpm test --run` SHALL exit `0` with `>= 4` spec files reported as run
- **AND** `grep -E 'componentDidCatch|ErrorBoundary' control-plane/src/app/App.tsx` SHALL match (error boundary present)
- **AND** `grep -E 'createRoot|from .react-dom/client.' control-plane/src/main.tsx` SHALL match (React 19.2 root mounted)
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cli-receipts.jsonl` per SC-POL-1.

---

## Capability: `projection-loader-port`

### Requirement: REQ-PLP-1 — `ProjectSource` port + `SnapshotProjectSource` implementation

The system SHALL expose a `ProjectSource` port with at minimum `discover()` and `load(projectId): Promise<Diagnostic<ProjectionBundle>>`; `refresh?()` is optional. `SnapshotProjectSource` SHALL be the mandatory implementation that reads projections from a `File` / `FileList` snapshot (per `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` §Snapshot format). The returned `ProjectionBundle` SHALL contain `{ project, chapters, characters, assets, uat, visualQuality, history }` keyed by their respective `schema:` const.

#### Scenario: EVT-PLP-01 — SnapshotProjectSource loads a valid projection bundle and exposes 7 schema-tagged projections

- **GIVEN** `golden/control-plane/snapshot-valid/` ships a `manifest.json` referencing a `projections/` directory with `cp-project`, `cp-chapters`, `cp-characters`, `cp-assets`, `cp-uat`, `cp-visual-quality`, `cp-history` files
- **WHEN** apply Block B lands and a Vitest spec invokes `new SnapshotProjectSource(...).load('snapshot-valid')`
- **THEN** the returned `Diagnostic<ProjectionBundle>` SHALL have `ok: true` and `data` SHALL contain 7 keys (`project`, `chapters`, `characters`, `assets`, `uat`, `visualQuality`, `history`)
- **AND** each projection SHALL carry its `schema:` const matching the file's filename family (e.g. `data.project.schema === "cp-project/v1alpha1"`)
- **AND** the Vitest spec `control-plane/test/loader.snapshot.spec.ts` SHALL exit `0`
- **AND** `grep -cE 'project|chapters|characters|assets|uat|visualQuality|history' control-plane/src/loader/SnapshotProjectSource.ts` SHALL return `>= 7` (bundle composition explicit in source).

### Requirement: REQ-PLP-2 — Path-traversal guard on `SnapshotProjectSource`

The system SHALL reject any snapshot entry whose path contains `..` segments or whose resolved absolute path is outside the snapshot root. The guard SHALL run BEFORE any file read; the loader SHALL return `Diagnostic` with `ok: false` and an `AjvError`-shaped error rather than throw, on guard violation.

#### Scenario: EVT-PLP-02 — Path-traversal attempts rejected without file read

- **GIVEN** an in-pack test fixture (NOT committed) constructs a `File` named `../../../etc/passwd` plus an absolute-path `File` like `/tmp/escape.json`
- **WHEN** the apply phase lands Block B and `new SnapshotProjectSource(...).load('malicious-snapshot')` is invoked
- **THEN** the loader SHALL return `Diagnostic` with `ok: false` and `errors[]` containing at least one entry whose `keyword` is `path-traversal` and whose `message` references the offending path
- **AND** the loader SHALL NOT throw (the call site SHALL remain interactive)
- **AND** `grep -cE '\.\.|path\.resolve|isAbsolute' control-plane/src/loader/SnapshotProjectSource.ts` SHALL return `>= 2` (guard logic explicit in source)
- **AND** the Vitest spec `control-plane/test/loader.diagnostics.spec.ts` SHALL exit `0`.

### Requirement: REQ-PLP-3 — `DirectoryProjectSource` with File System Access API + snapshot fallback

The system SHALL provide a `DirectoryProjectSource` that uses the File System Access API (`window.showDirectoryPicker`) when available (Chromium-family browsers) and falls back to the `SnapshotProjectSource` semantics for non-Chromium browsers. The fallback MUST be a code path, not a runtime error.

#### Scenario: EVT-PLP-03 — DirectoryProjectSource exports both code paths and snapshot fallback is wired

- **GIVEN** apply Block B lands
- **WHEN** `grep -E 'showDirectoryPicker|SnapshotProjectSource' control-plane/src/loader/DirectoryProjectSource.ts` is invoked
- **THEN** both `showDirectoryPicker` AND `SnapshotProjectSource` references SHALL match in source (progressive enhancement explicit)
- **AND** the loader SHALL NOT throw when `window.showDirectoryPicker` is `undefined` (non-Chromium guard verifiable by Vitest mock)
- **AND** the recorded Vitest run SHALL exit `0` and append a receipt per SC-POL-1.

---

## Capability: `schema-validation-pipeline`

### Requirement: REQ-SVP-1 — Ajv 8 instance (strict + allErrors + JSON Schema 2020-12 + no remote fetching)

The system SHALL instantiate Ajv 8 with `strict: true`, `allErrors: true`, JSON Schema 2020-12 dialect (`Ajv({ strict: true, allErrors: true })` plus `ajv/dist/2020`), and SHALL explicitly register any formats Ajv does not know by default. The Ajv instance SHALL NOT fetch remote schemas (no `$ref` to external URLs); it MAY resolve local `$ref` via `addSchema` from the in-repo `specs/*.schema.json` files.

#### Scenario: EVT-SVP-01 — Ajv instance is strict + allErrors + 2020-12 and no remote-schema loader registered

- **GIVEN** apply Block B lands and `control-plane/src/schema/ajv.ts` is committed
- **WHEN** `grep -cE 'strict: true|allErrors: true|2020|loadSchema|addSchema' control-plane/src/schema/ajv.ts` is invoked
- **THEN** the count SHALL be `>= 4` (strict, allErrors, 2020 dialect, addSchema — present and explicit)
- **AND** `grep -cE 'ajv-formats|addFormat' control-plane/src/schema/ajv.ts` SHALL be `>= 1` (format registration explicit)
- **AND** `grep -cE 'loadSchema|fetch\(|http' control-plane/src/schema/ajv.ts` SHALL be `0` (no remote fetching)
- **AND** `pnpm test --run control-plane/test/ajv.spec.ts` SHALL exit `0`.

### Requirement: REQ-SVP-2 — Schema registry lazy-compiled keyed by `schema:` const

The system SHALL provide a schema registry that compiles Ajv validators **lazily on first use**, keyed by the `schema:` const declared in each `specs/*.schema.json` (e.g. `cp-project/v1alpha1`, `catalog-entity/v1alpha1`, `control-plane-extension-config/v1`). Adding a new `schema:` const (e.g. `creation-recipe/v1` in slice N+) SHALL be a one-line addition to the registry.

#### Scenario: EVT-SVP-02 — Registry maps all 16 schemas by `schema:` const and lazy-compiles

- **GIVEN** apply Block B lands
- **WHEN** `jq -r '.["$id"], .properties.schema.const' specs/cp-project.schema.json specs/catalog-entity.schema.json specs/control-plane-extension.schema.json` is invoked and `grep -c 'schema:' control-plane/src/schema/registry.ts` is invoked
- **THEN** the registry source SHALL reference all 16 `$id`-bearing schemas (13 `cp-*` + `catalog-entity/v1alpha1` + `control-plane/v1` + `control-plane-extension-config/v1`)
- **AND** `grep -cE 'lazy|get\(|compile\(' control-plane/src/schema/registry.ts` SHALL be `>= 2` (lazy-compile pattern explicit)
- **AND** `pnpm test --run control-plane/test/schema-fixtures.spec.ts` SHALL exit `0` and exercise each `schema:` const against its golden fixture.

### Requirement: REQ-SVP-3 — `Diagnostic<T>` shape — never throws on invalid input

The system SHALL define `Diagnostic<T> = { ok: true, data: T } | { ok: false, errors: AjvError[] }` in `control-plane/src/diagnostics/types.ts`. The validator entry point SHALL return `Diagnostic` and SHALL NOT throw on invalid input (malformed JSON, schema mismatch, missing required fields).

#### Scenario: EVT-SVP-03 — Invalid cp-project input returns diagnostic-not-throw with AjvError[] carrying path + keyword + message

- **GIVEN** `golden/control-plane/project-invalid-schema/` ships `cp-project.missing-schema.json` whose payload violates `cp-project/v1alpha1`
- **WHEN** apply Block B lands and the registry validator is invoked against this fixture
- **THEN** the returned value SHALL match `{ ok: false, errors: AjvError[] }` (TypeScript-narrowed)
- **AND** `errors.length` SHALL be `>= 1`
- **AND** at least one error SHALL carry `instancePath`, `keyword`, and `message` fields
- **AND** the validator call SHALL NOT throw (verifiable by `expect(() => validate(payload)).not.toThrow()`)
- **AND** the Vitest spec `control-plane/test/loader.diagnostics.spec.ts` SHALL exit `0`.

---

## Capability: `golden-fixture-corpus`

### Requirement: REQ-GFC-1 — `project-valid/` corpus (1 NarrativeProject + 1 Character catalog entity + 5 valid cp-* projections)

The system SHALL commit `golden/control-plane/project-valid/` containing at minimum: one valid NarrativeProject, one Character catalog entity, and five valid `cp-*` projections (`cp-project`, `cp-chapters`, `cp-characters`, `cp-assets`, `cp-uat`). Every file SHALL carry a `schema:` const matching its filename family and SHALL pass its per-projection validator without diagnostics.

#### Scenario: EVT-GFC-01 — `project-valid/` fixture passes all five cp-* validators with `ok: true`

- **GIVEN** apply Block D lands
- **WHEN** `test -f golden/control-plane/project-valid/{narrative-project.yaml,character.yaml,cp-project.json,cp-chapters.json,cp-characters.json,cp-assets.json,cp-uat.json}` is invoked
- **THEN** every file SHALL exist
- **AND** `pnpm test --run control-plane/test/schema-fixtures.spec.ts` SHALL exit `0` and assert `diagnostic.ok === true` for all 5 cp-* projections
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cli-receipts.jsonl` per SC-POL-1.

### Requirement: REQ-GFC-2 — `project-invalid-schema/` corpus (cp-project.missing-schema.json)

The system SHALL commit `golden/control-plane/project-invalid-schema/cp-project.missing-schema.json` whose payload intentionally violates `cp-project/v1alpha1`. This fixture exists to prove the **diagnostic-not-crash** invariant of REQ-SVP-3.

#### Scenario: EVT-GFC-02 — `project-invalid-schema/` produces at least one AjvError and the SPA remains interactive

- **GIVEN** apply Block D lands and `golden/control-plane/project-invalid-schema/cp-project.missing-schema.json` is committed
- **WHEN** apply Block C lands and `vite preview` is invoked against a snapshot containing the invalid fixture
- **THEN** the loader SHALL return `Diagnostic` with `ok: false`, `errors.length >= 1`
- **AND** the SPA SHALL remain interactive (the error boundary SHALL render the diagnostic panel rather than unmount the React tree)
- **AND** `grep -c 'errors\[' control-plane/src/app/App.tsx` SHALL be `>= 1` (diagnostic panel rendering explicit)
- **AND** `pnpm test --run control-plane/test/loader.diagnostics.spec.ts` SHALL exit `0`.

### Requirement: REQ-GFC-3 — `snapshot-valid/` corpus (manifest.json + projections/) for SnapshotProjectSource

The system SHALL commit `golden/control-plane/snapshot-valid/` containing `manifest.json` plus a `projections/` directory with the seven cp-* files referenced by REQ-PLP-1. The manifest SHALL be the entry point for `SnapshotProjectSource.discover()`.

#### Scenario: EVT-GFC-03 — `snapshot-valid/` manifest resolves to 7 projections via SnapshotProjectSource

- **GIVEN** apply Block D lands
- **WHEN** `test -f golden/control-plane/snapshot-valid/{manifest.json,projections/cp-project.json,projections/cp-chapters.json,projections/cp-characters.json,projections/cp-assets.json,projections/cp-uat.json,projections/cp-visual-quality.json,projections/cp-history.json}` is invoked
- **THEN** all 8 files SHALL exist
- **AND** `pnpm test --run control-plane/test/loader.snapshot.spec.ts` SHALL exit `0` and assert the bundle has exactly 7 keys.

### Requirement: REQ-GFC-4 — Path-traversal guard verified against an in-pack (uncommitted) malicious-snapshot fixture

The system SHALL author an in-pack test fixture exercising the REQ-PLP-2 path-traversal guard. The fixture SHALL NOT be committed to `golden/control-plane/` (per `docs/24` §Security); it lives only inside `control-plane/test/loader.diagnostics.spec.ts` as inline data.

#### Scenario: EVT-GFC-04 — Malicious snapshot fixture triggers path-traversal guard with structured error

- **GIVEN** the in-pack test fixture exists in `control-plane/test/loader.diagnostics.spec.ts` (NOT committed under `golden/`)
- **WHEN** apply Block E lands and `pnpm test --run control-plane/test/loader.diagnostics.spec.ts` is invoked
- **THEN** the test SHALL assert the loader returns `Diagnostic` with `ok: false` and an error whose `keyword` matches `path-traversal`
- **AND** `git ls-files golden/control-plane/ | grep -E '\.\./|absolute'` SHALL return empty (no committed malicious fixture).

---

## Capability: `serverless-app-shell`

### Requirement: REQ-SAS-1 — 5 view components render from the loaded projection

The system SHALL ship five view components — `Overview.tsx` (renders `cp-project.project` + lifecycle + checks), `Story.tsx` (`cp-chapters.chapters`), `Visual.tsx` (`cp-assets.assets`), `QA.tsx` (`cp-uat.uat.runs` + `cp-visual-quality.status`), `History.tsx` (`cp-history`) — each reading from the Zustand store. Views SHALL NOT make `fetch` calls or instantiate HTTP clients.

#### Scenario: EVT-SAS-01 — Five view files exist and contain no `fetch`/HTTP-client references

- **GIVEN** apply Block C lands
- **WHEN** `test -f control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` is invoked
- **THEN** all 5 view files SHALL exist
- **AND** `grep -cE 'fetch\(|axios|XMLHttpRequest|http\.get|HttpClient' control-plane/src/views/*.tsx` SHALL return `0`
- **AND** `pnpm build` SHALL exit `0` (views compile and bundle).

### Requirement: REQ-SAS-2 — 6 TanStack Router routes consume Zustand, not remote APIs

The system SHALL register six routes (`/`, `/overview`, `/story`, `/visual`, `/qa`, `/history`) via TanStack Router. Route loaders SHALL read from the Zustand `projectionStore`; they SHALL NOT call the projection loader port directly or any remote API.

#### Scenario: EVT-SAS-02 — Six route paths registered and route loaders read from Zustand

- **GIVEN** apply Block C lands
- **WHEN** `grep -cE "path:\s*'/|path:\s*'/overview|path:\s*'/story|path:\s*'/visual|path:\s*'/qa|path:\s*'/history'" control-plane/src/routes/routes.tsx` is invoked
- **THEN** the count SHALL be `>= 6` (six route paths declared)
- **AND** `grep -cE 'useStore|projectionStore' control-plane/src/routes/routes.tsx` SHALL be `>= 1` (Zustand consumption by router)
- **AND** `pnpm build` SHALL exit `0`.

### Requirement: REQ-SAS-3 — Error boundary routes render exceptions to a diagnostic panel (never crashes SPA on malformed projection)

The system SHALL wrap the provider tree in `src/app/App.tsx` with an error boundary whose `componentDidCatch` (or function-component equivalent) routes the caught error to a diagnostic panel rendering the `Diagnostic<T>` shape. The SPA SHALL remain interactive after an error is caught.

#### Scenario: EVT-SAS-03 — App.tsx error boundary routes render exceptions to a diagnostic panel

- **GIVEN** apply Block C lands
- **WHEN** `grep -cE 'componentDidCatch|ErrorBoundary|diagnostic' control-plane/src/app/App.tsx` is invoked
- **THEN** the count SHALL be `>= 2` (boundary + diagnostic panel both present)
- **AND** `pnpm test --run control-plane/test/loader.diagnostics.spec.ts` SHALL exit `0` (the spec exercises boundary behaviour).

### Requirement: REQ-SAS-4 — Network panel shows zero outbound application-API requests after SPA load (UAT-M10-01 core path)

The system SHALL guarantee that, after `vite preview` serves the SPA and a user loads `golden/control-plane/snapshot-valid/`, the SPA SHALL make zero outbound application-API requests (only same-origin asset loads for `dist/*`). `control-plane/package.json` SHALL NOT declare telemetry, analytics, remote fonts, CDN, or runtime HTTP-client dependencies.

#### Scenario: EVT-SAS-04 — Zero remote dependencies in `package.json` and SPA renders 5 views from a loaded projection

- **GIVEN** apply Blocks C + F land and `vite preview` is invoked against `golden/control-plane/snapshot-valid/`
- **WHEN** `grep -cE 'telemetry|analytics|google-fonts|cdn\.|@sentry|datadog|axios|fetch-polyfill' control-plane/package.json control-plane/src/**/*.{ts,tsx}` is invoked
- **THEN** the count SHALL be `0`
- **AND** `cd control-plane && pnpm exec vite preview --port 4173` SHALL exit `0` (or run in background; the launch script SHALL record its argv/exit_code)
- **AND** the UAT-M10-01 acceptance ("Network panel shows no required application API request") SHALL hold
- **AND** `pnpm test --run` SHALL exit `0`.

---

## Acceptance Criteria Matrix

| AC | Block | Requirement(s) | Scenario(s) | Verification | Status |
|---|---|---|---|---|---|
| **AC-14.1** | A | REQ-CPS-1, REQ-CPS-2, REQ-CPS-3 | EVT-CPS-01..03 | `test -f changes/cp-foundation/{proposal,design,tasks,spec}.md`; `grep -cE 'control-plane-shell|projection-loader-port|schema-validation-pipeline|golden-fixture-corpus|serverless-app-shell' changes/cp-foundation/spec.md` returns `5` (all 5 capabilities declared verbatim) | Bash / deterministic |
| **AC-14.2** | A | REQ-CPS-1 | EVT-CPS-01 | `jq '.engines.node, .packageManager' control-plane/package.json` outputs `">=24.0.0"` and `"pnpm@11.9.0"`; `grep -cE '\^\|\~' control-plane/package.json` returns `0`; `cd control-plane && pnpm install --frozen-lockfile` exits `0` | jq + Bash |
| **AC-14.3** | A + E | REQ-CPS-2, REQ-CPS-3 | EVT-CPS-02, EVT-CPS-03 | `cd control-plane && pnpm build` exits `0`; `test -f control-plane/dist/index.html`; `pnpm test --run` exits `0` with `>= 4` spec files reported | Bash |
| **AC-14.4** | C | REQ-SAS-1, REQ-SAS-2, REQ-SAS-4 | EVT-SAS-01, EVT-SAS-02, EVT-SAS-04 | `cd control-plane && pnpm exec vite preview --port 4173` serves the SPA; all 5 view files render from loaded `snapshot-valid/` projection; UAT-M10-01 acceptance ("Network panel shows no required application API request") holds | Bash + manual / DevTools |
| **AC-14.5** | B + C | REQ-SVP-3, REQ-GFC-2, REQ-SAS-3 | EVT-SVP-03, EVT-GFC-02, EVT-SAS-03 | Loading `golden/control-plane/project-invalid-schema/cp-project.missing-schema.json` returns `Diagnostic` with `ok: false`, `errors.length >= 1`, and each error carries `instancePath`/`keyword`/`message`; SPA remains interactive; no console error escape | Vitest + Bash |
| **AC-14.6** | B | REQ-PLP-2, REQ-SVP-1, REQ-GFC-4 | EVT-PLP-02, EVT-SVP-01, EVT-GFC-04 | `grep -cE '\.\.\|path\.resolve\|isAbsolute' control-plane/src/loader/SnapshotProjectSource.ts` returns `>= 2`; `grep -cE 'loadSchema\|fetch\(http' control-plane/src/schema/ajv.ts` returns `0`; `pnpm test --run control-plane/test/loader.diagnostics.spec.ts` exits `0` | Bash + Vitest |
| **AC-14.7** | F | (regen) | (Block F) | Root `.gitignore` extended additively — Python + `.narrative/` + `assets/generated/candidates/` + `build/` entries preserved (verifiable by `git diff .gitignore`); `MANIFEST.json` regen includes `control-plane/*` + `golden/control-plane/*` entries; `_meta.regenerated_at` and `_meta.regeneration_reason` updated per m13 precedent | git diff + jq |
| **AC-14.8** | (no-op) | (cap) | (cap invariant) | `test "$(ls docs/adrs/ADR-*.md 2>/dev/null \| wc -l)" -le 26`; ADR count delta from baseline `3d1176e` is `0` (no new ADRs for slice 1) | Bash |
| **AC-14.9** | E + F | (gate) | EVT-* | `sddk debt-verify` verdict == `PASS_WITH_WARNINGS` or `PASS`; `sddk-pack-audit gate --root .` first stdout line == `PASS`; `control-plane/README.md` documents `pnpm install && pnpm build && pnpm test && pnpm preview` + the `pnpm --version` / `node --version` prereq gate | vault verify + Bash |
| **AC-14.10** | F | (closing report) | (Block F) | Slice-1 closing report records initial `dist/` bundle size (R-011 baseline; no gate), `pnpm --version` verification receipt (SC-POL-1 evidence), and `sddk-pack-audit gate` PASS receipt with recorded argv/exit_code per AC-INV-rdd | grep + JSONL parse |
| **AC-INV-schema** | A + B + C + E | (no-schema-mod) | (invariant) | `git diff --stat 3d1176e..HEAD -- specs/*.schema.json` returns empty (no schema modified) | git |
| **AC-INV-serverless** | A + C | REQ-SAS-4 | EVT-SAS-04 | `grep -cE 'telemetry\|analytics\|google-fonts\|cdn\.\|@sentry\|datadog\|axios\|fetch-polyfill' control-plane/package.json control-plane/src/**/*.{ts,tsx}` returns `0` | Bash |
| **AC-INV-rdd** | A + B + C + E | REQ-* (SC-POL-1) | EVT-* | `cycle-artifacts/p-7c4aff45199a2069/m14-cp-foundation/cli-receipts.jsonl` exists, is valid JSONL, contains one entry per applied recipe (pnpm install/build/test/preview, vite preview, schema-fixtures test, snapshot test, ajv test) with `exit_code` matching the actual run | JSONL parse |

Total: **13 ACs** (AC-14.1..14.10 + AC-INV-schema + AC-INV-serverless + AC-INV-rdd). Matches the m13 precedent count envelope (m13 was 23 ACs including 6 AC-INV-*; m14 is 10 AC + 3 AC-INV-* for a tighter A-lite scope).

---

## Source-of-Truth Exclusions

The following sites are **canonical contracts, registries, oracles, or inviolable surfaces** and MUST NOT be refactored by this change. They are the contract/oracle/surface, not consumers.

| Site | Role | Reason excluded |
|---|---|---|
| `specs/*.schema.json` (16 files) | Inner-repo substrate contracts | AC-INV-3 from m12 still binding; m14 does not modify any `specs/*.schema.json` |
| `specs/profile-aliases.yaml` | Alias registry | m12A canonical; m14 only consumes via projection loader (no edits) |
| `docs/28-CONTROL-PLANE-STACK.md` | Stack baseline | Pinned at proposal time; apply may note exact-version reality per R-005 but never silently deviate |
| `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` | Envelope shape + validation pipeline contract | Authoritative for loader contract |
| `uat/UAT-M10-01.md` | Slice-1 exit criterion | Authoritative; m14 slice 1 satisfies its core path |
| Root `.gitignore` (Python + `.narrative/` + `assets/generated/candidates/` + `build/` entries) | Existing ignore surface | m14 EXTENDS additively per R-004; existing entries preserved |
| `MANIFEST.json` `package`, `generated_for`, `working_name` keys | Top-level MANIFEST identity | Regen only adds new entries and updates `_meta` |
| `tools/sddk-pack-audit` (m13) | Existing tooling precedent | Owned by m13 cycle; m14 does not modify |

**Secondary exclusions** (kept-literal by design):
- 25 existing ADRs (`docs/adrs/ADR-001..025`) — m14 introduces 0 ADRs (slot 26/26 stays reserved)
- All `examples/`, `templates/`, `uat/`, `docs/`, `specs/` files except where listed in proposal's `production_surfaces` — slice 1 must not modify any spec-pack file (per proposal §"Out of Scope" final bullet)

---

## Risk Register

| # | Risk | Likelihood | Per-risk verification |
|---|---|---|---|
| **R1** | Node 25 vs Node 24 LTS baseline divergence (R-002 from explore) | HIGH | AC-14.2 enforces `engines.node: ">=24.0.0"` + `pnpm install --frozen-lockfile` on Node 24 LTS as release gate per project CI policy |
| **R2** | Corepack absent; `packageManager` cannot enforce pnpm (R-003) | HIGH | AC-14.2 enforces the field; AC-14.9 records `pnpm --version` as prereq; `tools/install-pnpm.sh` helper shipped per proposal Block F |
| **R3** | `.gitignore` extension overwrites Python entries (R-004) | MED | AC-14.7 enforces additive edit; `git diff .gitignore` reviewed pre-commit to confirm no Python entries removed |
| **R4** | Vite 8.1 / React 19.2 / TanStack Router / Tailwind 4.3 patch reality (R-005) | MED | Apply opens a pre-install verification step (`pnpm view <pkg> version`); records resolved versions in apply-progress YAML; updates `control-plane/STACK.md` only if it deviates from `docs/28` baseline — never silently |
| **R5** | `control-plane.schema.json` vs `cp-project.schema.json` validation target (R-006) | MED | Architectural commitment: validate golden fixtures against per-projection `cp-*.schema.json`; `control-plane.schema.json` stays slice 2+ surface; registry keyed by `schema:` const (REQ-SVP-2) |
| **R6** | Recipes + extension-config fixtures deferred (R-007) | MED | Architectural commitment: lazy-compile registry keyed by `schema:` const (REQ-SVP-2); adding `creation-recipe/v1` or `control-plane-extension-config/v1` is a one-line addition later |
| **R7** | Catalog fixture corpus minimal but provable (R-008) | MED | REQ-GFC-1..4 ship the slice-1 minimum corpus + path-traversal in-pack test; deferred-fixture inventory (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) listed in §"Out of Scope" |
| **R8** | TanStack Router loader state vs Zustand boundary (R-009) | LOW-MED | REQ-SAS-2 enforces "route loaders read from Zustand, not the loader port directly"; single source of truth in the store |
| **R9** | "Serverless" definition in UAT-M10-01 leaks (R-010) | LOW | AC-INV-serverless + EVT-SAS-04 grep `package.json` and `src/**/*.{ts,tsx}` for telemetry/analytics/remote fonts/CDN; DevTools Network panel verified empty post-`vite preview` |
| **R10** | Bundle-size budget not enforced (R-011) | LOW | AC-14.10 records initial `dist/` bundle size in slice-1 closing report (no gate) |
| **R11** | `MANIFEST.json` regeneration drift (R-012) | LOW | AC-14.7 enforces m13 regen pattern (incremental addition + `_meta.regenerated_at` + `_meta.regeneration_reason`) |
| **R12** | Error boundary does not catch async errors in Zustand subscribers | LOW | REQ-SAS-3 + EVT-SAS-03 verify boundary present; Vitest spec exercises synchronous render-time exceptions (slice-1 acceptable; slice-N+ may add error-catching subscriber wrappers) |

---

## Entropy Metrics (qualitative; DQS dimension improvements)

Entropy here is the **cross-surface coupling + validation entropy** of the control-plane foundation: the spread of projection shapes across schemas, the tightness of the diagnostic-not-crash guarantee, and the Information Bottleneck of the loader → store → routes chain.

| Dimension | Pre-M14 | Post-M14 slice 1 | Delta |
|---|---|---|---|
| **Connascence of Name (CoN)** — projection family identity across schemas + views | `cp-*` family referenced ad-hoc in `docs/13` and `docs/34`; no in-tree consumer | `cp-*` family keyed by `schema:` const in registry (REQ-SVP-2); all 5 views consume by projection key (REQ-SAS-1) | ↓ |
| **Connascence of Value (CoV)** — invalid-input contract | Crashes-or-silent-fail (no in-tree validation) | `Diagnostic<T> = { ok: true, data } \| { ok: false, errors: AjvError[] }` (REQ-SVP-3); never throws | ↓ |
| **Connascence of Type (CoT)** — projection bundle shape across loader/store/views | Implicit (no in-tree consumer) | Explicit `ProjectionBundle` shape (REQ-PLP-1); 7 keys; `schema:` const typed at compile time | ↓ |
| **Information Bottleneck (IB)** — loader → store → routes | Indirect (loader is the bottleneck; views read directly from loader) | Zustand is the bottleneck (REQ-SAS-2); loader writes to store; routes read from store | ↑ |
| **Design Quality Score (DQS)** — composite slice-1 quality | Smell: 0 in-tree test runner, 0 in-tree projection validator, 0 in-tree SPA | Smell eliminated: Vitest + Ajv + React 19.2 + Vite 8.1 + TanStack Router + Zustand; 4 spec files; 6-fixture minimum corpus; 6 routes; 5 views | ↑ |
| **SOLID entropy** (SRP/OCP at the boundary layer) | No boundary layer in tree | Loader port (REQ-PLP-1..3) + schema validation pipeline (REQ-SVP-1..3) + diagnostic type (REQ-SVP-3) + views (REQ-SAS-1) each have one responsibility; new `cp-*` family added via one-line registry extension | ↑ |

The slice-1 is **boundary + tooling at the cycle layer**: no inner-repo schema modification, no `docs/` or `specs/` mutation, no `MANIFEST.json` identity change. The `control-plane/` and `golden/control-plane/` containers are net-new deployable areas. m13's pack-only invariant retirement (REQ-RDP-4 / EVT-RDP-04 in m13 spec) carries forward: `tools/` and `control-plane/` are both cycle-mutable post-m13.

---

## Out of Scope (deferred to slice 2+)

- **CatalogEntity persistence** (CatalogStore slice + Dexie-backed registry) — slice 3+ per `docs/35-CATALOG-PROVIDERS.md` §Conflict strategy.
- **Entity pages** (Project / Character / Asset / Build entity pages) — slice 3 per `docs/13-CONTROL-PLANE.md` §Entity pages.
- **Extension Registry runtime** (EntityTab / EntityCard / HomeWidget instantiations) — slice 2 per `docs/30-CONTROL-PLANE-EXTENSIONS.md` + ADR-022.
- **Studio Home + Workbench** — slice 5 per `docs/33` + ADR-025.
- **Search** (Orama collators) — slice 4 per `docs/32`.
- **Narrative Docs** (`react-markdown` + sanitizing rehype layer + entity-link plugin) — slice 4.
- **Graph lenses** (Graphology + Sigma stable 3.x + ForceAtlas2 worker) — slice 6.
- **Recipes (RJSF)** — slice 7 (M10.1) per `docs/31` + ADR-023.
- **Capability catalog** — M10.2 per `docs/19-ROADMAP.md`.
- **Multi-project** — M10.3 per `docs/19` + `docs/35`.
- **PWA** (Vite PWA plugin or equivalent) — optional per `docs/28-CONTROL-PLANE-STACK.md` §Baseline, capability-gated; REQ-CPS-2 explicitly forbids it in slice 1.
- **Bundle-size budget enforcement** — "after M10 first usable build" per `docs/28` §Dependency governance.
- **Fixture expansion** — `project-stale-projection`, `project-malicious-docs`, `two-project-catalog`, `large-graph`, `recipes`, performance fixtures (10 projects / 1k entities / 10k nodes) — slice N+ per `docs/24-TESTING-GOLDEN-DATASET.md`.
- **Playwright browser UAT harness** — manual `vite preview` smoke only in slice 1; Playwright deferred to slice N+.
- **Spec pack modifications** — `docs/`, `specs/`, `examples/`, `templates/`, `uat/` UNCHANGED (AC-INV-schema binding).

---

## Invariant Preservation

All 11 project invariants from `milestones/m1-onboard-2026-08-28.md` L28–50 are preserved unchanged. The m12 + m13 invariants (`AC-INV-schema`, `AC-INV-packonly`, `AC-INV-rdd`) are **preserved**:

- `AC-INV-schema` (no `specs/*.schema.json` modification) — preserved absolutely; re-asserted for m14.
- `AC-INV-packonly` (`tools/` surface is cycle-mutable, `MANIFEST.json` regen covers new entries) — preserved; m14 adds `tools/install-pnpm.sh` (a helper, not a multi-line CLI) and `control-plane/` (a new container, not in the original pack scope but explicitly cycle-mutable per m13's `pack+tools` invariant).
- `AC-INV-rdd` (every CLI invocation records `argv` and `exit_code` to `cli-receipts.jsonl`) — preserved; m14's `cli-receipts.jsonl` is the cycle-scoped file under `cycle-artifacts/p-7c4aff45199a2069/m14-cp-foundation/`.

The new invariants introduced by this cycle:

| Invariant | Source | Enforcement |
|---|---|---|
| `engines.node: ">=24.0.0"` + `packageManager: "pnpm@11.9.0"` | REQ-CPS-1 | AC-14.2 (jq + frozen-install) |
| `tsconfig.json` strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` | REQ-CPS-2 | AC-14.3 (tsc --noEmit) |
| Ajv 8 strict + allErrors + JSON Schema 2020-12 + no remote fetching | REQ-SVP-1 | AC-14.6 (grep) |
| Schema registry lazy-compiled keyed by `schema:` const | REQ-SVP-2 | AC-14.6 (schema-fixtures spec) |
| `Diagnostic<T>` shape — never throws on invalid input | REQ-SVP-3 | AC-14.5 (invalid-fixture test) |
| Path-traversal guard on `SnapshotProjectSource` | REQ-PLP-2 | AC-14.6 (loader.diagnostics spec) |
| Serverless SPA — zero outbound application-API requests | REQ-SAS-4 | AC-14.4 + AC-INV-serverless |
| ADR count ≤ 26 | (carried forward) | AC-14.8 (no new ADRs for slice 1; slot 26/26 stays reserved) |
| `specs/*.schema.json` unmodified | (carried forward) | AC-INV-schema (git diff) |
| Root `.gitignore` extended additively | R-004 mitigation | AC-14.7 (git diff) |
| `cli-receipts.jsonl` argv/exit_code recorded per SC-POL-1 | (carried forward) | AC-INV-rdd (JSONL parse) |

---

## Next Recommended

`sddk-design` to deepen the architectural commitments made here (R-002, R-003, R-006, R-009, R-007) into the file-level architecture, then `sddk-tasks` to decompose Blocks A–F into implementation tasks for `sddk-apply`. Acceptance gates for apply phase:

- All 13 ACs (AC-14.1..14.10 + AC-INV-schema + AC-INV-serverless + AC-INV-rdd) MUST pass before archive.
- Block 0 commits first as `chore(cp-foundation): scaffold-changes-dir-and-gitignore-extend` (≤5 LoC, additive).
- Block A commits as `feat(control-plane): shell-scaffold-pnpm-vite-ts-strict` (~80 LoC).
- Block B commits as `feat(control-plane): projection-loader-ajv-schema-registry-diagnostics` (~400 LoC).
- Block C commits as `feat(control-plane): routes-and-views-serverless-shell` (~300 LoC).
- Block D commits as `feat(golden): control-plane-minimum-corpus` (~150 LoC across 6 fixtures + 1 snapshot).
- Block E commits as `test(control-plane): vitest-loader-ajv-diagnostics-fixtures` (~250 LoC).
- Block F commits as `chore(manifest): regen-control-plane-entries` + `chore(tools): install-pnpm-helper` + `docs(control-plane): slice-1-readme` (≤30 LoC).

**M14+ pivot**: M14 may promote `golden/control-plane/expanded-fixtures` (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) into a follow-on slice; M14 may also add ADR-026 if any slice-2 irreversibility decision warrants it (currently: not warranted, slot 26/26 stays reserved).
