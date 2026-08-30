# m16-cp-studio-search-docs — Control Plane slice 3a (Local Search + Safe Narrative Docs + Decision projection) — Delta Spec

## Source

- **Proposal SHA-256**: `e708a09043174d40774f9d66720c6dda6850d519339910d7572d2857e28f1c45` (`changes/m16-cp-studio-search-docs/proposal.md`, 281 LoC, cycle artifact `art-e708a0904317-c3663f75`).
- **Explore-report SHA-256**: `da68a80f77d41b91b56eaa445353149751cfdd1574f584d7d0e6f495fff4e404` (`cycle-artifacts/p-7c4aff45199a2069/m16-cp-studio-search-docs/explore-report.md`, 359 LoC, C2, Option B recommended, INC-008 binding, 8 of 10 m15 INCs explicitly deferred).
- **Cycle**: `p-7c4aff45199a2069/m16-cp-studio-search-docs` (A-lite, branch `feat/m16-cp-studio-search-docs-2026-08-30`, base `e530855eae910149ff8ee74dd689aa3e09d3fa8c`).
- **Path**: A-lite, execution mode `auto`; **version target**: v0.8.0 (MINOR).
- **Capability IDs** (3 NEW + 5 MODIFIED, names reused verbatim from proposal §"Capabilities"): `local-search-index` (NEW), `safe-narrative-docs` (NEW), `decision-projection` (NEW), `extension-registry` (MODIFIED), `feature-extensions` (MODIFIED), `projection-loader-port` (MODIFIED), `golden-fixture-corpus` (MODIFIED), `serverless-app-shell` (MODIFIED). Unchanged consumed: `control-plane-shell`, `schema-validation-pipeline`, `catalog-and-entity-pages`.
- **Binding exit criterion**: `uat/UAT-M10-03-local-search-docs.md` — Given a project snapshot with characters, chapters, assets, decisions, and Markdown docs; When the user searches for `llave plateada`; Then results include applicable character, scene/chapter, asset, decision, and docs entries; opening docs renders safe Markdown; Pass = useful results without network search service + unsafe content does not execute + source/entity navigation works.
- **Test baseline (must remain green)**: 28 m15 vitest across 12 spec files; final count grows by ≥ 3 new specs (`search.spec.ts` + `docs-sanitization.spec.ts` + `decision-projection.schema-fixtures.spec.ts`) + 2 extended specs (`extension-isolation.spec.ts` + `loader.snapshot.spec.ts`).

## Purpose

m16 opens slice 3a of the M10 arc (`docs/19-ROADMAP.md` §M10) on top of the m15 v0.7.0 catalog-and-entity-pages baseline. Slice 1 (m14) shipped the projection loader, 5 placeholder views, and the serverless SPA shell. Slice 2 (m15) shipped the catalog store + Extension Registry + entity pages + 8-tab composition. **Slice 3a ships Local Search + safe Narrative Docs + the missing 5th result type (decision) + Markdown entity-doc rendering** as the smallest coherent surface that satisfies UAT-M10-03. V1 ships a documented in-memory substring index over catalog entities + the 4 cp-* projections + Markdown docs — NOT Orama — with the migration path explicitly recorded in `docs/32`. Studio Home, Workbench, initial Graph Lenses remain as separate bounded cycles (m16b / m16c / m16d) per launch packet scope focus.

After this delta:

1. **`local-search-index`** — V1 in-memory substring full-text index over catalog entities + the 5 cp-* projection keys (project / chapters / characters / assets / decisions) + Markdown docs. Pure `searchIndex.ts` builder (testable in isolation); `useSearchIndex` React hook wraps the builder with `useProjectionStore` subscription + memoization. Tokenizer = case-insensitive + ASCII-folded (NFD + strip combining marks + lower); ranker = entity-ref specificity (exact id > namespace/name > text-match). Output: `SearchResult[]` discriminated by `type ∈ {character, scene-chapter, asset, decision, docs}`. Documented as a temporary primitive in `docs/32` §"Index persistence".
2. **`safe-narrative-docs`** — `react-markdown` + `rehype-sanitize` + `remark-gfm` Markdown rendering pipeline exposed through a `features/docs/character/DocTab.tsx` feature extension registered against the existing Extension Registry. **No new registry kind**; `EntityTabExtension` carries a `kind: 'docs'` discriminator field (additive metadata, NOT a new `apiVersion`). Entity-link syntax `[[Kind:namespace/name]]` parsed by a safe custom remark plugin that reuses `parseEntityRef` from `store/entityRef.ts`; unknown refs render as plain text. Source path resolution: entity's `metadata.annotations['narrative.dev/source-path']` → snapshot `docs/<basename>.md`.
3. **`decision-projection`** — NEW `specs/cp-decisions.schema.json` (NEW file, NOT a modification of existing — respects AC-INV-schema binding) + Decision catalog entity (`apiVersion: narrative.dev/v1alpha1`, `kind: Decision`) + `cp-decisions.json` projection fixture. Decision shape: `{ id, action, targetRef (Kind:namespace/name), date, status ∈ {accepted, rejected, pending, superseded} }` derived from `docs/04-DOMAIN-MODEL.md` (Workflow/governance) + ADR-008 + ADR-015 + `docs/34` EntityRef convention.
4. **`extension-registry` (MODIFIED)** — `EntityTabExtension` gains additive `kind: 'docs'` discriminator field (metadata only, dispatch contract unchanged, `apiVersion: 'control-plane.extensions/v1'` preserved verbatim). `extension-isolation.spec.ts` test 4 grep oracle **extended** with the relative-escape pattern `from\s+['"]\.\./\.\./(story|visual|catalog|continuity|docs)/` to close **INC-008 (FIND-F80375, CL-03, P2 MEDIUM)** — the residual m15 F-15-E PARTIAL PASS gap.
5. **`feature-extensions` (MODIFIED)** — adds `features/docs/` as the 5th independent feature folder. The m15 grep invariant extends to include `features/docs/`; the same test enforces the new boundary.
6. **`projection-loader-port` (MODIFIED)** — `ProjectionBundle` gains `decisions: unknown` + `docs: unknown` fields; `SnapshotProjectSource.load` gains a `loadDocs` helper that reads `docs/*.md` while preserving the existing `isSafeRelativePath` path-traversal guard.
7. **`golden-fixture-corpus` (MODIFIED)** — adds 4 NEW fixture files (`cp-decisions.json`, `decision-silver-key.yaml`, 3 Markdown docs in `snapshot-valid/docs/`) and MODIFIES 4 existing files (`manifest.json`, `cp-characters.json`, `cp-chapters.json`, `cp-assets.json`) with indexable text fields. Path-traversal guard fixture + M14/M15 in-pack test fixtures PRESERVED verbatim.
8. **`serverless-app-shell` (MODIFIED)** — `router.ts` adds the `/search` route (single-quoted `path: '/search'` per F-004 oracle pattern); `routes.tsx` F-004 oracle list is updated to include `/search` (closes **INC-009 (FIND-8E316A, CL-03, LOW P3) — AC-15.4 spec literal divergence** as natural side-effect).

After this delta, `uat/UAT-M10-03-local-search-docs.md` is satisfied and the slice-3a closeout task in `docs/19-ROADMAP.md` §M10 advances to done.

---

