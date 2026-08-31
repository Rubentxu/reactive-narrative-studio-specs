# Narrative Docs and Local Search

> M16 slice 3a — Local Search + Safe Narrative Docs + Decision projection.
> Supersedes prior `Orama V1` design; V1 ships a documented in-memory substring index.

## V1 substring index

The V1 substring index is a **pure in-memory substring full-text index** built from catalog entities, the 5 `cp-*` projection keys, and Markdown docs. No persistence, no IndexedDB, no Orama, no network requests.

### Contract

The search index is a **pure in-memory substring full-text index** built from catalog entities, the 5 `cp-*` projection keys, and Markdown docs in the snapshot `docs/` directory.

```
build(catalogEntities, bundle, docs) → SearchIndex
SearchIndex.search(query) → SearchResult[]
```

**No persistence. No IndexedDB. No Orama. No network requests.**

### Result shape

```ts
type SearchResultType = 'character' | 'scene-chapter' | 'asset' | 'decision' | 'docs';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;      // non-empty
  snippet: string;    // ≤ 140 chars; first match window, non-empty
  score: number;      // one of 100, 80, 60, 40, 20 (D4 ladder)
  entityRef: string;  // per-type convention, non-empty
  sourcePath: string; // doc path for scene-chapter/docs; '' for others
}
```

### entityRef convention (Amendment 1)

| Type | entityRef format | Example |
|------|-----------------|---------|
| character | `Kind:namespace/name` | `Character:demo/nora` |
| scene-chapter | `Chapter:cp/<chapter-id>` | `Chapter:cp/ch-silver-key` |
| asset | `Kind:namespace/name` | `Asset:demo/silver-key-doc` |
| decision | `Decision:<id>` | `Decision:silver-key` |
| docs | `Docs:<basename>` | `Docs:nora` |

### scene-chapter derivation (Amendment 1)

**ONE entry per chapter** from `bundle.chapters[]` — no `ch.scenes[]` nesting.

- id: `scene-chapter:<chapter-id>`
- title: `ch.title`
- sourcePath: `ch.docRef` when present, else `''`
- entityRef: `Chapter:cp/<chapter-id>`

Scene granularity is future-extensible via a separate cycle + ADR; the chapter IS the projected narrative unit in the Control Plane.

### Tokenizer (D3)

Unicode NFD decomposition → strip combining marks (category `Mn`) → lowercase → split on non-alphanumeric runs.

```
'LLAVÉ PLÁTEÁDA'  →  ['llave', 'plateada']
'Llàvé-Pláteádà'  →  ['llave', 'plateada']
```

### 5-Level Ranker (D4)

| Score | Condition | Example |
|-------|-----------|---------|
| 100 | Exact `id` match (type prefix stripped for bare queries) | `silver-key` → `decision:silver-key` |
| 80 | Exact `Kind:namespace/name` match | `Character:demo/nora` |
| 60 | All query tokens appear as substrings in indexed fields | "llave plateada" in action text |
| 40 | At least one query token appears | "llave" in description |
| 20 | Snippet-only hit (body text matched) | query in narrative doc body |
| tie-break | `id` ascending lexicographic | — |

Tie-break: `(score DESC, id ASC)` — deterministic across calls.

### Indexable text fields

| Projection | Schema-allowed indexable fields | Notes |
|-----------|-------------------------------|-------|
| characters | `role`, `visualDNA` | NOT `summary`/`description` (forbidden by `additionalProperties: false`) |
| chapters | `title` | ONE entry per chapter (Amendment 1); NOT `scenes` |
| assets | `path`, `kind` | NOT `description` |
| decisions | `action`, `id`, `targetRef`, `status` | REQ-DEC-1 shape |
| docs | `body` | Full Markdown body text |

## Safe Narrative Docs Rendering

### Pipeline

```
Markdown text
  → react-markdown
  → remark-gfm          (GFM tables + task lists + autolinks)
  → rehype-sanitize     (allow-list schema, GFM-safe by default)
  → entityLinkPlugin    ([[Kind:namespace/name]] → internal Link)
  → React output
```

