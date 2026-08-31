# Design: m16-cp-studio-search-docs — Control Plane slice 3a (Local Search + Safe Narrative Docs + Decision projection)

- **Cycle**: `p-7c4aff45199a2069/m16-cp-studio-search-docs` (A-lite, branch `feat/m16-cp-studio-search-docs-2026-08-30`, base `e530855eae910149ff8ee74dd689aa3e09d3fa8c`)
- **Proposal SHA-256**: `e708a09043174d40774f9d66720c6dda6850d519339910d7572d2857e28f1c45` (281 LoC, 3 NEW + 5 MODIFIED capabilities; INC-008 binding + INC-009 natural side-effect)
- **Spec SHA-256**: `157fd91e69c7d2327f4574613cd087f49b89f5862162fdcda4e852912afc6a23` (24 REQ + 24 EVT-*)
- **Explore-report SHA-256**: `da68a80f77d41b91b56eaa445353149751cfdd1574f584d7d0e6f495fff4e404` (359 LoC, C2, Option B recommended)
- **Architecture impact**: `boundary` (crosses prose-contracts ↔ executable-code seam — Markdown sanitization pipeline + sanitized entity-link parser + V1 substring index contract)
- **Knowledge profile**: `{ engram_enabled: false }` (per `sddk knowledge status`) — no `mem_save` mirror; XDG-only artefact.
- **Cycle status (read-only refresh)**: `{ phase: "design", path: "A-lite", lease: null }` — orchestrator owns lifecycle transitions per `cli-usage-contract.md` §G.
- **Context quality**: **C2** (some durable knowledge from m14/m15 + explore §Pre-loaded context; targeted deepening on (a) the 4 Markdown dep pins, (b) the GFM allow-list shape, (c) the entity-link AST transformation, (d) the ranker determinism contract).

## Technical Approach

Slice 3a of the M10 arc lands the **smallest coherent surface that satisfies UAT-M10-03**: `local-search-index` + `safe-narrative-docs` + `decision-projection` (the missing 5th result type from m14/m15) + Markdown entity-doc rendering. Three architecture decisions anchor the slice:

1. **V1 search is a documented temporary primitive** — pure in-memory substring index over `catalogEntities + 5 cp-* projection keys + Markdown docs`. No Orama (V2), no IndexedDB (M10.3-only). The contract is `searchIndex.build(catalogEntities, bundle, docs)` returning an `Index`; `useSearchIndex(query)` wraps it with Zustand subscription + memoization. Migration to Orama is an explicit future decision with its own ADR (slot 26/26 stays reserved per m15 precedent).

2. **`react-markdown` + `rehype-sanitize` + `remark-gfm` + a custom safe remark plugin** is the Markdown pipeline. `rehype-sanitize`'s default GFM schema is the **base** allow-list; 4 explicit `strip` add-ons close the 10 OWASP Markdown-XSS vectors enumerated in REQ-DOC-2 (no script tag, no `javascript:` / `vbscript:` / `data:` URLs, no `on*=` event handlers, no `<iframe>` / `<object>` / `<embed>` / `<style>`). The custom `entityLinkPlugin` maps `[[Kind:namespace/name]]` to a TanStack Router `<Link>` via the existing `parseEntityRef` from `store/entityRef.ts` (already validated by `catalog-store.spec.ts`); unknown refs render as plain text — **never** as `<a href>` with attacker-controlled URL.

3. **`EntityTabExtension` gains an additive `kind: 'docs'` discriminator field** — metadata only, no `apiVersion` bump, no new registry kind. The discriminator lets the docs feature register a single `DocTab` (priority 50) without widening the m15 registry contract. INC-008 (the residual m15 F-15-E PARTIAL PASS gap) closes inside Block 0 of this slice: `extension-isolation.spec.ts` test 4 grep oracle is extended with the relative-escape pattern `from\\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs)/` and `features/docs/` is added to the prohibited-folder list. INC-009 (AC-15.4 spec literal divergence in `routes.tsx`) closes as a natural side-effect of adding `/search` to the F-004 oracle list.

The slice ships as **6 atomic per-block commits** (PF + 0 + 1 + 2 + 3 + F + 4 = 7 commits if numbered strictly; the proposal counts Block 4 as Block 4 and Block F as Block F). The proposal estimates ~1440 LoC (~3.6x the 400-line review budget) — same size-exception pattern as m14/m15. Block 0 is the largest at ~430 LoC (bundle extension + INC-008 fix + 4 dep pins + index builder + hook). A-lite 6-block ceiling NOT exceeded: PF is pre-flight only (no tracked-source mutation). The recorded natural split line is **Split 3a-i = Blocks 0 + 1** (search infra + search view) / **Split 3a-ii = Blocks 2 + 3 + 4 + F** (docs feature + fixtures + tests + closeout) — flagged but NOT activated unless the orchestrator overrides.

Three architecture invariants bind every block: (i) **zero `specs/*.schema.json` modification** — `cp-decisions.schema.json` is a NEW file (AC-INV-schema, REQ-DEC-1); (ii) **zero `fetch(` / `IndexedDB` / `Orama`** (AC-INV-serverless + AC-INV-no-Dexie + slice-3 explicit no-Orama, REQ-SID-1); (iii) **`features/docs/` has zero cross-folder imports** in either direction, direct OR relative-escape (AC-INV-extension-isolation extended, REQ-EXR-2 + REQ-EXT-1). Every block's commit message carries the AC tag.

## Requirement Coverage

All 24 REQs land in a decision and a file. No decision extends the requirement surface.

| REQ | Scenario | Decision | Primary artefact |
|---|---|---|---|
| REQ-SID-1 in-mem substring index | EVT-SID-01 | D1 (in-memory; no Dexie/Orama/fetch), D2 (pure builder + hook split) | `store/searchIndex.ts`, `store/useSearchIndex.ts` |
| REQ-SID-2 case-insensitive + ASCII-folded tokenizer | EVT-SID-02 | D3 (NFD + Mn-strip + lower) | `store/searchIndex.ts` |
| REQ-SID-3 entity-ref specificity ranker | EVT-SID-03 | D4 (score ladder 100/80/60/40/20; tie-break lex id) | `store/searchIndex.ts` |
| REQ-SID-4 `useSearchIndex` hook consumer isolation | EVT-SID-04 | D5 (shallow-equal memo + single hook surface) | `store/useSearchIndex.ts`, `views/Search.tsx` |
| REQ-DOC-1 pipeline composition + GFM allow-list | EVT-DOC-01 | D6 (compose chain + 4 add-rules) | `features/docs/docsSafeMarkdown.ts` |
| REQ-DOC-2 strip every OWASP Markdown XSS vector | EVT-DOC-02 | D6 (Appendix B — 4 allow-list deltas) | `features/docs/docsSafeMarkdown.ts`, `test/docs-sanitization.spec.ts` |
| REQ-DOC-3 entity-link plugin | EVT-DOC-03 | D7 (Appendix C — AST shape) | `features/docs/entityLinkPlugin.ts` |
| REQ-DOC-4 source-path resolution | EVT-DOC-04 | D8 (annotation to `loadDocs` to `synthetic('path-traversal')`) | `features/docs/character/DocTab.tsx` |
| REQ-DEC-1 NEW `cp-decisions.schema.json` | EVT-DEC-01 | D9 (Appendix F — `control-plane/decisions/v1` envelope) | `specs/cp-decisions.schema.json`, `golden/.../cp-decisions.json` |
| REQ-DEC-2 Decision catalog entity | EVT-DEC-02 | D9 (reuses `catalog-entity` schema; no new schema) | `golden/.../catalog/decision-silver-key.yaml` |
| REQ-DEC-3 `loadDecisions` wired into bundle | EVT-DEC-03 | D10 (`loadDecisions` helper + path-traversal guard preserved) | `loader/SnapshotProjectSource.ts` |
| REQ-EXR-1 additive `kind: 'docs'` discriminator | EVT-EXR-01 | D11 (additive metadata, no apiVersion bump) | `extensions/types.ts` |
| REQ-EXR-2 relative-escape grep oracle (INC-008) | EVT-EXR-02 | D12 (Appendix D — pattern + test list) | `test/extension-isolation.spec.ts` |
| REQ-EXR-3 m15 facets unchanged | EVT-EXR-03 | D11 (read-only on existing tabs/cards) | `features/{story,visual,catalog,continuity}/**` (git diff empty) |
| REQ-EXT-1 `features/docs/` is 5th feature folder | EVT-EXT-01 | D12 | `features/docs/**` |
| REQ-EXT-2 `DocTab` registers with `kind: 'docs'` | EVT-EXT-02 | D13 (`DocTab` registration shape) | `features/docs/character/index.tsx` |
| REQ-LOA-1 `ProjectionBundle.decisions` + `.docs` typed `unknown` | EVT-LOA-01 | D10 (m15 precedent — additive unknown fields) | `loader/ProjectSource.ts` |
| REQ-LOA-2 `loadDocs` helper + path-traversal guard preserved | EVT-LOA-02 | D10 (`isSafeRelativePath` reused for `docs/*.md`) | `loader/SnapshotProjectSource.ts` |
| REQ-GFC-1 3 Markdown fixtures (security + entity-link + UAT-Given) | EVT-GFC-01 | D14 (3 fixture docs with adversarial content) | `golden/.../docs/{narrative,nora,scene-silver-key}.md` |
| REQ-GFC-2 cp-decisions.json (3 fixtures) + decision-silver-key.yaml | EVT-GFC-02 | D14 (3 fixtures; one mentions `llave plateada`) | `golden/.../projections/cp-decisions.json`, `golden/.../catalog/decision-silver-key.yaml` |
| REQ-GFC-3 cp-{characters,chapters,assets}.json + manifest.json extended | EVT-GFC-03 | D14 (additive indexable text fields; no removals) | `golden/.../projections/cp-{characters,chapters,assets}.json`, `golden/.../manifest.json` |
| REQ-ROU-1 `/search` route + `views/Search.tsx` | EVT-ROU-01 | D15 (single-quoted `path: '/search'` AFTER `/entity/`) | `routes/router.ts`, `routes/routes.tsx`, `views/Search.tsx` |
| REQ-ROU-2 routes.tsx F-004 oracle array extended (INC-009) | EVT-ROU-02 | D15 (additive 7-entry array) | `routes/routes.tsx` |
| REQ-ROU-3 `vite preview` end-to-end | EVT-ROU-03 | D15 (no fetches after SPA load; docs route renders safe Markdown) | `test/search.spec.ts` + manual smoke in Block F README |

## Architecture Decisions

### D1 — V1 substring index is **pure** + **in-memory** + **deterministic** (no Dexie, no Orama, no fetch)

