# Proposal: cp-foundation — Control Plane Foundation slice 1 (scaffold + projection loader + diagnostics)

- **Change id**: `cp-foundation`
- **Cycle**: `p-7c4aff45199a2069/m14-cp-foundation`
- **Evidence**: `explore-report.md` SHA-256 `a07e42755d07813b4399fae311ba62cde2da8ac305206e742a1dcbe2bbc24318` (518 lines, C3, gates G1–G8 PASS, hypothesis HOLDS, Option B recommended, 0 new ADRs required)
- **Baseline**: branch `main`, HEAD `3d1176e` (post-v0.5.6, working tree clean)
- **Target branch** (apply): `feat/m14-cp-foundation-2026-08-30`
- **Path**: A-lite; **version target**: v0.6.0 (MINOR — `control-plane/` is net-new product surface)
- **Rounds**: 1 (m14)

## Intent

Open the M10 arc with **slice 1 only**: scaffold `control-plane/` as a static
TypeScript/React SPA per `docs/28` + `control-plane/STACK.md`; implement a
projection loader with `DirectoryProjectSource` + `SnapshotProjectSource`; validate
catalog entities and projections against the 16 `specs/cp-*.schema.json` +
`specs/catalog-entity.schema.json` schemas with **diagnostic-not-crash** on
invalid input; ship a minimum-viable 6-fixture golden corpus per `docs/24`
§Schema fixtures; and prove end-to-end loading via a minimal app shell satisfying
the core path of `uat/UAT-M10-01.md` (serverless loading — no application API
calls, Overview/Story/Visual/QA/History views render from a loaded projection).

The m13 cycle retired the pack-only invariant and shipped the first
post-pack-only `tools/` entry (`tools/sddk-pack-audit`). m14 extends that
precedent into a second post-pack surface — `control-plane/` — but stays
strictly read-only on tracked sources until apply.

## Scope

### In Scope

