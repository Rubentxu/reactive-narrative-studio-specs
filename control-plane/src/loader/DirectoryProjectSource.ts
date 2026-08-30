import type { Diagnostic } from '../diagnostics/types';
import type { ProjectSource, ProjectionBundle } from './ProjectSource';
import { SnapshotProjectSource } from './SnapshotProjectSource';

export class DirectoryProjectSource implements ProjectSource {
  private snapshotSource: SnapshotProjectSource | null = null;

  async discover(): Promise<Diagnostic<readonly string[]>> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      return this.discoverFromDir();
    }
    if (!this.snapshotSource) return { ok: false, errors: [] };
    return this.snapshotSource.discover();
  }

  async load(projectId: string): Promise<Diagnostic<ProjectionBundle>> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      return this.loadFromDir(projectId);
    }
    if (!this.snapshotSource) return { ok: false, errors: [] };
    return this.snapshotSource.load(projectId);
  }

  fromFileList(files: FileList | ReadonlyArray<File>): void {
    this.snapshotSource = new SnapshotProjectSource(files);
  }

  private async discoverFromDir(): Promise<Diagnostic<readonly string[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker();
      const entries: string[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') entries.push(entry.name);
      }
      return { ok: true, data: entries };
    } catch {
      return { ok: false, errors: [] };
    }
  }

  private async loadFromDir(projectId: string): Promise<Diagnostic<ProjectionBundle>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') files.push(await entry.getFile());
      }
      const snap = new SnapshotProjectSource(files);
      return snap.load(projectId);
    } catch {
      return { ok: false, errors: [] };
    }
  }
}