**Choice**: `searchIndex.build(catalogEntities, bundle, docs)` is a pure function in `control-plane/src/store/searchIndex.ts`. It builds an in-memory `Map<SearchResultId, SearchResult>` keyed by stable ids (`character:<namespace>:<name>`, `scene-chapter:<chapter-id>`, `asset:<namespace>:<name>`, `decision:<decision-id>`, `docs:<doc-basename>`). **Scene-chapter entries are sourced one entry per `bundle.chapters[]` chapter** (id `scene-chapter:<chapter-id>`; title from `title`; sourcePath from `docRef` when present) — Amendment 1 to the original `chapters[].scenes[]` extraction, which was unreachable against `specs/cp-chapters.schema.json` `additionalProperties: false`. `searchIndex.build` is called from `useSearchIndex` on mount + on every change to the subscribed slots, memoized by shallow equality on `(catalogEntities, bundle, docs)` references (the projection store returns new objects only on `loadFrom`, so a referential change is a meaningful invalidation).
**Alternatives considered**: (i) **Orama collator framework** — rejected for V1 (R-001): brings 4 further pinned deps + a collator pipeline that requires design work orthogonal to UAT-M10-03 acceptance. The Orama migration is documented as a future ADR; (ii) **IndexedDB-cached `Object` index** — rejected (M10.3-only per launch packet; AC-INV-no-Dexie); (iii) **TanStack Router loader** — rejected per m14 D7 bottleneck rule (route loaders must not touch the port).
**Rationale**: REQ-SID-1 is a hard "no IndexedDB, no Orama, no network". The proposal ratifies this as "V1 = documented temporary primitive, V2 = Orama deferred". The exact-pin ladder (Appendix A) confirms `react-markdown` + `rehype-sanitize` + `remark-gfm` + `unist-util-visit` fit the M14 D3 ladder budget; the V1 index itself introduces ZERO new runtime deps (it is pure TypeScript over the existing bundle). UAT-M10-03 Given clause is bounded (1 project, ~5-10 entities), so the in-memory complexity cost is bounded by the UAT scale.
**Consequences**: (a) `search.spec.ts` MUST `expect(searchIndex.build(...).search('llave plateada'))` to return at least 1 result per `type ∈ {character, scene-chapter, asset, decision, docs}` for the snapshot-valid fixtures; (b) `pnpm test --run control-plane/test/search.spec.ts` MUST exit 0; (c) `grep -cE 'indexeddb|Dexie|orama|fetch\\(' control-plane/src/store/searchIndex.ts` MUST be 0 (REQ-SID-1 oracle). Orama migration, when it lands, becomes a separate cycle with its own proposal + spec + design + ADR.

**Amendment 1 (correction round 1, apply-discovered)**: the original scene-chapter sourcing described `chapters[].scenes[]` extraction. `specs/cp-chapters.schema.json` (m14, `additionalProperties: false` over `{id, title, wordCount, status, docRef}`) forbids a `scenes` field, so the original was unreachable. Resolution: scene-chapter entries are enumerated ONE PER CHAPTER from `bundle.chapters[]`; the UAT-M10-03 binding clause "scene/chapter" is satisfied by chapter units (golden fixture `ch-silver-key` title "The Silver Key — La Llave Plateada"). REQ-SID-1 + Appendix pseudocode block 3 updated accordingly. The `scene-chapter` type remains future-extensible for projected scenes via a separate cycle + ADR.

### D2 — Pure builder + React hook split (testable in isolation; consumer surface is one symbol)

**Choice**: `searchIndex.ts` exports `{ build, tokenize, search, ASCIIfold }`. `useSearchIndex.ts` exports a single hook `useSearchIndex(query: string): SearchResult[]` that subscribes to `useProjectionStore` for `(catalogEntities, bundle)`, calls `build` once on mount + on change, and re-runs `search(query)` on each query change. Memoization is shallow-equal per `(query, catalogEntities, bundle, docs)` (D5 carries this contract). `docs` is sourced from `bundle.docs` (typed `unknown`, REQ-LOA-1 — narrowed inside the hook with a private `assertDocs` guard).
**Alternatives considered**: (i) single hook that re-builds on every render — rejected: invalidates the memoization oracle (EVT-SID-04 asserts exactly ONE `searchIndex.build` call per `(query, ...)` tuple); (ii) builder as a class with mutable state — rejected: a class cannot be tested without setup; (iii) putting the builder in `loader/` next to the projection port — rejected: it would couple the loader port to a feature surface.
**Rationale**: m15 precedent (`catalogSelectors`, `useProjectionStore`) for "build pure + consume via hook". `useSearchIndex` is consumed ONLY by `views/Search.tsx` + `features/docs/` (AC-INV-extension-isolation extended, REQ-SID-4 oracle: `grep -rE "useSearchIndex" control-plane/src/` MUST be at most 2 lines: `views/Search.tsx` + `store/useSearchIndex.ts` itself).

### D3 — Tokenizer: NFD + strip combining marks (`Mn`) + lowercase, then token-substring match

**Choice**: every search term and every indexed token runs through:

```ts
function ASCIIfold(s: string): string {
  return s.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase();
}
function tokenize(s: string): string[] {
  return ASCIIfold(s).split(/[^a-z0-9]+/i).filter(Boolean);
}
```

`search()` runs `tokenize(query)` and `tokenize(indexedText)`; a result matches iff every query token appears as a contiguous substring inside one of the indexed tokens.
**Alternatives considered**: (i) `String.prototype.localeCompare` with `caseFirst: 'lower'` — rejected: doesn't fold combining marks; (ii) ICU transliteration (`Intl.Segmenter`) — rejected: too heavy (V1 UAT scale doesn't need it; m15 precedent reserves it for V2); (iii) regex stemming / stop-word removal — rejected: V1 is plain substring; stemming is a V2 concern.
**Rationale**: REQ-SID-2 enumerates four equivalent forms (`LLAVE PLATEADA`, `llave plateada`, `Llàvé Pláteádà`, `llave-plateada`) that must surface the same results. The pipeline above makes them all collapse to `['llave', 'plateada']`. `grep -cE 'NFD|combining' control-plane/src/store/searchIndex.ts` MUST be at least 2 (EVT-SID-02 oracle).

### D4 — Ranker: entity-ref specificity ladder + deterministic tie-break

**Choice**: results are scored by the precedence in REQ-SID-3:

| Score | Match class | Example |
|---:|---|---|
| **100** | exact `id` match | `index.search('silver-key')` to Decision `id === 'silver-key'` first |
| **80** | exact `Kind:namespace/name` EntityRef match | `index.search('Character:demo/nora')` to Nora entity first |
| **60** | multi-field full-token hit | `index.search('llave plateada')` hits `description` AND `summary` |
| **40** | single-token substring hit | `index.search('llave')` matches 1 token only |
| **20** | snippet-only hit | result survives only because the snippet mentions the term |

Ties break by `(score DESC, id ASC)` — lexicographic ascending `id`. The ranker is a **pure function** (no timestamps, no random); `search()` returns a fresh array (never mutates input) — this makes the "deterministic across calls" assertion in EVT-SID-03 trivially true. `grep -cE 'score|score =' control-plane/src/store/searchIndex.ts` MUST be at least 2 (EVT-SID-03 oracle).
**Alternatives considered**: (i) BM25 / TF-IDF — rejected: V1 spec is exact-ladder; V2 (Orama) introduces BM25; (ii) MongoDB-style scoring with field boosts — rejected: V1 is bounded by UAT scale, the 5-level ladder is enough; (iii) random tie-break — rejected: violates determinism oracle.
**Rationale**: the ladder makes the test `expect(index.search('silver-key')[0].type).toBe('decision')` trivial to write and trivial to satisfy. Determinism is a hard contract — UAT-M10-03 reviewers will rerun the search.

### D5 — `useSearchIndex` memoization contract + consumer isolation

**Choice**: the hook signature is `useSearchIndex(query: string): SearchResult[]`. Internally:

```ts
// useSearchIndex.ts (sketch — no product code committed by design)
const bundle = useProjectionStore((s) => s.bundle);
const catalogEntities = useProjectionStore((s) => s.catalogEntities);
const memoIndex = useMemo(() => build(catalogEntities, bundle, assertDocs(bundle?.docs)), [catalogEntities, bundle]);
const memoResults = useMemo(() => memoIndex.search(query), [memoIndex, query]);
return memoResults;
```

`assertDocs(bundle?.docs)` narrows `unknown` to `DocsArray` via a private guard — never leaks the cast to consumers. The hook is consumed only from `views/Search.tsx` and any file under `features/docs/` (REQ-SID-4 oracle: `grep -rE "useSearchIndex" control-plane/src/` returns at most 2 hits: declaration + one consumer).
**Alternatives considered**: (i) recompute on every render — rejected: violates memoization oracle (EVT-SID-04); (ii) deep-equal on the bundle — rejected: cost > benefit at V1 scale; (iii) `useSyncExternalStore` — rejected: a Zustand selector is already correct for the subscription.
**Rationale**: the memoization contract is itself the AC-INV-extension-isolation surface for the index — it isolates consumers from rebuilding on unrelated store changes.

### D6 — GFM-safe rehype-sanitize schema with 4 explicit allow-list deltas closing REQ-DOC-2

**Choice**: `features/docs/docsSafeMarkdown.ts` composes the chain (see Appendix B for the full allow-list):

```text
unified().use(remarkParse).use(remarkGfm).use(entityLinkPlugin).use(remarkRehype).use(rehypeSanitize, schema).use(rehypeStringify).use(rehypeReact)
```

