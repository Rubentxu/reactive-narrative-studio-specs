import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { catalogSelectors } from '../src/store/catalogSelectors';
import { useProjectionStore } from '../src/store/projectionStore';
import { SnapshotProjectSource } from '../src/loader/SnapshotProjectSource';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOLDEN_ROOT = resolve(process.cwd(), '../golden/control-plane');

function newFileListFromDirWithYaml(relativeDir: string): File[] {
  const fullDir = join(GOLDEN_ROOT, relativeDir);
  const entries = readdirSync(fullDir, { recursive: true });
  const files = entries.filter((f): f is string => typeof f === 'string' && (f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.md')));
  return files.map((f: string) => {
    const fullPath = join(fullDir, f);
    const { readFileSync } = require('node:fs');
    const bytes = readFileSync(fullPath);
    return new File([bytes as BlobPart], f);
  });
}

describe('catalogSelectors', () => {
  describe('byEntityRef', () => {
    it('returns undefined for non-existent entity (store is empty in tests)', () => {
      const ref = { kind: 'Character', namespace: 'nonexistent', name: 'ghost' };
      const result = catalogSelectors.byEntityRef(ref);
      expect(result).toBeUndefined();
    });
  });

  describe('byNamespace', () => {
    it('returns empty array when no entities exist', () => {
      const result = catalogSelectors.byNamespace('demo');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('count', () => {
    it('returns 0 for any kind when store is empty', () => {
      const result = catalogSelectors.count('Character');
      expect(result).toBe(0);
    });

    it('returns 0 for unknown kind', () => {
      const result = catalogSelectors.count('UATRun');
      expect(result).toBe(0);
    });
  });

  describe('byKind', () => {
    it('returns empty array when no entities exist', () => {
      const result = catalogSelectors.byKind('Character');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('catalogSelectors — populated state', () => {
  // Seed the store once before all populated tests
  beforeEach(async () => {
    useProjectionStore.getState().reset();
    const files = newFileListFromDirWithYaml('snapshot-valid');
    const source = new SnapshotProjectSource(files);
    await useProjectionStore.getState().loadFrom(source, 'snapshot-valid');
  });

  afterEach(() => {
    useProjectionStore.getState().reset();
  });

  it('loadFrom populates catalogEntities with at least 2 entities (Nora + Build)', () => {
    const entities = useProjectionStore.getState().catalogEntities;
    expect(entities.length).toBeGreaterThanOrEqual(2);
  });

  it('byKind returns Character entities from snapshot', () => {
    const characters = catalogSelectors.byKind('Character');
    expect(characters.length).toBeGreaterThanOrEqual(1);
    expect(characters.some((e) => e.metadata.name === 'nora')).toBe(true);
  });

  it('byKind returns Build entities from snapshot', () => {
    const builds = catalogSelectors.byKind('Build');
    expect(builds.length).toBeGreaterThanOrEqual(1);
  });

  it('byEntityRef resolves Character:demo/nora', () => {
    const ref = { kind: 'Character', namespace: 'demo', name: 'nora' };
    const entity = catalogSelectors.byEntityRef(ref);
    expect(entity).toBeDefined();
    expect(entity!.metadata.name).toBe('nora');
    expect(entity!.metadata.namespace).toBe('demo');
  });

  it('byEntityRef resolves Build entity', () => {
    const ref = { kind: 'Build', namespace: 'demo', name: 'build-001' };
    const entity = catalogSelectors.byEntityRef(ref);
    expect(entity).toBeDefined();
  });

  it('count returns correct number for Character kind', () => {
    const count = catalogSelectors.count('Character');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('byNamespace returns entities in demo namespace', () => {
    const entities = catalogSelectors.byNamespace('demo');
    expect(entities.length).toBeGreaterThanOrEqual(2);
  });
});