- **`control-plane/` workspace scaffold** — `package.json` (engines.node, `packageManager: "pnpm@11.9.0"`, exact-pinned deps), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json` (strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), `vite.config.ts` (React plugin, NO PWA plugin), `.gitignore` (local Node ignores), `index.html`.
- **Minimal app shell** — `src/main.tsx` (React 19.2 root), `src/app/App.tsx` (provider tree + error boundary).
- **Projection loader port + 2 implementations** — `src/loader/ProjectSource.ts` (`discover()`, `load()`, `refresh?()`), `SnapshotProjectSource` (mandatory, reads from `File`/`FileList`), `DirectoryProjectSource` (File System Access API progressive enhancement with snapshot fallback for non-Chromium).
- **Schema validation pipeline** — `src/schema/ajv.ts` (Ajv 8 + JSON Schema 2020-12 + strict + `allErrors` + known formats), `src/schema/registry.ts` (lazy-compile, keyed by `schema:` const, maps all 13 `cp-*` envelopes + `catalog-entity/v1alpha1` + `control-plane-extension-config/v1` placeholder), `src/diagnostics/types.ts` (`Diagnostic<T> = { ok: true, data: T } | { ok: false, errors: AjvError[] }`).
- **State** — `src/store/projectionStore.ts` (Zustand: current loaded projection + diagnostics; **no** Dexie persistence in slice 1).
- **Routes** — `src/routes/router.ts` + `src/routes/routes.tsx` (TanStack Router minimal tree: `/`, `/overview`, `/story`, `/visual`, `/qa`, `/history`; loaders read from Zustand, not remote APIs).
- **Views** — `Overview.tsx` (renders `cp-project.project` + lifecycle + checks), `Story.tsx` (`cp-chapters.chapters`), `Visual.tsx` (`cp-assets.assets`), `QA.tsx` (`cp-uat.uat.runs` + `cp-visual-quality.status`), `History.tsx` (`cp-history`).
- **Tests** — `test/loader.snapshot.spec.ts`, `test/loader.diagnostics.spec.ts`, `test/ajv.spec.ts`, `test/schema-fixtures.spec.ts` (Vitest + Testing Library per `docs/28` §Testing).
- **Golden fixtures (minimum corpus)** — `golden/control-plane/project-valid/` (1 NarrativeProject + 1 Character catalog entity + 5 valid projections: `cp-project`, `cp-chapters`, `cp-characters`, `cp-assets`, `cp-uat`), `golden/control-plane/project-invalid-schema/` (`cp-project.missing-schema.json` to prove diagnostic-not-crash), `golden/control-plane/snapshot-valid/` (`manifest.json` pointing to `projections/`).
- **Path-traversal guard** in `SnapshotProjectSource` (per `docs/24` §Security).
- **Root `.gitignore` EXTEND** (never overwrite) — adds Node entries, preserves Python + `.narrative/` + `assets/generated/candidates/` + `build/`.
- **`MANIFEST.json` regen** — post-apply incremental addition + `_meta.regenerated_at` + `_meta.regeneration_reason` (m13 precedent).
- **Slice-1 README** — prerequisite verification (`pnpm --version`, `node --version`), `pnpm install && pnpm build && pnpm test && pnpm preview` smoke recipe.

### Out of Scope (deferred to slice 2+ per launch packet)

- **CatalogEntity persistence** (CatalogStore slice + Dexie-backed registry) — slice 3+ per `docs/35` §Conflict strategy.
- **Entity pages** (Project / Character / Asset / Build entity pages) — slice 3 per `docs/13` §Entity pages.
- **Extension Registry runtime** (EntityTab / EntityCard / HomeWidget instantiations) — slice 2 per `docs/30` + ADR-022.
- **Studio Home + Workbench** — slice 5 per `docs/33` + ADR-025.
- **Search** (Orama collators) — slice 4 per `docs/32`.
- **Narrative Docs** (`react-markdown` + sanitizing rehype layer + entity-link plugin) — slice 4.
- **Graph lenses** (Graphology + Sigma stable 3.x + ForceAtlas2 worker) — slice 6.
- **Recipes (RJSF)** — slice 7 (M10.1) per `docs/31` + ADR-023.
- **Capability catalog** — M10.2 per `docs/19`.
- **Multi-project** — M10.3 per `docs/19` + `docs/35`.
- **PWA** (Vite PWA plugin or equivalent) — optional per `docs/28` §Baseline, capability-gated.
- **Bundle-size budget enforcement** — "after M10 first usable build" per `docs/28` §Dependency governance.
- **Fixture expansion** — `project-stale-projection`, `project-malicious-docs`, `two-project-catalog`, `large-graph`, `recipes`, performance fixtures (10 projects / 1k entities / 10k nodes) — slice N+ per `docs/24`.
- **Playwright browser UAT harness** — manual `vite preview` smoke only in slice 1.
- **Spec pack modifications** — `docs/`, `specs/`, `examples/`, `uat/` UNCHANGED.

## Capabilities

> CONTRACT with sddk-spec. Vault research: the only existing capability node
> in this project is `capability-m2-init-2026-08-28` ("no test runner present;
> spec-pack stage"); m14 introduces Vitest per `docs/28` §Testing, so that
> detection is invalidated. All five capability names below are net-new and
> MUST be reused verbatim in `specs/<capability>/spec.md` by sddk-spec.

### New Capabilities

- **`control-plane-shell`** — workspace scaffold (`control-plane/package.json`, `pnpm-workspace.yaml`, lockfile, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`) + minimal app shell (`src/main.tsx`, `src/app/App.tsx` + provider tree + error boundary). Pins: `engines.node: ">=24.0.0"`, `packageManager: "pnpm@11.9.0"`, Vite 8.1 / React 19.2 / TypeScript strict / TanStack Router / Tailwind 4.3 / Zustand / Ajv 8 (exact patches decided by apply per R-005). Vitest introduced as test runner. No PWA plugin in slice 1.
- **`projection-loader-port`** — `ProjectSource` port interface (`discover()`, `load(projectId): Promise<Diagnostic<ProjectionBundle>>`, `refresh?()`) + two implementations: `SnapshotProjectSource` (mandatory, reads `File`/`FileList`, with path-traversal guard per `docs/24` §Security) + `DirectoryProjectSource` (File System Access API progressive enhancement for Chromium, snapshot fallback for non-Chromium). Bundle = `{ project, chapters, characters, assets, uat, visualQuality, history }` keyed by `cp-*` `schema:` const.
- **`schema-validation-pipeline`** — Ajv 8 instance (`strict: true`, `allErrors: true`, known formats explicitly registered, no remote schema fetching) + JSON Schema 2020-12 + schema registry mapping `schema:` const → compiled validator, **lazy-compiled** on first use so adding `creation-recipe/v1` or `control-plane-extension-config/v1` later is a one-line addition. Diagnostic shape `{ ok: true, data: T } | { ok: false, errors: AjvError[] }`; never throws on invalid input.
- **`golden-fixture-corpus`** — minimum 6 fixtures under `golden/control-plane/`: `project-valid/` (1 NarrativeProject + 1 Character catalog entity + 5 valid `cp-*` projections), `project-invalid-schema/` (`cp-project.missing-schema.json` proves diagnostic-not-crash), `snapshot-valid/` (`manifest.json` + `projections/` per `docs/34` §Snapshot format). Path-traversal guard verified against a 7th malicious-snapshot fixture (in-pack test, no committed fixture). Deferred families (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) listed in `design.md` §"Future Work".
- **`serverless-app-shell`** — 5 view components rendering from the loaded projection (Overview / Story / Visual / QA / History) wired by 6 TanStack Router routes that consume the Zustand store, NOT remote APIs. `App.tsx` provider tree + error boundary that catches any uncaught render exception and routes it to a diagnostic panel (never crashes the SPA on a malformed projection). Satisfies `UAT-M10-01` core path: "Network panel shows no required application API request."