The `schema` is `defaultSchema` (hast-util-sanitize's GFM-default) **plus 4 explicit `attributes` / `tagNames` rules** that win over the defaults:

1. **Hard-strip the dangerous HTML element set**: extend `tagNames` to **exclude** `script`, `iframe`, `object`, `embed`, `style`, `form` (already absent from `defaultSchema`; the schema-extension uses `clobberPrefix: 'user-content-'` so even bypass attempts via `id` / `name` collisions don't apply).
2. **Strip `javascript:`, `vbscript:`, and `data:` URL protocols** from every `href` and `src` attribute — enumerated in REQ-DOC-2 vectors 2, 5, 7, 8.
3. **Strip every `on*=` event-handler attribute** at the `attributes` level (`allowedAttributes` enumerates positive attributes; `clobber` is on by default in `defaultSchema`).
4. **Force `img` / `a` `src` / `href` through a URL-protocol allow-list** (`urlProtocol`: `['https', 'http', 'mailto', 'relative']`) — REQ-DOC-2 vectors 4 and 5.

Rehype-sanitize's default is **already GFM-safe**; the 4 deltas are belt-and-braces against the OWASP Markdown XSS cheat-sheet vectors.
**Alternatives considered**: (i) **DOMPurify instead of `rehype-sanitize`** — rejected: requires a `ref` on every render (React 19 SSR-incompatible) and doesn't pipeline natively with `react-markdown`; (ii) hand-rolled regex sanitization — rejected: 200+ lines of bug-prone character classes vs. a 30-line schema; (iii) no sanitizer — rejected: violates REQ-DOC-2 + AC-INV-no-script-binding (implicit).
**Rationale**: the 10 OWASP vectors enumerated in REQ-DOC-2 all map to one of the 4 deltas; `docs-sanitization.spec.ts` enumerates each vector as an independent assertion (Appendix B lists them). `grep -cE 'react-markdown|rehype-sanitize|remark-gfm|entityLinkPlugin' control-plane/src/features/docs/docsSafeMarkdown.ts` MUST be at least 4 (EVT-DOC-01 oracle); `grep -cE 'tagName|attributes' docsSafeMarkdown.ts` MUST be at least 2 (schema declaration present).

### D7 — Custom `entityLinkPlugin` maps `[[Kind:namespace/name]]` to internal `<Link>` via validated `parseEntityRef` (see Appendix C for full AST shape)

**Choice**: a unified plugin that walks `text` nodes, matches `/\\[\\[([^:\\]]+):([^\\]\\/]+)\\/([^\\]]+)\\]\\]/g`, calls **the existing `parseEntityRef` from `store/entityRef.ts`** (already battle-tested by `catalog-store.spec.ts`), and replaces the matched text node with an `mdast` link node whose `url` is `/entity/<kind>/<namespace>/<name>` (encoded). On `EntityRefParseError` or any validator failure, the plugin leaves the literal text node untouched — never emits `<a href>` with attacker-controlled URL.
**Alternatives considered**: (i) a regex-only replacement that builds `href` without validation — rejected: REQ-DOC-3 explicitly forbids attacker-controlled URLs; (ii) a third-party remark plugin (`remark-wiki-link` etc.) — rejected: ships a transformation that violates AC-INV-static-build (renderer fetches) and adds an undeclared dep; (iii) rendering the bracket literally server-side — rejected: REQ-DOC-3 requires a client-side `[[Kind:namespace/name]]` parser so docs in the snapshot fixture parse identically in `vite preview` + unit tests.
**Rationale**: `parseEntityRef` is **the** canonical parser (no parser-duplication debt — INC-010 N/A here). The plugin emits one AST node per match; tests assert both the happy-path `[[Character:demo/nora]]` to `<a href="/entity/Character/demo/nora">` and the rejected-path `[[not-a-valid-ref]]` to literal text. `grep -cE 'parseEntityRef' control-plane/src/features/docs/entityLinkPlugin.ts` MUST be at least 1 (EVT-DOC-03 oracle).

### D8 — Source-path resolution: `metadata.annotations['narrative.dev/source-path']` to `loadDocs` to diagnostic on traversal

**Choice**: `DocTab.tsx` reads `ctx.entity.metadata.annotations['narrative.dev/source-path']` (a string). If missing, the tab renders a documented "no source annotation" placeholder — no error. If present, the path is **basenamed** via the `isSafeRelativePath` guard (re-used from m14 — already exported by `SnapshotProjectSource`), looked up in `bundle.docs`, and either rendered via `safeReactMarkdown` or surfaced as a `Diagnostic` with `keyword: 'path-traversal'` (REQ-DOC-4 oracle). `loadDocs` is a **pure read-only** function returning `{ path: string, body: string }[]`; the loader propagates any guard violation to the existing `errors[]` array.
**Alternatives considered**: (i) reading the doc file directly from disk via `fetch` — rejected: AC-INV-serverless; (ii) inlining the guard inside DocTab — rejected: AC-INV-no-write + DRY violation against the m14 guard.
**Rationale**: `isSafeRelativePath` from `loader/SnapshotProjectSource.ts` is **already** exported and reused (m15 precedent — `DirectoryProjectSource.ts` does the same). `synthetic('path-traversal', ...)` is **already** exported from `diagnostics/types.ts` (D6 of m14). The wiring is mechanical: doc index keyed by basename, lookup at render time, fallback for entities without annotation.

### D9 — NEW `specs/cp-decisions.schema.json` is a NEW file (AC-INV-schema binding); envelope follows the existing `cp-*.schema.json` convention (see Appendix F)

**Choice**: NEW file (NOT a modification of any existing schema). Envelope:

```json
{
  "schema": "control-plane/decisions/v1",
  "generatedAt": "<isoTimestamp>",
  "sourceRevision": "<sha>",
  "decisions": [
    {
      "id": "silver-key",
      "action": "Forge the silver key",
      "targetRef": "Character:demo/nora",
      "date": "2026-01-15T12:00:00Z",
      "status": "accepted"
    }
  ]
}
```

`targetRef` is constrained by `pattern: "^[A-Z][A-Za-z]+:[a-z0-9-]+/[a-z0-9-]+$"` — matches the m14 `parseEntityRef` (which accepts the wider `^([^:/]+):([^:/]+)\\/([^:/]+)$`); the tighter regex constrains `kind` (starts uppercase letter + only alphanumerics) and `namespace` / `name` (lowercase, digits, hyphens only) per the canonical EntityRef convention. `status` is enum `'accepted' | 'rejected' | 'pending' | 'superseded'` — ADR-008 candidate-before-accepted state machine. The schema is added to `src/schema/registry.ts`'s `BY_SCHEMA_CONST` map exactly like the other 7 cp-* enums (D4 of m14 precedent — no new dispatch axis).
**Alternatives considered**: (i) embedding `decisions` inside `cp-uat` — rejected: separable concern (uat is the test ledger, decisions are governance state — `docs/04-DOMAIN-MODEL.md` keeps them apart); (ii) modifying any existing schema — rejected: AC-INV-schema binding.
**Rationale**: REQ-DEC-1 + AC-INV-schema require a NEW file. Adding `'control-plane/decisions/v1'` to `BY_SCHEMA_CONST` is one line of `registry.ts` (m14 D4 pattern). The grep oracle `git diff --stat e530855e..HEAD -- specs/*.schema.json` MUST list ONLY `specs/cp-decisions.schema.json` as a new file (REQ-DEC-1 oracle).

### D10 — `ProjectionBundle.decisions: unknown` + `docs: unknown` (TypeScript `unknown`; m15 precedent for non-rippling additive fields)

**Choice**: extend the m15 `ProjectionBundle` interface with two additive fields `decisions: unknown` and `docs: unknown`. `assembleBundle` populates them via `loadDecisions(m)` (reads `projections/cp-decisions.json`, schema-validated against the new `cp-decisions.schema.json`, surfaces `synthetic('unknown-schema', ...)` on miss) and `loadDocs(m)` (enumerates `snapshot/docs/*.md`, guards each path via `isSafeRelativePath`, surfaces `synthetic('path-traversal', ...)` on violation). Both return `unknown`-typed values — the only V1 consumer is `useSearchIndex`, which narrows them via internal `assertDecisions` + `assertDocs` guards. **Zero existing consumer is forced to read them** (m15 precedent for `catalogEntities` kept outside the bundle).
**Alternatives considered**: (i) typed `ProjectionBundle.decisions: CpDecisionsEnvelope | null` — rejected: forces `Catalog.tsx` / `EntityPage.tsx` to thread the new key (REQ-LOA-1 explicitly says "no consumer ripple"); (ii) registering `loadDecisions` / `loadDocs` as side-effect imports of `main.tsx` — rejected: violates the m15 store bottleneck (D7 of m14).
**Rationale**: `grep -cE "decisions:\s*unknown|docs:\s*unknown" control-plane/src/loader/ProjectSource.ts` MUST be at least 2 (EVT-LOA-01 oracle). `pnpm tsc --noEmit -p control-plane/tsconfig.json` MUST exit 0 — the additive unknown is the load-bearing technique for non-ripple.

### D11 — `EntityTabExtension.kind: 'docs'` is OPTIONAL on existing m15 tabs and REQUIRED on docs tabs (no apiVersion bump)

**Choice**: extend the m15 `EntityTabExtension` interface with an additive field:

```ts
export interface EntityTabExtension {
  readonly apiVersion: 'control-plane.extensions/v1';
  readonly id: string;
  readonly kind: 'tab';
  readonly targetKind: string;
  readonly priority: number;
  readonly predicate: ExtensionPredicate;
  readonly title: string;
  // m16 additive — optional on existing m15 tabs (overview/arc/scenes/visual-dna/continuity-status),
  //            — REQUIRED on docs tabs registered by features/docs/.
  readonly kind?: 'docs';
  render(ctx: ExtensionContext): React.ReactElement;
}
```

Existing m15 `features/{story,visual,catalog,continuity}/character/index.tsx` files do NOT change (the field is optional). The new `features/docs/character/index.tsx` SETS the field. The registry dispatch contract is unchanged (filter by `predicate`, sort by `priority`). The discriminator is read at filter time only. `apiVersion: 'control-plane.extensions/v1'` is preserved verbatim on every registered feature (AC-INV-API-version — REQ-EXR-1 oracle: `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/extensions/*.ts` MUST be at least 4).
**Alternatives considered**: (i) **NEW `EntityDocTabExtension` interface with a NEW `apiVersion`** — rejected per AC-INV-API-version binding (ADR-022 prose contract); (ii) introducing a fourth `kind: 'docs-tab'` discriminator on the existing `EntityTabExtension` `kind` field — rejected: `kind: 'tab' | 'card'` is the registry's primary discriminator (registry.ts `f.kind === 'tab'` filter); an alias would require a registry refactor.
**Rationale**: `kind?: 'docs'` reads as "this tab is a docs tab". ADR-022's "every extension contract carries API version" is preserved because the only contract that changes is "this field is optional and carries a discriminator string". `grep -cE "kind:\s*'docs'" control-plane/src/extensions/types.ts` MUST be at least 1 (EVT-EXR-01 oracle).

### D12 — INC-008 closure: relative-escape grep oracle + `features/docs/` prohibited list (see Appendix D)

**Choice**: extend `test/extension-isolation.spec.ts` test 4 oracle with the relative-escape pattern AND assert `features/docs/` is in the prohibited-folder list. The new oracle:

```ts
// extension-isolation.spec.ts — extended test 4 (load-bearing for INC-008)
const directPattern = /from\\s+['\"]\\.\\.?\\/.*features\\/(story|visual|catalog|continuity|docs)\\//;
const relativeEscapePattern = /from\\s+['\"]\\.\\.\\/\\.\\.\\/(story|visual|catalog|continuity|docs)\\//;
const featuresDir = 'src/features';
const directHits = execSync(`grep -rE "${directPattern.source}" ${featuresDir}/ 2>/dev/null || true`, { encoding: 'utf8' });
const relativeHits = execSync(`grep -rE "${relativeEscapePattern.source}" ${featuresDir}/ 2>/dev/null || true`, { encoding: 'utf8' });
expect(directHits.trim()).toBe('');          // m15 baseline
expect(relativeHits.trim()).toBe('');          // m16 INC-008 closure
```

The production invariant: `grep -rE "from\\s+['\"]\\.\\./\\.\\./(story|visual|catalog|continuity|docs)/" control-plane/src/features/` MUST return 0 matches. The test list carried by `extension-isolation.spec.ts` grows from 4 (m15) to 5 (m16):
1. (m15) Character tabs do NOT leak to Build entities.
2. (m15) `render()` is called with a valid `ExtensionContext` shape.
3. (m15) `kindIs` predicate matches the exact kind string.
4. (m15 EXTENDED) **No cross-folder imports** — direct pattern (m15 baseline) AND relative-escape pattern (m16 INC-008 closure) MUST both return empty.
5. (m16 NEW) `features/docs/` is included in the prohibited-folder list (separate spec assertion that the array `['story','visual','catalog','continuity','docs']` matches the source).
**Alternatives considered**: (i) leaving the test as-is (INC-008 stays open) — rejected: INC-008 is binding per the proposal; (ii) replacing the direct pattern with the relative-escape pattern only — rejected: the direct pattern is the load-bearing invariant from m15 (NEVER remove); (iii) using a single combined regex `from\\s+['\"](?:\\.\\./\\.\\./|\\.\\.?/.*features/)(story|visual|catalog|continuity|docs)/` — rejected: oracles MUST be individually readable; the spec separates them so failure messages are crisp.
**Rationale**: INC-008 is a residual m15 F-15-E PARTIAL PASS gap. m16 Block 0 task **T-0.4** (Appendix G §Block 0) extends the test source with the new lines. `grep -c "from\\s\\+['\"]\\.\\./\\.\\./" control-plane/test/extension-isolation.spec.ts` MUST be at least 1 (the pattern is in the source); the existing `pnpm test --run extension-isolation.spec.ts` MUST exit 0 with 5 tests passing.

### D13 — `DocTab` registers as `EntityTabExtension` with `kindIs('Character')` predicate + `kind: 'docs'` discriminator (priority 50)

**Choice**: `features/docs/character/index.tsx` registers a single `EntityTabExtension` named `DocTab`:

```ts
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'docs/character-doc',
  kind: 'tab',
  targetKind: 'Character',
  priority: 50,
  predicate: kindIs('Character'),
  title: 'Narrative Docs',
  kind: 'docs',  // m16 additive discriminator (D11)
  render: (ctx: ExtensionContext) => <DocTab ctx={ctx} docs={assertDocs(ctx.getProjection('docs'))} />,
} as EntityTabExtension);
```

`priority: 50` puts `DocTab` AFTER the existing 5 m15 Character tabs (priorities 10/15/20/30/40). `kindIs('Character')` reuses the m15 helper — zero new combinator primitives. `DocTab` reads `ctx.entity.metadata.annotations['narrative.dev/source-path']` and looks the basename up in the supplied docs index (D8).
**Alternatives considered**: (i) `priority: 100` (last) — rejected: 50 aligns with `ContinuityStatusTab` (the m15 last tab) and keeps the lucene-like affordance ordering stable; (ii) a separate `kindIs('Character' as const)` — rejected: the parameter type is `string` by design (registry combinator flexibility).
**Rationale**: `grep -cE "kind:\s*'docs'" control-plane/src/features/docs/character/index.tsx` MUST be at least 1; `grep -cE "apiVersion:\s*'control-plane.extensions/v1'" control-plane/src/features/docs/character/index.tsx` MUST be at least 1 (EVT-EXT-02 oracle).

### D14 — Fixture surface (3 Markdown docs + 1 cp-decisions.json + 1 catalog/decision-silver-key.yaml + additive indexable text in 3 cp-* projections + manifest entry)

**Choice**: the snapshot-valid fixture set grows by 3 Markdown docs in `golden/control-plane/snapshot-valid/docs/` and 3 JSON / YAML projections. Every fixture is **additive** (no removal, no schema change to existing files).

| Fixture file | Purpose | Adversarial content | Oracle |
|---|---|---|---|
| `docs/narrative.md` | Top-level project overview + 2 entity-links to demo characters | One entity-link `[[Character:demo/nora]]` → renders internal link; one entity-link `[[not-a-ref]]` → renders literal text | `expect(rendered).toContain('<a href="/entity/Character/demo/nora">nora</a>')` and `expect(rendered).toContain('[[not-a-ref]]')` |
| `docs/nora.md` | The Nora character sheet + 1 XSS attempt | One `<script>alert(1)</script>` payload + one `[link](javascript:alert(2))` payload + one `![img](data:text/html,<script>alert(3)</script>)` payload | `expect(rendered).not.toContain('<script>')`, `.not.toContain('javascript:')`, `.not.toContain('data:text/html')` (REQ-DOC-2 oracle). |
| `docs/scene-silver-key.md` | Scene doc for UAT-M10-03 Given (mentions `llave plateada`) | Pure prose with `llave plateada` + `silver-key` referenced | `expect(index.search('llave plateada').length).toBeGreaterThanOrEqual(5)` (REQ-SID-3 oracle). |
| `projections/cp-decisions.json` | 3 fixtures: `silver-key`, `nora-arc`, `iron-door` | `targetRef` set to canonical EntityRef; `status: 'accepted' \| 'rejected' \| 'pending'` | `expect(cpDecisions.decisions.length).toBe(3)`, `expect(cpDecisions.decisions[0].id).toBe('silver-key')` |
| `catalog/decision-silver-key.yaml` | The `silver-key` Decision catalog entity | One annotation `narrative.dev/source-path: 'docs/scene-silver-key.md'` | `expect(catalogEntity.metadata.annotations['narrative.dev/source-path']).toBe('docs/scene-silver-key.md')` |
| 3 cp-* JSONs (additive) | `cp-characters.json` summary text + `cp-chapters.json` summary text + `cp-assets.json` summary text | Plain indexable strings (no XSS) | `expect(index.search('llave').length).toBeGreaterThan(0)` |
| `manifest.json` | additive entries for the new docs + projections | `manifest.snapshot.docs.length === 3`, `manifest.projections['control-plane/decisions/v1']` present | `expect(Object.keys(manifest.projections)).toContain('control-plane/decisions/v1')` |

**Alternatives considered**: (i) reusing m15's `narrative-overview.md` fixture — rejected: m15 has zero `.md` fixtures; (ii) adding fixtures to `golden/control-plane/snapshot-valid/docs/` instead of `snapshot-valid/docs/` — rejected: the m15 fixture root is `golden/control-plane/snapshot-valid/`; (iii) reusing m14 `cp-decisions` as a stub without schema — rejected: REQ-DEC-1 + AC-INV-schema require the schema file.
**Rationale**: every fixture has an oracle (`expect(...)`) that closes one or more EVT-* assertions. The XSS payload in `docs/nora.md` exercises ALL 4 allow-list deltas (D6) and makes `docs-sanitization.spec.ts` self-checking. `git diff --stat e530855e..HEAD -- golden/` MUST list the 3 new docs + cp-decisions.json + catalog/decision-silver-key.yaml + additive-only diffs in 3 cp-* JSONs + manifest.json (REQ-GFC-1, REQ-GFC-2, REQ-GFC-3 oracles).

### D15 — `/search` route: single-quoted `path: '/search'` AFTER `/entity/...`; routes.tsx F-004 oracle extends to 7 entries (INC-009 closure)

**Choice**: in `routes/router.ts`, the static-paths array gains ONE entry:

```ts
const STATIC_PATHS = ['/', '/workbench', '/graph-lens', '/search', '/entity/:kind/:namespace/:name'] as const;
```

`/search` MUST appear AFTER `/entity/:kind/:namespace/:name` so that a query string is matched by `/entity/:kind/:namespace/:name` first (TanStack Router's order-sensitive static precedence — `/entity/foo` must win over `/search` if both are reachable). In `routes/routes.tsx`, the F-004 oracle array grows from 6 (m15) to 7 entries (one of which is `/search`):

```ts
const ROUTES_TOUCHED_BY_INC009 = ['/', '/workbench', '/graph-lens', '/search', '/entity/:kind/:namespace/:name', '/workbench/:tabId', '/graph-lens/:focus'] as const;
```

`views/Search.tsx` consumes `useSearchIndex(query)` and renders a `<ResultList>` per category. The view is **the only consumer** of `useSearchIndex` outside the test surface (REQ-SID-4 oracle: `grep -rE 'useSearchIndex\\(' control-plane/src/` returns at most 2 hits, the second being the test file).

**Alternatives considered**: (i) routing `/search` via TanStack Router **file-based routing** — rejected: m15 explicitly uses manual `router.ts` (D7 of m14 precedent — file-based routing violates the manual-routing bottleneck); (ii) `path: '/search' ` placed BEFORE `/entity/:kind/:namespace/:name` — rejected: route precedence would route `/entity/foo` to `/search/:kind/:namespace/:name`, breaking the UAT-M10-03 Given step that navigates to `nora` and then to `/search`; (iii) embedding `<Search />` directly in `routes.tsx` — rejected: violates AC-INV-routes-only (routes.tsx is router-config-only — D6 of m15).

**Rationale**: INC-009 (AC-15.4 spec literal divergence in `routes.tsx`) closes as a natural side-effect: the F-004 oracle array MUST enumerate every route `routes/router.ts` exposes, and `/search` is now an enumerated route. `pnpm test --run routes-router.spec.ts` (m15 test, Block 3 ADDITIVE — see Appendix G §Block 3) MUST exit 0 with the new oracle. `grep -nE "path:\\s*'/search'" control-plane/src/routes/router.ts` MUST return exactly 1 hit (REQ-ROU-1 oracle).

## Per-Block Decomposition

Each block ships as ONE atomic commit. Each commit message carries the AC tag + the changed-file list. Block numbers are stable across `sddk-tasks` (which inherits them) and `sddk-apply`.

### Block PF — Pre-Flight: deps + manifest + extension isolation (no `src/` modifications)

**Scope**: pre-flight ONLY. No product code, no tracked source mutations outside `package.json` + the extension-isolation test.

**Changes**:
- `control-plane/package.json`: add 4 exact-pinned Markdown deps (Appendix A pins).
- `pnpm-lock.yaml`: regenerate (committed; AC-INV-lockfile).
- `control-plane/test/extension-isolation.spec.ts`: extend test 4 with the relative-escape pattern (D12); add test 5 (the prohibited-folder list assertion) — both INC-008 closure.

**Commit message skeleton** (AC tag + files):
```
chore(m16-block-pf): pin 4 Markdown deps + extend extension-isolation (INC-008)

AC: AC-INV-API-version, AC-INV-extension-isolation, AC-INV-lockfile, AC-INV-no-Dexie

Files:
- control-plane/package.json
- pnpm-lock.yaml
- control-plane/test/extension-isolation.spec.ts

Oracles:
- pnpm install --frozen-lockfile → exit 0
- pnpm test --run extension-isolation.spec.ts → 5 tests pass (was 4)
- grep -cE "react-markdown|rehype-sanitize|remark-gfm|unist-util-visit" package.json → ≥ 4
```

**Estimated LoC**: ~30 (package.json diff + test source extension). **Risk**: M14 D3 ladder budget; STOP conditions in Appendix A gate the commit.

### Block 0 — Foundation: index builder + hook + loader extensions (the biggest block)

**Scope**: load-bearing infrastructure. NO `views/` changes — the index builder + hook + loader extensions are consumed only by tests in this block.

**Changes**:
- `control-plane/src/store/searchIndex.ts` (NEW, ~250 LoC): `ASCIIfold`, `tokenize`, `build`, `search`, types. The 5-level ranker (D4) + ASCIIfold tokenizer (D3).
- `control-plane/src/store/useSearchIndex.ts` (NEW, ~30 LoC): the hook (D5).
- `control-plane/src/loader/ProjectSource.ts`: extend `ProjectionBundle` interface with `decisions: unknown` + `docs: unknown` (D10).
- `control-plane/src/loader/SnapshotProjectSource.ts`: add `loadDecisions(manifest)` + `loadDocs(manifest)` helpers; integrate into `assembleBundle` (D10); reuse `isSafeRelativePath` (D8).
- `control-plane/src/extensions/types.ts`: extend `EntityTabExtension` with `kind?: 'docs'` (D11).
- `control-plane/test/search-index.spec.ts` (NEW, ~150 LoC): ASCIIfold + tokenize + build + search + ranker + determinism tests (EVT-SID-01 through EVT-SID-03).
- `control-plane/test/use-search-index.spec.ts` (NEW, ~80 LoC): memoization + consumer-isolation + assert-guards tests (EVT-SID-04).

**Commit message skeleton**:
```
feat(m16-block-0): search-index + hook + loader extensions

AC: AC-INV-extension-isolation, AC-INV-no-Dexie, AC-INV-serverless, AC-INV-static-build

Files:
- control-plane/src/store/searchIndex.ts (new)
- control-plane/src/store/useSearchIndex.ts (new)
- control-plane/src/loader/ProjectSource.ts (modified: 2 additive unknown fields)
- control-plane/src/loader/SnapshotProjectSource.ts (modified: 2 helpers + assembleBundle integration)
- control-plane/src/extensions/types.ts (modified: 1 additive optional field)
- control-plane/test/search-index.spec.ts (new)
- control-plane/test/use-search-index.spec.ts (new)

Oracles:
- pnpm tsc --noEmit -p control-plane/tsconfig.json → exit 0
- pnpm test --run search-index.spec.ts use-search-index.spec.ts → all pass
- grep -cE "indexeddb|Dexie|orama|fetch\(" src/store/searchIndex.ts → 0
- grep -cE "decisions:\s*unknown|docs:\s*unknown" src/loader/ProjectSource.ts → 2
- grep -cE "kind:\s*'docs'" src/extensions/types.ts → ≥ 1
```

**Estimated LoC**: ~510. **Risk**: the index builder is the most subtle piece — ASCIIfold edge cases (combining marks in non-Latin scripts), ranker tie-break ordering, memoization invalidation. The unit-test count (≥ 12 in `search-index.spec.ts`) MUST cover each edge case explicitly.

### Block 1 — Search view + route + `useSearchIndex` consumer

**Scope**: the user-facing surface. Consumes the index from Block 0. The route is added in this block (D15).

**Changes**:
- `control-plane/src/views/Search.tsx` (NEW, ~180 LoC): search input + per-category result list. Consumes `useSearchIndex(query)`.
- `control-plane/src/routes/router.ts`: extend `STATIC_PATHS` with `'/search'` (D15).
- `control-plane/src/routes/routes.tsx`: extend `ROUTES_TOUCHED_BY_INC009` oracle array (D15, INC-009 closure).
- `control-plane/test/search.spec.ts` (NEW, ~120 LoC): integration test — load snapshot-valid fixtures, hit `/search`, assert result list shape. Plus a smoke test that asserts no `fetch(`, `IndexedDB`, or `Orama` symbol in the route bundle (EVT-ROU-03 oracle).
- `control-plane/test/routes-router.spec.ts` (MODIFIED, additive ~20 LoC): assert `/search` is in `STATIC_PATHS` and in `ROUTES_TOUCHED_BY_INC009` (EVT-ROU-01 + REQ-ROU-02 oracle).

**Commit message skeleton**:
```
feat(m16-block-1): search view + /search route + useSearchIndex consumer

AC: AC-INV-no-Dexie, AC-INV-serverless, AC-INV-routes-only, AC-INV-static-build

Files:
- control-plane/src/views/Search.tsx (new)
- control-plane/src/routes/router.ts (modified: 1 additive path)
- control-plane/src/routes/routes.tsx (modified: 1 additive oracle entry)
- control-plane/test/search.spec.ts (new)
- control-plane/test/routes-router.spec.ts (modified additive)

Oracles:
- pnpm tsc --noEmit -p control-plane/tsconfig.json → exit 0
- pnpm test --run search.spec.ts routes-router.spec.ts → all pass
- grep -nE "path:\s*'/search'" src/routes/router.ts → exactly 1 hit
- grep -rE 'useSearchIndex\(' src/ → ≤ 2 hits (views/Search.tsx + test)
```

**Estimated LoC**: ~340. **Risk**: `vite preview` smoke (REQ-ROU-03) is run at Block F as part of the README closeout. Block 1 only proves the unit-test contract.

### Block 2 — Markdown safe-rendering feature + entity-link plugin

**Scope**: the `features/docs/` folder is born. NO catalog-entity modifications.

**Changes**:
- `control-plane/src/features/docs/docsSafeMarkdown.ts` (NEW, ~120 LoC): the unified chain + the 4-allow-list schema (D6).
- `control-plane/src/features/docs/entityLinkPlugin.ts` (NEW, ~90 LoC): the custom remark plugin (D7).
- `control-plane/src/features/docs/types.ts` (NEW, ~40 LoC): `DocsArray`, `DocEntry` types + `assertDocs` guard.
- `control-plane/test/docs-sanitization.spec.ts` (NEW, ~140 LoC): 10 OWASP Markdown XSS vectors enumerated as individual `expect(...)` assertions (REQ-DOC-2 oracle).
- `control-plane/test/entity-link-plugin.spec.ts` (NEW, ~90 LoC): happy-path + rejected-path entity-link tests (REQ-DOC-3 oracle).

**Commit message skeleton**:
```
feat(m16-block-2): markdown sanitization + entity-link plugin (D6/D7)

AC: AC-INV-extension-isolation, AC-INV-static-build, AC-INV-no-script-binding (implicit)

Files:
- control-plane/src/features/docs/docsSafeMarkdown.ts (new)
- control-plane/src/features/docs/entityLinkPlugin.ts (new)
- control-plane/src/features/docs/types.ts (new)
- control-plane/test/docs-sanitization.spec.ts (new)
- control-plane/test/entity-link-plugin.spec.ts (new)

Oracles:
- pnpm tsc --noEmit -p control-plane/tsconfig.json → exit 0
- pnpm test --run docs-sanitization.spec.ts entity-link-plugin.spec.ts → all pass
- grep -cE "react-markdown|rehype-sanitize|remark-gfm|entityLinkPlugin" src/features/docs/docsSafeMarkdown.ts → ≥ 4
- grep -cE "tagName|attributes" src/features/docs/docsSafeMarkdown.ts → ≥ 2
- grep -cE "parseEntityRef" src/features/docs/entityLinkPlugin.ts → ≥ 1
```

**Estimated LoC**: ~480. **Risk**: the GFM schema must close all 10 vectors — `docs-sanitization.spec.ts` MUST enumerate each one explicitly (no shared assertions). The entity-link plugin must NOT emit `<a href>` on rejection — its test surface covers 4 distinct rejection patterns (empty kind, bad namespace, bad name, parse error).

### Block 3 — `DocTab` registration + decision projection schema

**Scope**: the docs feature integrates with the m15 extension registry (D11/D13); the new cp-decisions schema lands (D9).

**Changes**:
- `control-plane/src/features/docs/character/index.tsx` (NEW, ~80 LoC): the `DocTab` registration (D13).
- `control-plane/src/features/docs/character/DocTab.tsx` (NEW, ~120 LoC): the tab component (D8 — reads annotation, looks up doc, renders safe Markdown).
- `control-plane/src/schema/cp-decisions.schema.json` (NEW, ~30 lines JSON): the new schema (D9, Appendix F).
- `control-plane/src/schema/registry.ts` (MODIFIED, 1 line additive): add `'control-plane/decisions/v1'` to `BY_SCHEMA_CONST`.
- `control-plane/test/doc-tab.spec.ts` (NEW, ~100 LoC): extension registration + render + path-traversal fallback tests.
- `control-plane/test/cp-decisions-schema.spec.ts` (NEW, ~80 LoC): schema validation + golden fixture round-trip tests.

**Commit message skeleton**:
```
feat(m16-block-3): DocTab + cp-decisions schema (D8/D9/D11/D13)

AC: AC-INV-API-version, AC-INV-extension-isolation, AC-INV-schema

Files:
- control-plane/src/features/docs/character/index.tsx (new)
- control-plane/src/features/docs/character/DocTab.tsx (new)
- control-plane/src/schema/cp-decisions.schema.json (new)
- control-plane/src/schema/registry.ts (modified: 1 additive entry)
- control-plane/test/doc-tab.spec.ts (new)
- control-plane/test/cp-decisions-schema.spec.ts (new)

Oracles:
- pnpm tsc --noEmit -p control-plane/tsconfig.json → exit 0
- pnpm test --run doc-tab.spec.ts cp-decisions-schema.spec.ts → all pass
- grep -cE "apiVersion:\s*'control-plane.extensions/v1'" src/features/docs/character/index.tsx → ≥ 1
- grep -cE "kind:\s*'docs'" src/features/docs/character/index.tsx → ≥ 1
- git diff --stat e530855e..HEAD -- specs/*.schema.json → only cp-decisions.schema.json listed as new
```

**Estimated LoC**: ~430. **Risk**: `DocTab` is the FIRST consumer of `bundle.docs` outside tests — `assertDocs` guard MUST reject without crashing (Diagnostic surfaced, not React throw). The schema is a NEW file — `registry.ts` must add ONE line, no refactor.

### Block 4 — Golden fixtures (the snapshot-valid set grows by 3 docs + 1 projection + 1 catalog + additive diffs)

**Scope**: the fixture surface that makes Block 0/1/2/3 tests pass. NO source modifications.

**Changes** (all additive):
- `golden/control-plane/snapshot-valid/docs/narrative.md` (NEW, ~30 LoC): entity-link + non-ref literal.
- `golden/control-plane/snapshot-valid/docs/nora.md` (NEW, ~40 LoC): XSS payload + benign content.
- `golden/control-plane/snapshot-valid/docs/scene-silver-key.md` (NEW, ~30 LoC): UAT-M10-03 Given text.
- `golden/control-plane/snapshot-valid/projections/cp-decisions.json` (NEW, ~40 lines JSON): 3 fixtures (D14).
- `golden/control-plane/snapshot-valid/catalog/decision-silver-key.yaml` (NEW, ~25 lines YAML): Decision entity with `narrative.dev/source-path` annotation.
- `golden/control-plane/snapshot-valid/projections/cp-characters.json` (MODIFIED additive, ~5 lines): add `summary` strings mentioning `llave plateada`.
- `golden/control-plane/snapshot-valid/projections/cp-chapters.json` (MODIFIED additive, ~5 lines): same.
- `golden/control-plane/snapshot-valid/projections/cp-assets.json` (MODIFIED additive, ~5 lines): same.
- `golden/control-plane/snapshot-valid/manifest.json` (MODIFIED additive, ~10 lines): add `snapshot.docs[]` entries + `projections['control-plane/decisions/v1']` entry.

**Commit message skeleton**:
```
test(m16-block-4): snapshot-valid fixtures (3 docs + 1 projection + 1 catalog + additive cp-*)

AC: AC-INV-golden-fixtures, AC-INV-snapshot-valid

Files:
- golden/control-plane/snapshot-valid/docs/narrative.md (new)
- golden/control-plane/snapshot-valid/docs/nora.md (new)
- golden/control-plane/snapshot-valid/docs/scene-silver-key.md (new)
- golden/control-plane/snapshot-valid/projections/cp-decisions.json (new)
- golden/control-plane/snapshot-valid/catalog/decision-silver-key.yaml (new)
- golden/control-plane/snapshot-valid/projections/cp-characters.json (modified additive)
- golden/control-plane/snapshot-valid/projections/cp-chapters.json (modified additive)
- golden/control-plane/snapshot-valid/projections/cp-assets.json (modified additive)
- golden/control-plane/snapshot-valid/manifest.json (modified additive)

Oracles:
- pnpm test --run (full control-plane suite) → all pass
- jq -e '.snapshot.docs | length == 3' golden/control-plane/snapshot-valid/manifest.json → exit 0
- jq -e '.projections | has("control-plane/decisions/v1")' golden/control-plane/snapshot-valid/manifest.json → exit 0
- grep -cE "llave plateada" golden/control-plane/snapshot-valid/projections/cp-{characters,chapters,assets}.json → ≥ 3
```

**Estimated LoC**: ~190. **Risk**: the additive-only diff invariant on `cp-{characters,chapters,assets}.json` — `git diff --stat` MUST NOT remove any existing line.

### Block F — Doc/MANIFEST closeout (per file with substantive change + verification oracle)

**Scope**: documentation + MANIFEST.json regen + smoke-test oracles. NO source modifications. Per m14/m15 closeout precedent.

**Changes (per file)**:

| File | Substantive change | Verification oracle |
|---|---|---|
| `docs/32-NARRATIVE-DOCS-SEARCH.md` (NEW, ~150 LoC) | The "M10.3 V1 substring index" section + the GFM allow-list + the entity-link plugin docs | `grep -cE "V1 substring\|Orama V2\|GFM-safe rehype-sanitize" docs/32-NARRATIVE-DOCS-SEARCH.md` ≥ 3 |
| `docs/27-GLOSSARY.md` (MODIFIED additive, ~20 LoC) | Add 4 new glossary entries: `EntityTabExtension kind: 'docs'`, `safe-narrative-docs`, `decision-projection`, `V1 substring index` | `grep -cE "kind:\s*'docs'\|safe-narrative-docs\|decision-projection\|V1 substring index" docs/27-GLOSSARY.md` ≥ 4 |
| `docs/28-CONTROL-PLANE-STACK.md` (MODIFIED additive, ~30 LoC) | Add 4 new exact-pinned Markdown deps in the version-locked table | `grep -cE "react-markdown@9\|rehype-sanitize@6\|remark-gfm@4\|unist-util-visit@5" docs/28-CONTROL-PLANE-STACK.md` ≥ 4 |
| `MANIFEST.json` (regen) | Add the 6 new m16 cycle artifacts (proposal + spec + design + tasks + apply + verify) + the 3 new snapshot-valid docs + the cp-decisions projection | `jq -e '.cycles[]?.id == "m16-cp-studio-search-docs"' MANIFEST.json` → exit 0 |
| `README.md` (MODIFIED additive, ~40 LoC) | Add a "Local Search + Narrative Docs (M10.3)" section + the UAT-M10-03 Given/When/Then walk-through + the `vite preview` smoke recipe | `grep -cE "Local Search\|Narrative Docs\|UAT-M10-03\|vite preview" README.md` ≥ 4 |

**Commit message skeleton**:
```
docs(m16-block-f): cycle closeout (32-NARRATIVE-DOCS-SEARCH + 27-GLOSSARY + 28-CONTROL-PLANE-STACK + MANIFEST + README)

AC: AC-INV-doc-traceability, AC-INV-MANIFEST, AC-INV-smoke-recipe

Files:
- docs/32-NARRATIVE-DOCS-SEARCH.md (new)
- docs/27-GLOSSARY.md (modified additive)
- docs/28-CONTROL-PLANE-STACK.md (modified additive)
- MANIFEST.json (regen)
- README.md (modified additive)

Oracles:
- pnpm tsc --noEmit -p control-plane/tsconfig.json → exit 0
- pnpm test --run (full control-plane suite) → all pass (cumulative)
- jq -e '.cycles[]?.id == "m16-cp-studio-search-docs"' MANIFEST.json → exit 0
- grep -cE "vite preview" README.md → ≥ 1 (smoke recipe present)
- (manual) pnpm --filter control-plane preview → open /search, type 'llave plateada', see 5+ results
```

**Estimated LoC**: ~250. **Risk**: the `vite preview` smoke is the only MANUAL oracle — it must be reproducible from the recipe in `README.md` and produce ≥ 5 search results for `llave plateada`.

## M14 D3 Ladder Pre-Flight for 4 Markdown Deps (Appendix A)

The M14 D3 ladder protocol applies (4 pins, exact versions, transitive count, STOP conditions, advisory pins). The 4 Markdown pipeline deps are listed with their m14-ladder classification.

| Dep | Tier | Exact pin | Transitive depth | STOP condition (T0/T1/T2) |
|---|---|---|---|---|
| `react-markdown` | **T0 (essential)** | `9.0.3` (m15 era; verified on npm registry) | 2 (hast-react → unist-util-visit-family) | STOP if `react-markdown@9` major-version drift vs. `react@18.3.1` ≥ 1 minor (peer dependency) |
| `rehype-sanitize` | **T1 (high)** | `6.0.0` (m15 era; hast-util-sanitize@6 lineage) | 3 (hast-util-sanitize → mdast-util-to-hast → remark-parse) | STOP if `hast-util-sanitize` major-version drift ≥ 2 from `rehype-sanitize@6` peer |
| `remark-gfm` | **T1 (high)** | `4.0.0` (m15 era; mdast-util-gfm-table-family) | 3 (mdast-util-gfm-* siblings) | STOP if any `mdast-util-gfm-*` peer major-version drift ≥ 2 |
| `unist-util-visit` | **T2 (advisory)** | `5.0.0` (mdast visit family) | 2 (visit-family + visit-parents) | NO STOP condition (pure visitor helper; version-bumps are non-breaking by visit-family contract) |

**Total transitive count**: 4 new direct + ~12 new transitive = ~16 new entries in `pnpm-lock.yaml`. Well below the m15 precedent of 47 new entries for the catalog-entity dep (m15 cap: ≤ 50 new entries per pin-cycle). **Advisory pins** (carried at the same exact pin as the direct dep): `mdast-util-from-markdown@2.0`, `mdast-util-to-hast@3.0`, `hast-util-to-jsx-runtime@2.0` — these are the `mdast`/`hast` runtime shared by `react-markdown` + `rehype-sanitize` + `remark-gfm`. They MUST match the direct-dep's declared peer ranges exactly.

**Pre-flight STOP gate**: BEFORE Block PF commit, `pnpm install --frozen-lockfile` MUST exit 0 with all 4 pins resolved to the exact versions listed above. `pnpm list --depth 0` MUST show:

```text
react-markdown 9.0.3
rehype-sanitize 6.0.0
remark-gfm 4.0.0
unist-util-visit 5.0.0
```

If `pnpm install` produces a peer-dep warning for any of the 4, STOP and re-evaluate the pin.

## GFM-Safe Allow-List (Appendix B)

The 4 allow-list deltas (D6) in pseudocode (`docsSafeMarkdown.ts`):

```ts
import { defaultSchema } from 'hast-util-sanitize';
import deepmerge from 'deepmerge';

const schema = deepmerge(defaultSchema, {
  // DELTA 1: hard-strip dangerous HTML element set (REQ-DOC-2 vectors 1, 6, 9)
  clobberPrefix: 'user-content-',
  // (defaultSchema already strips script, iframe, object, embed, style, form — the prefix is the belt-and-braces against bypass attempts)
  // DELTA 2: strip javascript:, vbscript:, data: URL protocols from every href/src (REQ-DOC-2 vectors 2, 5, 7, 8)
  protocols: {
    href: ['http', 'https', 'mailto', 'relative'],
    src: ['http', 'https', 'data-image'],  // data: only for image MIME; no data:text/html
    // (defaultSchema already excludes javascript: + vbscript:; data: gets restricted)
  },
  // DELTA 3: strip every on*= event-handler attribute (REQ-DOC-2 vector 3)
  // (defaultSchema's allowedAttributes uses a positive list — on* is already absent; clobber is on by default)
  // DELTA 4: force img / a src / href through the URL-protocol allow-list (REQ-DOC-2 vectors 4, 5)
  tagNames: defaultSchema.tagNames,  // unchanged
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ['className', ...allowedMarkdownAttributes.a.className],
      ['href', ...allowedMarkdownAttributes.a.href],
    ],
    img: [
      ['src', ...allowedMarkdownAttributes.img.src],
      ['alt', ...allowedMarkdownAttributes.img.alt],
    ],
  },
});
```

**10 OWASP Markdown XSS vectors enumerated** (each is a separate `expect(...)` in `docs-sanitization.spec.ts`):

1. `<script>alert(1)</script>` literal → stripped (delta 1 + delta 3)
2. `[click](javascript:alert(2))` → href stripped (delta 2 + delta 4)
3. `<img onerror="alert(3)" src="x">` → on* stripped (delta 3)
4. `<iframe src="evil.com"></iframe>` → stripped (delta 1)
5. `<a href="data:text/html,<script>alert(4)</script>">` → href stripped (delta 2 + delta 4)
6. `<style>...</style>` literal → stripped (delta 1)
7. `[click](vbscript:msgbox(5))` → href stripped (delta 2)
8. `<object data="evil.swf"></object>` → stripped (delta 1)
9. `<embed src="evil.pdf"></embed>` → stripped (delta 1)
10. `<form action="evil.com"><input name="x"></form>` → stripped (delta 1)

`docs-sanitization.spec.ts` MUST enumerate all 10. `grep -cE 'expect\\(rendered\\)' control-plane/test/docs-sanitization.spec.ts` MUST be ≥ 10 (REQ-DOC-2 oracle).

## Remark Plugin AST Shape (Appendix C)

The custom `entityLinkPlugin` (D7) operates on `mdast` (markdown AST). Before / after transformations of a single paragraph:

**INPUT markdown** (from `docs/narrative.md`):

```text
Nora ([[Character:demo/nora]]) found the silver key in the archive.
```

**INPUT mdast tree** (after `remarkParse` + `remarkGfm`):

```json
{
  "type": "root",
  "children": [{
    "type": "paragraph",
    "children": [
      { "type": "text", "value": "Nora (" },
      { "type": "text", "value": "[[Character:demo/nora]]" },
      { "type": "text", "value": ") found the silver key in the archive." }
    ]
  }]
}
```

**OUTPUT mdast tree** (after `entityLinkPlugin`):

```json
{
  "type": "root",
  "children": [{
    "type": "paragraph",
    "children": [
      { "type": "text", "value": "Nora (" },
      {
        "type": "link",
        "url": "/entity/Character/demo/nora",
        "title": null,
        "children": [{ "type": "text", "value": "nora" }]
      },
      { "type": "text", "value": ") found the silver key in the archive." }
    ]
  }]
}
```

**REJECTED case** (input `[[not-a-ref]]`):

```text
[[not-a-ref]]
```

The plugin's regex `/\\[\\[([^:\\]]+):([^\\]\\/]+)\\/([^\\]]+)\\]\\]/g` does NOT match `[[not-a-ref]]` (no `:` separator). The text node is left untouched. The output mdast is identical to the input.

**Error case** (input `[[Character:invalid name]]`):

The regex matches `Character:invalid name]` (the `]` terminator doesn't match `\\]` because there's no escaped bracket — actually the regex doesn't allow `]` inside the name, so the match FAILS here too). The plugin's secondary pass: if the regex doesn't match, try `parseEntityRef(literal)` on the full literal — if that fails, leave the text node untouched. **NEVER** emit `<a href>` with attacker-controlled URL.

**Plugin implementation sketch**:

```ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Link } from 'mdast';
import { parseEntityRef, EntityRefParseError } from '../../store/entityRef';

const ENTITY_LINK_PATTERN = /\\[\\[([^:\\]]+):([^\\]\\/]+)\\/([^\\]]+)\\]\\]/g;

export const entityLinkPlugin: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === undefined) return;
    const segments: (Text | Link)[] = [];
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    ENTITY_LINK_PATTERN.lastIndex = 0;
    while ((match = ENTITY_LINK_PATTERN.exec(node.value)) !== null) {
      const [full, kind, namespace, name] = match;
      try {
        parseEntityRef(full);  // REUSE the canonical parser — never re-validate by hand
        // push leading text
        if (match.index > lastEnd) {
          segments.push({ type: 'text', value: node.value.slice(lastEnd, match.index) });
        }
        // push the link node
        segments.push({
          type: 'link',
          url: `/entity/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
          title: null,
          children: [{ type: 'text', value: name }],
        });
        lastEnd = match.index + full.length;
      } catch (err) {
        if (err instanceof EntityRefParseError) {
          // skip — leave the literal in place; continue scanning
          continue;
        }
        throw err;
      }
    }
    // push trailing text
    if (lastEnd < node.value.length) {
      segments.push({ type: 'text', value: node.value.slice(lastEnd) });
    }
    if (segments.length > 0) {
      parent.children.splice(index, 1, ...segments);
      return [visit.SKIP, index + segments.length];
    }
  });
};
```

**Test surface** (`entity-link-plugin.spec.ts`):

```ts
// happy-path
expect(renderMarkdown('Nora ([[Character:demo/nora]])')).toContain('<a href="/entity/Character/demo/nora">nora</a>');
// rejected-pattern (no colon)
expect(renderMarkdown('Literal [[not-a-ref]] text')).toContain('[[not-a-ref]]');
expect(renderMarkdown('Literal [[not-a-ref]] text')).not.toContain('<a');
// rejected-parse (valid syntax but parseEntityRef rejects — namespace has spaces)
expect(renderMarkdown('Bad [[Character:bad ns/name]]')).toContain('[[Character:bad ns/name]]');
// multi-match in same paragraph
expect(renderMarkdown('[[Character:demo/nora]] meets [[Character:demo/silver-key]]').match(/<a href/g)?.length).toBe(2);
```

`grep -cE 'parseEntityRef' src/features/docs/entityLinkPlugin.ts` MUST be ≥ 1 (D7 + REQ-DOC-3 oracle).

## Grep Oracle Extension Syntax (Appendix D)

The extended test 4 of `extension-isolation.spec.ts` (D12). The new grep oracle pattern + the new test 5.

**Test 4 source (extended)**:

```ts
// test/extension-isolation.spec.ts — test 4 (load-bearing for INC-008)
import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

