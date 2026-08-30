import { describe, it, expect } from 'vitest';
import { tokenize, buildIndex, search } from '../src/store/searchIndex';
import type { CatalogEntity } from '../src/loader/ProjectSource';

function makeEntity(kind: string, namespace: string, name: string, description = ''): CatalogEntity {
  return {
    apiVersion: 'studio.test/v1',
    kind,
    metadata: { name, namespace, description },
  } as unknown as CatalogEntity;
}

const CHARACTERS: CatalogEntity[] = [
  makeEntity('Character', 'demo', 'nora', 'The protagonist of the story'),
  makeEntity('Character', 'demo', 'nora-build', 'A build variant of Nora'),
  makeEntity('Character', 'demo', 'runner', 'Fast runner character'),
  makeEntity('Character', 'studio', 'architect', 'The system architect'),
];

const BUILDS: CatalogEntity[] = [
  makeEntity('Build', 'demo', 'build-001', 'Primary build'),
  makeEntity('Build', 'studio', 'ci-build', 'CI pipeline build'),
];

describe('searchIndex — tokenize', () => {
  it('returns lowercase tokens split by whitespace, dash, underscore, slash', () => {
    const tokens = tokenize('Nora-BUILD runner');
    expect(tokens).toEqual(['nora', 'build', 'runner']);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles string with only separators', () => {
    expect(tokenize('---')).toEqual([]);
  });

  it('splits on dot separator', () => {
    expect(tokenize('demo/nora')).toEqual(['demo', 'nora']);
  });

  it('handles single word', () => {
    expect(tokenize('nora')).toEqual(['nora']);
  });
});

describe('searchIndex — buildIndex', () => {
  it('builds an index with entities and a lookup map', () => {
    const index = buildIndex(CHARACTERS);
    expect(index.entities).toHaveLength(4);
    expect(index.lookup instanceof Map).toBe(true);
  });

  it('indexes entity name tokens', () => {
    const index = buildIndex(CHARACTERS);
    const noraResults = index.lookup.get('nora');
    expect(noraResults).toBeDefined();
    expect(noraResults!.length).toBeGreaterThan(0);
    expect(noraResults!.some((e) => String(e.metadata?.name ?? '') === 'nora')).toBe(true);
  });

  it('indexes entity kind tokens', () => {
    const index = buildIndex(CHARACTERS);
    const charResults = index.lookup.get('character');
    expect(charResults).toBeDefined();
    expect(charResults!.length).toBe(4);
  });

  it('does not duplicate entity for same token', () => {
    const index = buildIndex([makeEntity('Character', 'demo', 'nora')]);
    const noraResults = index.lookup.get('nora');
    expect(noraResults!.length).toBe(1);
  });

  it('indexes full namespace/name reference', () => {
    const index = buildIndex(CHARACTERS);
    const fullRef = index.lookup.get('demo/nora');
    expect(fullRef).toBeDefined();
    expect(fullRef!.length).toBe(1);
    expect(String(fullRef![0]!.metadata?.name ?? '')).toBe('nora');
  });
});

describe('searchIndex — search', () => {
  it('returns empty array for empty query', () => {
    const index = buildIndex(CHARACTERS);
    expect(search(index, '')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });

  it('returns empty array when no entities exist', () => {
    const index = buildIndex([]);
    expect(search(index, 'nora')).toEqual([]);
  });

  it('returns level-4 exact name match before level-3 prefix', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'nora');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBe(4);
    expect(String(results[0]!.entity.metadata?.name ?? '')).toBe('nora');
  });

  it('returns level-3 prefix match for non-exact name', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'nor');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBe(3);
  });

  it('returns level-2 substring match', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'ora');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBe(2);
  });

  it('returns results sorted by score descending', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'nora');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('deduplicates entities across multiple token matches', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'nora build');
    const keys = results.map((r) => `${r.entity.kind}:${String(r.entity.metadata?.namespace ?? '')}/${String(r.entity.metadata?.name ?? '')}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('finds entities by kind token', () => {
    const index = buildIndex(BUILDS);
    const results = search(index, 'build');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.entity.kind === 'Build')).toBe(true);
  });

  it('returns empty for query with no matches', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'xyznonexistent');
    expect(results).toEqual([]);
  });

  it('search is case-insensitive', () => {
    const index = buildIndex(CHARACTERS);
    const lower = search(index, 'nora');
    const upper = search(index, 'NORA');
    const mixed = search(index, 'NoRa');
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });

  it('whitespace-only query returns empty', () => {
    const index = buildIndex(CHARACTERS);
    expect(search(index, '  \n\t  ')).toEqual([]);
  });

  it('result includes matchField field', () => {
    const index = buildIndex(CHARACTERS);
    const results = search(index, 'nora');
    expect(results[0]).toHaveProperty('matchField');
    expect(['name', 'namespace', 'kind', 'description'] as const).toContain(results[0]!.matchField);
  });
});