### Modified Capabilities

- **None.** Existing capabilities (`catalog-vocabulary-normalization`, `cli-json-contracts`, `control-plane-projection-schemas`, `profile-alias-consumption`, `event-log-schema`, etc.) are unchanged at spec level; m14 only consumes them.

## Approach

**Option B** from explore §"Approaches" — `docs/25` CP-A (shell) + CP-B (loader) + minimal CP-C (project view), with the schema-fixtures corpus sized to `docs/24` minimum. Single reviewable unit; no split.

| Block | Path | Files | Est. LoC | Risk |
|---|---|---|---|---|
| **0** `.gitignore` extend + `changes/cp-foundation/` skeleton | in-pack | 2 | ≤5 | Trivial |
| **A** `control-plane-shell` | out-of-pack (`control-plane/`) | 9 | ~80 | Low |
| **B** `projection-loader-port` + `schema-validation-pipeline` | out-of-pack (`control-plane/src/{loader,schema,diagnostics,store}/`) | 11 | ~400 | Med |
| **C** `serverless-app-shell` (routes + views) | out-of-pack (`control-plane/src/{routes,views,app}/`) | 9 | ~300 | Med |
| **D** `golden-fixture-corpus` | out-of-pack (`golden/control-plane/`) | 6 fixtures + 1 snapshot | ~150 | Low |
| **E** Tests (Vitest) | out-of-pack (`control-plane/test/`) | 4 specs | ~250 | Low |
| **F** `MANIFEST.json` regen + slice-1 README + `tools/install-pnpm.sh` helper | pack + `tools/` | 3 | ≤30 | Low |

Total ≈ 44 files, ~1215 LoC (matches explore §"File-by-file scope" of ~30 files / 1000–1500 LoC with overhead for tests + fixtures). Within A-lite review budget (6 blocks ≤ A-lite 6-block ceiling — at the ceiling; if reviewer wants more, the natural split line is **Block A only** as 1a and Blocks B–F as 1b, matching `docs/25` CP-A vs CP-B boundary).

**Architectural commitments made here** (apply cannot re-open these without re-proposal):
- `engines.node: ">=24.0.0"` (R-002 recommendation from explore — accepts Node 25 dev installs while CI gates on Node 24 LTS).
- `packageManager: "pnpm@11.9.0"` + apply-phase `pnpm --version` gate (R-003 mitigation).
- Schema registry shape: lazy-compile keyed by `schema:` const (R-007 mitigation; one-line additions for recipes + extension-config in slice N+).
- Per-projection `cp-*.schema.json` is the validation target for golden fixtures; `control-plane.schema.json` is the bundle schema and stays slice 2+ surface (R-006 disambiguation).
- TanStack Router loaders consume the Zustand store, not the loader port directly (R-009 boundary decision).
- No PWA plugin in slice 1 (R-010 serverless guarantee — design lists `no-network deps` as a hard rule).

## Quality Intent