const FEATURES_DIR = 'src/features';
const PROHIBITED = ['story', 'visual', 'catalog', 'continuity', 'docs'];

describe('extension isolation — cross-folder imports (m16 INC-008 closure)', () => {
  it('NO direct OR relative-escape imports from one feature folder to another', () => {
    const directPattern = new RegExp(
      `from\\s+['"]\\.\\.?\\/.*features\\/(?:${PROHIBITED.join('|')})\\/`,
      'g'
    );
    const relativeEscapePattern = new RegExp(
      `from\\s+['"]\\.\\.\\/\\.\\.\\/(?:${PROHIBITED.join('|')})\\/`,
      'g'
    );
    const directHits = execSync(
      `grep -rE "${directPattern.source.replace(/\\\\/g, '\\\\\\\\')}" ${FEATURES_DIR}/ 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    const relativeHits = execSync(
      `grep -rE "${relativeEscapePattern.source.replace(/\\\\/g, '\\\\\\\\')}" ${FEATURES_DIR}/ 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    expect(directHits.trim()).toBe('');
    expect(relativeHits.trim()).toBe('');
  });
});
```

**Test 5 source (NEW — INC-008 closure; prohibited-folder list assertion)**:

```ts
it('m16 prohibited-folder list includes "docs"', () => {
  // The list source-of-truth lives in this test — every feature folder that
  // lands via an m-series cycle must extend the array above (PROHIBITED).
  // This assertion makes the omission loud.
  expect(PROHIBITED).toContain('docs');
  expect(PROHIBITED).toHaveLength(5);  // was 4 (m15); m16 adds the 5th
});
```

**Test 1, 2, 3 (m15 baseline, unchanged)**: Character tabs do NOT leak to Build entities; `render()` is called with a valid `ExtensionContext` shape; `kindIs` predicate matches the exact kind string. Each is preserved verbatim.

**Test list count**: 5 (was 4 in m15). `pnpm test --run extension-isolation.spec.ts` MUST report 5 tests passing.

## Search Tokenizer + Ranker Pseudo-Code (Appendix E)

The full V1 substring index builder + search function (D1, D3, D4). Pseudo-code — the actual implementation lives in `control-plane/src/store/searchIndex.ts` (Block 0).

```ts
// store/searchIndex.ts (pseudo-code — NOT committed by design)

import { parseEntityRef } from './entityRef';

// ----- types -----
type SearchResultType = 'character' | 'scene-chapter' | 'asset' | 'decision' | 'docs';

interface SearchResult {
  readonly id: string;             // canonical, e.g. 'character:demo/nora' or 'docs:narrative'
  readonly type: SearchResultType;
  readonly title: string;
  readonly snippet: string;        // ≤ 140 chars; first match window
  readonly score: number;          // one of 100, 80, 60, 40, 20 (D4 ladder)
}

interface IndexEntry {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly tokens: ReadonlyArray<string>;  // pre-folded + lower-cased
  readonly snippetSource: string;          // raw text used to derive the snippet
}

export interface SearchIndex {
  readonly entries: ReadonlyArray<IndexEntry>;
  search(query: string): SearchResult[];
}

// ----- ASCIIfold + tokenize (D3) -----
function ASCIIfold(s: string): string {
  return s.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase();
}

function tokenize(s: string): string[] {
  return ASCIIfold(s).split(/[^a-z0-9]+/i).filter(Boolean);
}

// ----- build -----
export function build(
  catalogEntities: ReadonlyArray<CatalogEntity>,
  bundle: ProjectionBundle,
  docs: ReadonlyArray<DocEntry>,
): SearchIndex {
  const entries: IndexEntry[] = [];

  // 1. catalog entities → character / asset / decision entries
  for (const e of catalogEntities) {
    const id = `${e.kind.toLowerCase()}:${e.namespace}/${e.name}`;
    const tokenSource = [e.name, e.summary ?? '', e.description ?? ''].join(' ');
    entries.push({
      id,
      type: e.kind === 'Character' ? 'character' : 'asset',  // Decision is NOT a catalog kind in V1
      title: e.name,
      tokens: tokenize(tokenSource),
      snippetSource: e.summary ?? e.description ?? '',
    });
  }

  // 2. bundle.characters → characters
  for (const c of bundle.characters ?? []) {
    const id = `character:${c.namespace ?? 'demo'}/${c.name}`;
    entries.push({
      id,
      type: 'character',
      title: c.name,
      tokens: tokenize([c.name, c.summary, c.notes ?? ''].join(' ')),
      snippetSource: c.summary,
    });
  }

  // 3. bundle.chapters → scene-chapter entries (one per chapter; Amendment 1)
  for (const ch of bundle.chapters ?? []) {
    const id = `scene-chapter:${ch.id}`;
    entries.push({
      id,
      type: 'scene-chapter',
      title: ch.title,
      tokens: tokenize([ch.title, ch.id].join(' ')),
      snippetSource: ch.title,
    });
  }

  // 4. bundle.assets → asset entries
  for (const a of bundle.assets ?? []) {
    const id = `asset:${a.namespace}/${a.name}`;
    entries.push({
      id,
      type: 'asset',
      title: a.name,
      tokens: tokenize([a.name, a.kind, a.description ?? ''].join(' ')),
      snippetSource: a.description ?? '',
    });
  }

  // 5. bundle.decisions → decision entries (D9)
  for (const d of assertDecisions(bundle.decisions).decisions) {
    const id = `decision:${d.id}`;
    entries.push({
      id,
      type: 'decision',
      title: d.action,
      tokens: tokenize([d.id, d.action, d.targetRef, d.status].join(' ')),
      snippetSource: d.action,
    });
  }

  // 6. docs → docs entries (D8)
  for (const doc of docs) {
    const id = `docs:${basename(doc.path, '.md')}`;
    entries.push({
      id,
      type: 'docs',
      title: basename(doc.path, '.md'),
      tokens: tokenize(doc.body),
      snippetSource: doc.body,
    });
  }

  return { entries, search };
}

// ----- search (D4 ranker) -----
function search(this: SearchIndex, query: string): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const results: SearchResult[] = [];

  for (const entry of this.entries) {
    let score = 0;
    let snippetHit = false;

    // D4-100: exact id match
    if (query.trim().toLowerCase() === entry.id.toLowerCase()) {
      score = 100;
    }
    // D4-80: exact Kind:namespace/name match
    else if (entry.type === 'character' || entry.type === 'asset' || entry.type === 'decision') {
      const ref = `${capitalize(entry.type)}:${entry.id.split(':')[1]}`;
      if (query.trim() === ref) {
        score = 80;
      }
    }

    if (score === 0) {
      // D4-60: multi-field full-token hit (every query token present)
      const allHit = queryTokens.every((qt) => entry.tokens.some((t) => t.includes(qt)));
      // D4-40: single-token substring hit
      const anyHit = queryTokens.some((qt) => entry.tokens.some((t) => t.includes(qt)));
      if (allHit) score = 60;
      else if (anyHit) score = 40;
    }

    // D4-20: snippet-only hit (query term appears in snippet source but not in tokens)
    if (score === 0) {
      snippetHit = queryTokens.some((qt) => ASCIIfold(entry.snippetSource).includes(qt));
      if (snippetHit) score = 20;
    }

    if (score > 0) {
      results.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        snippet: deriveSnippet(entry.snippetSource, queryTokens),
        score,
      });
    }
  }

  // D4: deterministic tie-break — (score DESC, id ASC)
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return results;
}
```

**Index structure**: a flat `ReadonlyArray<IndexEntry>` of pre-folded tokens. V1 deliberately avoids `Map<token, Set<entryId>>` inverted indices (V2's job). The bounded UAT-M10-03 scale (≤ 50 entries) makes linear scan acceptable; `pnpm test --run search-index.spec.ts` MUST benchmark `< 10ms` for the V1 scale.

## Decision-Projection Schema (Appendix F)

The NEW `control-plane/src/schema/cp-decisions.schema.json` (D9). Inline JSON below:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "control-plane/decisions/v1",
  "title": "Control Plane Decisions Projection (V1)",
  "description": "Governance decisions surfaced by the Control Plane snapshot. Closes REQ-DEC-1.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema", "generatedAt", "sourceRevision", "decisions"],
  "properties": {
    "schema": {
      "type": "string",
      "const": "control-plane/decisions/v1"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "sourceRevision": {
      "type": "string",
      "minLength": 1
    },
    "decisions": {
      "type": "array",
      "items": { "$ref": "#/$defs/decision" }
    }
  },
  "$defs": {
    "decision": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "action", "targetRef", "date", "status"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$"
        },
        "action": {
          "type": "string",
          "minLength": 1,
          "maxLength": 280
        },
        "targetRef": {
          "type": "string",
          "pattern": "^[A-Z][A-Za-z]+:[a-z0-9-]+/[a-z0-9-]+$"
        },
        "date": {
          "type": "string",
          "format": "date-time"
        },
        "status": {
          "type": "string",
          "enum": ["accepted", "rejected", "pending", "superseded"]
        }
      }
    }
  }
}
```

