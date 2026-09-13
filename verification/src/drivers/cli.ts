import type { RunContext } from '../evidence/store.ts';
import { ProcessDriver, type ProcessResult } from './process.ts';

export interface CliDriverConfig {
  /** Repo root (contains tools/ and recipes/). */
  repoRoot: string;
  /** Working dir for narrative commands (temp workspace for init, repo root for plan). */
  pythonBin?: string;
  timeoutMs?: number;
}

/**
 * Black-box driver for the real Python CLI (`narrative`).
 * Executes the production entry point as an external process (VAH-012):
 * it never imports narrative_cli into the harness process.
 */
export class CliDriver {
  private readonly process: ProcessDriver;
  private readonly config: CliDriverConfig;

  constructor(run: RunContext, config: CliDriverConfig) {
    this.config = config;
    this.process = new ProcessDriver(run);
  }

  private narrativeEnv(): Record<string, string> {
    return {
      PYTHONPATH: `${this.config.repoRoot}/tools:${this.config.repoRoot}/tools/narrative-cli`,
    };
  }

  async run(args: string[], cwd: string, artifactPrefix: string): Promise<ProcessResult> {
    return this.process.execute(
      {
        cmd: this.config.pythonBin ?? 'python3',
        args: ['-m', 'narrative_cli', ...args],
        cwd,
        envAllowlist: ['PATH', 'HOME', 'LANG', 'LC_ALL', 'VIRTUAL_ENV'],
        env: this.narrativeEnv(),
        timeoutMs: this.config.timeoutMs,
      },
      artifactPrefix,
    );
  }

  async init(recipe: string | undefined, planPath: string | undefined, params: Record<string, string>, out: string, artifactPrefix: string): Promise<ProcessResult> {
    const args: string[] = ['init'];
    if (planPath) args.push('--plan', planPath);
    else if (recipe) args.push('--recipe', recipe);
    for (const [key, value] of Object.entries(params)) args.push('--param', `${key}=${value}`);
    args.push('--out', out, '--json');
    return this.run(args, this.config.repoRoot, artifactPrefix);
  }
}