## Capability: `local-search-index` (NEW)

### Requirement: REQ-SID-1 — In-memory substring search index over catalog entities + 5 cp-* projections + Markdown docs

The system SHALL expose a pure `searchIndex.build(catalogEntities, bundle, docs)` function that produces an in-memory substring index over (a) every catalog entity's `kind` + `metadata.namespace` + `metadata.name` + `metadata.annotations` + body text, (b) the 5 cp-* projection keys `cp-project`, `cp-chapters`, `cp-characters`, `cp-assets`, `cp-decisions` (entries are enumerated by id + name + any text fields surfaced in the projection), and (c) every Markdown doc in the snapshot `docs/` directory (body text + filename). The index SHALL produce `SearchResult[]` discriminated by `type ∈ {character, scene-chapter, asset, decision, docs}` with shape `{ id: string, type: SearchResultType, title: string, snippet: string, entityRef: EntityRef-string, sourcePath: string, score: number }`. The index SHALL live in memory; it SHALL NOT use IndexedDB, SHALL NOT use Orama, SHALL NOT issue any network request.

#### Scenario: EVT-SID-01 — searchIndex.build returns SearchResult[] for all 5 result types against the snapshot-valid fixture and the UAT-M10-03 Given clause `llave plateada` is satisfied end-to-end

- **GIVEN** apply Blocks 0 + 2 land and `golden/control-plane/snapshot-valid/{projections/cp-{project,chapters,characters,assets,decisions}.json,catalog/decision-silver-key.yaml,docs/{narrative,nora,scene-silver-key}.md}` are committed
- **WHEN** a Vitest spec invokes `searchIndex.build(catalogEntities, bundle, docs)` with the snapshot-valid fixtures and then `index.search('llave plateada')` is called
- **THEN** the returned `SearchResult[]` SHALL contain at least one entry per `type ∈ {character, scene-chapter, asset, decision, docs}`
- **AND** every result SHALL carry a non-empty `title` + `snippet` + `entityRef` + `sourcePath` + `score`
- **AND** `pnpm test --run control-plane/test/search.spec.ts` SHALL exit `0`
- **AND** `grep -cE 'indexeddb|Dexie|orama|fetch\(' control-plane/src/store/searchIndex.ts` SHALL return `0` (no persistence, no remote code).

### Requirement: REQ-SID-2 — Tokenizer is case-insensitive AND ASCII-folded (NFD + strip combining marks + lower)

The system SHALL normalize every search term and every indexed token via the following pipeline BEFORE comparison: (1) Unicode NFD decomposition, (2) strip combining marks (Unicode category Mn), (3) lowercase. The match SHALL be a token-substring match (the query appears as a contiguous substring inside the tokenized text). The pipeline SHALL treat `LLAVE PLATEADA`, `llave plateada`, `Llàvé Pláteádà`, and `llave-plateada` as equivalent inputs and SHALL surface the same `SearchResult[]`.

#### Scenario: EVT-SID-02 — ASCII-folded case-insensitive tokenization matches uppercase, accented, and hyphenated variants of `llave plateada`

- **GIVEN** apply Block 0 lands and `searchIndex.tokenize('LLAVÉ PLÁTEÁDA')` is exported for testing
- **WHEN** a Vitest spec invokes `searchIndex.tokenize('LLAVÉ PLÁTEÁDA')` AND `searchIndex.tokenize('llave plateada')` AND `searchIndex.tokenize('Llàvé-Pláteádà')`
- **THEN** all three invocations SHALL return the same token array `['llave', 'plateada']`
- **AND** `index.search('LLAVE PLATEADA')` SHALL return the same `SearchResult[]` (modulo ordering) as `index.search('llave plateada')`
- **AND** `grep -cE 'NFD|combining' control-plane/src/store/searchIndex.ts` SHALL be `>= 2` (the normalization primitives are present in source).

### Requirement: REQ-SID-3 — Ranker scores by entity-ref specificity: exact id > namespace/name > text-match

The system SHALL rank search results using the following precedence (higher wins, ties broken by `id` lexicographic ascending): (a) exact `id` match (score = 100); (b) `Kind:namespace/name` exact match (score = 80); (c) full-token hit across multiple fields (score = 60); (d) single-token substring hit (score = 40); (e) snippet-only hit (score = 20). The ranker SHALL be deterministic: two calls with the same input SHALL produce the same result order.

#### Scenario: EVT-SID-03 — Ranking by entity-ref specificity is deterministic and exact-id outranks text-match

- **GIVEN** apply Block 0 lands and the snapshot-valid fixture contains (i) a Decision whose `id` is exactly `silver-key`, (ii) a Character entry whose `entityRef` is `Character:demo/nora`, (iii) a Markdown doc whose body mentions `llave plateada` without matching any entity id
- **WHEN** a Vitest spec invokes `index.search('silver-key')`
- **THEN** the FIRST result SHALL be the Decision (exact id, score = 100)
- **AND** the ranker SHALL be deterministic: invoking `index.search('silver-key')` twice SHALL return `SearchResult[]` in identical order (verified by deep-equal assertion)
- **AND** `grep -cE 'score|score =' control-plane/src/store/searchIndex.ts` SHALL be `>= 2` (the scoring function is present).

### Requirement: REQ-SID-4 — `useSearchIndex` React hook wraps the pure builder with `useProjectionStore` subscription + memoization

The system SHALL expose `useSearchIndex(query: string): SearchResult[]` from `control-plane/src/store/useSearchIndex.ts`. The hook SHALL subscribe to `useProjectionStore` for `catalogEntities` + `bundle`, SHALL call `searchIndex.build(...)` once on mount and on every change to the subscribed slots, SHALL memoize the result by `(query, catalogEntities, bundle, docs)` (shallow-equal), and SHALL return the memoized `SearchResult[]`. The hook SHALL be consumed ONLY from `views/Search.tsx` + `features/docs/` (per AC-INV-extension-isolation).

#### Scenario: EVT-SID-04 — useSearchIndex returns memoized SearchResult[] and is consumed only from views/Search.tsx + features/docs/

- **GIVEN** apply Blocks 0 + 1 + 3 land and `useSearchIndex.ts` is committed
- **WHEN** `grep -rE "useSearchIndex" control-plane/src/` is invoked
- **THEN** the consumer list SHALL contain exactly `views/Search.tsx` and any file under `features/docs/`
- **AND** the count SHALL be `<= 3` (one hook + one or two consumers; no third-party consumption)
- **AND** a Vitest spec that invokes the hook twice with the same `(query, catalogEntities, bundle, docs)` arguments SHALL observe exactly ONE call to `searchIndex.build` (memoization assertion via spy).

---

## Capability: `safe-narrative-docs` (NEW)

### Requirement: REQ-DOC-1 — Markdown rendering pipeline (`react-markdown` + `rehype-sanitize` + `remark-gfm` + entity-link plugin) with GFM-safe allow-list

