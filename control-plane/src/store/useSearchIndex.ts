import { useMemo } from 'react';
import { useProjectionStore } from './projectionStore';
import { buildIndex, search, type SearchResult } from './searchIndex';

/**
 * Memoized hook that builds a search index from the loaded catalog bundle
 * and exposes a search function.
 *
 * Returns an empty-search-result array when no bundle is loaded (AC-INV-no-write).
 * The hook re-computes only when catalogEntities change.
 */
export function useSearchIndex() {
  const catalogEntities = useProjectionStore((s) => s.catalogEntities);
  const status = useProjectionStore((s) => s.status);

  const index = useMemo(() => {
    if (status !== 'loaded' || catalogEntities.length === 0) {
      return null;
    }
    return buildIndex(catalogEntities);
  }, [catalogEntities, status]);

  const searchFn = (query: string): SearchResult[] => {
    if (!index) return [];
    return search(index, query);
  };

  return searchFn;
}

/**
 * Convenience: returns all entities as SearchResult[] when query is empty,
 * using the same memoized index.
 */
export function useAllEntities(): SearchResult[] {
  const catalogEntities = useProjectionStore((s) => s.catalogEntities);
  const status = useProjectionStore((s) => s.status);

  return useMemo(() => {
    if (status !== 'loaded' || catalogEntities.length === 0) {
      return [];
    }
    return catalogEntities.map((entity) => ({
      entity,
      score: 0,
      matchField: 'name' as const,
    }));
  }, [catalogEntities, status]);
}
