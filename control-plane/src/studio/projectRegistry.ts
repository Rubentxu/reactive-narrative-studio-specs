/**
 * projectRegistry — local recent-project registry for Studio Home (M10.3).
 *
 * Persists ONLY metadata in IndexedDB (REQ-MP-2): project id, title, source
 * kind, selected file names, last-opened timestamp and favorite flag. Narrative
 * content (projections, docs, chapter text) MUST NEVER be written here — the
 * projects themselves live outside the browser (local directories / Git).
 *
 * Plain IndexedDB API (no Dexie/Orama); an in-memory fallback keeps the API
 * usable under node tests and non-browser environments.
 */

export type SourceKind = 'snapshot' | 'directory';

export interface ProjectRecord {
  projectId: string;
  title: string;
  sourceKind: SourceKind;
  fileNames: string[];
  lastOpenedAt: string;
  favorite: boolean;
}

/** The complete, enforced shape of a persisted record (metadata only). */
export const PROJECT_RECORD_KEYS: ReadonlyArray<keyof ProjectRecord> = [
  'projectId',
  'title',
  'sourceKind',
  'fileNames',
  'lastOpenedAt',
  'favorite',
];

export const STUDIO_DB_NAME = 'rns-studio';
export const STUDIO_STORE_NAME = 'projects';

interface Backend {
  list(): Promise<ProjectRecord[]>;
  upsert(record: ProjectRecord): Promise<void>;
  remove(projectId: string): Promise<void>;
  clear(): Promise<void>;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'));
  });
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(STUDIO_DB_NAME, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STUDIO_STORE_NAME)) {
        db.createObjectStore(STUDIO_STORE_NAME, { keyPath: 'projectId' });
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('indexedDB open failed'));
  });
}

class IndexedDbBackend implements Backend {
  async list(): Promise<ProjectRecord[]> {
    const db = await openDb();
    try {
      const tx = db.transaction(STUDIO_STORE_NAME, 'readonly');
      const all = await requestToPromise(tx.objectStore(STUDIO_STORE_NAME).getAll() as IDBRequest<ProjectRecord[]>);
      return all;
    } finally {
      db.close();
    }
  }

  async upsert(record: ProjectRecord): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STUDIO_STORE_NAME, 'readwrite');
      tx.objectStore(STUDIO_STORE_NAME).put(record);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('indexedDB put failed'));
      });
    } finally {
      db.close();
    }
  }

  async remove(projectId: string): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STUDIO_STORE_NAME, 'readwrite');
      tx.objectStore(STUDIO_STORE_NAME).delete(projectId);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('indexedDB delete failed'));
      });
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STUDIO_STORE_NAME, 'readwrite');
      tx.objectStore(STUDIO_STORE_NAME).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('indexedDB clear failed'));
      });
    } finally {
      db.close();
    }
  }
}

class MemoryBackend implements Backend {
  private readonly records = new Map<string, ProjectRecord>();

  async list(): Promise<ProjectRecord[]> {
    return [...this.records.values()];
  }

  async upsert(record: ProjectRecord): Promise<void> {
    this.records.set(record.projectId, { ...record });
  }

  async remove(projectId: string): Promise<void> {
    this.records.delete(projectId);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}

let backendFactory: () => Backend = () => (hasIndexedDb() ? new IndexedDbBackend() : new MemoryBackend());
let backendInstance: Backend | null = null;

function backend(): Backend {
  if (!backendInstance) backendInstance = backendFactory();
  return backendInstance;
}

/** Test seam: force a backend (memory) or restore auto-detection. */
export function __setRegistryBackend(factory: (() => Backend) | null): void {
  backendFactory = factory ?? (() => (hasIndexedDb() ? new IndexedDbBackend() : new MemoryBackend()));
  backendInstance = null;
}

export function isRegistryAvailable(): boolean {
  return hasIndexedDb();
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const records = await backend().list();
  return records.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export async function getProject(projectId: string): Promise<ProjectRecord | undefined> {
  return (await backend().list()).find((r) => r.projectId === projectId);
}

export interface UpsertInput {
  projectId: string;
  title: string;
  sourceKind: SourceKind;
  fileNames: string[];
  /** Preserves the previous favorite flag when omitted. */
  favorite?: boolean;
}

export async function upsertRecent(input: UpsertInput, now: () => string = () => new Date().toISOString()): Promise<ProjectRecord> {
  const store = backend();
  const existing = (await store.list()).find((r) => r.projectId === input.projectId);
  const record: ProjectRecord = {
    projectId: input.projectId,
    title: input.title,
    sourceKind: input.sourceKind,
    fileNames: [...input.fileNames],
    lastOpenedAt: now(),
    favorite: input.favorite ?? existing?.favorite ?? false,
  };
  await store.upsert(record);
  return record;
}

export async function setFavorite(projectId: string, favorite: boolean): Promise<void> {
  const store = backend();
  const existing = (await store.list()).find((r) => r.projectId === projectId);
  if (!existing) return;
  await store.upsert({ ...existing, favorite });
}

export async function removeProject(projectId: string): Promise<void> {
  await backend().remove(projectId);
}

export async function clearAll(): Promise<void> {
  await backend().clear();
}