The system SHALL render Markdown via `react-markdown` chained with `remark-gfm` (GFM tables + task lists + autolinks), `rehype-sanitize` (allow-list schema), and a custom Remark plugin `entityLinkPlugin` that maps `[[Kind:namespace/name]]` syntax to internal `<Link>` elements. The sanitization schema SHALL be GFM-safe by default AND SHALL explicitly strip `<script>` tags, `javascript:` URLs, `data:` URLs (in `<img>` and `<a>`), `vbscript:` URLs, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<form>`, inline event handler attributes (`onerror=`, `onclick=`, `onload=`, etc.), and raw HTML other than the Markdown-allowed subset (headings, links, lists, code blocks, emphasis, GFM tables, GFM task lists, blockquotes).

#### Scenario: EVT-DOC-01 — Pipeline composition includes react-markdown + rehype-sanitize + remark-gfm + entityLinkPlugin

- **GIVEN** apply Block 3 lands and `control-plane/src/features/docs/docsSafeMarkdown.ts` is committed
- **WHEN** `grep -nE 'react-markdown|rehype-sanitize|remark-gfm|entityLinkPlugin' control-plane/src/features/docs/docsSafeMarkdown.ts` is invoked
- **THEN** all four identifiers SHALL appear in the file (pipeline composition is explicit)
- **AND** the rehype-sanitize schema SHALL declare an explicit allow-list (verified by `grep -cE 'tagName|attributes' control-plane/src/features/docs/docsSafeMarkdown.ts` returning `>= 2`)
- **AND** `pnpm test --run control-plane/test/docs-sanitization.spec.ts` SHALL exit `0`.

### Requirement: REQ-DOC-2 — Sanitization allow-list strips every OWASP Markdown XSS cheat-sheet vector

The system SHALL reject (strip or replace with literal text) the following input vectors as enumerated by the OWASP Markdown XSS cheat-sheet; each vector is independently asserted in `docs-sanitization.spec.ts`:

| Vector | Example | Required outcome |
|---|---|---|
| raw `<script>` | `<script>alert('xss')</script>` | `<script>` not present in rendered output |
| `javascript:` URL | `[click](javascript:alert(1))` | `href` value does NOT begin with `javascript:` |
| `onerror=` attribute | `<img src=x onerror=alert(1)>` | `onerror` attribute not present in rendered output |
| `data:` URL in `<img>` | `<img src="data:text/html,<script>alert(1)</script>">` | `data:` URLs in `<img>` `src` are stripped |
| `data:` URL in `<a>` | `[click](data:text/html,<script>alert(1)</script>)` | `data:` URLs in `<a>` `href` are stripped |
| `<iframe>` | `<iframe src="evil.com"></iframe>` | `<iframe>` not present in rendered output |
| `<object>` / `<embed>` | `<object data="evil.swf"></object>` | neither `<object>` nor `<embed>` present |
| `vbscript:` URL | `[click](vbscript:msgbox(1))` | `vbscript:` URLs stripped from `href` |
| inline event handler | `<div onclick="alert(1)">x</div>` | all `on*` event handler attributes stripped |
| raw `<style>` | `<style>body{background:url("javascript:alert(1)")}</style>` | `<style>` not present in rendered output |

The system SHALL PRESERVE all GFM-safe Markdown: headings (`# … ######`), emphasis (`*foo*`, `**foo**`), code spans, code blocks, ordered/unordered lists, blockquotes, links with `https://` / `http://` / relative URLs, GFM tables, GFM task lists, GFM strikethrough, autolinks.

#### Scenario: EVT-DOC-02 — Every OWASP Markdown XSS cheat-sheet vector is stripped; GFM-safe Markdown is preserved

- **GIVEN** apply Block 3 lands and `golden/control-plane/snapshot-valid/docs/narrative.md` contains `<script>alert('xss')</script>` and `[click](javascript:alert(1))`
- **WHEN** `pnpm test --run control-plane/test/docs-sanitization.spec.ts` is invoked and the spec renders the security fixture via `safeReactMarkdown(...)`
- **THEN** the rendered HTML SHALL NOT contain any `<script>` element AND SHALL NOT contain any `href` attribute whose value begins with `javascript:`
- **AND** the spec SHALL additionally assert that the OWASP vectors enumerated in the requirement table above (data: URL, iframe, object/embed, vbscript:, onerror=, onclick=, onload=, raw `<style>`) are each independently stripped when fed to `safeReactMarkdown(...)`
- **AND** the spec SHALL assert that a GFM-safe Markdown input (headings + emphasis + lists + GFM table + code block + `https://` link) renders to the corresponding HTML structure unchanged.

### Requirement: REQ-DOC-3 — `[[Kind:namespace/name]]` entity-link plugin maps to internal `<Link>` and renders unknown refs as plain text

The system SHALL provide a custom Remark plugin `entityLinkPlugin` that scans Markdown text for the pattern `[[Kind:namespace/name]]` (per `docs/34-CONTROL-PANE-DATA-CONTRACTS.md`), SHALL parse each match via `parseEntityRef` from `store/entityRef.ts`, SHALL emit an internal `<Link>` element whose `to` is `/entity/$kind/$namespace/$name` for VALID refs, and SHALL render the literal text `[[Kind:namespace/name]]` (no link) for INVALID refs or refs that throw `EntityRefParseError`. The plugin SHALL NOT emit an `<a href>` element with an attacker-controlled URL.

#### Scenario: EVT-DOC-03 — `[[Character:demo/nora]]` renders as internal Link to /entity/Character/demo/nora; malformed ref renders as plain text

- **GIVEN** apply Block 3 lands and `golden/control-plane/snapshot-valid/docs/nora.md` contains `[[Character:demo/nora]]`
- **WHEN** a Vitest spec renders the document via `safeReactMarkdown(..., {remarkPlugins: [entityLinkPlugin]})`
- **THEN** the rendered output SHALL contain a single `<a href="/entity/Character/demo/nora">` (or TanStack Router `<Link to="/entity/Character/demo/nora">`) element
- **AND** an input of `[[not-a-valid-ref]]` SHALL render as the literal text `[[not-a-valid-ref]]` with NO anchor element
- **AND** an input of `[[Character:demo/nora-with-javascript:alert(1)]]` SHALL render as the literal text (parser rejects) with NO anchor element whose `href` contains `javascript:`
- **AND** `grep -cE 'parseEntityRef' control-plane/src/features/docs/entityLinkPlugin.ts` SHALL be `>= 1` (the validated parser is the only entry point).

### Requirement: REQ-DOC-4 — Source-path resolution: `metadata.annotations['narrative.dev/source-path']` → `snapshot/docs/<basename>.md`

The system SHALL resolve a Markdown doc for a given catalog entity by reading `entity.metadata.annotations['narrative.dev/source-path']` and resolving the basename against the loaded `docs/` directory. Resolution SHALL surface `synthetic('doc-not-found', ...)` if the annotation is absent, surface `synthetic('path-traversal', ...)` if the path escapes `docs/` (via the existing `isSafeRelativePath` guard from m14), and SHALL fall back to `undefined` (no doc rendered) for entities without the annotation. The Markdown body SHALL be loaded via `loadDocs` (per REQ-LOA-2).

#### Scenario: EVT-DOC-04 — Source-path resolution locates `docs/nora.md` for the Nora fixture; missing annotation yields no tab; path-traversal attempt yields synthetic diagnostic