- **Production surfaces**: `control-plane/{package.json,pnpm-workspace.yaml,pnpm-lock.yaml,tsconfig.json,vite.config.ts,index.html,.gitignore}`, `control-plane/src/{main.tsx,app/,loader/,schema/,diagnostics/,store/,routes/,views/}`, `control-plane/test/`, `golden/control-plane/{project-valid,project-invalid-schema,snapshot-valid}/`, root `.gitignore` (extended), `MANIFEST.json` (regen), `tools/install-pnpm.sh` (helper), `control-plane/README.md`.
- **Changed public APIs**: `ProjectSource` port + 2 implementations (new); `Diagnostic<T>` shape (new); Ajv 8 schema registry (new); TanStack Router 6 routes (new). All `control-plane/`-internal; no spec-pack API impact.
- **Readiness dimensions**:
  - **contract completeness** — every `cp-*` schema in `specs/` resolves through the registry; every `golden/` fixture exercises its `schema:` const.
  - **internal consistency** — no `specs/*.schema.json` modified; root `.gitignore` extended additively; `MANIFEST.json` regen follows m13 precedent.
  - **testability** — Vitest introduced; 4 spec files cover loader end-to-end, AJV setup, diagnostics, fixtures; all are headless + offline.
  - **security** — path-traversal guard on `SnapshotProjectSource` (rejects `..` and absolute paths outside the snapshot root); no remote schema fetching; no telemetry/analytics/remote fonts/CDN.
- **Required real boundaries**:
  - `pnpm install && pnpm build && pnpm test` MUST succeed against the real `specs/*.schema.json` files (no mocks).
  - `vite preview` against `golden/control-plane/snapshot-valid/` MUST serve the SPA and render all 5 views from the loaded projection.
  - Loading `golden/control-plane/project-invalid-schema/` MUST return a diagnostic with at least one `AjvError` (path + keyword + message) and the SPA MUST remain interactive (no crash).
  - DevTools Network panel MUST show zero outbound application-API requests after SPA load (UAT-M10-01).

## Architecture Impact

- **Level**: `boundary` — `control-plane/` is a net-new deployable area crossing the prose-contracts ↔ executable-code seam. First static TypeScript/React SPA in this repo.
- **Evidence**:
  - **Inputs**: `specs/cp-{project,chapters,characters,assets,uat,visual-quality,progress,history,scm,costs,approvals,workflow,graph}.schema.json` (13 envelopes), `specs/catalog-entity.schema.json`, `specs/control-plane-extension.schema.json` (slice 2+), `examples/catalog-project.yaml` (in-tree catalog fixture).
  - **Outputs**: static `dist/` bundle; runtime zero network API calls; loaded projection surfaced via Zustand `projectionStore`.
  - **Precedent**: `tools/sddk-pack-audit` (m13, post-pack-only precedent for in-tree TypeScript tooling under a sibling directory to `control-plane/`).
  - **ADRs consumed (no new ones)**: ADR-014 (projection envelopes), ADR-021 (catalog projection), ADR-022 (extension kinds), ADR-024 (federated providers — relevant for DirectoryProjectSource), ADR-025 (Studio Home — slice 5 deferral).
- **Architecture intent**: A proposal-phase observed/planned C4 preview is produced by `sddk-c4-likec4` if available; otherwise the fallback table below is the canonical intent for design phase to deepen.

