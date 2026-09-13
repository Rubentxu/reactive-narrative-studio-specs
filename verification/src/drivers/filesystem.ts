import { mkdir, mkdtemp, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import type { RunContext } from '../evidence/store.ts';
import { sha256 } from '../util/canonical.ts';

export interface FileEntry {
  path: string;
  sha256: string;
  bytes: number;
}

/**
 * Filesystem driver: fresh temp workspaces (VAH-022), tree snapshots,
 * file hashes and before/after captures (VAH-011).
 */
export class FilesystemDriver {
  private readonly run: RunContext;

  constructor(run: RunContext) {
    this.run = run;
  }

  async tempWorkspace(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), `rns-${prefix}-`));
    await this.run.emitEvent('filesystem.workspace.created', { prefix, dir });
    return dir;
  }

  async snapshotTree(root: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const dirent of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, dirent.name);
        if (dirent.isDirectory()) {
          await walk(full);
        } else {
          const content = await readFile(full);
          entries.push({
            path: relative(root, full).split('\\').join('/'),
            sha256: sha256(content),
            bytes: content.byteLength,
          });
        }
      }
    };
    await walk(root);
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }

  async writeTreeArtifact(name: string, root: string): Promise<string> {
    const tree = await this.snapshotTree(root);
    await this.run.writeJson(name, { root, files: tree });
    return name;
  }

  async readTree(root: string): Promise<Map<string, Buffer>> {
    const out = new Map<string, Buffer>();
    const walk = async (dir: string): Promise<void> => {
      for (const dirent of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, dirent.name);
        if (dirent.isDirectory()) await walk(full);
        else out.set(relative(root, full).split('\\').join('/'), await readFile(full));
      }
    };
    await walk(root);
    return out;
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export { rm };