- **GIVEN** apply Blocks 2 + 3 land and `golden/control-plane/snapshot-valid/catalog/nora.yaml` carries `metadata.annotations['narrative.dev/source-path']: docs/nora.md` AND `golden/control-plane/snapshot-valid/docs/nora.md` exists
- **WHEN** a Vitest spec calls `resolveDocsForEntity(noraEntity, docs)` with the snapshot-valid fixture
- **THEN** the resolver SHALL return the `nora.md` body string
- **AND** when called with a `Build` entity that LACKS the annotation, the resolver SHALL return `undefined` (no error, no tab rendered)
- **AND** when called with a synthetic entity whose annotation is `metadata.annotations['narrative.dev/source-path']: '../../etc/passwd'`, the resolver SHALL return a `Diagnostic` whose `code` is `'path-traversal'` (verifies `isSafeRelativePath` guard is preserved).

---

## Capability: `decision-projection` (NEW)

### Requirement: REQ-DEC-1 — NEW `specs/cp-decisions.schema.json` envelope (`schema: "control-plane/decisions/v1"`)

The system SHALL introduce `specs/cp-decisions.schema.json` as a NEW file (NOT a modification of any existing schema — respects AC-INV-schema binding from m13/m14/m15). The schema SHALL declare an envelope `{ schema: "control-plane/decisions/v1", generatedAt: isoTimestamp, sourceRevision: string, decisions: Decision[] }` and SHALL validate each `Decision` as `{ id: string, action: string, targetRef: string (matching `^[A-Z][A-Za-z]+:[a-z0-9-]+/[a-z0-9-]+$`), date: isoTimestamp, status: "accepted"|"rejected"|"pending"|"superseded" }`. The schema SHALL be wired into the existing `schema-validation-pipeline` (registry shape unchanged).

#### Scenario: EVT-DEC-01 — cp-decisions.schema.json validates the 3 fixture decisions including the one mentioning `llave plateada`

- **GIVEN** apply Blocks 0 + 2 land and `specs/cp-decisions.schema.json` + `golden/control-plane/snapshot-valid/projections/cp-decisions.json` (containing 3 decisions, one whose `action` mentions `llave plateada`) are committed
- **WHEN** `pnpm test --run control-plane/test/decision-projection.schema-fixtures.spec.ts` is invoked
- **THEN** Ajv SHALL validate all 3 fixture decisions against the schema (zero errors)
- **AND** a Decision whose `targetRef` is `not-a-valid-ref` SHALL fail Ajv validation with a regex-pattern error
- **AND** `git diff --stat e530855eae910149ff8ee74dd689aa3e09d3fa8c..HEAD -- specs/*.schema.json` SHALL list ONLY `specs/cp-decisions.schema.json` as a new file (AC-INV-schema binding holds; no existing schema mutated).

### Requirement: REQ-DEC-2 — Decision catalog entity (`apiVersion: narrative.dev/v1alpha1`, `kind: Decision`)

The system SHALL support a new catalog entity kind `Decision` with `apiVersion: narrative.dev/v1alpha1` and `kind: Decision`. The Decision entity SHALL carry `metadata.name`, `metadata.namespace`, `metadata.annotations['narrative.dev/projection-ref']` pointing at the cp-decisions projection entry, and SHALL validate via the existing `catalog-entity.schema.json` (no schema change to `catalog-entity.schema.json`). The decision's `status` field SHALL map to the ADR-008 candidate-before-accepted state machine: `pending` → `accepted` | `rejected` | `superseded`.

#### Scenario: EVT-DEC-02 — Decision catalog entity `decision-silver-key.yaml` parses via `catalog-entity.schema.json` and references cp-decisions via projection-ref

- **GIVEN** apply Block 2 lands and `golden/control-plane/snapshot-valid/catalog/decision-silver-key.yaml` is committed
- **WHEN** a Vitest spec invokes `parseCatalogEntity(decisionSilverKeyYaml)`
- **THEN** the parsed entity SHALL carry `apiVersion: 'narrative.dev/v1alpha1'`, `kind: 'Decision'`, and `metadata.annotations['narrative.dev/projection-ref']` referencing the cp-decisions projection entry
- **AND** `grep -cE "kind:\s*'Decision'|kind:\s*Decision" control-plane/src/extensions/predicates.ts` SHALL return `0` (Decision kind is NOT yet a registered tab/card predicate — it surfaces via Search results only; no new entity page in m16).

### Requirement: REQ-DEC-3 — SnapshotProjectSource reads `projections/cp-decisions.json` and populates `bundle.decisions`

The system SHALL extend `SnapshotProjectSource.loadFrom` to read `golden/.../projections/cp-decisions.json` and to populate `ProjectionBundle.decisions: unknown` with the validated envelope (per REQ-DEC-1). The `decisions` field SHALL be `unknown`-typed (TypeScript `unknown`) so no existing consumer is forced to read it; the search index (per REQ-SID-1) is the only m16 consumer. The m14 path-traversal guard `isSafeRelativePath` SHALL continue to reject any `cp-decisions.json` path that escapes the projection root.

#### Scenario: EVT-DEC-03 — loadFrom reads cp-decisions.json and surfaces synthetic('unknown-schema', ...) for missing file (path-traversal guard preserved)

- **GIVEN** apply Block 0 lands and `golden/control-plane/snapshot-valid/projections/cp-decisions.json` exists
- **WHEN** a Vitest spec invokes `SnapshotProjectSource.loadFrom(snapshot-valid)`
- **THEN** `bundle.decisions` SHALL be the validated envelope (not undefined)
- **AND** when `cp-decisions.json` is REMOVED from the snapshot, the load SHALL surface `synthetic('unknown-schema', ...)` and bundle.decisions SHALL remain undefined
- **AND** when a synthetic manifest entry declares `cp-decisions.json` at `../../../etc/passwd`, the load SHALL surface `synthetic('path-traversal', ...)` and bundle.decisions SHALL remain undefined.

---

## Capability: `extension-registry` (MODIFIED)

> (Previously: m15 NEW — compile-time `ControlPlaneFeature[]` registry with `apiVersion: 'control-plane.extensions/v1'`; no discriminator on `EntityTabExtension`.)

### Requirement: REQ-EXR-1 — `EntityTabExtension` gains additive `kind: 'docs'` discriminator field (no `apiVersion` bump)

The system SHALL extend `EntityTabExtension` (per m15 REQ-EXR-2) with an additive OPTIONAL discriminator field `kind: 'docs'` declared as `kind?: 'docs'` in `control-plane/src/extensions/types.ts`. The discriminator SHALL be optional on existing m15 tabs (overview, arc, scenes, metadata, continuity-status, visual-dna, etc.) and REQUIRED on docs tabs (the new `DocTab` registered by `features/docs/`). The `apiVersion: 'control-plane.extensions/v1'` const literal SHALL be preserved verbatim on every registered feature (AC-INV-API-version binding). The registry dispatch contract SHALL be unchanged (filter by `predicate`, sort by `priority`).

#### Scenario: EVT-EXR-01 — `kind: 'docs'` discriminator is optional on existing m15 tabs and required on the new DocTab; no apiVersion bump

- **GIVEN** apply Blocks 0 + 3 land and `control-plane/src/extensions/types.ts` is modified with the additive `kind?: 'docs'` field
- **WHEN** `grep -cE "kind:\s*'docs'" control-plane/src/extensions/types.ts` is invoked
- **THEN** the count SHALL be `>= 1` (the discriminator is declared in the type union)
- **AND** `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/extensions/*.ts` SHALL remain `>= 4` (the const literal is preserved)
- **AND** `git diff e530855eae910149ff8ee74dd689aa3e09d3fa8c..HEAD -- control-plane/src/extensions/types.ts` SHALL show ONLY the additive field (no existing field removed or renamed).