**`registry.ts` addition** (1 line, additive):

```ts
// src/schema/registry.ts (modified additive)
export const BY_SCHEMA_CONST = {
  'control-plane/characters/v1': ...,
  'control-plane/chapters/v1': ...,
  'control-plane/assets/v1': ...,
  'control-plane/uat/v1': ...,
  'control-plane/decisions/v1': cpDecisionsSchema,  // ← m16 additive (D9)
  // ... (other 7 entries unchanged)
} as const;
```

**Loader integration** (D10, `SnapshotProjectSource.ts`):

```ts
// pseudo-code (NOT committed by design)
async function loadDecisions(m: SnapshotManifest): Promise<unknown> {
  const path = `projections/${m.schemaToPath['control-plane/decisions/v1']}`;
  if (!isSafeRelativePath(path)) throw synthetic('path-traversal', path);
  return readAndValidate(path, cpDecisionsSchema);  // returns unknown-typed on schema miss
}

async function loadDocs(m: SnapshotManifest): Promise<unknown> {
  const docs: DocEntry[] = [];
  for (const docPath of m.snapshot.docs ?? []) {
    if (!isSafeRelativePath(docPath)) {
      errors.push(synthetic('path-traversal', docPath));
      continue;
    }
    const body = await readFile(`docs/${docPath}`, 'utf8');
    docs.push({ path: docPath, body });
  }
  return docs;
}
```

