import { mkdir, writeFile, appendFile, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { EvidenceRef } from '../types.ts';
import { sha256 } from '../util/canonical.ts';

export interface EvidenceEvent {
  ts: string;
  runId: string;
  kind: string;
  [key: string]: unknown;
}

/**
 * Immutable evidence bundle for one run (VAH-007/014/025).
 * Layout: evidence/<runId>/{events.jsonl, artifacts/..., hashes.sha256}
 * A run directory is never written twice: runIds are unique per execution.
 */
export class EvidenceStore {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async createRun(runId?: string): Promise<RunContext> {
    const id = runId ?? newRunId();
    const dir = join(this.rootDir, id);
    await mkdir(join(dir, 'artifacts'), { recursive: true });
    const ctx = new RunContext(id, dir);
    await ctx.emitEvent('run.started', { runId: id });
    return ctx;
  }
}

export function newRunId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = randomBytes(4).toString('hex');
  return `run-${ts}-${rand}`;
}

export class RunContext {
  readonly artifactIds = new Map<string, EvidenceRef>();
  readonly runId: string;
  readonly dir: string;

  constructor(runId: string, dir: string) {
    this.runId = runId;
    this.dir = dir;
  }

  get artifactsDir(): string {
    return join(this.dir, 'artifacts');
  }

  async emitEvent(kind: string, payload: Record<string, unknown> = {}): Promise<void> {
    const event: EvidenceEvent = { ts: new Date().toISOString(), runId: this.runId, kind, ...payload };
    await appendFile(join(this.dir, 'events.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');
  }

  /**
   * Store a text artifact under artifacts/<name> and register its SHA-256.
   */
  async writeArtifact(name: string, content: string): Promise<EvidenceRef> {
    const path = join(this.artifactsDir, name);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content, 'utf8');
    return this.registerArtifact(name, path, Buffer.byteLength(content, 'utf8'));
  }

  /**
   * Register an existing file (already on disk, e.g. a browser trace) into the bundle.
   * The file is referenced in place when it already lives inside the run dir,
   * otherwise it is copied into artifacts/.
   */
  async registerFile(name: string, absolutePath: string): Promise<EvidenceRef> {
    const target = join(this.artifactsDir, name);
    if (absolutePath !== target) {
      const { copyFile } = await import('node:fs/promises');
      await mkdir(join(target, '..'), { recursive: true });
      await copyFile(absolutePath, target);
    }
    const bytes = (await stat(target)).size;
    return this.registerArtifact(name, target, bytes);
  }

  async writeJson(name: string, value: unknown): Promise<EvidenceRef> {
    return this.writeArtifact(name, `${JSON.stringify(value, null, 2)}\n`);
  }

  private async registerArtifact(name: string, absolutePath: string, bytes: number): Promise<EvidenceRef> {
    const content = await readFile(absolutePath);
    const ref: EvidenceRef = {
      artifactId: name,
      path: relative(this.dir, absolutePath),
      sha256: sha256(content),
      bytes,
    };
    this.artifactIds.set(name, ref);
    await this.emitEvent('artifact.written', { artifactId: name, sha256: ref.sha256, bytes });
    return ref;
  }

  /** Finalize the bundle: write hashes.sha256 covering every file in the run dir. */
  async finalize(): Promise<void> {
    const lines: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const { readdir } = await import('node:fs/promises');
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'browser-traces') continue; // handled below as binary dirs
          await walk(full);
        } else {
          const rel = relative(this.dir, full);
          if (rel === 'hashes.sha256') continue;
          const content = await readFile(full);
          lines.push(`${sha256(content)}  ${rel}`);
        }
      }
    };
    await walk(this.dir);
    await writeFile(join(this.dir, 'hashes.sha256'), `${lines.join('\n')}\n`, 'utf8');
    await this.emitEvent('run.finalized', { files: lines.length });
  }
}
