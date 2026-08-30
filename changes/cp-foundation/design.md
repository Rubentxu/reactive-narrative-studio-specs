# Design: cp-foundation — Control Plane Foundation slice 1 (m14-cp-foundation)

- **Cycle**: `p-7c4aff45199a2069/m14-cp-foundation` (A-lite, branch `feat/m14-cp-foundation-2026-08-30`, base `3d1176e`)
- **Proposal SHA-256**: `d2f1f9748f82fa14d0b79003fa8ca03e28bfdd9d1657ec329dc0ff860dcb73ac` (244 LoC)
- **Spec SHA-256**: `682071d75845adc737e658743a06dc47640e62520bbafc157c6fa800876636ff` (401 LoC, 5 NEW capabilities, 17 REQs, 17 EVT scenarios, 13 ACs)
- **Architecture impact**: `boundary` (first static SPA in-tree; prose-contract → executable-code seam crossed; zero `specs/*.schema.json` modified)
- **Design-time evidence**: registry probes + pnpm behaviour probes executed 2026-08-30 (see §"Design-Time Evidence Receipts")

## Technical Approach

Slice 1 lands `docs/25` CP-A + CP-B + minimal CP-C as **one pnpm workspace rooted at `control-plane/`**, wired to the canonical contracts by *reference*, never by copy: `src/schema/registry.ts` imports the 16 `specs/*.schema.json` files directly through Vite's module graph, so the SPA, `vitest`, and `pnpm build` all validate against the same bytes the spec pack ships. The runtime is the `docs/34` §Validation pipeline verbatim — `bytes → parse → schema select → AJV validate → normalize → store → render` — with the **store as the single bottleneck**: the loader port never touches React, and route loaders never touch the loader port (R-009).

Four cross-cutting rules bind every block: (1) **diagnostic-not-throw** — every failure mode, including guard violations and JSON parse errors, is projected into the same `AjvError` shape (REQ-SVP-3); (2) **no network at runtime** — no telemetry, CDN, remote fonts, HTTP client, or Ajv `loadSchema` (REQ-SAS-4); (3) **schemas are read-only inputs** (AC-INV-schema); (4) **every source file is written to satisfy its scenario's grep oracle literally** — the spec's EVT-* scenarios are executable acceptance tests against source text, so §"AC-Driven Source Constraints" below is normative for apply, not advisory.

## Requirement Coverage

All 17 REQs land in a decision and a file. No decision extends the requirement surface.

