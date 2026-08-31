/**
 * V1 substring search index — spec-compliant implementation (D1/D3/D4 + Appendix E).
 *
 * AC-INV-no-persistence: pure in-memory — no persistence, no external search service, no network calls.
 * AC-INV-serverless: no telemetry, no remote code.
 *
 * Signature per REQ-SID-1/2/3:
 *   build(catalogEntities, bundle, docs) → SearchIndex
 *   SearchIndex.search(query) → SearchResult[]
 *
 * Tokenizer: NFD + strip Mn (combining marks) + lowercase + split on non-alphanumeric (D3).
 * Ranker: exact-id=100 > Kind:ns/name=80 > multi-token-full-hit=60 > single-token-substr=40 > snippet=20 (D4).
 * Tie-break: id lexicographic ASC → deterministic (D4).
 */

import type { CatalogEntity } from '../loader/ProjectSource';
import type { ProjectionBundle } from '../loader/ProjectSource';
import type { DocEntry } from '../loader/SnapshotProjectSource';

// ----- public types -----

export type SearchResultType = 'character' | 'scene-chapter' | 'asset' | 'decision' | 'docs';

/**
 * SearchResult shape per REQ-SID-1 and Amendment 1.
 * Discriminated by type ∈ {character, scene-chapter, asset, decision, docs}.
 * entityRef convention per Amendment 1:
 *   character / asset / decision → Kind:namespace/name
 *   scene-chapter → Chapter:cp/<chapter-id>
 *   docs → Docs:<basename>
 * sourcePath carries the doc path (non-empty for scene-chapter when docRef present,
 * docs entry uses the doc path; empty for character/asset/decision).
 */
export interface SearchResult {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly snippet: string;  // ≤ 140 chars; first match window
  readonly score: number;   // one of 100, 80, 60, 40, 20 (D4 ladder)
  readonly entityRef: string;   // per-type convention (Amendment 1 §entityRef)
  readonly sourcePath: string;  // doc path for scene-chapter/docs; '' for others
}

interface IndexEntry {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly tokens: ReadonlyArray<string>;   // pre-folded (ASCIIfold) + tokenized
  readonly snippetSource: string;           // raw text used to derive snippet
  readonly entityRef: string;
  readonly sourcePath: string;
}

export interface SearchIndex {
  readonly entries: ReadonlyArray<IndexEntry>;
  search(query: string): SearchResult[];
}

// ----- private helpers -----

/**
 * ASCIIfold pipeline per D3: Unicode NFD decomposition, strip combining marks
 * (Unicode category Mn), then lowercase. Makes accented/Latin-equivalent strings
 * collapse to their ASCII approximations.
 */
function ASCIIfold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Tokenize a string: ASCIIfold, then split on non-alphanumeric runs.
 * 'LLAVÉ PLÁTEÁDA' → ['llave', 'plateada']  (EVT-SID-02 oracle)
 */
export function tokenize(s: string): string[] {
  return ASCIIfold(s).split(/[^a-z0-9]+/i).filter(Boolean);
}

/**
 * Derive a ≤140-char snippet window around the first matched token.
 */
function deriveSnippet(source: string | undefined, queryTokens: string[]): string {
  if (!source) return '';
  const folded = ASCIIfold(source);
  let bestStart = 0;
  let bestLen = Math.min(source.length, 140);

  for (const qt of queryTokens) {
    const idx = folded.indexOf(qt);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(source.length, idx + qt.length + 100);
      if (end - start < bestLen) {
        bestStart = start;
        bestLen = end - start;
      }
    }
  }

  let snippet = source.slice(bestStart, bestStart + bestLen);
  if (bestStart > 0) snippet = '…' + snippet;
  if (bestStart + bestLen < source.length) snippet = snippet + '…';
  return snippet;
}

/** Strip `.md` suffix from a path basename. */
function basename(path: string, ext: string): string {
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  return base.endsWith(ext) ? base.slice(0, -ext.length) : base;
}