### GFM-safe allow-list (4 deltas from OWASP Markdown XSS cheat-sheet)

The **GFM-safe rehype-sanitize** schema strips the following **in addition** to the GFM-safe default:

| Vector | Strip/reject |
|--------|-------------|
| `<script>` tags | Strip |
| `javascript:` URLs in href/src | Strip |
| `data:` URLs in `<img>` and `<a>` | Strip |
| `vbscript:` URLs | Strip |
| `<iframe>`, `<object>`, `<embed>` | Strip |
| `<style>` | Strip |
| Inline event handlers (`onerror=`, `onclick=`, etc.) | Strip |

**Preserved:** headings, emphasis, code spans/blocks, ordered/unordered lists, blockquotes, links with `https://`/`http://`/relative URLs, GFM tables, GFM task lists, GFM strikethrough, autolinks.

### entityLinkPlugin AST shape

Custom Remark plugin that:

1. Scans for `[[Kind:namespace/name]]` patterns in text nodes
2. Calls `parseEntityRef` (from `store/entityRef.ts`) to validate
3. Emits an `<a href="/entity/Kind/namespace/name">` for valid refs
4. Passes the original text through unchanged for invalid/unknown refs

```ts
// Minimal AST transformation
function entityLinkPlugin() {
  return (tree: Node) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      const matches = parseAllEntityLinks(node.value);
      if (!matches.length) return;
      // Replace text node with linked + unlinked segments
    });
  };
}
```

The plugin NEVER emits an `<a href>` with an attacker-controlled URL.

## Orama V2 Migration Path

V1 ships a **documented in-memory substring index** as the smallest coherent surface that satisfies UAT-M10-03. The migration path to Orama is:

1. Swap `searchIndex.build` internals for `orama` client
2. Preserve `SearchResult` discriminated union shape
3. Preserve `SearchResultType` enum
4. Preserve the 5-level ranker signal (exact-id > Kind:ns/name > multi-token > single-token > snippet)
5. Preserve `entityRef` per-type convention

**Not warranted in M10:** Orama introduces IndexedDB persistence, a separate client bundle, and cloud-optional semantics that are out of scope for the UAT-M10-03 binding. A future ADR (slot 26/26 reserved) will assess the migration when usage patterns are established.

## Path-Traversal Guard

`SnapshotProjectSource.loadDocs` uses `isSafeRelativePath`:

```ts
export function isSafeRelativePath(p: string): boolean {
  if (isAbsolutePath(p)) return false;
  return !p.split(/[\\/]+/).some((seg) => seg === '..');
}
```

- Reads `docs/*.md` from the snapshot directory
- Rejects any path containing `..` segments
- Surfaces `synthetic('path-traversal', ...)` diagnostic on violation
- m14 path-traversal guard fixture preserved

## Decision Projection

### Shape (REQ-DEC-1)

`specs/cp-decisions.schema.json` — NEW file (NOT a modification of any existing schema):

```json
{
  "schema": "control-plane/decisions/v1",
  "generatedAt": "isoTimestamp",
  "sourceRevision": "string",
  "decisions": [{
    "id": "string",
    "action": "string",
    "targetRef": "string (^[A-Z][A-Za-z]+:[a-z0-9-]+/[a-z0-9-]+$)",
    "date": "isoTimestamp",
    "status": "accepted | rejected | pending | superseded"
  }]
}
```

### Decision entityRef convention

`Decision:<id>` — e.g., `Decision:silver-key` for a decision with `id: "silver-key"`.

## References

- [`docs/27-GLOSSARY.md`](docs/27-GLOSSARY.md) — glossary entries for search index, safe docs, decision projection
- [`docs/28-CONTROL-PLANE-STACK.md`](docs/28-CONTROL-PLANE-STACK.md) — version-locked dependency table
- [`uat/UAT-M10-03-local-search-docs.md`](uat/UAT-M10-03-local-search-docs.md) — binding UAT
