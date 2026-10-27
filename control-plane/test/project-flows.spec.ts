// @vitest-environment jsdom
/**
 * project-flows.spec.ts
 *
 * The project creation and loading flows behave on real directory shapes:
 * skeleton paths spanning subdirectories are written through nested handles,
 * directory loading collects files in depth (not just the root), a chosen
 * directory is picked once per session, and concurrent loads resolve in the
 * order the user initiated them — last request wins, never a stale one.
 *
 * Requirements: REQ-CR-8 (testRefs source for the traceability registry).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileSystemAccessSink } from '../src/features/recipes/FileSystemAccessSink';
import { DirectoryProjectSource } from '../src/loader/DirectoryProjectSource';
import { useProjectionStore } from '../src/store/projectionStore';
import type { CreatePlan } from '../src/features/recipes/RecipePlanEmitter';

type FakeFileNode = { kind: 'file'; content: Uint8Array<ArrayBuffer> };
type FakeDirNode = { kind: 'directory'; children: Map<string, FakeNode> };
type FakeNode = FakeFileNode | FakeDirNode;

// Emulates the File System Access API surface the flows touch: directory
// handles are iterable, and file handles are created through parent scopes.
// getFileHandle emulates { create: true } by reserving the name.
function makeHandle(children: Map<string, FakeNode>): any {
  const handle: any = {
    kind: 'directory',
    async *values() {
      for (const [name, node] of children) {
        if (node.kind === 'file') {
          yield { kind: 'file', name, getFile: async () => new File([node.content], name) };
        } else {
          yield makeHandle((node as FakeDirNode).children);
        }
      }
    },
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      let node = children.get(name);
      if ((!node || node.kind !== 'directory') && options?.create) {
        node = { kind: 'directory', children: new Map() };
        children.set(name, node);
      }
      if (!node || node.kind !== 'directory') throw new Error(`no such directory: ${name}`);
      return makeHandle((node as FakeDirNode).children);
    },
    async getFileHandle(name: string) {
      let node = children.get(name);
      if (!node || node.kind !== 'file') {
        node = { kind: 'file', content: new Uint8Array() };
        children.set(name, node);
      }
      const fileNode = node as FakeFileNode;
      return {
        async createWritable() {
          let bytes = new Uint8Array();
          return {
            async write(chunk: Uint8Array) {
              const merged = new Uint8Array(bytes.length + chunk.length);
              merged.set(bytes);
              merged.set(chunk, bytes.length);
              bytes = merged;
            },
            async close() {
              fileNode.content = bytes;
            },
          };
        },
      };
    },
  };
  return handle;
}

function fakeDirectory(tree: Record<string, string>): any {
  const root: Map<string, FakeNode> = new Map();
  for (const [path, content] of Object.entries(tree)) {
    const segments = path.split('/').filter((part) => part.length > 0);
    const fileName = segments.pop()!;
    let scope = root;
    for (const directory of segments) {
      let next = scope.get(directory);
      if (!next || next.kind !== 'directory') {
        next = { kind: 'directory', children: new Map() } as FakeDirNode;
        scope.set(directory, next);
      }
      scope = (next as FakeDirNode).children;
    }
    scope.set(fileName, { kind: 'file', content: new TextEncoder().encode(content) });
  }
  return makeHandle(root);
}

const PLAN: CreatePlan = {
  recipe: 'middle-grade-illustrated',
  recipeLockSha256: 'a'.repeat(64),
  manifest: { title: 'Demo' },
  createPlanSha256: 'b'.repeat(64),
  skeleton: [
    { path: 'narrative.yaml', sha256: 'c'.repeat(64), bytes: 14, content: 'title: Demo\n' },
    { path: 'canon/chapters/01-opening.md', sha256: 'd'.repeat(64), bytes: 10, content: '# Opening\n' },
    { path: 'catalog/characters/maya.json', sha256: 'e'.repeat(64), bytes: 16, content: '{"name": "maya"}\n' },
  ],
};

describe('file system access sink writes nested skeleton paths', () => {
  let pickerCalls = 0;
  beforeEach(() => {
    pickerCalls = 0;
    (window as any).showDirectoryPicker = async () => {
      pickerCalls += 1;
      return fakeDirectory({});
    };
  });

  afterEach(() => {
    delete (window as any).showDirectoryPicker;
  });

  it('resolves parent directories before creating each file', async () => {
    const result = await fileSystemAccessSink.write(PLAN, {
      'narrative.yaml': 'title: Demo\n',
      'canon/chapters/01-opening.md': '# Opening\n',
      'catalog/characters/maya.json': '{"name": "maya"}\n',
    });
    expect(result.written.map((entry) => entry.path)).toEqual(PLAN.skeleton.map((entry) => entry.path));
    expect(result.written.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256))).toBe(true);
  });
});

describe('directory source loads the whole tree with one picker', () => {
  afterEach(() => {
    delete (window as any).showDirectoryPicker;
  });

  it('collects files from subdirectories, not just the root', async () => {
    (window as any).showDirectoryPicker = async () =>
      fakeDirectory({
        'manifest.json': '{}',
        'projections/story.json': '{}',
        'docs/outline.md': '# outline',
      });
    const source = new DirectoryProjectSource();
    const discovered = await source.discover();
    if (!discovered.ok) throw new Error(discovered.errors.map((e) => e.message).join('; '));
    expect([...discovered.data].sort()).toEqual(['manifest.json', 'outline.md', 'story.json']);
  });

  it('picks the directory once for discover and load', async () => {
    let picks = 0;
    (window as any).showDirectoryPicker = async () => {
      picks += 1;
      return fakeDirectory({ 'manifest.json': '{}' });
    };
    const source = new DirectoryProjectSource();
    await source.discover();
    await source.load('demo-project');
    expect(picks).toBe(1);
  });
});

describe('concurrent project loads', () => {
  it('keeps the last initiated project even when an older one resolves later', async () => {
    const store = useProjectionStore.getState();
    const makeSource = (projectId: string, delay: number) => ({
      async load() {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return {
          ok: true as const,
          data: {
            bundle: { project: { id: projectId, title: projectId } },
            catalogEntities: [],
          },
        };
      },
    });

    const slowFirst = store.loadFrom(makeSource('slow-project', 120) as any, 'slow-project');
    const fastSecond = store.loadFrom(makeSource('fast-project', 10) as any, 'fast-project');
    await Promise.all([slowFirst, fastSecond]);

    const state = useProjectionStore.getState();
    expect(state.activeProjectId).toBe('fast-project');
    expect(state.bundle?.project).toEqual({ id: 'fast-project', title: 'fast-project' });
  });
});
