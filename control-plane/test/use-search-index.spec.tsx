// @vitest-environment jsdom
/**
 * use-search-index.spec.tsx — hook integration test for useSearchIndex.
 *
 * Hook signature: useSearchIndex(query: string): SearchResult[]
 * Memoization: build is called once per (query, catalogEntities, bundle, docs).
 *
 * EVT-SID-04 oracle: hook consumed only from views/Search.tsx + features/docs/.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { useProjectionStore } from '../src/store/projectionStore';
import { useSearchIndex } from '../src/store/useSearchIndex';
import { SnapshotProjectSource } from '../src/loader/SnapshotProjectSource';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOLDEN_ROOT = resolve(process.cwd(), '../golden/control-plane');

function newFileListFromDirWithYaml(relativeDir: string): File[] {
  const fullDir = join(GOLDEN_ROOT, relativeDir);
  const entries = readdirSync(fullDir, { recursive: true });
  const files = entries.filter(
    (f): f is string =>
      typeof f === 'string' &&
      (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.md'))
  );
  return files.map((f: string) => {
    const fullPath = join(fullDir, f);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require('node:fs');
    const bytes = readFileSync(fullPath);
    return new File([bytes as BlobPart], f);
  });
}

/**
 * Test component that calls useSearchIndex(query) directly.
 * The new API: useSearchIndex(query: string) → SearchResult[]
 */
function SearchIndexTester({ query, testId }: { query: string; testId: string }): React.ReactElement {
  const results = useSearchIndex(query);
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-count`}>{results.length}</span>
      <span data-testid={`${testId}-status`}>ok</span>
    </div>
  );
}

describe('useSearchIndex', () => {
  afterEach(() => {
    cleanup();
  });

  describe('when no bundle is loaded (empty store)', () => {
    beforeEach(() => {
      useProjectionStore.getState().reset();
    });

    afterEach(() => {
      useProjectionStore.getState().reset();
    });

    it('returns empty array for any query when store is empty', () => {
      render(<SearchIndexTester query="nora" testId="empty-test" />);
      const counts = screen.getAllByTestId('empty-test-count');
      // React StrictMode renders twice; take the last value
      const count = Number(counts[counts.length - 1]!.textContent);
      expect(count).toBe(0);
    });

    it('renders without crashing when store is empty', () => {
      render(<SearchIndexTester query="nora" testId="empty-crash" />);
      const statuses = screen.getAllByTestId('empty-crash-status');
      expect(statuses[statuses.length - 1]!.textContent).toBe('ok');
    });
  });

  describe('when bundle is loaded', () => {
    beforeEach(async () => {
      useProjectionStore.getState().reset();
      const files = newFileListFromDirWithYaml('snapshot-valid');
      const source = new SnapshotProjectSource(files);
      await useProjectionStore.getState().loadFrom(source, 'snapshot-valid');
    });

    afterEach(() => {
      useProjectionStore.getState().reset();
    });

    it('returns at least 1 result for a known entity name', () => {
      render(<SearchIndexTester query="nora" testId="bundle-test" />);
      const counts = screen.getAllByTestId('bundle-test-count');
      const count = Number(counts[counts.length - 1]!.textContent);
      expect(count).toBeGreaterThan(0);
    });
  });
});
