import { spawn } from 'node:child_process';
import type { EvidenceRef, ProcessObservation } from '../types.ts';
import type { RunContext } from '../evidence/store.ts';
import { redactSecrets } from '../util/redact.ts';

export interface ProcessRequest {
  cmd: string;
  args: string[];
  cwd: string;
  /** Env allowlist: only these variables are inherited from the harness env. */
  envAllowlist: string[];
  timeoutMs?: number;
  /** Extra env merged after the allowlist (never inherited wholesale). */
  env?: Record<string, string>;
}

export interface ProcessResult extends ProcessObservation {
  stdout: string;
  stderr: string;
}

/**
 * Executes an external process with env allowlist, timeout and redacted capture.
 * The driver collects observations only — PASS/FAIL is decided by oracles.
 */
export class ProcessDriver {
  private readonly run: RunContext;
  private readonly secrets: string[];

  constructor(run: RunContext, secrets: string[] = []) {
    this.run = run;
    this.secrets = secrets;
  }

  async execute(request: ProcessRequest, artifactPrefix: string): Promise<ProcessResult> {
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 120_000;
    const env: Record<string, string> = {};
    for (const key of request.envAllowlist) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
    Object.assign(env, request.env ?? {});

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
      const child = spawn(request.cmd, request.args, { cwd: request.cwd, env });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (err) => {
        stderr += `\n[spawn error] ${String(err)}`;
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr, timedOut });
      });
    });

    const observation: ProcessResult = {
      command: [request.cmd, ...request.args].join(' '),
      cwd: request.cwd,
      exitCode: result.code,
      timedOut: result.timedOut,
      durationMs: Date.now() - started,
      stdout: redactSecrets(result.stdout, this.secrets),
      stderr: redactSecrets(result.stderr, this.secrets),
    };

    await this.run.writeArtifact(`${artifactPrefix}.stdout.txt`, observation.stdout);
    await this.run.writeArtifact(`${artifactPrefix}.stderr.txt`, observation.stderr);
    await this.run.writeArtifact(`${artifactPrefix}.exit.txt`, String(observation.exitCode));
    await this.run.emitEvent('process.executed', {
      artifactPrefix,
      command: observation.command,
      exitCode: observation.exitCode,
      timedOut: observation.timedOut,
      durationMs: observation.durationMs,
    });
    return observation;
  }
}

export function processObservationToRef(_r: ProcessResult): EvidenceRef | undefined {
  // Process artifacts are already registered in the store; refs are fetched by name.
  return undefined;
}
