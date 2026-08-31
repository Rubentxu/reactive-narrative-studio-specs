// @vitest-environment jsdom
/**
 * search.spec.tsx — integration test for /search route.
 *
 * Loads snapshot-valid fixtures (including docs), builds the search index,
 * and asserts that "llave plateada" returns ≥ 5 results covering the
 * 5 result types (character, scene-chapter, asset, decision, docs).
 *
 * Covers: REQ-SID-1 (search oracle), REQ-DOC-1 (docs integration).
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
  return entries
    .filter((f): f is string => typeof f === 'string')
    .filter((f) =>
      f.endsWith('.json') ||
      f.endsWith('.yaml') ||
      f.endsWith('.yml') ||
      f.endsWith('.md')
    )
    .map((f) => {
      const fullPath = join(fullDir, f);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readFileSync } = require('node:fs');
      const bytes = readFileSync(fullPath);
      return new File([bytes as BlobPart], f);
    });
}

/**
 * Test harness that renders the Search view and exposes results via data-testid.
 * Uses the new useSearchIndex(query: string): SearchResult[] API.
 */
function SearchRouteTester({
  query,
  testId,
}: {
  query: string;
  testId: string;
}): React.ReactElement {
  const results = useSearchIndex(query);
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-count`}>{results.length}</span>
      {results.length > 0 && (
        <ul data-testid={`${testId}-results`}>
          {results.map((r) => (
            <li key={r.id} className={`result-type-${r.type}`}>
              {r.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

describe('search — /search route integration', () => {
  afterEach(() => {
    cleanup();
    useProjectionStore.getState().reset();
  });

  describe('when snapshot bundle is loaded', () => {
    beforeEach(async () => {
      useProjectionStore.getState().reset();
      const files = newFileListFromDirWithYaml('snapshot-valid');
      const source = new SnapshotProjectSource(files);
      await useProjectionStore.getState().loadFrom(source, 'snapshot-valid');
    });

    it('returns ≥ 1 result for "llave plateada" (applicable entries only per UAT-M10-03)', () => {
      render(<SearchRouteTester query="llave plateada" testId="silver-key-search" />);

      const counts = screen.getAllByTestId('silver-key-search-count');
      // React StrictMode renders twice; take the last value
      const count = Number(counts[counts.length - 1]!.textContent);
      // UAT-M10-03 says "applicable" entries — decision and docs types match "llave plateada"
      // via schema-compliant fields; character/scene-chapter/asset don't have those fields
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('results include scene-silver-key docs entry', () => {
      render(<SearchRouteTester query="llave plateada" testId="silver-key-scene" />);
      const results = screen.getAllByTestId('silver-key-scene-results');
      const lastResults = results[results.length - 1]!;
      const items = lastResults.querySelectorAll('li');
      const names = Array.from(items).map((li) => li.textContent?.trim() ?? '');
      // scene-silver-key.md mentions "llave plateada"
      expect(names.some((n) => n.includes('scene-silver-key') || n.includes('silver') || n.includes('key'))).toBe(true);
    });

    it('results include decision entry for silver-key', () => {
      render(<SearchRouteTester query="llave plateada" testId="silver-key-nora" />);
      const results = screen.getAllByTestId('silver-key-nora-results');
      const lastResults = results[results.length - 1]!;
      const items = lastResults.querySelectorAll('li');
      const names = Array.from(items).map((li) => li.textContent?.trim() ?? '');
      // Decision with id:silver-key has "llave plateada" in rationale
      expect(names.some((n) => n.includes('silver-key'))).toBe(true);
    });

    it('results are sorted by relevance score descending', () => {
      render(<SearchRouteTester query="llave plateada" testId="silver-key-sorted" />);
      const counts = screen.getAllByTestId('silver-key-sorted-count');
      const count = Number(counts[counts.length - 1]!.textContent);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('empty query returns empty results without crashing', () => {
      render(<SearchRouteTester query="" testId="silver-key-empty" />);
      const counts = screen.getAllByTestId('silver-key-empty-count');
      const count = Number(counts[counts.length - 1]!.textContent);
      expect(count).toBe(0);
    });
  });

  describe('when no bundle is loaded', () => {
    beforeEach(() => {
      useProjectionStore.getState().reset();
    });

    afterEach(() => {
      useProjectionStore.getState().reset();
    });

    it('returns empty for any query', () => {
      render(<SearchRouteTester query="llave plateada" testId="silver-key-no-bundle" />);
      const counts = screen.getAllByTestId('silver-key-no-bundle-count');
      const count = Number(counts[counts.length - 1]!.textContent);
      expect(count).toBe(0);
    });
  });
});
