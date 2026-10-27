import type { Diagnostic } from '../diagnostics/types';
import type { ProjectSource, ProjectionBundle, CatalogEntity } from './ProjectSource';
import { SnapshotProjectSource } from './SnapshotProjectSource';

export class DirectoryProjectSource implements ProjectSource {
  private snapshotSource: SnapshotProjectSource | null = null;
  // The directory chosen once is reused for the subsequent load: asking the
  // user to pick the same folder twice is friction, and a cancelled picker
  // invalidates the cached handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private directoryHandle: any = null;

  async discover(): Promise<Diagnostic<readonly string[]>> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      return this.discoverFromDir();
    }
    if (!this.snapshotSource) return { ok: false, errors: [] };
    return this.snapshotSource.discover();
  }

  async load(projectId: string): Promise<Diagnostic<{ bundle: ProjectionBundle; catalogEntities: CatalogEntity[] }>> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      return this.loadFromDir(projectId);
    }
    if (!this.snapshotSource) return { ok: false, errors: [] };
    return this.snapshotSource.load(projectId);
  }

  fromFileList(files: FileList | ReadonlyArray<File>): void {
    this.snapshotSource = new SnapshotProjectSource(files);
  }

  private async pickDirectory(): Promise<any | null> {
    if (this.directoryHandle) return this.directoryHandle;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.directoryHandle = await (window as any).showDirectoryPicker();
      return this.directoryHandle;
    } catch {
      this.directoryHandle = null;
      return null;
    }
  }

  /** Collect every file under the chosen directory, in depth-first order. */
  private async collectFiles(dirHandle: any, files: File[] = []): Promise<File[]> {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        files.push(await entry.getFile());
      } else if (entry.kind === 'directory') {
        await this.collectFiles(entry, files);
      }
    }
    return files;
  }

  private async discoverFromDir(): Promise<Diagnostic<readonly string[]>> {
    const dirHandle = await this.pickDirectory();
    if (!dirHandle) return { ok: false, errors: [] };
    try {
      const files = await this.collectFiles(dirHandle);
      return { ok: true, data: files.map((file) => file.name) };
    } catch {
      return { ok: false, errors: [] };
    }
  }

  private async loadFromDir(projectId: string): Promise<Diagnostic<{ bundle: ProjectionBundle; catalogEntities: CatalogEntity[] }>> {
    const dirHandle = await this.pickDirectory();
    if (!dirHandle) return { ok: false, errors: [] };
    try {
      const files = await this.collectFiles(dirHandle);
      const snap = new SnapshotProjectSource(files);
      return await snap.load(projectId);
    } catch {
      return { ok: false, errors: [] };
    }
  }
}