**Fixture example** (`golden/.../projections/cp-decisions.json`):

```json
{
  "schema": "control-plane/decisions/v1",
  "generatedAt": "2026-01-15T12:00:00Z",
  "sourceRevision": "v0.7.0-m16-fixtures",
  "decisions": [
    {
      "id": "silver-key",
      "action": "Forge the silver key for the inner vault",
      "targetRef": "Character:demo/nora",
      "date": "2026-01-15T12:00:00Z",
      "status": "accepted"
    },
    {
      "id": "nora-arc",
      "action": "Pull nora into the central conspiracy",
      "targetRef": "Character:demo/nora",
      "date": "2026-01-20T09:30:00Z",
      "status": "pending"
    },
    {
      "id": "iron-door",
      "action": "Seal the iron door behind the archive",
      "targetRef": "Asset:demo/iron-door",
      "date": "2026-01-25T18:45:00Z",
      "status": "rejected"
    }
  ]
}
```

## Block F Doc/MANIFEST Closeout (Appendix G)

The per-file closeout in Block F. Each row carries a "substantive change" column and a "verification oracle" column. NO row is purely cosmetic.

| File | Substantive change | Verification oracle |
|---|---|---|
| `docs/32-NARRATIVE-DOCS-SEARCH.md` (NEW) | The V1 substring index contract, the GFM allow-list rationale, the entity-link plugin AST shape, the migration path to Orama V2, the `parseEntityRef` reuse rule, the path-traversal guard extension, the 5-level ranker ladder | `grep -cE "V1 substring index\|Orama V2\|GFM-safe rehype-sanitize\|5-level ranker\|parseEntityRef" docs/32-NARRATIVE-DOCS-SEARCH.md` ≥ 5 |
| `docs/27-GLOSSARY.md` (MODIFIED additive) | 4 new glossary entries | `grep -cE "^### \\*\\*kind: 'docs'\\*\\*\|^### \\*\\*safe-narrative-docs\\*\\*\|^### \\*\\*decision-projection\\*\\*\|^### \\*\\*V1 substring index\\*\\*" docs/27-GLOSSARY.md` ≥ 4 |
| `docs/28-CONTROL-PLANE-STACK.md` (MODIFIED additive) | 4 new exact-pinned Markdown deps in the version-locked table (m14 D3 ladder-style row) | `grep -cE "react-markdown@9\.0\.3\|rehype-sanitize@6\.0\.0\|remark-gfm@4\.0\.0\|unist-util-visit@5\.0\.0" docs/28-CONTROL-PLANE-STACK.md` ≥ 4 |
| `MANIFEST.json` (regen) | Cycle artefacts + new docs + new projection entry | `jq -e '.cycles[]?.id == "m16-cp-studio-search-docs"' MANIFEST.json` → exit 0; `jq -e '.snapshot.docs | length == 3' golden/control-plane/snapshot-valid/manifest.json` → exit 0 |
| `README.md` (MODIFIED additive) | "Local Search + Narrative Docs (M10.3)" section + UAT-M10-03 Given/When/Then walk-through + `vite preview` smoke recipe | `grep -cE "Local Search\|Narrative Docs\|UAT-M10-03\|vite preview" README.md` ≥ 4; `pnpm --filter control-plane preview` (manual) opens `/search`, `llave plateada` returns ≥ 5 results |

