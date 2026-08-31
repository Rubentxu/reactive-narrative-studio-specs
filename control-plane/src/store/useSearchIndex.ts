/**
 * useSearchIndex — memoized search hook per REQ-SID-4 (D2/D5).
 *
 * Signature: useSearchIndex(query: string): SearchResult[]
 *
 * Subscribes to (catalogEntities, bundle, docs) via useProjectionStore.
 * Calls build(...) once on mount + on every change to subscribed slots.
 * Memoizes by shallow equality on (query, catalogEntities, bundle, docs).
 *
 * EVT-SID-04 oracle: grep -rE "useSearchIndex" src/ ≤ 3 hits
 *   (declaration + views/Search.tsx + features/docs/)
 * AC-INV-no-write: features cannot mutate Zustand.
 * AC-INV-extension-isolation: hook consumed only from allowed paths.
 */

import { useMemo } from 'react';
import { useProjectionStore } from './projectionStore';
import { build, type SearchResult } from './searchIndex';
import type { DocEntry } from '../loader/SnapshotProjectSource';

// Private guard narrowing bundle.docs to DocEntry[]
function assertDocs(docs: unknown): ReadonlyArray<DocEntry> {
  if (!Array.isArray(docs)) return [];
  return docs as ReadonlyArray<DocEntry>;
}

/**
 * useSearchIndex — the sole exported symbol from this module.
 * Returns SearchResult[] for the given query, memoized by
 * (query, catalogEntities, bundle, docs) shallow equality.
 */
export function useSearchIndex(query: string): SearchResult[] {
  const catalogEntities = useProjectionStore((s) => s.catalogEntities);
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);

  const index = useMemo(() => {
    if (status !== 'loaded' || !bundle) return null;
    const docs = assertDocs(bundle.docs);
    return build(catalogEntities, bundle, docs);
  }, [catalogEntities, bundle, status]);

  const results = useMemo(() => {
    if (!index) return [];
    return index.search(query);
  }, [index, query]);

  return results;
}
