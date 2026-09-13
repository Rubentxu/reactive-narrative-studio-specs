import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sha256 } from '../util/canonical.ts';

export interface IntegrityProblem {
  kind: 'hash-mismatch' | 'missing-file' | 'missing-required' | 'untracked-file' | 'unreadable-bundle';
  path: string;
  detail: string;
}

export interface IntegrityReport {
  bundle: string;
  ok: boolean;
  checked: number;
  problems: IntegrityProblem[];
}

const REQUIRED_FILES = ['run.json', 'verdict.json', 'events.jsonl'];

/**
 * Recompute SHA-256 for every file listed in hashes.sha256 and validate the
 * required bundle files (VAH-025). Detects tampering and corruption of
 * archived evidence — the retained bundles are the audit's ground truth.
 */
export async function verifyEvidenceBundle(bundleDir: string): Promise<IntegrityReport> {
  const problems: IntegrityProblem[] = [];
  const hashesPath = join(bundleDir, 'hashes.sha256');

  for (const required of REQUIRED_FILES) {
    const p = join(bundleDir, required);
    if (!existsSync(p)) {
      // verdict.json lives under artifacts/ for runner-produced bundles
      const alt = join(bundleDir, 'artifacts', required);
      if (!existsSync(alt)) {
        problems.push({ kind: 'missing-required', path: required, detail: 'required bundle file is absent' });
      }
    }
  }

  if (!existsSync(hashesPath)) {
    problems.push({ kind: 'unreadable-bundle', path: hashesPath, detail: 'hashes.sha256 is missing' });
    return { bundle: bundleDir, ok: false, checked: 0, problems };
  }

  const lines = (await readFile(hashesPath, 'utf8')).split('\n').filter((l) => l.trim().length > 0);
  const listed = new Set<string>();
  let checked = 0;
  for (const line of lines) {
    const match = /^([0-9a-f]{64})\s{2}(.+)$/.exec(line);
    if (!match) {
      problems.push({ kind: 'unreadable-bundle', path: hashesPath, detail: `malformed hash line: ${line}` });
      continue;
    }
    const [, expected, relPath] = match;
    listed.add(relPath ?? '');
    const full = join(bundleDir, relPath ?? '');
    if (!existsSync(full)) {
      problems.push({ kind: 'missing-file', path: relPath ?? '', detail: 'listed in hashes.sha256 but absent on disk' });
      continue;
    }
    const actual = sha256(await readFile(full));
    checked += 1;
    if (actual !== expected) {
      problems.push({
        kind: 'hash-mismatch',
        path: relPath ?? '',
        detail: `expected ${expected?.slice(0, 12)}…, actual ${actual.slice(0, 12)}…`,
      });
    }
  }

  // untracked files (outside hashes.sha256) are a tamper signal too
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(bundleDir, full).split('\\').join('/');
      if (entry.isDirectory()) {
        await walk(full);
      } else if (rel !== 'hashes.sha256' && !listed.has(rel)) {
        problems.push({ kind: 'untracked-file', path: rel, detail: 'present in bundle but not listed in hashes.sha256' });
      }
    }
  };
  await walk(bundleDir);

  return { bundle: bundleDir, ok: problems.length === 0, checked, problems };
}

/**
 * Verify every retained release bundle under changes/<cycle>/evidence/<name>/
 * (release evidence retention — ADR-VAH-002 traceability evidence).
 */
export async function verifyRetainedBundles(repoRoot: string): Promise<IntegrityReport[]> {
  const reports: IntegrityReport[] = [];
  const changesDir = join(repoRoot, 'changes');
  if (!existsSync(changesDir)) return reports;
  for (const change of await readdir(changesDir, { withFileTypes: true })) {
    if (!change.isDirectory()) continue;
    const evidenceDir = join(changesDir, change.name, 'evidence');
    if (!existsSync(evidenceDir)) continue;
    for (const bundle of await readdir(evidenceDir, { withFileTypes: true })) {
      if (!bundle.isDirectory()) continue;
      reports.push(await verifyEvidenceBundle(join(evidenceDir, bundle.name)));
    }
  }
  return reports;
}