| REQ | Scenario | Decision | Primary artifact |
|---|---|---|---|
| REQ-CPS-1 runtime pinned | EVT-CPS-01 | D1 (Node floor + guard), D2 (pnpm pin), D3 (exact versions) | `control-plane/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| REQ-CPS-2 TS strict + static `dist/` | EVT-CPS-02 | D3 (TS pin via smoke gate), D5 (`server.fs.allow`) | `tsconfig.json`, `vite.config.ts` |
| REQ-CPS-3 Vitest + shell + boundary | EVT-CPS-03 | D6 (boundary placement), D8 (test env split) | `src/main.tsx`, `src/app/App.tsx`, `src/app/ErrorBoundary.tsx`, `vite.config.ts` (`test:`) |
| REQ-PLP-1 port + snapshot impl | EVT-PLP-01 | D7 (7-key bundle, catalog kept outside), D8 (`File[] \| FileList`) | `src/loader/ProjectSource.ts`, `src/loader/SnapshotProjectSource.ts` |
| REQ-PLP-2 path-traversal guard | EVT-PLP-02 | D8 (browser-safe guard), D6 (`synthetic('path-traversal')`) | `src/loader/SnapshotProjectSource.ts` |
| REQ-PLP-3 directory source + fallback | EVT-PLP-03 | D8 (guard exported for reuse) | `src/loader/DirectoryProjectSource.ts`, `src/types/fs-access.d.ts` |
| REQ-SVP-1 Ajv 8 strict/2020-12/no remote | EVT-SVP-01 | D5 (module-graph imports, no `loadSchema`), D4 (`date-time` allowlist) | `src/schema/ajv.ts` |
| REQ-SVP-2 lazy registry by `schema:` const | EVT-SVP-02 | D4 (`$id` key + 2 dispatch axes + collision rule + load/compile matrix) | `src/schema/registry.ts` |
| REQ-SVP-3 `Diagnostic<T>` never throws | EVT-SVP-03 | D6 (single failure channel, 5 required fields) | `src/diagnostics/types.ts` |
| REQ-GFC-1 `project-valid/` | EVT-GFC-01 | D4 (`apiVersion` dispatch for the 2 catalog entities), D8 (YAML in tests only) | `golden/control-plane/project-valid/*` (7 files) |
| REQ-GFC-2 `project-invalid-schema/` | EVT-GFC-02 | D6 (`errors[0]` banner in `App.tsx`) | `golden/control-plane/project-invalid-schema/cp-project.missing-schema.json` |
| REQ-GFC-3 `snapshot-valid/` | EVT-GFC-03 | D7 (`catalogEntities` outside `bundle` keeps "exactly 7 keys" true) | `golden/control-plane/snapshot-valid/{manifest.json,projections/*}` (8 files) |
| REQ-GFC-4 uncommitted malicious fixture | EVT-GFC-04 | D8 (inline `File[]` in the spec, never under `golden/`) | `control-plane/test/loader.diagnostics.spec.ts` |
| REQ-SAS-1 five views | EVT-SAS-01 | D7 (lifecycle/checks ← catalog entity; QA ← `overallStatus`) | `src/views/{Overview,Story,Visual,QA,History}.tsx` |
| REQ-SAS-2 six routes read Zustand | EVT-SAS-02 | D7 (sync `getState()` loaders, no port access) | `src/routes/{router.ts,routes.tsx}` |
| REQ-SAS-3 boundary → diagnostic panel | EVT-SAS-03 | D6 (class boundary wrapping `RouterProvider`) | `src/app/ErrorBoundary.tsx`, `src/diagnostics/DiagnosticPanel.tsx` |
| REQ-SAS-4 zero application-API requests | EVT-SAS-04 | D5 (schemas bundled, not fetched), D2 (pnpm fetch is build-time only) | `package.json`, `index.html`, `src/**` |

## Architecture Decisions

### D1 — Node floor: `engines.node: ">=24.0.0"` + `preinstall` guard (pnpm does NOT enforce `engines`)

**Choice**: `package.json` declares `"engines": { "node": ">=24.0.0" }` **and** a `preinstall` script that hard-fails below major 24. Node 24 LTS remains the release bar; Node 25.9.0 (this host) is a supported dev runtime.
**Alternatives considered**: (i) `engines.node: "24.x"` — rejected per R-002(a): refuses the installed dev runtime; (ii) `engines` field alone — **empirically refuted**: `pnpm install` against `engines.node: ">=99.0.0"` emitted only `[WARN] Unsupported engine` and **exited 0** (probe `/tmp/opencode/cp-probe`); (iii) `.npmrc` with `engine-strict=true` — rejected: `.npmrc` is outside the spec's affected-surface list (spec §Source L10) and would silently widen the change surface.
**Rationale**: the field alone is documentation, not a gate. The guard makes the floor executable inside the surface the spec already authorises. Verified guard text (probe `/tmp/opencode/pre-probe`, exit 1, install blocked):

```json
"preinstall": "node -e \"const [maj]=process.versions.node.split('.'); if (Number(maj) < 24) { console.error('control-plane requires Node >=24'); process.exit(1); }\""
```

`grep -cE '\^|~'` over that exact package.json returned **0** — the guard is compatible with EVT-CPS-01. Upstream engine floors all clear `>=24`: `vite@8.2.2` `^20.19.0 || >=22.12.0`, `vitest@4.1.11` `^20 || ^22 || >=24`, `@tanstack/react-router@1.170.32` `>=20.19`.
**Release bar**: per repo CI policy (local validation is the gate), `pnpm install --frozen-lockfile && pnpm build && pnpm test` on **Node 24 LTS** is the release-tag gate; remote CI is reserved for the `v0.6.0` tag.

### D2 — pnpm enforcement: `packageManager` self-management (Corepack is NOT required)

**Choice**: `"packageManager": "pnpm@11.9.0"` + apply gate `cd control-plane && pnpm --version` MUST print `11.9.0` + `tools/install-pnpm.sh` as the *bootstrap* helper only (host with no pnpm at all).
**Alternatives considered**: (i) treat the field as a no-op and rely solely on a manual `pnpm --version` check (explore R-003's assumption) — **empirically refuted**; (ii) require Corepack — rejected: absent on this host, and a host-level decision per R-003.
**Rationale**: pnpm ≥10 self-manages the pinned version (`manage-package-manager-versions`, default on). Probe `/tmp/opencode/pm-probe` pinned `pnpm@10.0.0`; with pnpm **11.9.0** on `PATH`, `pnpm --version` inside that directory returned **`10.0.0`** — pnpm downloaded and delegated to the pinned release with no Corepack present. R-003's premise ("`packageManager` is a no-op without Corepack") is therefore false for pnpm, and the field *is* the enforcement mechanism.
**Consequences apply MUST honour**: (a) the version gate is only meaningful **inside `control-plane/`** — from the repo root `pnpm --version` reports the host binary (today 11.9.0, but the host already advertises 11.24.0 as available, so another machine will differ); (b) first install on a cold host performs one network fetch of pnpm 11.9.0 — a build-time fetch, outside the UAT-M10-01 runtime guarantee; (c) `tools/install-pnpm.sh` (≤30 lines, `set -euo pipefail`) only needs to land *some* pnpm ≥10 — the pin does the rest.

### D3 — Exact version resolution and the deviation ladder (R-005)

**Choice**: apply resolves every dependency with `pnpm view <pkg> version --json`, writes `cycle-artifacts/.../m14-cp-foundation/resolved-versions.json`, appends one `cli-receipts.jsonl` entry per invocation (AC-INV-rdd), pins the resolved literal in `package.json` with **no** `^`/`~`, and reconciles against `docs/28` with a three-tier ladder.

| Tier | Condition vs `docs/28` baseline | Action |
|---|---|---|
| **T0** record-only | patch drift inside the declared `major.minor` | pin + record in `resolved-versions.json`; no doc edit |
| **T1** record + note | minor drift inside the declared major | pin + record + append a dated "resolved at m14 apply" line to `control-plane/STACK.md` (spec R4: "never silently") |
| **T2** stop | major drift, an undeclared baseline, or an upstream `engines` floor incompatible with `>=24.0.0` | do **not** pin unilaterally; record, and escalate to re-proposal unless the pre-pin smoke gate below passes |

Design-time snapshot (advisory only — apply re-resolves and its numbers win):

| Package | `docs/28` baseline | Resolved 2026-08-30 | Tier |
|---|---|---|---|
| `vite` | 8.1 | **8.2.2** | T1 |
| `react` / `react-dom` | 19.2 | 19.2.8 | T0 |
| `@tanstack/react-router` | current compatible stable | 1.170.32 | T0 |
| `tailwindcss` / `@tailwindcss/vite` | 4.3 | 4.3.3 | T0 |
| `zustand` | pinned stable | 5.0.15 | T0 |
| `ajv` | 8.x, 2020-12 | 8.20.0 | T0 |
| `ajv-formats` | (implied by "known formats") | 3.0.1 | T0 |
| `vitest` | pinned | 4.1.11 | T0 |
| `@vitejs/plugin-react` | (implied by "React plugin") | 6.1.1 | T0 |
| `@testing-library/react` | pinned | 16.3.3 | T0 |
| `yaml` (test-only) | — | resolved at apply | T0 |
| `typescript` | **"strict mode", no version** | **7.0.2** (`latest`; `previous`-line 5.x) | **T2 — undeclared** |

**TypeScript is the only T2 case** and is resolved here, not deferred: `docs/28` pins no TS version, so there is no baseline to violate, and the pack's convention everywhere else is "current stable generation". Apply pins the resolved `latest` **only after a pre-pin smoke gate**: compile the slice-1 sources with `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` and require `tsc --noEmit` exit 0 (REQ-CPS-2 is the acceptance anyway). On failure, fall back to the highest `5.9.x` that passes, pin that, and record the fallback as a T1 note in `STACK.md` + apply-progress. No guessing, no silent drift.
**Rationale**: R-005 assigns exact patches to apply; design owes a *decision procedure*, not a frozen number. The ladder makes "never silently" mechanical, and the receipt trail satisfies AC-INV-rdd.

### D4 — Schema registry: keyed by `$id`, dispatched by `schema:` const — and the const collision is real

**Choice**: the compiled-validator map is keyed by `$id` (unique across all 16 files). Two dispatch indexes select an `$id` from a document: `BY_SCHEMA_CONST` (`properties.schema.const` → `$id`) for the 15 envelope schemas, and `BY_API_VERSION` (`apiVersion` → `$id`) for catalog entities. Compilation is lazy: `Map<$id, ValidateFunction>` filled on first `get()`.
**Alternatives considered**: (i) key the map directly by `schema:` const (the proposal's shorthand) — **not implementable as written**: `jq` over the pack proves `specs/cp-project.schema.json` **and** `specs/control-plane.schema.json` both declare `"schema": { "const": "control-plane/project/v1" }`, so the const is not a unique key; (ii) key by filename — rejected: filenames are not part of any contract; (iii) copy the schemas under `control-plane/src/schema/` — rejected: duplicates the canonical contract and invites drift against AC-INV-schema.
**Collision resolution (ratifies R-006)**: `control-plane/project/v1` dispatches to **`cp-project.schema.json`** — the per-projection envelope is the slice-1 validation target. `control-plane.schema.json` is *registered* (so its `$ref`s resolve locally) but is **unreachable via const dispatch** until slice 2+ gives the bundle a discriminator. A source comment states this explicitly so slice 2 cannot re-introduce the ambiguity by accident.
**Catalog entities have no `schema` const at all** — `catalog-entity.schema.json` requires `apiVersion` (`const: "narrative.dev/v1alpha1"`) + `kind` (11-value enum) + `metadata`. Hence the second dispatch axis; a single-axis registry would silently fail to select a validator for the `project-valid/` catalog fixtures.

**Slice-1 load/compile matrix** (16 registered, ≤9 compiled — laziness is asserted, not assumed):

| Schema | Registered (`addSchema`) | Compiled in slice 1 | Why |
|---|---|---|---|
| `cp-{project,chapters,characters,assets,uat,visual-quality,history}` (7) | yes | **yes** | the 7 `ProjectionBundle` keys (REQ-PLP-1) |
| `catalog-entity` | yes | **yes** | `project-valid/{narrative-project,character}.yaml` (REQ-GFC-1) |
| `cp-{progress,graph,workflow,scm,costs,approvals}` (6) | yes | no | no slice-1 fixture; proves lazy-compile |
| `control-plane` (bundle) | yes | no | slice 2+ per R-006; registration only, to resolve its 13 `$ref`s locally |
| `control-plane-extension` | yes | no | slice 2 per ADR-022 |

`creation-recipe/v1` (already in-tree at `specs/creation-recipe.schema.json`) is deliberately **not** registered in slice 1 — adding it later is one line in each index, which is precisely the R-007 guarantee.

### D5 — Schemas enter the bundle through Vite's module graph, not through `fs`

**Choice**: `registry.ts` imports the 16 documents with explicit static imports for the three non-`cp-*` schemas plus `import.meta.glob('../../../specs/cp-*.schema.json', { eager: true, import: 'default' })`; `vite.config.ts` sets `server.fs.allow: ['..']` so dev/preview can serve above the workspace root.
**Alternatives considered**: (i) `fs.readFileSync` at startup — impossible in a browser SPA; (ii) a build step copying `specs/` into `public/` — rejected: a second copy of the contract and a runtime `fetch` (violates REQ-SAS-4); (iii) an unbounded glob `specs/*.schema.json` — rejected: it would pull in the 12 non-control-plane schemas (`event`, `narrative-ir`, …) that REQ-SVP-2 does not scope.
**Rationale**: one code path for browser, `vitest`, and `pnpm build`; schemas are compiled into `dist/` (64 KB total for all 16 — measured), so the SPA needs zero network to validate. The glob is `cp-*`-scoped, giving exactly 13 + 3 explicit = 16.

### D6 — `Diagnostic<T>` is the single failure channel; guard violations are synthesised `AjvError`s

**Choice**: `src/diagnostics/types.ts` owns `AjvError` (five **required** fields: `instancePath`, `schemaPath`, `keyword`, `message`, `params`), `Diagnostic<T>`, `fromAjv()` (projects Ajv `ErrorObject[]`, defaulting the optional `message` to `''`), and `synthetic(keyword, instancePath, message)` for the four non-Ajv failures: `path-traversal`, `parse-error`, `unknown-schema`, `missing-entry`.
**Alternatives considered**: a separate `LoaderError` union — rejected: REQ-PLP-2 requires guard violations to surface as `AjvError`-shaped with `keyword: 'path-traversal'`, and two error vocabularies would force the UI to branch.
**Rationale**: `exactOptionalPropertyTypes: true` makes optional members hostile to a projection type; all five fields required keeps `errors[0].message` non-`undefined` at the render site, which EVT-SVP-03 asserts.
**Boundary placement**: `src/app/ErrorBoundary.tsx` (class component — React 19 still has no hook equivalent) wraps `<RouterProvider>` inside `App.tsx`; caught render exceptions are converted with `synthetic('render-exception', …)` and rendered by `src/diagnostics/DiagnosticPanel.tsx`. `App.tsx` additionally subscribes to store diagnostics and renders a top-level banner indexing `errors[0]`, because EVT-GFC-02 greps `App.tsx` for the literal `errors[`.

### D7 — Store is the bottleneck; route loaders are synchronous store reads (ratifies R-009)

**Choice**:

```ts
interface ProjectionState {
  status: 'empty' | 'loading' | 'loaded' | 'failed';
  bundle: ProjectionBundle | null;      // exactly the 7 cp-* keys
  catalogEntities: CatalogEntity[];     // NOT a bundle key (EVT-GFC-03 asserts exactly 7)
  diagnostics: AjvError[];
  sourceLabel: string | null;
  loadFrom(source: ProjectSource, projectId: string): Promise<void>;
  reset(): void;
}
```

`loadFrom` is invoked **only** from `src/app/SourcePicker.tsx` (user gesture: snapshot file input or directory picker). Route loaders are `() => ({ status: useProjectionStore.getState().status })` — synchronous, no `await`, no port access. Views subscribe with selectors.
**Alternatives considered**: (i) route loaders calling `ProjectSource.load()` — rejected per R-009: navigation would race the async load and the loader would lose its isolated testability; (ii) TanStack Router `context` carrying the port — rejected: same coupling, plus it makes the port a routing dependency.
**Rationale**: single source of truth, loader unit-testable with zero React, and `catalogEntities` kept outside `bundle` so the "exactly 7 keys" assertion stays true.
**Lifecycle/checks resolution**: `cp-project.schema.json` exposes only `project.{id,title,language,format,audienceProfile}` — `lifecycle`, `checks`, `blocking`, `warnings` live in `control-plane.schema.json` (slice 2+). REQ-SAS-1's "lifecycle + checks" therefore binds to the **catalog entity**, where they actually exist: `spec.lifecycle` + `status.checks` (verified against `examples/catalog-project.yaml`). With a snapshot that carries no catalog entity, `Overview` renders a documented "not present in this projection set" placeholder instead of inventing fields.
**QA field binding**: spec prose says `cp-visual-quality.status`; the schema has **no** `status` property — it declares `continuityStatus`, `editorialStatus`, `readabilityStatus`, `overallStatus`. Per spec §Source-of-Truth Exclusions (`specs/*.schema.json` is canonical), `QA.tsx` binds `visualQuality.overallStatus` and lists the three sub-statuses. No schema is modified.

### D8 — Fixtures are read as real `File` objects; no File API polyfill

**Choice**: `SnapshotProjectSource` accepts `readonly File[] | FileList` and normalises via `Array.from()`. `test/support/fixtures.ts` reads `golden/control-plane/**` with `node:fs/promises` and constructs `new File([bytes], relativePath)`.
**Alternatives considered**: (i) a `FileList` polyfill — rejected: `FileList` has no constructor, and widening the port to an iterable removes the need; (ii) calling internal loader functions directly and skipping `File` — rejected: it would leave the real ingestion path untested; (iii) a jsdom-wide environment — rejected: unnecessary for three of the four specs.
**Rationale**: measured on this host — Node exposes global `File` and `Blob.prototype.text()` (`node -e` probe: both `function`), so the mandatory snapshot path runs unpolyfilled under vitest's default `node` environment. Only `test/loader.diagnostics.spec.ts` needs DOM (it exercises the error boundary) and opts in per-file with `// @vitest-environment jsdom`.
**Guard, browser-safe**: no `node:path` import (it would not survive bundling). `SnapshotProjectSource.ts` hosts the guard inline and exports it for `DirectoryProjectSource`:

```ts
const PARENT_SEGMENT = '..';
export function isAbsolutePath(p: string): boolean { return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p); }
export function isSafeRelativePath(p: string): boolean {
  if (isAbsolutePath(p)) return false;
  return !p.split(/[\\/]+/).some((seg) => seg === PARENT_SEGMENT);
}
```

The guard runs on every manifest entry **before** any `File.text()` call (REQ-PLP-2) and returns `synthetic('path-traversal', entry, …)` on violation.

## Data Flow

```
  golden/control-plane/snapshot-valid/           specs/*.schema.json  (16, read-only)
  manifest.json + projections/*.json                     │
          │                                              │ import.meta.glob + 3 static imports (D5)
          │  File[] | FileList                           ▼
          ▼                                    ┌──────────────────────┐
  ┌──────────────────────┐   guard(..,abs)     │ schema/ajv.ts        │ Ajv2020
  │ SnapshotProjectSource│──── reject ────┐    │  strict / allErrors  │ + addFormats(['date-time'])
  │  discover() load()   │                │    │  addSchema (no http) │
  └──────────┬───────────┘                │    └──────────┬───────────┘
             │ bytes → parse              │               │ registerSchema × 16
             ▼                            │               ▼
      ┌─────────────┐  schema select  ┌───┴──────────────────────────┐
      │  JSON.parse │────────────────►│ schema/registry.ts           │
      └──────┬──────┘  const/apiVer   │  BY_SCHEMA_CONST → $id       │
             │                        │  BY_API_VERSION  → $id       │
             │        AJV validate ◄──┤  lazy Map<$id, Validate>     │
             ▼                        └──────────────┬───────────────┘
      Diagnostic<ProjectionBundle> ──────────────────┘
             │ ok:true → normalize          │ ok:false → AjvError[]
             ▼                              ▼
      ┌───────────────────────────────────────────────┐
      │ store/projectionStore.ts  (Zustand — THE      │  ◄── SourcePicker.tsx (user gesture)
      │ bottleneck: bundle + catalogEntities + diags) │
      └───────┬───────────────────────────────┬───────┘
              │ getState() (sync loaders)     │ selectors
              ▼                               ▼
      routes/routes.tsx (6 paths)      views/{Overview,Story,Visual,QA,History}.tsx
              │                               │  zero fetch / zero HTTP client
              └────────► App.tsx ◄────────────┘
                    ErrorBoundary + DiagnosticPanel (errors[0])
```

`docs/34` pipeline mapping: `bytes` (File) → `parse` (JSON.parse / yaml) → `schema select` (registry dispatch) → `AJV validate` → `normalize` (ProjectionBundle assembly) → `store` (Zustand) → `render` (routes + views). No arrow leaves the process.

## File Changes

| File | Action | Est. LoC | Description |
|---|---|---|---|
| `changes/cp-foundation/design.md` | Create | this file | Technical design (canonical) |
| `changes/cp-foundation/tasks.md` | Create (sddk-tasks) | ~300 | Block decomposition |
| `control-plane/package.json` | Create | ~55 | engines + preinstall guard (D1), `packageManager` (D2), exact pins (D3), scripts; **zero `^`/`~`** |
| `control-plane/pnpm-workspace.yaml` | Create | 2 | `packages: []` — verified accepted by pnpm 11.9.0 (probe); slice N+ adds members |
| `control-plane/pnpm-lock.yaml` | Create (generated) | n/a | Committed; `--frozen-lockfile` is the gate |
| `control-plane/tsconfig.json` | Create | ~25 | `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`; `resolveJsonModule`; includes `vite.config.ts` |
| `control-plane/vite.config.ts` | Create | ~25 | React plugin + `@tailwindcss/vite` + `server.fs.allow: ['..']` (D5) + inline `test:` block (vitest); **no PWA/workbox token** |
| `control-plane/index.html` | Create | ~12 | Vite entry; no remote font/CDN link |
| `control-plane/.gitignore` | Create | ~6 | `node_modules/`, `dist/`, `.vite/`, `coverage/` |
| `control-plane/README.md` | Create | ~40 | Prereq gate (`node --version`, `cd control-plane && pnpm --version`) + `install/build/test/preview` smoke |
| `control-plane/src/main.tsx` | Create | ~12 | `createRoot` from `react-dom/client` (EVT-CPS-03) |
| `control-plane/src/app/App.tsx` | Create | ~60 | Provider tree, `ErrorBoundary`, diagnostic banner indexing `errors[0]` |
| `control-plane/src/app/ErrorBoundary.tsx` | Create | ~40 | `componentDidCatch` → `synthetic('render-exception')` |
| `control-plane/src/app/SourcePicker.tsx` | Create | ~50 | Only call site of `loadFrom` (snapshot input + directory button) |
| `control-plane/src/diagnostics/types.ts` | Create | ~45 | `AjvError`, `Diagnostic<T>`, `fromAjv`, `synthetic` |
| `control-plane/src/diagnostics/DiagnosticPanel.tsx` | Create | ~35 | Renders `instancePath` / `keyword` / `message` per error |
| `control-plane/src/loader/ProjectSource.ts` | Create | ~55 | Port + `ProjectionBundle` (exactly 7 keys) + `CatalogEntity` types |
| `control-plane/src/loader/SnapshotProjectSource.ts` | Create | ~130 | Mandatory impl + exported path guard (D8) |
| `control-plane/src/loader/DirectoryProjectSource.ts` | Create | ~90 | `showDirectoryPicker` when present, else delegates to `SnapshotProjectSource` |
| `control-plane/src/schema/ajv.ts` | Create | ~35 | Ajv2020 instance; `addFormats(ajv, ['date-time'])`; **no URL literal / no `http` substring** |
| `control-plane/src/schema/registry.ts` | Create | ~110 | 16 schemas, 2 dispatch indexes, lazy compile, `validate()` entry point |
| `control-plane/src/store/projectionStore.ts` | Create | ~70 | Zustand slice (D7) |
| `control-plane/src/routes/router.ts` | Create | ~20 | `createRouter` + type registration |
| `control-plane/src/routes/routes.tsx` | Create | ~70 | 6 routes, single-quoted `path: '/…'`, store-reading loaders |
| `control-plane/src/views/{Overview,Story,Visual,QA,History}.tsx` | Create (5) | ~220 | Schema-bound renderers; zero fetch |
| `control-plane/src/styles.css` | Create | 3 | `@import "tailwindcss";` |
| `control-plane/src/types/fs-access.d.ts` | Create | ~15 | `showDirectoryPicker` ambient types (strict mode needs them) |
| `control-plane/test/{loader.snapshot,loader.diagnostics,ajv,schema-fixtures}.spec.ts` | Create (4) | ~250 | See §Testing Strategy |
| `control-plane/test/support/fixtures.ts` | Create | ~45 | `fs` → `File[]` helper + YAML parse (D8) |
| `golden/control-plane/project-valid/*` | Create (7) | ~90 | `narrative-project.yaml`, `character.yaml`, `cp-{project,chapters,characters,assets,uat}.json` |
| `golden/control-plane/project-invalid-schema/cp-project.missing-schema.json` | Create | ~8 | Omits the required `schema` const → `keyword: "required"` |
| `golden/control-plane/snapshot-valid/{manifest.json,projections/*.json}` | Create (8) | ~110 | 7 projections + manifest (`docs/34` §Snapshot format) |
| Root `.gitignore` | **Modify (append only)** | +6 | Node entries appended below the existing Python/`.narrative/`/`assets/`/`build/` block |
| `MANIFEST.json` | **Modify (regen)** | +~50 entries | m13 pattern: append + `_meta.regenerated_at` + `_meta.regeneration_reason` |
| `tools/install-pnpm.sh` | Create | ≤30 | Bootstrap only (D2); `set -euo pipefail`, anchored to `tools/check-skill-crossrefs.sh` |

**Net**: 51 new files, 2 modified, 0 deleted. **File-count reconciliation vs proposal**: the proposal estimated ~44 files by counting Block D as "6 fixtures + 1 snapshot"; the snapshot fixture is 8 files and `project-valid/` is 7, so Block D is 16 files. LoC stays inside the ~1215 estimate (fixtures are small JSON). Blocks stay at 6 — the A-lite ceiling is unchanged; only the per-block file count moved.

## Interfaces / Contracts

```ts
// src/diagnostics/types.ts
export interface AjvError {
  instancePath: string;  schemaPath: string;  keyword: string;
  message: string;       params: Record<string, unknown>;
}
export type Diagnostic<T> = { ok: true; data: T } | { ok: false; errors: AjvError[] };
export type SyntheticKeyword = 'path-traversal' | 'parse-error' | 'unknown-schema' | 'missing-entry' | 'render-exception';

// src/loader/ProjectSource.ts
export interface ProjectionBundle {          // exactly 7 keys — EVT-GFC-03
  project: CpProject; chapters: CpChapters; characters: CpCharacters;
  assets: CpAssets;   uat: CpUat;           visualQuality: CpVisualQuality;
  history: CpHistory;
}
export interface ProjectSource {
  discover(): Promise<Diagnostic<readonly string[]>>;
  load(projectId: string): Promise<Diagnostic<ProjectionBundle>>;
  refresh?(): Promise<Diagnostic<ProjectionBundle>>;
}

// src/schema/registry.ts
export type SchemaId = string;                                  // the $id — the ONLY unique key (D4)
export function schemaIdFor(doc: unknown): Diagnostic<SchemaId>; // const | apiVersion dispatch
export function get(id: SchemaId): ValidateFunction;             // lazy compile
export function validate<T>(doc: unknown): Diagnostic<T>;        // never throws — REQ-SVP-3
```

Registry index shape (the collision is encoded, not hidden):

```ts
// 'control-plane/project/v1' is declared by BOTH cp-project.schema.json and
// control-plane.schema.json. Slice 1 dispatches it to the per-projection
// envelope (R-006); the bundle schema is registered for $ref resolution only.
const BY_SCHEMA_CONST: Readonly<Record<string, SchemaId>> = {
  'control-plane/project/v1': CP_PROJECT_ID,
  /* … 12 further cp-* consts …, 'control-plane-extension-config/v1': CP_EXT_ID */
};
const BY_API_VERSION: Readonly<Record<string, SchemaId>> = {
  'narrative.dev/v1alpha1': CATALOG_ENTITY_ID,   // catalog-entity has NO schema: const
};
```

## AC-Driven Source Constraints (normative for apply)

The EVT-* scenarios grep source text. `grep -c` counts **lines**, not matches. Apply MUST honour these or the ACs fail on correct code.

| Scenario | Oracle | Constraint on the source |
|---|---|---|
| EVT-CPS-01 | `grep -cE '\^\|~' package.json` == 0 | No caret/tilde **anywhere**, including scripts and regexes. Verified guard text in D1 complies. |
| EVT-CPS-02 | `grep -cE 'vite-plugin-pwa\|workbox' vite.config.ts` == 0 | Do not even mention PWA in a comment. |
| EVT-CPS-03 / EVT-SAS-03 | `App.tsx` matches `componentDidCatch\|ErrorBoundary\|diagnostic` (≥2 lines) | `import { ErrorBoundary }` + `<ErrorBoundary>` usage + a `diagnostic*` identifier ⇒ ≥3 lines. |
| EVT-GFC-02 | `grep -c 'errors\[' App.tsx` ≥ 1 | `App.tsx` must literally index — `errors[0]` in the banner (D6). |
| EVT-CPS-03 | `main.tsx` matches `createRoot\|from .react-dom/client.` | Keep the import on one line, single-quoted. |
| EVT-PLP-01 | `grep -cE 'project\|chapters\|…\|history' SnapshotProjectSource.ts` ≥ 7 | Assemble the bundle key-by-key on separate lines (no spread shortcut). |
| EVT-PLP-02 | `grep -cE '\.\.\|path\.resolve\|isAbsolute' SnapshotProjectSource.ts` ≥ 2 | Guard lives **in this file**; `PARENT_SEGMENT = '..'` and `isAbsolutePath` supply the two lines without importing `node:path`. |
| EVT-PLP-03 | `DirectoryProjectSource.ts` matches both `showDirectoryPicker` and `SnapshotProjectSource` | Import the snapshot impl by name; do not alias it. |
| EVT-SVP-01 | `grep -cE 'strict: true\|allErrors: true\|2020\|loadSchema\|addSchema' ajv.ts` ≥ 4 **and** `grep -cE 'loadSchema\|fetch\(\|http' ajv.ts` == 0 | One option per line (`strict: true`, `allErrors: true`), `from 'ajv/dist/2020'`, and an `addSchema` call ⇒ 4 lines. **`ajv.ts` must contain no `http` substring** — therefore **no `$id` URL literal and no URL in comments**; all URL-bearing code lives in `registry.ts`. |
| EVT-SVP-01 | `grep -cE 'ajv-formats\|addFormat' ajv.ts` ≥ 1 | `addFormats(ajv, ['date-time'])` — the only format any of the 16 schemas uses (17 occurrences, all `date-time`). |
| EVT-SVP-02 | `registry.ts` references all 16 `$id`s; `grep -cE 'lazy\|get\(\|compile\(' ` ≥ 2 | Name the cache `lazy`-prefixed and keep `get(` / `compile(` on distinct lines. |
| EVT-SAS-01 / AC-INV-serverless | `grep -cE 'fetch\(\|axios\|XMLHttpRequest\|…' views/*.tsx`, `package.json`, `src/**` == 0 | No `fetch(` even in a comment; no telemetry/CDN/analytics dependency. |
| EVT-SAS-02 | `grep -cE "path:\s*'/…" routes.tsx` ≥ 6 | Route paths declared as `path: '/overview'` — **single quotes**, one route per line. |
| EVT-GFC-04 | `git ls-files golden/control-plane/ \| grep -E '\.\./\|absolute'` empty | The malicious fixture is inline in `loader.diagnostics.spec.ts`; never committed under `golden/`. |
| AC-INV-schema | `git diff --stat 3d1176e..HEAD -- specs/*.schema.json` empty | Schemas are imported, never edited. |

## Architecture Model

- **Impact**: `boundary`
- **Observed baseline**: fallback table below. Evidence-bound to `git ls-files` + `MANIFEST.json` (`_meta.regeneration_reason`: "m13: added tools/sddk-pack-audit CLI; count 127 → 128").
- **Planned intent**: fallback table below.
- **Render**: `unavailable` — `sddk-c4-likec4` was not selected by the launch plan (skill paths list only the design phase prompt, phase-common, and optional `entropy-sdd`), and no LikeC4 renderer is on `PATH` (`which likec4` → not found). The proposal's table is deepened here to element level; that is the canonical intent for `sddk-tasks`.

| Stable ID | Element | Observed (3d1176e) | Planned (post-m14 slice 1) |
|---|---|---|---|
| `cnt.control-plane` | Container `control-plane/` | `STACK.md` + 1 ComfyUI workflow (2 files) | pnpm workspace SPA: 8 root files + 21 `src/` + 5 `test/` |
| `cmp.loader` | Component projection loader | absent | `ProjectSource` port + 2 impls + path guard |
| `cmp.schema` | Component validation pipeline | absent | Ajv2020 + 16-schema registry (2 dispatch axes, lazy compile) |
| `cmp.store` | Component projection store | absent | Zustand slice — the loader→routes bottleneck |
| `cmp.shell` | Component app shell | absent | 6 routes + 5 views + error boundary + diagnostic panel |
| `cnt.golden` | Container `golden/` | absent | `control-plane/{project-valid,project-invalid-schema,snapshot-valid}/` (16 files) |
| `cnt.tools` | Container `tools/` | 2 entries | + `install-pnpm.sh` (3 entries) |
| `ext.specs` | Contract source `specs/*.schema.json` | 16 control-plane-relevant files, no in-tree consumer | same files, now consumed read-only by `cmp.schema` (new dependency edge, no mutation) |
| `ext.verify` | Actor `sddk-verify` | `sddk-pack-audit gate` (pack only) | + `control-plane` build/test verifier |

**Evidence gaps**: no runtime C4 baseline exists for `control-plane/` because the container has no executable code at `3d1176e`; the observed column is filesystem evidence only.

## Testing Strategy

| Layer | What | Approach | Env |
|---|---|---|---|
| Unit | Ajv instance is strict/allErrors/2020-12, `date-time` registered, no remote loader | `test/ajv.spec.ts` — assert `ajv.opts`, assert `format('date-time')` resolves, assert compiling a `$ref`-bearing schema needs no network | node |
| Unit | Registry: 16 registered, dispatch by const **and** by `apiVersion`, collision resolves to `cp-project`, laziness | `test/schema-fixtures.spec.ts` — snapshot `compiledCount` before/after; assert `schemaIdFor` for both axes; assert `ok === true` for all 5 `project-valid/` cp-* + 2 catalog entities | node |
| Unit | `Diagnostic` never throws; `AjvError` carries `instancePath`/`keyword`/`message`; path-traversal guard | `test/loader.diagnostics.spec.ts` — `expect(() => validate(bad)).not.toThrow()`; inline malicious `File[]` (`../../../etc/passwd`, `/tmp/escape.json`) ⇒ `keyword: 'path-traversal'` | jsdom (per-file docblock) |
| Integration | `SnapshotProjectSource.load()` over the real `snapshot-valid/` fixture ⇒ `ok:true`, exactly 7 keys, each carrying its `schema:` const | `test/loader.snapshot.spec.ts` + `test/support/fixtures.ts` (`fs` → real `File`, no polyfill — D8) | node |
| Component | Error boundary renders `DiagnosticPanel` instead of unmounting | Testing Library inside `loader.diagnostics.spec.ts` (throwing child) | jsdom |
| Build | `tsc --noEmit` (3 strict flags), `pnpm build` ⇒ `dist/index.html`, no PWA token | Bash, receipted to `cli-receipts.jsonl` | Node 24 LTS at release bar |
| Manual UAT | UAT-M10-01 core path: `vite preview`, load `snapshot-valid/`, 5 views render, DevTools Network shows zero application-API requests; then load `project-invalid-schema/` ⇒ diagnostic panel, SPA still interactive | `control-plane/README.md` smoke recipe; Playwright deferred to slice N+ | browser |

Every command in the table appends `{"argv": […], "exit_code": N, "command": "…", "timestamp": "…"}` to `cycle-artifacts/p-7c4aff45199a2069/m14-cp-foundation/cli-receipts.jsonl` (AC-INV-rdd).

## Migration / Rollout

No data migration, no feature flag, no runtime state. Seven commits, one per block, in the proposal's order (Block 0 → F); `v0.6.0` MINOR tag. `git revert` per block is sufficient — Block A's scaffold is removable without B–F, and Block D's fixtures without A/B/C/E. The only mutation to pre-existing tracked content is the **append-only** `.gitignore` edit (Python + `.narrative/` + `assets/generated/candidates/` + `build/` entries verified preserved by `git diff .gitignore` before commit) and the `MANIFEST.json` regen (m13 pattern).

## Future Work — deferred fixture inventory (R-008)

| Fixture family | `docs/24` reference | Deferred to |
|---|---|---|
| `project-stale-projection/` | §Golden Control Plane workspace | slice 2 (needs `docs/34` §Projection freshness UI) |
| `project-malicious-docs/` | §Security fixtures (malicious Markdown, javascript link) | slice 4 (arrives with `react-markdown` + sanitizer) |
| `two-project-catalog/` | §Golden Control Plane workspace | M10.3 multi-project |
| `large-graph/` | §Performance fixtures (10k nodes) | slice 6 (Graphology/Sigma) |
| `recipes/` | §Schema fixtures | slice 7 / M10.1 (RJSF) — registry needs one line per D4 |
| extension-config fixtures | §Schema fixtures | slice 2 (ADR-022) — registry needs one line per D4 |
| malformed ZIP, oversized/recursive data | §Security fixtures | slice N+ (no ZIP ingestion in slice 1) |
| 10 projects / 1k entities / large docs index | §Performance fixtures | after first measured M10 build (`docs/28` §Dependency governance) |

## Entropy Delta (design-level, extends spec §Entropy Metrics)

- **CoN ↓** — the projection family identity is now a typed dispatch table (`BY_SCHEMA_CONST`/`BY_API_VERSION`) instead of a filename convention; the `control-plane/project/v1` collision is encoded once rather than rediscovered per consumer.
- **CoT ↓** — `ProjectionBundle` is a closed 7-key type checked by `tsc` and asserted by a test, so slice 2 cannot widen it silently.
- **CoV ↓** — one failure vocabulary (`AjvError`) for schema, parse, guard, and render exceptions.
- **IB ↑** — exactly one bottleneck (the Zustand slice). Loader→store is the only write edge; store→routes/views the only read edge. D7 forbids the shortcut that would have created a second edge.
- **Coupling risk accepted** — `registry.ts` depends on the *relative path* `../../../specs/`. Moving `control-plane/` breaks it loudly at build time (not silently at runtime); accepted over duplicating the contract.

## Open Questions

- [ ] None blocking. `typescript@7.0.2` vs a `5.9.x` fallback is resolved procedurally by D3's pre-pin smoke gate; apply records which branch it took.

## ADR Candidates

- **None.** Each candidate was tested against all three criteria (hard to reverse + surprising + real trade-off): D4's `$id` keying is reversible and *forced* by the const collision (no trade-off, only one implementable option); D7's store boundary was already ratified by the proposal and REQ-SAS-2; D1/D2 are removable configuration. ADR count stays at **25**, slot 26/26 reserved (AC-14.8).

## Block Decomposition

| Block | Capability | Files | Est. LoC | Commit |
|---|---|---|---|---|
| **0** | — | 2 | ≤5 | `chore(cp-foundation): scaffold-changes-dir-and-gitignore-extend` |
| **A** | `control-plane-shell` | 10 | ~180 | `feat(control-plane): shell-scaffold-pnpm-vite-ts-strict` |
| **B** | `projection-loader-port` + `schema-validation-pipeline` | 8 | ~420 | `feat(control-plane): projection-loader-ajv-schema-registry-diagnostics` |
| **C** | `serverless-app-shell` | 11 | ~300 | `feat(control-plane): routes-and-views-serverless-shell` |
| **D** | `golden-fixture-corpus` | 16 | ~210 | `feat(golden): control-plane-minimum-corpus` |
| **E** | tests | 5 | ~295 | `test(control-plane): vitest-loader-ajv-diagnostics-fixtures` |
| **F** | manifest + tools + README | 3 | ≤70 | `chore(manifest): regen-control-plane-entries` (+2 companions) |

Ordering constraint: **D before E** (specs read real fixtures) and **B before C** (views import store types). A-lite 6-block ceiling unchanged.

## Design-Time Evidence Receipts

| Probe | Command | Result | Feeds |
|---|---|---|---|
| engines enforcement | `pnpm install` with `engines.node: ">=99.0.0"` | `[WARN] Unsupported engine`, **exit 0** | D1 |
| preinstall guard | same + `preinstall` node-major check | **exit 1**, install blocked, `grep -cE '\^\|~'` = 0 | D1 |
| packageManager self-management | `packageManager: "pnpm@10.0.0"`, host pnpm 11.9.0 | `pnpm --version` → **10.0.0** (no Corepack) | D2 |
| version resolution | `pnpm view <pkg> version engines --json` × 13 | table in D3; all engine floors ≤ 24 | D3 |
| schema const collision | `jq '.["$id"], .properties.schema.const' specs/*.schema.json` | `cp-project` and `control-plane` share `control-plane/project/v1`; `catalog-entity` has no const | D4 |
| format inventory | `grep -oh '"format": *"[a-z-]*"' specs/*.schema.json` | 17 hits, **all `date-time`** | D5 |
| schema payload size | `du -ch specs/{cp-*,catalog-entity,control-plane,control-plane-extension}.schema.json` | 64 KB total | D5 |
| File API | `node -e "typeof File; typeof Blob.prototype.text"` | both `function` | D8 |
| C4 renderer | `which likec4` | not found | §Architecture Model |

## Next Recommended

`sddk-tasks` — decompose Blocks 0/A–F into apply tasks, carrying §"AC-Driven Source Constraints" verbatim into the task acceptance text, and gating Block A on the D3 resolution + smoke-gate receipts.
