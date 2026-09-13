import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { EnvironmentObservation, GitObservation } from '../types.ts';

const exec = promisify(execFile);

async function version(cmd: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 10_000 });
    return stdout.trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

/** VAH-008: OS, Node, pnpm, Python, browser versions relevant to the run. */
export async function probeEnvironment(): Promise<EnvironmentObservation> {
  const [node, pnpm, python, browser] = await Promise.all([
    version('node', ['--version']),
    version('pnpm', ['--version']),
    version('python3', ['--version']),
    version('npx', ['playwright', '--version']),
  ]);
  return {
    os: `${process.platform} ${process.arch}`,
    node: node ?? process.version,
    pnpm,
    python,
    browser,
  };
}

/** VAH-007: commit under test + dirty state with the file list. */
export async function probeGit(repoRoot: string): Promise<GitObservation> {
  const { stdout: sha } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  const { stdout: branch } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot });
  const { stdout: statusOut } = await exec('git', ['status', '--porcelain'], { cwd: repoRoot });
  const dirtyFiles = statusOut.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    sha: sha.trim(),
    branch: branch.trim(),
    dirty: dirtyFiles.length > 0,
    ...(dirtyFiles.length > 0 ? { dirtyFiles } : {}),
  };
}
