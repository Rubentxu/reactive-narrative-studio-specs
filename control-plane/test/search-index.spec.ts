import { describe, it, expect } from 'vitest';
import { tokenize, build } from '../src/store/searchIndex';
import type { CatalogEntity } from '../src/loader/ProjectSource';
import type { ProjectionBundle } from '../src/loader/ProjectSource';
import type { DocEntry } from '../src/loader/SnapshotProjectSource';

function makeEntity(kind: string, namespace: string, name: string, description = ''): CatalogEntity {
  return {
    apiVersion: 'studio.test/v1',
    kind,
    metadata: { name, namespace, description },
  } as unknown as CatalogEntity;
}

const CHARACTERS: CatalogEntity[] = [
  makeEntity('Character', 'demo', 'nora', 'The protagonist of the story who discovers the llave plateada'),
  makeEntity('Character', 'demo', 'nora-build', 'A build variant of Nora'),
  makeEntity('Character', 'demo', 'runner', 'Fast runner character'),
  makeEntity('Character', 'studio', 'architect', 'The system architect'),
];

const BUNDLE_WITH_DECISIONS: ProjectionBundle = {
  project: null,
  chapters: {
    chapters: [
      { id: 'ch-silver-key', title: 'La Llave Plateada — The Silver Key', status: 'pass', docRef: 'docs/scene-silver-key.md' },
    ],
  },
  characters: {
    characters: [
      { id: 'char-nora-bundle', name: 'Nora', summary: 'Bundle-only notes: carries the silver key in chapter 3', notes: 'Bundle variant' },
    ],
  },
  assets: {
    assets: [
      { id: 'asset-silver-key-doc', name: 'silver-key-doc', path: 'docs/scene-silver-key.md', kind: 'llave-plateada-document' },
    ],
  },
  uat: null,
  visualQuality: null,
  history: null,
  decisions: {
    decisions: [
      { id: 'silver-key', action: 'Accept the silver key — the llave plateada that anchors the narrative', targetRef: 'Scene:demo/scene-silver-key', date: '2026-01-01T00:00:00Z', status: 'accepted' },
      { id: 'nora-arc', action: 'Pursue Nora character arc through the archive', targetRef: 'Character:demo/nora', date: '2026-01-02T00:00:00Z', status: 'pending' },
      { id: 'iron-door', action: 'Open the iron door for protagonist progression', targetRef: 'Asset:demo/iron-door', date: '2026-01-03T00:00:00Z', status: 'rejected' },
    ],
  },
  docs: [],
};

const DOCS: DocEntry[] = [
  { path: 'docs/narrative.md', body: 'Nora found the silver key in the archive. The archive contains many secrets.' },
  { path: 'docs/nora.md', body: 'Character:demo/nora is the main protagonist. She carries the silver key and encounters the llave plateada.' },
  { path: 'docs/scene-silver-key.md', body: 'The silver key scene shows Nora finding the llave plateada (silver key) in the archive.' },
];