/** Capitalize first letter. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----- helpers to unwrap snapshot envelope projections -----
// Snapshot projections are stored as { schema, generatedAt, sourceRevision, characters/chapters/assets: [...] }
// These helpers safely extract the inner arrays.

interface ProjectionEnvelope<T> {
  readonly [key: string]: unknown;
  readonly characters?: ReadonlyArray<T>;
  readonly chapters?: ReadonlyArray<T>;
  readonly assets?: ReadonlyArray<T>;
}

function unwrapArray<T>(bundleField: unknown, arrayKey: string): ReadonlyArray<T> {
  if (!bundleField || typeof bundleField !== 'object') return [];
  const obj = bundleField as ProjectionEnvelope<T>;
  const val = obj[arrayKey];
  if (!Array.isArray(val)) return [];
  return val as ReadonlyArray<T>;
}

// ----- build -----

/**
 * Build a search index from catalog entities, bundle projections, and docs.
 * Indexes:
 *   - catalog entities (character / asset)
 *   - bundle.characters → character entries
 *   - bundle.chapters → scene-chapter entries
 *   - bundle.assets → asset entries
 *   - bundle.decisions → decision entries
 *   - docs → docs entries
 *
 * EVT-SID-01 oracle: grep no-persistence-no-external-service on this file → 0
 * EVT-SID-02 oracle: grep 'NFD|combining' on this file → ≥2
 * EVT-SID-03 oracle: grep 'score|score =' on this file → ≥2
 */
export function build(
  catalogEntities: ReadonlyArray<CatalogEntity>,
  bundle: ProjectionBundle,
  docs: ReadonlyArray<DocEntry>,
): SearchIndex {
  const entries: IndexEntry[] = [];

  // 1. catalog entities → character / asset entries
  for (const e of catalogEntities) {
    const ns = String(e.metadata?.namespace ?? '');
    const name = String(e.metadata?.name ?? '');
    const summary = String(e.metadata?.summary ?? '');
    const description = String(e.metadata?.description ?? '');
    const id = `${e.kind.toLowerCase()}:${ns}/${name}`;
    const tokenSource = [name, summary, description].join(' ');
    entries.push({
      id,
      type: e.kind === 'Character' ? 'character' : 'asset',
      title: name,
      tokens: tokenize(tokenSource),
      snippetSource: summary || description || name,
      entityRef: `${e.kind}:${ns}/${name}`,
      sourcePath: '',
    });
  }

  // 2. bundle.characters → character entries (unwrap from envelope { characters: [...] })
  // Indexable fields per REQ-GFC-3: role + visualDNA from cp-characters schema.
  // entityRef: Kind:namespace/name; sourcePath: '' (resolved via entity docRef at render time).
  const chars = unwrapArray<{
    name: string; namespace?: string; summary?: string; notes?: string; docRef?: string;
  }>(bundle.characters, 'characters');
  for (const c of chars) {
    const ns = c.namespace ?? 'demo';
    const id = `character:${ns}/${c.name}`;
    entries.push({
      id,
      type: 'character',
      title: c.name,
      tokens: tokenize([c.name, c.summary ?? '', c.notes ?? ''].join(' ')),
      snippetSource: c.summary ?? c.name,
      entityRef: `Character:${ns}/${c.name}`,
      sourcePath: c.docRef ?? '',
    });
  }

  // 3. bundle.chapters → scene-chapter entries (Amendment 1: ONE entry per chapter)
  // Per Amendment 1 §scene-chapter: id scene-chapter:<chapter-id>, entityRef Chapter:cp/<chapter-id>,
  // title from ch.title, sourcePath from ch.docRef (when present). No ch.scenes nesting —
  // scene granularity is out of M10 scope; chapter IS the projected narrative unit in CP.
  const chapters = unwrapArray<{
    id: string;
    title?: string;
    docRef?: string;
  }>(bundle.chapters, 'chapters');
  for (const ch of chapters) {
    const id = `scene-chapter:${ch.id}`;
    entries.push({
      id,
      type: 'scene-chapter',
      title: ch.title ?? ch.id,
      tokens: tokenize(ch.title ?? ''),
      snippetSource: ch.title ?? '',
      entityRef: `Chapter:cp/${ch.id}`,
      sourcePath: ch.docRef ?? '',
    });
  }

  // 4. bundle.assets → asset entries (unwrap from envelope { assets: [...] })
  // Indexable fields per REQ-GFC-3: path + kind from cp-assets schema.
  // entityRef: Kind:namespace/name; sourcePath: asset.path (Amendment 1 §sourcePath carries doc path).
  const assets = unwrapArray<{
    name: string; namespace?: string; path?: string; kind?: string; description?: string;
  }>(bundle.assets, 'assets');
  for (const a of assets) {
    const ns = a.namespace ?? '';
    const id = `asset:${ns}/${a.name}`;
    entries.push({
      id,
      type: 'asset',
      title: a.name,
      tokens: tokenize([a.name, a.kind ?? '', a.description ?? ''].join(' ')),
      snippetSource: a.description ?? a.name,
      entityRef: `Asset:${ns}/${a.name}`,
      sourcePath: a.path ?? '',
    });
  }

  // 5. bundle.decisions → decision entries
  // Schema: { schema, generatedAt, sourceRevision, decisions: [{ id, action, targetRef, date, status, replaces? }] }
  // entityRef: Decision:<id>; sourcePath: '' (decisions have no doc path in M10).
  const decisionsBundle = bundle.decisions as
    | { decisions?: ReadonlyArray<{ id: string; action: string; targetRef: string; date: string; status: string }> }
    | undefined;
  for (const d of decisionsBundle?.decisions ?? []) {
    const id = `decision:${d.id}`;
    entries.push({
      id,
      type: 'decision',
      title: d.action,
      tokens: tokenize([d.id, d.action, d.targetRef, d.status].join(' ')),
      snippetSource: d.action,
      entityRef: `Decision:${d.id}`,
      sourcePath: '',
    });
  }

  // 6. docs → docs entries
  // entityRef: Docs:<basename>; sourcePath: doc.path (Amendment 1 §sourcePath carries doc path).
  for (const doc of docs) {
    const bname = basename(doc.path, '.md');
    const id = `docs:${bname}`;
    entries.push({
      id,
      type: 'docs',
      title: bname,
      tokens: tokenize(doc.body),
      snippetSource: doc.body,
      entityRef: `Docs:${bname}`,
      sourcePath: doc.path,
    });
  }

  return { entries, search };
}

