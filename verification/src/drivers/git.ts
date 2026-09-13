import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RunContext } from '../evidence/store.ts';
import type { GitObservation } from '../types.ts';
import { probeGit } from '../evidence/probes.ts';

const exec = promisify(execFile);

export class GitDriver {
  private readonly run: RunContext;
  private readonly repoRoot: string;

  constructor(run: RunContext, repoRoot: string) {
    this.run = run;
    this.repoRoot = repoRoot;
  }

  async observe(artifactName = 'git.observation.json'): Promise<GitObservation> {
    const observation = await probeGit(this.repoRoot);
    await this.run.writeJson(artifactName, observation);
    return observation;
  }

  async diffFiles(): Promise<string[]> {
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd: this.repoRoot });
    return stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  }
}