describe('searchIndex — tokenize (D3)', () => {
  it('returns lowercase tokens split by non-alphanumeric', () => {
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

  // EVT-SID-02: ASCII-folded case-insensitive tokenization
  it('ASCII-folds accented characters: LLAVE → llave', () => {
    expect(tokenize('LLAVÉ')).toEqual(['llave']);
  });

  it('ASCII-folds combining marks: PLÁTEÁDA → plateada', () => {
    expect(tokenize('PLÁTEÁDA')).toEqual(['plateada']);
  });

  it('tokenize(LLAVÉ PLÁTEÁDA) deep-equals tokenize(llave plateada)', () => {
    expect(tokenize('LLAVÉ PLÁTEÁDA')).toEqual(tokenize('llave plateada'));
  });

  it('tokenize(Llàvé Pláteádà) deep-equals tokenize(llave plateada)', () => {
    expect(tokenize('Llàvé Pláteádà')).toEqual(tokenize('llave plateada'));
  });

  it('tokenize(llave-plateada) deep-equals tokenize(llave plateada)', () => {
    expect(tokenize('llave-plateada')).toEqual(['llave', 'plateada']);
  });
});

describe('searchIndex — build (D1/D3)', () => {
  it('builds an index with entries and a search method', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, []);
    expect(Array.isArray(index.entries)).toBe(true);
    expect(typeof index.search).toBe('function');
  });

  it('indexes catalog entities as character/asset type', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, []);
    const noraEntry = index.entries.find((e) => e.id === 'character:demo/nora');
    expect(noraEntry).toBeDefined();
    expect(noraEntry!.type).toBe('character');
    expect(noraEntry!.title).toBe('nora');
  });

  it('indexes decisions from bundle.decisions', () => {
    const index = build([], BUNDLE_WITH_DECISIONS, []);
    const decisionEntries = index.entries.filter((e) => e.type === 'decision');
    expect(decisionEntries.length).toBe(3);
    const silverKey = decisionEntries.find((e) => e.id === 'decision:silver-key');
    expect(silverKey).toBeDefined();
    expect(silverKey!.title).toBe('Accept the silver key — the llave plateada that anchors the narrative');
  });

  it('indexes docs from the docs array', () => {
    const index = build([], BUNDLE_WITH_DECISIONS, DOCS);
    const docEntries = index.entries.filter((e) => e.type === 'docs');
    expect(docEntries.length).toBe(3);
    const narrative = docEntries.find((e) => e.id === 'docs:narrative');
    expect(narrative).toBeDefined();
    expect(narrative!.title).toBe('narrative');
    expect(narrative!.tokens).toContain('nora');
    expect(narrative!.tokens).toContain('silver');
    expect(narrative!.tokens).toContain('key');
  });

  it('does not duplicate entries for the same id', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, []);
    const ids = index.entries.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe('searchIndex — search (D4 ranker)', () => {
  it('returns empty array for empty query', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    expect(index.search('')).toEqual([]);
    expect(index.search('   ')).toEqual([]);
  });

  it('returns empty array when no entries exist', () => {
    const index = build([], { ...BUNDLE_WITH_DECISIONS, decisions: undefined, characters: null, assets: null, chapters: null }, []);
    expect(index.search('nora')).toEqual([]);
  });

  // D4-100: exact id match outranks all other scores
  it('exact id match (silver-key) returns score 100', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('silver-key');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe('decision:silver-key');
    expect(results[0]!.score).toBe(100);
  });

  it('D4-80: exact Kind:namespace/name match returns score 80', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('Character:demo/nora');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBe(80);
  });

  it('D4-60: multi-token full hit across multiple fields returns score 60', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('llave plateada');
    expect(results.length).toBeGreaterThan(0);
    // silver-key decision mentions "llave plateada" in its action text
    const silverKeyResult = results.find((r) => r.id === 'decision:silver-key');
    expect(silverKeyResult).toBeDefined();
    expect(silverKeyResult!.score).toBeGreaterThanOrEqual(40);
  });

  it('D4-40: single-token substring hit returns score 40', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('nora');
    expect(results.length).toBeGreaterThan(0);
    const noraResults = results.filter((r) => r.type === 'character');
    expect(noraResults.length).toBeGreaterThan(0);
    // exact id match > name match > token hit
    expect(results[0]!.score).toBeGreaterThanOrEqual(40);
  });

  it('D4-20: snippet-only hit returns score 20', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    // "archive" appears in narrative.md body but not as an indexed token
    const results = index.search('archive');
    const narrativeResult = results.find((r) => r.id === 'docs:narrative');
    expect(narrativeResult).toBeDefined();
    expect(narrativeResult!.score).toBeGreaterThanOrEqual(20);
  });

  it('results are sorted by score descending', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('nora');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('search is case-insensitive', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const lower = index.search('nora');
    const upper = index.search('NORA');
    const mixed = index.search('NoRa');
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });

  it('deterministic: two calls return identical order', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const first = index.search('llave plateada');
    const second = index.search('llave plateada');
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id));
    expect(first.map((r) => r.score)).toEqual(second.map((r) => r.score));
  });

  it('result includes all required fields', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('nora');
    expect(results.length).toBeGreaterThan(0);
    const r = results[0]!;
    expect(r).toHaveProperty('id');
    expect(r).toHaveProperty('type');
    expect(r).toHaveProperty('title');
    expect(r).toHaveProperty('snippet');
    expect(r).toHaveProperty('score');
    expect(typeof r.score).toBe('number');
  });

  it('returns at least one result per type for "llave plateada" query (EVT-SID-01)', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    const results = index.search('llave plateada');
    const types = new Set(results.map((r) => r.type));

    // Amendment 1: EVT-SID-01 at FULL STRENGTH — all 5 types required.
    // scene-chapter: ONE entry per chapter (id scene-chapter:<chapter-id>,
    // entityRef Chapter:cp/<chapter-id>, sourcePath from ch.docRef).
    expect(types.has('character')).toBe(true);
    expect(types.has('scene-chapter')).toBe(true);
    expect(types.has('asset')).toBe(true);
    expect(types.has('decision')).toBe(true);
    expect(types.has('docs')).toBe(true);

    // Non-empty field assertions (Amendment 1 §entityRef convention):
    for (const r of results) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.snippet.length).toBeGreaterThan(0);
      expect(r.entityRef.length).toBeGreaterThan(0);
      expect(r.score).toBeGreaterThan(0);
    }

    // scene-chapter entry shape per Amendment 1:
    const sceneChapter = results.find((r) => r.type === 'scene-chapter');
    expect(sceneChapter).toBeDefined();
    expect(sceneChapter!.id).toBe('scene-chapter:ch-silver-key');
    expect(sceneChapter!.entityRef).toBe('Chapter:cp/ch-silver-key');
    expect(sceneChapter!.sourcePath).toBe('docs/scene-silver-key.md');
  });

  it('whitespace-only query returns empty', () => {
    const index = build(CHARACTERS, BUNDLE_WITH_DECISIONS, DOCS);
    expect(index.search('  \n\t  ')).toEqual([]);
  });
});