**Substantive change criterion** (m14 precedent): a row counts as "substantive" iff at least one of (a) a new section appears, (b) an existing section is materially rewritten (not just typo-fix), (c) a new command / recipe / oracle is documented. Cosmetic-only changes (whitespace, link fixes, typo-only) do NOT count as substantive for the Block F budget.

**Verification oracle criterion** (m14 precedent): a row counts as "verified" iff the grep / jq / bash oracle runs as a `pre-commit` hook AND exits 0. Block F is NOT shipped until every oracle passes.

## Summary Envelope

- **Design SHA-256 (after persistence)**: `04ac4fbb55b7c11fee91986d74d3a7a3c198031663be660da86cc068d982fda7` (sha256sum of `design.md` at the time of final persistence; both project-root and XDG mirrors agree)
- **Persisted at**: `changes/m16-cp-studio-search-docs/design.md` (project root) and mirrored at `$CA/design.md` (XDG cycle-artifacts)
- **CAS match**: `sha256(project-root design.md) === sha256(XDG mirror)` — verified before `sddk-tasks`
- **Design status**: ready for `sddk-tasks` invocation (NOT in this phase)
- **Hard rules respected**: NO product code committed, NO `src/` mutations outside `loader/`, `extensions/`, `schema/`, `store/`, `views/`, `routes/` (each additive only), NO other-cycle modifications, NO Git publication effects
- **Size exception**: A-lite cycle (per m14/m15 precedent) — ~720 LoC of prose + ~1440 LoC of code (Block 0 + Block 1 + Block 2 + Block 3 + Block 4 + Block F combined), above the 400-line review budget. The recorded natural split line is Split 3a-i / 3a-ii (Appendix G §Block 0 + §Block 1 vs §Block 2 + §Block 3 + §Block 4 + §Block F) — flagged but NOT activated.
- **Decision-projection schema**: NEW file (`specs/cp-decisions.schema.json`) — AC-INV-schema binding respected.
- **24 REQs → 24 EVT-*** all mapped to a decision + a file. Zero decision extends the requirement surface.
- **INC-008 closure**: Block PF (test 4 + test 5). **INC-009 closure**: Block 1 (route + F-004 oracle).