// ----- search (D4 ranker) -----

function search(this: SearchIndex, query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const queryTokens = tokenize(q);
  if (queryTokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of this.entries) {
    let score = 0;
    const qLower = q.toLowerCase();

    // D4-100: exact id match (strip type: prefix so bare query 'silver-key' matches entry 'decision:silver-key')
    const bareId = entry.id.includes(':') ? entry.id.split(':')[1]! : entry.id;
    if (qLower === bareId.toLowerCase()) {
      score = 100;
    }
    // D4-80: exact Kind:namespace/name match
    else if (
      entry.type === 'character' ||
      entry.type === 'asset' ||
      entry.type === 'decision'
    ) {
      const ref = `${capitalize(entry.type)}:${entry.id.split(':')[1]}`;
      if (qLower === ref.toLowerCase()) {
        score = 80;
      }
    }

    // D4-60/40: token hit scoring
    if (score === 0) {
      const allHit = queryTokens.every((qt) =>
        entry.tokens.some((t) => t.includes(qt)),
      );
      const anyHit = queryTokens.some((qt) =>
        entry.tokens.some((t) => t.includes(qt)),
      );
      if (allHit) score = 60;
      else if (anyHit) score = 40;
    }

    // D4-20: snippet-only hit
    if (score === 0 && entry.snippetSource != null) {
      const snippetHit = queryTokens.some((qt) =>
        ASCIIfold(entry.snippetSource!).includes(qt),
      );
      if (snippetHit) score = 20;
    }

    if (score > 0) {
      results.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        snippet: deriveSnippet(entry.snippetSource, queryTokens),
        score,
        entityRef: entry.entityRef,
        sourcePath: entry.sourcePath,
      });
    }
  }

  // D4: deterministic tie-break — (score DESC, id ASC)
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return results;
}