### Requirement: REQ-EXR-2 — `extension-isolation.spec.ts` grep oracle extended with relative-escape pattern (closes INC-008)

The system SHALL extend `control-plane/test/extension-isolation.spec.ts` test 4 grep oracle to include the relative-escape pattern `from\s+['"]\.\./\.\./(story|visual|catalog|continuity|docs)/`. The test SHALL additionally assert that `features/docs/` is included in the prohibited-folder list. **This extension closes INC-008 (FIND-F80375, CL-03, P2 MEDIUM, e43adbbfa6b9a16fdba6887e447c649e)** — the residual m15 F-15-E PARTIAL PASS gap that the direct `from '...features/(story|visual|catalog|continuity|docs)/'` oracle did not catch. The production invariant SHALL hold: `grep -rE "from\s+['"]\.\./\.\./(story|visual|catalog|continuity|docs)/" control-plane/src/features/` SHALL return `0` matches.

#### Scenario: EVT-EXR-02 — Relative-escape grep oracle finds zero hits in features/docs/ and asserts features/docs/ is in the prohibited-folder list (INC-008 closure)

- **GIVEN** apply Block 0 lands and the new docs feature folder `control-plane/src/features/docs/` is created (Block 3) — at this point in Block 0 the folder is empty of cross-folder imports by construction
- **WHEN** `grep -c "from\s\+['\"]\\.\\./\\.\\./" control-plane/test/extension-isolation.spec.ts` is invoked
- **THEN** stdout SHALL be `>= 1` and exit SHALL be `0` (the oracle pattern is present in the test source)
- **AND** `grep -cE "from\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs)/" control-plane/test/extension-isolation.spec.ts` SHALL be `>= 1`
- **AND** `pnpm test --run control-plane/test/extension-isolation.spec.ts` SHALL exit `0` with 5 tests passing (the 4 from m15 + 1 new oracle-extension test)
- **AND** `grep -rE "from\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs)/" control-plane/src/features/` SHALL return `0` matches (production invariant holds).

### Requirement: REQ-EXR-3 — Existing 3 tabs + 3 cards from m15 remain unchanged (no regression)

The system SHALL NOT mutate the rendering contract, the priority, or the predicate of any `EntityTabExtension` or `EntityCardExtension` registered by `features/{story,visual,catalog,continuity}/`. The m15 `ExtensionContext` contract (per m15 REQ-EXR-2) SHALL be preserved unchanged (no new fields, no removed fields). The m15 registry filter/sort algorithm SHALL be preserved unchanged.

#### Scenario: EVT-EXR-03 — m15 fixture composes the same 5 facets on Character:Nora after m16 apply (no regression)

- **GIVEN** apply Blocks 0 + 3 land
- **WHEN** `pnpm test --run control-plane/test/entity-page-composition.spec.ts` is invoked
- **THEN** the spec SHALL exit `0` and the rendered DOM SHALL contain the same 5 facets from m15 (`OverviewTab` + `ScenesTab` + `VisualDNATab` + `ContinuityStatusTab` + `VisualCard`) AND the new `DocTab` registered by `features/docs/` (composition count >= 6 for Character:Nora)
- **AND** `git diff e530855eae910149ff8ee74dd689aa3e09d3fa8c..HEAD -- control-plane/src/features/{story,visual,catalog,continuity}/` SHALL be empty (m15 feature folders are unmodified at spec level).

---

## Capability: `feature-extensions` (MODIFIED)

> (Previously: m15 NEW — 4 independent feature folders `{story,visual,catalog,continuity}` with zero cross-folder imports enforced by grep oracle.)

### Requirement: REQ-EXT-1 — `features/docs/` is the 5th independent feature folder; grep invariant extended

The system SHALL organise `features/docs/` as the 5th independent feature folder under `control-plane/src/features/docs/` with the same per-folder convention as m15 (registration side-effect file + per-entity folders + per-tab/card components). The grep invariant from m15 SHALL be extended to cover `features/docs/`; the existing `extension-isolation.spec.ts` test 4 oracle (now extended per REQ-EXR-2) SHALL additionally assert that `features/docs/` does NOT import any other `features/` folder via either direct path or relative-escape path. The Extension Registry module (`control-plane/src/extensions/`) SHALL remain the SOLE mediator for cross-feature composition.

#### Scenario: EVT-EXT-01 — `features/docs/` does not import any other `features/` folder (direct OR relative-escape) — the load-bearing UAT-M10-03 Pass clause

- **GIVEN** apply Blocks 0 + 3 land and `control-plane/src/features/docs/` exists with `character/{DocTab,index}.tsx`, `docsSafeMarkdown.ts`, `entityLinkPlugin.ts`
- **WHEN** `grep -rE "from\s+['\"]\.\.?/.*features/(story|visual|catalog|continuity|docs)/" control-plane/src/features/docs/` is invoked
- **THEN** the match count SHALL be `0`
- **AND** `grep -rE "from\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs)/" control-plane/src/features/` SHALL return `0` matches (relative-escape oracle; INC-008 closure)
- **AND** `pnpm test --run control-plane/test/extension-isolation.spec.ts` SHALL exit `0`.

### Requirement: REQ-EXT-2 — `features/docs/character/index.tsx` registers `DocTab` with `kindIs('Character')` predicate + `kind: 'docs'` discriminator

The system SHALL ship `control-plane/src/features/docs/character/index.tsx` that registers a single `EntityTabExtension` named `DocTab` against the existing Extension Registry with (a) `targetKind: 'Character'`, (b) `predicate: kindIs('Character')` (reuses m15 helper — zero new combinator primitives), (c) `kind: 'docs'` (per REQ-EXR-1), (d) `apiVersion: 'control-plane.extensions/v1'` (preserved verbatim), (e) `priority: 50` (after existing 5 m15 Character tabs), and (f) `render(ctx): ReactNode` returning the rendered Markdown for `ctx.entity.metadata.annotations['narrative.dev/source-path']`.

#### Scenario: EVT-EXT-02 — DocTab registers against the Extension Registry and appears in resolveEntityTabs({ kind: 'Character' })

- **GIVEN** apply Blocks 0 + 3 land and `features/docs/character/index.tsx` is imported transitively by `app/App.tsx`
- **WHEN** a Vitest spec invokes `extensionRegistry.resolveEntityTabs({ kind: 'Character', metadata: { name: 'nora', namespace: 'demo' } })`
- **THEN** the result SHALL include the new `DocTab` extension in addition to the 3 m15 Character tabs (Overview/Arc/Scenes/etc.)
- **AND** `grep -cE "kind:\s*'docs'" control-plane/src/features/docs/character/index.tsx` SHALL be `>= 1` (the discriminator is set on the registration)
- **AND** `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/features/docs/character/index.tsx` SHALL be `>= 1` (the const literal is preserved).

---

## Capability: `projection-loader-port` (MODIFIED)

> (Previously: m15 MODIFIED — `ProjectionBundle` shape with 7 projection keys; `SnapshotProjectSource.load` refactored into `parseManifest` + `validateAndLoadProjections` + `loadCatalogEntities` + `assembleBundle`; path-traversal guard preserved.)

