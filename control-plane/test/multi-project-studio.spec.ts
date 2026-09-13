/**
 * multi-project-studio.spec.ts — M10.3 unit tests.
 *
 * Requirements: REQ-MP-1 (independent runtime identities), REQ-MP-2 (registry
 * metadata-only), REQ-MP-5 (deleting preferences does not touch projects),
 * REQ-MP-6 (no central narrative DB — registry record shape probe).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useProjectionStore, resolveProjectIdentity } from '../src/store/projectionStore';
import {
  __setRegistryBackend,
  clearAll,
  listProjects,
  removeProject,
  setFavorite,
  upsertRecent,
  PROJECT_RECORD_KEYS,
  getProject,
} from '../src/studio/projectRegistry';
import type { ProjectionBundle, ProjectSource } from '../src/loader/ProjectSource';
import type { Diagnostic } from '../src/diagnostics/types';
import type { CatalogEntity } from '../src/loader/ProjectSource';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

function fixtureBundle(dir: string): ProjectionBundle {
  const cp = JSON.parse(readFileSync(join(REPO_ROOT, 'golden/control-plane', dir, 'projections/cp-project.json'), 'utf8'));
  return {
    project: cp,
    chapters: {},
    characters: {},
    assets: {},
    uat: {},
    visualQuality: {},
    history: {},
    decisions: {},
    docs: {},
  };
}

class FakeSource implements ProjectSource {
  constructor(
    private readonly bundle: ProjectionBundle,
    private readonly entities: CatalogEntity[],
  ) {}
  async load(): Promise<Diagnostic<{ bundle: ProjectionBundle; catalogEntities: CatalogEntity[] }>> {
    return { ok: true, data: { bundle: this.bundle, catalogEntities: this.entities } };
  }
  async discover(): Promise<Diagnostic<readonly string[]>> {
    return { ok: true, data: [] };
  }
}

beforeEach(async () => {
  // node has no indexedDB → the registry auto-falls back to the in-memory backend
  __setRegistryBackend(null);
  await clearAll();
  useProjectionStore.getState().reset();
});

describe('multi-project runtime (REQ-MP-1)', () => {
  it('keeps two loaded projects with independent identities and switches active', async () => {
    const store = useProjectionStore.getState();
    const a = await store.loadFrom(new FakeSource(fixtureBundle('snapshot-valid'), [{ kind: 'Project' } as CatalogEntity]), 'snapshot');
    const b = await store.loadFrom(new FakeSource(fixtureBundle('snapshot-second'), [{ kind: 'Project' } as CatalogEntity]), 'snapshot');

    expect(a.projectId).toBe('demo-project');
    expect(b.projectId).toBe('demo-project-b');
    expect(a.projectId).not.toBe(b.projectId);

    const state = useProjectionStore.getState();
    expect(Object.keys(state.projects).sort()).toEqual(['demo-project', 'demo-project-b']);
    expect(state.activeProjectId).toBe('demo-project-b');

    state.setActive('demo-project');
    const after = useProjectionStore.getState();
    expect(after.activeProjectId).toBe('demo-project');
    expect((after.bundle?.project as { project?: { id?: string } }).project?.id).toBe('demo-project');
    // the other identity is still held
    expect(Object.keys(after.projects)).toHaveLength(2);
  });

  it('resolves identity from the nested cp-project descriptor with label fallback', () => {
    expect(resolveProjectIdentity(fixtureBundle('snapshot-valid'), 'snapshot')).toEqual({
      projectId: 'demo-project',
      title: 'Demo Project',
    });
    expect(resolveProjectIdentity({ project: null } as unknown as ProjectionBundle, 'snapshot')).toEqual({
      projectId: 'snapshot',
      title: 'snapshot',
    });
  });
});

describe('registry metadata-only (REQ-MP-2)', () => {
  it('persists exactly the declared metadata keys', async () => {
    await upsertRecent({
      projectId: 'p1',
      title: 'P1',
      sourceKind: 'snapshot',
      fileNames: ['manifest.json', 'cp-project.json'],
    });
    const [record] = await listProjects();
    expect(Object.keys(record ?? {}).sort()).toEqual([...PROJECT_RECORD_KEYS].sort());
    // no narrative payload keys leak into the record
    for (const forbidden of ['bundle', 'projections', 'docs', 'chapters', 'decisions']) {
      expect(Object.keys(record ?? {})).not.toContain(forbidden);
    }
  });

  it('orders by lastOpenedAt desc and preserves favorite on re-upsert', async () => {
    let clock = 0;
    const now = (): string => new Date(2026, 0, 1, 0, 0, clock++).toISOString();
    await upsertRecent({ projectId: 'a', title: 'A', sourceKind: 'snapshot', fileNames: [] }, now);
    await upsertRecent({ projectId: 'b', title: 'B', sourceKind: 'snapshot', fileNames: [] }, now);
    await setFavorite('a', true);
    await upsertRecent({ projectId: 'a', title: 'A2', sourceKind: 'snapshot', fileNames: ['x'] }, now);

    const records = await listProjects();
    expect(records[0]?.projectId).toBe('a');
    expect(records[0]?.favorite).toBe(true);
    expect(records[0]?.title).toBe('A2');
  });

  it('removes and clears without touching anything else', async () => {
    await upsertRecent({ projectId: 'a', title: 'A', sourceKind: 'snapshot', fileNames: [] });
    await removeProject('a');
    expect(await getProject('a')).toBeUndefined();
    await upsertRecent({ projectId: 'b', title: 'B', sourceKind: 'snapshot', fileNames: [] });
    await clearAll();
    expect(await listProjects()).toEqual([]);
  });

  it('deleting preferences does not touch the projects (REQ-MP-5): re-load works after clear', async () => {
    const store = useProjectionStore.getState();
    await upsertRecent({ projectId: 'demo-project', title: 'Demo Project', sourceKind: 'snapshot', fileNames: [] });
    await clearAll();
    expect(await listProjects()).toEqual([]);

    const loaded = await store.loadFrom(new FakeSource(fixtureBundle('snapshot-valid'), []), 'snapshot');
    expect(loaded.projectId).toBe('demo-project');
    expect(useProjectionStore.getState().status).toBe('loaded');
  });
});