| Element | Observed (today) | Planned (after m14 slice 1) |
|---|---|---|
| Container `control-plane/` | `STACK.md` + 1 ComfyUI workflow | Full pnpm workspace SPA (shell + loader + diagnostics + 5 views) |
| Container `golden/` | absent | `control-plane/{project-valid,project-invalid-schema,snapshot-valid}/` |
| Container `tools/` | 2 entries (Bash preflight + pack-audit CLI) | + 1 entry (`install-pnpm.sh` helper) |
| Container `changes/` | 2 changes | + 1 change (`cp-foundation/`) |
| External actor `sddk-verify` | pack-only via `sddk-pack-audit gate` | + `control-plane/` shell-build verifier (`pnpm install && pnpm build && pnpm test`) |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `changes/cp-foundation/{proposal,design,tasks,spec}.md` | New | The change record (4 files; this proposal + design + tasks + spec) |
| `control-plane/package.json` | New | First in-tree SPA `package.json`; `engines.node`, `packageManager`, exact-pinned deps |
| `control-plane/pnpm-workspace.yaml` | New | Workspace root declaration (single-app for slice 1; ready for slice N+ expansion) |
| `control-plane/pnpm-lock.yaml` | New | Lockfile committed per `docs/28` §Dependency governance |
| `control-plane/tsconfig.json` | New | TS strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` |
| `control-plane/vite.config.ts` | New | Vite 8.1 + React plugin; **NO PWA plugin** |
| `control-plane/.gitignore` | New | Local Node ignores |
| `control-plane/index.html` | New | Vite entry |
| `control-plane/src/{main.tsx,app/,loader/,schema/,diagnostics/,store/,routes/,views/}` | New | React 19.2 app source (~30 files) |
| `control-plane/test/{loader.snapshot,loader.diagnostics,ajv,schema-fixtures}.spec.ts` | New | Vitest specs (4 files) |
| `control-plane/README.md` | New | Prereqs + smoke recipe |
| `golden/control-plane/{project-valid,project-invalid-schema,snapshot-valid}/` | New | 6-fixture minimum corpus |
| `tools/install-pnpm.sh` | New (helper, optional) | CI-friendly pnpm prerequisite installer (≤30 lines; `set -euo pipefail`) |
| Root `.gitignore` | EXTEND | + `node_modules/`, `dist/`, `.vite/`, `coverage/`, `*.log`, `.pnpm-store/` (additive; Python entries preserved) |
| `MANIFEST.json` | MODIFIED (regen) | + entries for new `control-plane/*` files + `golden/control-plane/*`; `_meta.regenerated_at` + `_meta.regeneration_reason` updated |
| `docs/`, `specs/`, `examples/`, `templates/`, `uat/` | UNCHANGED | Slice 1 must not modify any spec-pack file |
| `tools/sddk-pack-audit` | UNCHANGED | Owned by m13 cycle |
| `docs/adrs/ADR-026-*.md` | NOT REQUIRED | Slice 1 introduces 0 ADRs (slot 26/26 stays reserved per explore §G5) |

## Risks

> Top 12 from explore §"Risks"; R-002/R-003/R-006/R-009 explicitly flagged by
> launch packet as "OPEN DECISIONS FOR DESIGN — do not preempt". This proposal
> makes the architectural commitments above (R-002, R-003, R-006, R-009, R-007)
> so design phase can ratify without re-opening.

| Risk | Likelihood | Mitigation |
|---|---|---|
| **R-001** Exact-version pinning policy not codified | HIGH | Design phase commits `package.json` template with **exact** versions (no `^`/`~`) for the 7 critical slice-1 deps; lockfile committed; CI runs `pnpm install --frozen-lockfile` |
| **R-002** Node 25 vs Node 24 LTS baseline divergence | HIGH | **Architectural commitment**: `engines.node: ">=24.0.0"`; CI gate on Node 24 LTS as release gate per project CI policy (local CI source of truth; remote CI reserved for release) |
| **R-003** Corepack absent; `packageManager` cannot enforce pnpm | HIGH | **Architectural commitment**: `packageManager: "pnpm@11.9.0"` + apply-phase `pnpm --version` gate (refuse if not 11.9.x); document prereq in slice-1 README; ship `tools/install-pnpm.sh` helper for CI |
| **R-004** `.gitignore` extension risks overwriting Python entries | MED | Apply phase uses additive edit only; pre-commit `git diff .gitignore` verification that no Python entries removed |
| **R-005** Vite 8.1 / React 19.2 / TanStack Router / Tailwind 4.3 patch reality | MED | Apply phase opens a pre-install verification step (`pnpm view <pkg> version` for each); records resolved versions in apply-progress YAML; updates `control-plane/STACK.md` only if it deviates from `docs/28` baseline — never silently |
| **R-006** `control-plane.schema.json` vs `cp-project.schema.json` validation target disambiguation | MED | **Architectural commitment**: validate golden fixtures against per-projection `cp-*.schema.json` (one file per projection family keyed by `schema:` const); `control-plane.schema.json` is the bundle schema and stays slice 2+ surface. Registry shape documented in `design.md` |
| **R-007** Recipes + extension-config fixtures deferred | MED | **Architectural commitment**: schema registry uses lazy-compile keyed by `schema:` const; adding `creation-recipe/v1` or `control-plane-extension-config/v1` is a one-line addition later. No rework in slice N+ |
| **R-008** Catalog fixture corpus minimal but provable | MED | Slice 1 minimum corpus (`project-valid`, `project-invalid-schema`, `snapshot-valid`) proves diagnostic-not-crash + serverless loading; deferred-fixture inventory lives in `design.md` §"Future Work" for next cycle |
| **R-009** TanStack Router loader state vs Zustand boundary | LOW-MED | **Architectural commitment**: Zustand holds loaded projection + diagnostics (single slice); TanStack Router routes load by reading Zustand, not the loader port directly. Keeps loader testable in isolation and prevents race conditions |
| **R-010** "Serverless" definition in UAT-M10-01 must not leak | LOW | Design lists "no-network deps" as hard rule for slice 1; apply greps `package.json` for telemetry/analytics/remote fonts/CDN; DevTools Network panel verified empty post-`vite preview` |
| **R-011** Bundle-size budget not enforced | LOW | Design adds `pnpm build` script that prints `dist/` size; apply records initial number in slice-1 closing report (no gate) |
| **R-012** `MANIFEST.json` regeneration | LOW | Apply uses existing m13 regen pattern: incremental addition to documents array + update `_meta.regenerated_at` + `_meta.regeneration_reason` |

## Rollback Plan

This is a content + tooling + new SPA change with no runtime state. Per the
A-lite contract:

1. Every block lands as its own commit:
   - Block 0: `chore(cp-foundation): scaffold-changes-dir-and-gitignore-extend`
   - Block A: `feat(control-plane): shell-scaffold-pnpm-vite-ts-strict`
   - Block B: `feat(control-plane): projection-loader-ajv-schema-registry-diagnostics`
   - Block C: `feat(control-plane): routes-and-views-serverless-shell`
   - Block D: `feat(golden): control-plane-minimum-corpus`
   - Block E: `test(control-plane): vitest-loader-ajv-diagnostics-fixtures`
   - Block F: `chore(manifest): regen-control-plane-entries` + `chore(tools): install-pnpm-helper` + `docs(control-plane): slice-1-readme`
2. Released under tag `v0.6.0` (MINOR bump per release convention); release notes link to `UAT-M10-01` core-path evidence.
3. **Full rollback**: `git revert v0.5.6..v0.6.0` — or `--no-commit <first>..<last>` for selective revert.
4. **Partial rollback**: each block revertible independently. Block A's scaffold is removable without affecting Blocks B–F (B–F can be re-implemented against a different shell). Block D's fixtures are removable without affecting Blocks A/B/C/E (the loader still validates ad-hoc input).
5. **No remote dependency**: no CI integration to undo, no DB migration, no telemetry backend.
6. **No spec-pack mutation**: rollback never reverts `docs/`, `specs/`, `examples/`, `uat/`, `templates/` (none were modified).

## Dependencies

- **Baseline** `3d1176e` (post-v0.5.6) MUST remain unamended until apply.
- **16 schemas** in `specs/` (1 catalog-entity + 1 control-plane envelope + 1 control-plane-extension + 13 `cp-*`) are the validation inputs and MUST remain unmodified by slice 1 (AC-INV-1 of m13 cycle still binding).
- **`docs/28-CONTROL-PLANE-STACK.md` baseline** (Node 24 LTS / Vite 8.1 / React 19.2 / TS strict / TanStack Router / Tailwind 4.3 / Zustand / Ajv 8 / Vitest) — locked at proposal time, ratified by apply-phase exact-version verification per R-005.
- **`docs/25-IMPLEMENTATION-STARTER.md` §Control Plane first slices** (CP-A..CP-I) — slice 1 covers CP-A + CP-B + minimal CP-C + schema-fixtures corpus; CP-D..CP-I deferred.
- **`docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`** (envelope shape + validation pipeline + snapshot format) — authoritative for loader contract.
- **`docs/35-CATALOG-PROVIDERS.md`** (catalog + provider contract) — slice 1 surface is validate-only; full CatalogStore persistence deferred to slice 3+.
- **`uat/UAT-M10-01.md`** — slice 1 exit criterion (serverless loading; 5 views render from loaded projection).
- **25 ADRs** in `docs/adrs/ADR-001..025` — all consumed; no new ADR for slice 1 (slot 26/26 stays reserved for a future irreversibility decision).
- **m13 release state** (`v0.5.6`, `tools/sddk-pack-audit` precedent, MANIFEST regen pattern) — prerequisite precedent for first post-pack-only `control-plane/` entry.
- **Node 24 LTS runtime + pnpm 11.9.x** — apply-phase prereq verified by `tools/install-pnpm.sh` helper (no Corepack dependency on host).

## Success Criteria

| id | Criterion | Milestone |
|---|---|---|
| **AC-14.1** | `changes/cp-foundation/{proposal,design,tasks,spec}.md` all exist; spec.md declares the 5 new capabilities (`control-plane-shell`, `projection-loader-port`, `schema-validation-pipeline`, `golden-fixture-corpus`, `serverless-app-shell`) | M14 |
| **AC-14.2** | `control-plane/package.json` declares `engines.node: ">=24.0.0"`, `packageManager: "pnpm@11.9.0"`, and exact-pinned versions for the 7 critical slice-1 deps (no `^`/`~`); `pnpm-lock.yaml` committed; `pnpm install --frozen-lockfile` succeeds on Node 24 LTS | M14 |
| **AC-14.3** | `pnpm build` produces a static `dist/` bundle; `pnpm test` runs 4 Vitest specs and exits 0 | M14 |
| **AC-14.4** | `vite preview` against `golden/control-plane/snapshot-valid/` serves the SPA and all 5 views render their projection data; Network panel shows zero outbound application-API requests after load (UAT-M10-01 core path) | M14 |
| **AC-14.5** | Loading `golden/control-plane/project-invalid-schema/` returns a `Diagnostic` with at least one `AjvError` (path + keyword + message); SPA remains interactive; no console error escape (UAT-M10-01 exit criterion) | M14 |
| **AC-14.6** | `SnapshotProjectSource` rejects `..` and absolute paths outside snapshot root (path-traversal guard verified by Vitest spec); no remote schema fetching in Ajv setup | M14 |
| **AC-14.7** | Root `.gitignore` extended additively (Python + `.narrative/` + `assets/generated/candidates/` + `build/` entries preserved); `MANIFEST.json` regen includes new `control-plane/*` + `golden/control-plane/*` entries; `_meta.regenerated_at` + `_meta.regeneration_reason` updated per m13 precedent | M14 |
| **AC-14.8** | ADR count stays at 25 (0 new ADRs for slice 1; slot 26/26 remains reserved for a future slice requiring an irreversibility decision) | M14 |
| **AC-14.9** | Zero introduced HIGH/MEDIUM/CRITICAL findings by `sddk-pack-audit gate` against the post-apply tree; slice-1 README documents `pnpm install && pnpm build && pnpm test && pnpm preview` smoke recipe + the `pnpm --version` / `node --version` prereq gate | M14 |
| **AC-14.10** | Slice-1 closing report records initial `dist/` bundle size (R-011 baseline; no gate), `pnpm --version` verification receipt (SC-POL-1 evidence), and `sddk-pack-audit gate` PASS receipt with recorded argv/exit_code | M14 |

## Vault References

- `~/.sddk-knowledge/p-7c4aff45199a2069/capabilities/capability-m2-init-2026-08-28.md` (only existing capability node — invalidated by Vitest introduction in slice 1; replaced by the 5 new capabilities above)
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/cycle-m12-spec-completion-followup-7-2026-08-30.md` (m12 precedent for pack-only invariant retirement)
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/review-block-{6A..6E}-2026-08-28.md` (m6 review-budget precedent for A-lite 6-block ceiling)
- `~/.sddk-knowledge/p-7c4aff45199a2069/incs/INC-002-review-budget-overrun-policy.md` (review-budget guardrail)
- Cycle artifact: `p-7c4aff45199a2069/m14-cp-foundation/explore-report.md` (SHA-256 `a07e42755d07813b4399fae311ba62cde2da8ac305206e742a1dcbe2bbc24318`; hypothesis HOLDS, Option B recommended, 0 new ADRs)
- Inner-repo: `docs/{19-ROADMAP,25-IMPLEMENTATION-STARTER,28-CONTROL-PLANE-STACK,34-CONTROL-PLANE-DATA-CONTRACTS,35-CATALOG-PROVIDERS}.md` (M10 strategic anchors)
- Inner-repo: `uat/UAT-M10-01.md` (slice-1 exit criterion)
- Inner-repo: `control-plane/STACK.md` (pinned baseline; ratified by apply per R-005)
- Inner-repo: `specs/{catalog-entity,control-plane,control-plane-extension,cp-*}.schema.json` (16 validation inputs)
- Inner-repo precedent: `tools/sddk-pack-audit` (m13 first post-pack-only `tools/` entry — pattern for `control-plane/` as second post-pack surface)