### Requirement: REQ-LOA-1 — `ProjectionBundle` gains `decisions: unknown` + `docs: unknown` fields (no consumer ripple)

The system SHALL extend `ProjectionBundle` (per m15 REQ-PLP-1) with two additive fields `decisions: unknown` and `docs: unknown` declared in `control-plane/src/loader/ProjectSource.ts`. The fields SHALL be `unknown`-typed so no existing consumer is forced to read them. The m15 `assembleBundle` helper SHALL continue to populate the 7 existing projection keys (`project`, `chapters`, `characters`, `assets`, `uat`, `visualQuality`, `history`) and SHALL additionally populate `decisions` (via `loadDecisions`, per REQ-DEC-3) and `docs` (via `loadDocs`, per REQ-LOA-2).

#### Scenario: EVT-LOA-01 — ProjectionBundle.decisions and ProjectionBundle.docs are populated by SnapshotProjectSource and are typed `unknown`

- **GIVEN** apply Block 0 lands and `control-plane/src/loader/ProjectSource.ts` declares `decisions: unknown` + `docs: unknown`
- **WHEN** `grep -cE "decisions:\s*unknown|docs:\s*unknown" control-plane/src/loader/ProjectSource.ts` is invoked
- **THEN** the count SHALL be `>= 2`
- **AND** a Vitest spec that calls `SnapshotProjectSource.loadFrom(snapshot-valid)` SHALL observe `bundle.decisions !== undefined` AND `bundle.docs !== undefined`
- **AND** `pnpm tsc --noEmit -p control-plane/tsconfig.json` SHALL exit `0` (no type errors from the additive unknown fields).

### Requirement: REQ-LOA-2 — `loadDocs` helper reads `docs/*.md` from the snapshot preserving the `isSafeRelativePath` path-traversal guard

The system SHALL ship `SnapshotProjectSource.loadDocs(snapshotRoot): { path: string, body: string }[]` that (a) enumerates `*.md` files under `snapshot/docs/`, (b) reads each file's UTF-8 body, (c) validates the relative path via the existing `isSafeRelativePath` helper from m14, (d) surfaces `synthetic('path-traversal', ...)` and returns an empty array if any path fails the guard. The helper SHALL preserve the m14 invariant: `golden/control-plane/project-invalid-schema/` continues to surface at least one `AjvError` Diagnostic.

#### Scenario: EVT-LOA-02 — loadDocs reads the 3 fixture docs (narrative.md + nora.md + scene-silver-key.md) and surfaces synthetic('path-traversal') for traversal attempts

- **GIVEN** apply Block 2 lands and `golden/control-plane/snapshot-valid/docs/{narrative,nora,scene-silver-key}.md` exist
- **WHEN** a Vitest spec invokes `SnapshotProjectSource.loadDocs(snapshotValidRoot)`
- **THEN** the returned array SHALL contain 3 entries with non-empty `body` fields
- **AND** when the spec invokes `SnapshotProjectSource.loadFrom(projectInvalidSchema)` (the m14 negative fixture), the returned diagnostics SHALL contain at least one `AjvError` (m14 invariant preserved)
- **AND** when the spec invokes `loadDocs` against a synthetic root whose manifest declares a doc at `../../../etc/passwd`, the returned diagnostics SHALL contain `synthetic('path-traversal', ...)`.

---

## Capability: `golden-fixture-corpus` (MODIFIED)

> (Previously: m15 MODIFIED — `snapshot-valid` corpus with 7 projections + 3 catalog entities; m14 path-traversal guard fixture + in-pack test fixtures preserved.)

### Requirement: REQ-GFC-1 — 3 Markdown docs in `snapshot-valid/docs/` (security fixture + entity-link + UAT-Given)

The system SHALL ship `golden/control-plane/snapshot-valid/docs/{narrative,nora,scene-silver-key}.md` with the following contents:

- `narrative.md` — security fixture containing `<script>alert('xss')</script>` AND `[click](javascript:alert(1))` (verified by `docs-sanitization.spec.ts` per REQ-DOC-2).
- `nora.md` — fixture containing `[[Character:demo/nora]]` entity link (verified by the entity-link plugin per REQ-DOC-3).
- `scene-silver-key.md` — fixture mentioning `llave plateada` so the UAT-M10-03 Given clause is satisfiable end-to-end (verified by `search.spec.ts` per REQ-SID-1).

#### Scenario: EVT-GFC-01 — The 3 fixture docs exist in snapshot-valid/docs/ and contain the expected adversarial + entity-link + UAT-Given content

- **GIVEN** apply Block 2 lands and the 3 fixture docs are committed
- **WHEN** `ls golden/control-plane/snapshot-valid/docs/*.md` is invoked
- **THEN** the output SHALL list exactly `narrative.md`, `nora.md`, `scene-silver-key.md`
- **AND** `grep -cE "<script>alert|javascript:alert" golden/control-plane/snapshot-valid/docs/narrative.md` SHALL be `>= 2` (security fixture contains the OWASP vectors)
- **AND** `grep -cE "\[\[Character:demo/nora\]\]" golden/control-plane/snapshot-valid/docs/nora.md` SHALL be `>= 1`
- **AND** `grep -cE "llave plateada" golden/control-plane/snapshot-valid/docs/scene-silver-key.md` SHALL be `>= 1`.

### Requirement: REQ-GFC-2 — `cp-decisions.json` projection fixture (3 decisions) + `decision-silver-key.yaml` Decision catalog entity

The system SHALL ship `golden/control-plane/snapshot-valid/projections/cp-decisions.json` containing exactly 3 Decision entries (one whose `action` field mentions `llave plateada`, one in `accepted` status, one in `pending` status) AND SHALL ship `golden/control-plane/snapshot-valid/catalog/decision-silver-key.yaml` referencing the cp-decisions projection via `metadata.annotations['narrative.dev/projection-ref']`. The m14 path-traversal guard fixture and the m15 in-pack test fixtures (`project-invalid-schema/`, `cp-characters.json` etc.) SHALL be PRESERVED verbatim.

#### Scenario: EVT-GFC-02 — cp-decisions.json has 3 fixtures (one mentioning `llave plateada`); decision-silver-key.yaml references cp-decisions; m14 fixtures preserved

- **GIVEN** apply Block 2 lands and the new fixtures are committed
- **WHEN** `cat golden/control-plane/snapshot-valid/projections/cp-decisions.json | jq '.decisions | length'` is invoked
- **THEN** stdout SHALL be `3`
- **AND** `grep -cE "llave plateada" golden/control-plane/snapshot-valid/projections/cp-decisions.json` SHALL be `>= 1` (UAT Given clause satisfied)
- **AND** `grep -cE "projection-ref" golden/control-plane/snapshot-valid/catalog/decision-silver-key.yaml` SHALL be `>= 1`
- **AND** `git diff e530855eae910149ff8ee74dd689aa3e09d3fa8c..HEAD -- golden/control-plane/project-invalid-schema/` SHALL be empty (m14 path-traversal guard fixture preserved).

### Requirement: REQ-GFC-3 — `cp-characters.json` + `cp-chapters.json` + `cp-assets.json` + `manifest.json` extended with indexable text fields

