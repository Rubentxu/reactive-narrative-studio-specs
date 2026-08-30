import type { CatalogEntity } from '../loader/ProjectSource';

/**
 * V1 substring search index.
 * Pure in-memory implementation — no external dependencies (AC-INV-no-Dexie).
 * 5-level ranker: exact-match > prefix-match > substring-match > case-insensitive > namespace-scope.
 */

export interface SearchResult {
  entity: CatalogEntity;
  score: number;
  matchField: 'name' | 'namespace' | 'kind' | 'description';
}

export interface SearchIndex {
  entities: CatalogEntity[];
  lookup: Map<string, CatalogEntity[]>;
}

// ----------------------------------------------------------------
// Pure functions
// ----------------------------------------------------------------

/**
 * Tokenize a string into lowercase words for indexing.
 */
export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s\-_./\\]+/)
    .filter((t) => t.length > 0);
}

/**
 * Build an inverted lookup index from a list of entities.
 * The index maps each token to the entities that contain it.
 */
export function buildIndex(entities: CatalogEntity[]): SearchIndex {
  const lookup = new Map<string, CatalogEntity[]>();

  for (const entity of entities) {
    const name = String(entity.metadata?.name ?? '');
    const namespace = String(entity.metadata?.namespace ?? '');
    const description = String(entity.metadata?.description ?? '');
    const fields = [name, namespace, entity.kind, description];

    for (const field of fields) {
      const tokens = tokenize(field);
      for (const token of tokens) {
        const existing = lookup.get(token);
        if (existing) {
          if (!existing.includes(entity)) {
            existing.push(entity);
          }
        } else {
          lookup.set(token, [entity]);
        }
      }
    }

    // Always index the full name as a raw string for exact matching
    const fullName = `${namespace}/${name}`.toLowerCase();
    if (fullName.length > 0) {
      const existing = lookup.get(fullName);
      if (existing) {
        if (!existing.includes(entity)) existing.push(entity);
      } else {
        lookup.set(fullName, [entity]);
      }
    }
  }

  return { entities, lookup };
}

/**
 * Compute score for a single entity against a query.
 * 5-level ranker: exact-full-ref > exact-name > prefix > substring > contains.
 */
function scoreEntity(entity: CatalogEntity, qLower: string): { score: number; matchField: SearchResult['matchField'] } {
  const name = String(entity.metadata?.name ?? '').toLowerCase();
  const namespace = String(entity.metadata?.namespace ?? '').toLowerCase();
  const fullRef = `${namespace}/${name}`;

  if (fullRef === qLower) return { score: 5, matchField: 'name' };
  if (name === qLower) return { score: 4, matchField: 'name' };
  if (name.startsWith(qLower)) return { score: 3, matchField: 'name' };
  if (name.includes(qLower)) return { score: 2, matchField: 'name' };
  return { score: 1, matchField: 'name' };
}

/**
 * Search the index for a query string.
 * Returns ranked results using 5-level scoring:
 *   score 5 — exact full-ref match (namespace/name)
 *   score 4 — exact name match
 *   score 3 — prefix match on name
 *   score 2 — substring match on name
 *   score 1 — case-insensitive match anywhere
 * Results sorted descending by score, then by entity name.
 */
export function search(index: SearchIndex, query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const qLower = q.toLowerCase();
  const qTokens = tokenize(q);
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  // Pass 1: token lookup
  for (const token of qTokens) {
    const matched = index.lookup.get(token) ?? [];
    for (const entity of matched) {
      const key = `${entity.kind}:${String(entity.metadata?.namespace ?? '')}/${String(entity.metadata?.name ?? '')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { score, matchField } = scoreEntity(entity, qLower);
      results.push({ entity, score, matchField });
    }
  }

  // Pass 2: fallback full scan for substring/prefix when token lookup found nothing
  if (results.length === 0) {
    for (const entity of index.entities) {
      const key = `${entity.kind}:${String(entity.metadata?.namespace ?? '')}/${String(entity.metadata?.name ?? '')}`;
      if (seen.has(key)) continue;
      const name = String(entity.metadata?.name ?? '').toLowerCase();
      // Level 3: prefix match
      if (name.startsWith(qLower)) {
        seen.add(key);
        results.push({ entity, score: 3, matchField: 'name' });
      }
      // Level 2: substring match
      else if (name.includes(qLower)) {
        seen.add(key);
        results.push({ entity, score: 2, matchField: 'name' });
      }
    }
  }

  // Deduplicate by entity key, keeping highest score
  const deduped = new Map<string, SearchResult>();
  for (const r of results) {
    const key = `${r.entity.kind}:${String(r.entity.metadata?.namespace ?? '')}/${String(r.entity.metadata?.name ?? '')}`;
    const existing = deduped.get(key);
    if (!existing || r.score > existing.score) {
      deduped.set(key, r);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aName = String(a.entity.metadata?.name ?? '');
    const bName = String(b.entity.metadata?.name ?? '');
    return aName.localeCompare(bName);
  });
}