The system SHALL MODIFY the existing `golden/control-plane/snapshot-valid/projections/cp-{characters,chapters,assets}.json` files to add indexable text fields (Nora character: `description` + `summary`; chapters: `synopsis`; assets: `description`). The system SHALL MODIFY `golden/control-plane/snapshot-valid/manifest.json` to add `decisions` projection entry + `docs/` directory entry. NO existing projection key SHALL be removed; the existing `project`, `chapters`, `characters`, `assets`, `uat`, `visualQuality`, `history` entries SHALL be preserved.

#### Scenario: EVT-GFC-03 — cp-characters.json + cp-chapters.json + cp-assets.json + manifest.json include the new indexable fields; existing keys preserved

- **GIVEN** apply Block 2 lands and the 4 modified fixtures are committed
- **WHEN** `jq '.characters[0] | has("description") and has("summary")' golden/control-plane/snapshot-valid/projections/cp-characters.json` is invoked
- **THEN** stdout SHALL be `true`
- **AND** `jq 'has("decisions") and has("docs")' golden/control-plane/snapshot-valid/manifest.json` SHALL be `true`
- **AND** `jq '.projections | keys' golden/control-plane/snapshot-valid/manifest.json` SHALL list all 7 m15 projection keys plus `decisions` (8 total; no removals).

---

## Capability: `serverless-app-shell` (MODIFIED)

> (Previously: m15 MODIFIED — `/catalog` + `/entity/$kind/$namespace/$name` routes; placeholder views replaced with domain content; `App.tsx` `routerReady` removed.)

### Requirement: REQ-ROU-1 — `/search` route registered in `router.ts` with `views/Search.tsx` as the sole call site of `useSearchIndex`

The system SHALL register a `/search` route in `control-plane/src/routes/router.ts` (single-quoted `path: '/search'`, component `views/Search.tsx`) declared AFTER `/entity/$kind/$namespace/$name` (per F-004 oracle ordering). The system SHALL ship `control-plane/src/views/Search.tsx` that (a) renders a query input, (b) calls `useSearchIndex(query)` (the sole call site of the hook), (c) renders results grouped by `type ∈ {character, scene-chapter, asset, decision, docs}`, (d) renders each result as a link to either the entity route (`/entity/$kind/$namespace/$name`) or the docs anchor.

#### Scenario: EVT-ROU-01 — `/search` route is registered in router.ts and views/Search.tsx is the sole consumer of useSearchIndex

- **GIVEN** apply Block 1 lands and `control-plane/src/views/Search.tsx` is committed
- **WHEN** `grep -nE "path:\s*'/search'" control-plane/src/routes/router.ts` is invoked
- **THEN** the line number SHALL be GREATER than the `/entity/...` line number (route ordering preserved)
- **AND** `grep -rE "useSearchIndex" control-plane/src/` SHALL return exactly 2 occurrences: `views/Search.tsx` (consumer) + `store/useSearchIndex.ts` (declaration)
- **AND** `pnpm test --run control-plane/test/search.spec.ts` SHALL exit `0` asserting that rendering `<Search query="llave plateada"/>` against the snapshot-valid fixture produces DOM containing at least one element per `result-type-{character,scene-chapter,asset,decision,docs}` class.

### Requirement: REQ-ROU-2 — `routes.tsx` F-004 oracle list extended with `path: '/search'` (closes INC-009 as natural side-effect)

The system SHALL modify `control-plane/src/routes/routes.tsx` to ADD `'path: \'/search\''` to the existing `routePaths` const array (the F-004 oracle). The addition SHALL be additive (no existing entry removed); the m15 `routePaths` array shall grow from 6 entries to 7 entries. **This update closes INC-009 (FIND-8E316A, CL-03, LOW P3) — the m15 AC-15.4 spec literal divergence** — as a natural side-effect of Block 1 routing work.

#### Scenario: EVT-ROU-02 — routes.tsx F-004 oracle includes `path: '/search'` and the array length grows from 6 to 7 (INC-009 closure)

- **GIVEN** apply Block 1 lands and `control-plane/src/routes/routes.tsx` is modified
- **WHEN** `grep -cE "path:\s*'/.*'" control-plane/src/routes/routes.tsx` is invoked
- **THEN** stdout SHALL be `7` (was 6 in m15; +1 for `/search`)
- **AND** `grep -cE "path:\s*'/search'" control-plane/src/routes/routes.tsx` SHALL be `>= 1`
- **AND** `grep -cE "path:\s*'/catalog'|path:\s*'/entity" control-plane/src/routes/routes.tsx` SHALL remain at the m15 baseline count (no m15 entries removed; additive only).

### Requirement: REQ-ROU-3 — `vite preview` against snapshot-valid serves `/search` and the UAT-M10-03 Given clause is satisfiable end-to-end

The system SHALL, after `pnpm build`, serve the static SPA via `vite preview` against `golden/control-plane/snapshot-valid/` and SHALL respond with HTTP 200 on `/search`. The rendered DOM SHALL include a query input + a result list element. After typing `llave plateada` in the query input, the result list SHALL contain at least one entry per `result-type-{character,scene-chapter,asset,decision,docs}` class. The DevTools Network panel SHALL show zero outbound application-API requests after SPA load (AC-INV-serverless preserved + extended to slice-3a pages).

#### Scenario: EVT-ROU-03 — vite preview serves /search and the UAT-M10-03 Pass clause is satisfied end-to-end (useful results + no script execution + entity navigation)

- **GIVEN** apply Blocks 0+1+2+3 land and `pnpm build` produces a static `dist/` bundle
- **WHEN** `vite preview --outDir dist &` runs against `golden/control-plane/snapshot-valid/` and the test harness curls `http://localhost:4173/search` AND inspects the rendered HTML
- **THEN** HTTP status SHALL be `200` AND the HTML SHALL contain the `<div class="view-search">` element
- **AND** when the harness invokes the search with `llave plateada`, the rendered DOM SHALL contain at least one element per `result-type-{character,scene-chapter,asset,decision,docs}` class
- **AND** the DevTools Network panel SHALL show zero outbound application-API requests after SPA load (verified by `curl` capture or by the lack of `fetch(` calls in the search.spec.ts module)
- **AND** clicking a docs result SHALL navigate to the `scene-silver-key.md` anchor AND the rendered Markdown SHALL NOT contain any `<script>` element OR any `href="javascript:..."` (verified by `docs-sanitization.spec.ts` per REQ-DOC-2).

---

## Invariant Preservation

All 11 project invariants from `milestones/m1-onboard-2026-08-28.md` L28–50 are preserved unchanged. The m12 + m13 + m14 + m15 invariants (`AC-INV-schema`, `AC-INV-serverless`, `AC-INV-no-write`, `AC-INV-no-Dexie`, `AC-INV-extension-isolation`, `AC-INV-API-version`, `AC-INV-static-build`, `AC-INV-test-baseline`, `AC-INV-doc-discipline`, `AC-INV-rdd`) are **preserved and extended**:

- `AC-INV-schema` — preserved absolutely; `specs/cp-decisions.schema.json` is a NEW file (not a modification). Re-asserted via REQ-DEC-1.
- `AC-INV-serverless` — preserved; `searchIndex.ts` + `safe-narrative-docs` introduce no `fetch(`, no telemetry, no remote schema, no remote code. Re-asserted via REQ-SID-1 + REQ-DOC-1.
- `AC-INV-no-write` — preserved; docs are read-only. Re-asserted via REQ-DOC-1 + REQ-LOA-2.
- `AC-INV-no-Dexie` — preserved; V1 index is in-memory. Re-asserted via REQ-SID-1.
- `AC-INV-extension-isolation` — preserved AND extended: `extension-isolation.spec.ts` test 4 grep oracle extended with relative-escape pattern AND `features/docs/` coverage. Re-asserted via REQ-EXR-2 + REQ-EXT-1.
- `AC-INV-API-version` — preserved; `EntityTabExtension.apiVersion: 'control-plane.extensions/v1'` is unchanged; `kind: 'docs'` is additive metadata. Re-asserted via REQ-EXR-1.
- `AC-INV-static-build` — preserved; `pnpm build` produces static `dist/`; size recorded in Block F (no gate).
- `AC-INV-test-baseline` — preserved; the 28 m15 vitest across 12 spec files remain green; final count grows by ≥ 3 new specs + 2 extended specs. Re-asserted via every `pnpm test --run ...` scenario.
- `AC-INV-doc-discipline` — preserved; Block F mandatory closeout across `docs/19/27/28/32` + `control-plane/STACK.md` + `README.md` + `MANIFEST.json` regen. First-class per launch packet directive.
- `AC-INV-rdd` — preserved; `cli-receipts.jsonl` argv/exit_code recorded per SC-POL-1.

The new invariants introduced by this cycle:

| Invariant | Source | Enforcement |
|---|---|---|
| `searchIndex` is pure + in-memory (no Dexie, no Orama, no fetch) | REQ-SID-1 | EVT-SID-01 grep + Vitest |
| Tokenizer is case-insensitive AND ASCII-folded | REQ-SID-2 | EVT-SID-02 Vitest |
| Ranker is deterministic AND entity-ref-specific | REQ-SID-3 | EVT-SID-03 Vitest |
| `useSearchIndex` consumed only from `views/Search.tsx` + `features/docs/` | REQ-SID-4 | EVT-SID-04 grep |
| Markdown sanitizer strips every OWASP Markdown XSS cheat-sheet vector | REQ-DOC-2 | EVT-DOC-02 Vitest (`docs-sanitization.spec.ts`) |
| `[[Kind:namespace/name]]` entity-link uses validated parser only | REQ-DOC-3 | EVT-DOC-03 Vitest |
| Doc source-path resolution preserves `isSafeRelativePath` | REQ-DOC-4 | EVT-DOC-04 Vitest |
| `cp-decisions.schema.json` is NEW (no existing schema mutated) | REQ-DEC-1 | EVT-DEC-01 git diff |
| Decision catalog entity uses existing `catalog-entity.schema.json` | REQ-DEC-2 | EVT-DEC-02 Vitest |
| `bundle.decisions` populated via `loadDecisions` (path-traversal guard preserved) | REQ-DEC-3 | EVT-DEC-03 Vitest |
| `EntityTabExtension.kind: 'docs'` discriminator is OPTIONAL on existing tabs and REQUIRED on docs tabs | REQ-EXR-1 | EVT-EXR-01 grep |
| Relative-escape grep oracle finds 0 hits in features/ (INC-008 closure) | REQ-EXR-2 | EVT-EXR-02 grep + Vitest |
| m15 facets unchanged (no regression on Character:Nora composition) | REQ-EXR-3 | EVT-EXR-03 Vitest + git diff |
| `features/docs/` has zero cross-folder imports (direct OR relative-escape) | REQ-EXT-1 | EVT-EXT-01 grep |
| `DocTab` registers against existing registry with `kind: 'docs'` discriminator | REQ-EXT-2 | EVT-EXT-02 Vitest |
| `ProjectionBundle.decisions` + `ProjectionBundle.docs` are typed `unknown` | REQ-LOA-1 | EVT-LOA-01 grep + tsc |
| `loadDocs` reads 3 fixture docs + surfaces path-traversal synthetic | REQ-LOA-2 | EVT-LOA-02 Vitest |
| 3 Markdown fixtures + 3 decision fixtures + 4 modified fixtures | REQ-GFC-1 + REQ-GFC-2 + REQ-GFC-3 | EVT-GFC-01 + EVT-GFC-02 + EVT-GFC-03 grep + Vitest |
| `/search` route registered; F-004 oracle updated (INC-009 closure) | REQ-ROU-1 + REQ-ROU-2 | EVT-ROU-01 + EVT-ROU-02 grep |
| `vite preview` renders `/search`; UAT-M10-03 Given/Then end-to-end | REQ-ROU-3 | EVT-ROU-03 integration smoke |

---

## Next Recommended

`sddk-design` to deepen the architectural commitments made here into the file-level architecture (Block decomposition: PF + 0 + 1 + 2 + 3 + 4 + F; M14 D3 ladder pre-flight for 4 new pinned deps; sanitization schema GFM-safe allow-list enumeration; entity-link remark plugin AST shape; search index tokenizer + ranker pseudo-code; `extension-isolation.spec.ts` grep oracle extension syntax; INC-008 + INC-009 closure evidence), then `sddk-tasks` to decompose Blocks 0+1+2+3+4+F into implementation tasks for `sddk-apply`. Acceptance gates for apply phase:

- All 14 ACs (AC-16.1..16.14) MUST pass before archive.
- Block PF commits first as `chore(sddk): m16-pf-preflight-resolved-versions` (no tracked source mutation; writes `$CA/resolved-versions.json`).
- Block 0 commits as `feat(control-plane): bundle-decisions-docs-index-discriminator-isolation-fix` (~430 LoC across ~5 new + ~5 modified files; includes INC-008 fix + `kind: 'docs'` + 4 dep pins + index builder + hook).
- Block 1 commits as `feat(control-plane): search-route-view-oracle-update` (~190 LoC across ~1 new + 3 modified files; includes `/search` route + `Search.tsx` + F-004 oracle update closing INC-009).
- Block 2 commits as `feat(golden): cp-decisions-docs-fixtures` (~140 LoC across ~5 new + 4 modified fixture files).
- Block 3 commits as `feat(control-plane): docs-feature-extension-module` (~370 LoC across ~5 new + 1 modified feature file).
- Block 4 commits as `test(control-plane): search-docs-sanitization-decision-projection-specs` (~510 LoC across 3 new spec files + 2 extended spec files).
- Block F commits as `docs(control-plane): search-docs-docs-manifest-stack-closeout` + `chore(manifest): regen-m16-entries` (~120 LoC across 7 doc edits + MANIFEST regen).
- Baseline 28 m15 vitest across 12 spec files MUST remain green; final count grows to ≥ 31 vitest across 14 spec files.

**M16+ pivot**: M16 may promote `golden/control-plane/expanded-fixtures` (recipes, extension-config, stale-projection, malicious-docs, two-project, large-graph) into a follow-on slice; M16 may also add ADR-026 if a future V2 search-upgrade cycle warrants an Orama-migration ADR (currently: not warranted; slot 26/26 stays reserved per m15 precedent). Recorded natural split line: Split 3a-i = Blocks 0+1 = search infra + search view; Split 3a-ii = Blocks 2+3+4+F = docs feature + fixtures + tests + closeout — do NOT activate without orchestrator override.