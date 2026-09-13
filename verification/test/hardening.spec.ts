/**
 * hardening.spec.ts — negative and robustness tests (H10).
 *
 * Requirements: REQ-VAH-HARDENING (corrupt evidence, dirty tree, process-level
 * redaction, parallel isolation, flakiness), REQ-VAH-EVIDENCE-INTEGRITY
 * (tamper detection + retained bundle verification), REQ-VAH-CI-ARTIFACTS (JUnit).
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EvidenceStore } from '../src/evidence/store.ts';
import { verifyEvidenceBundle, verifyRetainedBundles } from '../src/audit/integrity.ts';
import { classifyFlakiness } from '../src/audit/flakiness.ts';
import { probeGit } from '../src/evidence/probes.ts';
import { ProcessDriver } from '../src/drivers/process.ts';
import { renderJUnit } from '../src/report/junit.ts';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const exec = promisify(execFile);

async function makeBundle(): Promise<string> {
  const store = new EvidenceStore(await mkdtemp(join(tmpdir(), 'rns-hard-')));
  const run = await store.createRun();
  await run.writeJson('run.json', { runId: run.runId, scenarioId: 'SCN-X', overall: 'PASS' });
  await run.writeJson('verdict.json', { runId: run.runId, scenarioId: 'SCN-X', overall: 'PASS' });
  await run.writeArtifact('events.jsonl', '{"kind":"run.started"}\n');
  await run.finalize();
  return run.dir;
}

describe('hardening — evidence integrity (REQ-VAH-EVIDENCE-INTEGRITY)', () => {
  it('accepts an untampered bundle', async () => {
    const dir = await makeBundle();
    const report = await verifyEvidenceBundle(dir);
    expect(report.ok).toBe(true);
    expect(report.checked).toBeGreaterThan(0);
  });

  it('detects a tampered artifact (hash mismatch)', async () => {
    const dir = await makeBundle();
    await writeFile(join(dir, 'artifacts', 'verdict.json'), '{"tampered":true}', 'utf8');
    const report = await verifyEvidenceBundle(dir);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.kind === 'hash-mismatch' && p.path.includes('verdict.json'))).toBe(true);
  });

  it('detects an untracked injected file', async () => {
    const dir = await makeBundle();
    await writeFile(join(dir, 'artifacts', 'injected.txt'), 'evil', 'utf8');
    const report = await verifyEvidenceBundle(dir);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.kind === 'untracked-file')).toBe(true);
  });

  it('detects a missing listed file', async () => {
    const dir = await makeBundle();
    await rm(join(dir, 'artifacts', 'verdict.json'));
    const report = await verifyEvidenceBundle(dir);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.kind === 'missing-file')).toBe(true);
  });

  it('verifies the retained release bundles in the repo (VAH retention)', async () => {
    const reports = await verifyRetainedBundles(REPO_ROOT);
    expect(reports.length).toBeGreaterThan(0);
    const failed = reports.filter((r) => !r.ok);
    expect(failed.map((r) => r.bundle)).toEqual([]);
  }, 60_000);
});

describe('hardening — dirty tree observation (VAH-007)', () => {
  it('reports dirty state with the file list in a temp repo', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'rns-git-'));
    await exec('git', ['init', '-q'], { cwd: repo });
    await exec('git', ['config', 'user.email', 't@t'], { cwd: repo });
    await exec('git', ['config', 'user.name', 't'], { cwd: repo });
    await writeFile(join(repo, 'a.txt'), 'one', 'utf8');
    await exec('git', ['add', '.'], { cwd: repo });
    await exec('git', ['commit', '-q', '-m', 'init'], { cwd: repo });

    await writeFile(join(repo, 'a.txt'), 'two', 'utf8');
    await writeFile(join(repo, 'new.txt'), 'new', 'utf8');

    const observation = await probeGit(repo);
    expect(observation.dirty).toBe(true);
    expect(observation.dirtyFiles?.length).toBe(2);
    expect(observation.sha).toMatch(/^[0-9a-f]{40}$/);
  }, 30_000);
});

describe('hardening — process-level secret redaction (VAH-009)', () => {
  it('redacts secrets in captured stdout/stderr artifacts', async () => {
    const store = new EvidenceStore(await mkdtemp(join(tmpdir(), 'rns-red-')));
    const run = await store.createRun();
    const driver = new ProcessDriver(run, ['sup3r-s3cret-literal']);
    const result = await driver.execute(
      {
        cmd: 'node',
        args: ['-e', "console.log('GITHUB_TOKEN=abc123'); console.log('literal sup3r-s3cret-literal here'); console.error('PASSWORD=hunter2')"],
        cwd: tmpdir(),
        envAllowlist: ['PATH'],
      },
      'redact-test',
    );
    expect(result.stdout).not.toContain('abc123');
    expect(result.stdout).not.toContain('sup3r-s3cret-literal');
    expect(result.stderr).not.toContain('hunter2');
    expect(result.stdout).toContain('***REDACTED***');

    const stdoutArtifact = await readFile(join(run.dir, 'artifacts', 'redact-test.stdout.txt'), 'utf8');
    expect(stdoutArtifact).not.toContain('abc123');
  }, 30_000);
});

describe('hardening — flakiness classification (VAH-014)', () => {
  it('classifies FLAKY when a scenario has both PASS and FAIL history', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rns-flaky-'));
    const mk = async (runId: string, scenarioId: string, overall: string): Promise<void> => {
      const dir = join(root, 'evidence', runId, 'artifacts');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'verdict.json'), JSON.stringify({ runId, scenarioId, overall }), 'utf8');
    };
    await mk('run-1', 'SCN-A', 'PASS');
    await mk('run-2', 'SCN-A', 'FAIL');
    await mk('run-3', 'SCN-B', 'PASS');
    await mk('run-4', 'SCN-B', 'PASS');

    const records = await classifyFlakiness(root);
    const a = records.find((r) => r.scenarioId === 'SCN-A');
    const b = records.find((r) => r.scenarioId === 'SCN-B');
    expect(a?.classification).toBe('FLAKY');
    expect(b?.classification).toBe('STABLE_PASS');
  });

  it('classifies the real repo evidence without STABLE_FAIL or FLAKY (empty working dir is valid)', async () => {
    const records = await classifyFlakiness(join(REPO_ROOT, 'verification'));
    // The working evidence dir may be empty (fresh checkout / cleaned working
    // area); what matters is that no scenario is classified as unstable.
    expect(records.some((r) => r.classification === 'STABLE_FAIL' || r.classification === 'FLAKY')).toBe(false);
  });
});

describe('hardening — parallel isolation (VAH-022)', () => {
  it('two concurrent scenario runs produce distinct runIds and independent bundles', async () => {
    const [a, b] = await Promise.all([makeBundle(), makeBundle()]);
    expect(a).not.toBe(b);
    const [ra, rb] = await Promise.all([verifyEvidenceBundle(a), verifyEvidenceBundle(b)]);
    expect(ra.ok && rb.ok).toBe(true);
  }, 60_000);
});

describe('hardening — JUnit reporter (REQ-VAH-CI-ARTIFACTS)', () => {
  it('emits well-formed JUnit XML with failures and waived skips', () => {
    const xml = renderJUnit({
      runId: 'run-1',
      scenarioId: 'SCN-X',
      uat: 'UAT-X',
      requirements: ['REQ-X'],
      overall: 'PASS_WITH_WAIVER',
      startedAt: 't0',
      finishedAt: 't1',
      steps: [{ id: 's1', driver: 'git', action: 'observe', status: 'passed', observations: {}, artifacts: [], durationMs: 5 }],
      oracles: [
        {
          id: 'o1', type: 'browser', classification: 'runtime-health', proves: 'p', doesNotProve: 'd',
          verdict: 'failed', waived: true, waiverId: 'WVR-X', message: 'waived thing',
        },
      ],
      unprovenRequirements: [],
      appliedWaivers: ['WVR-X'],
      git: { sha: 'a'.repeat(40), branch: 'main', dirty: false },
      environment: { os: 'linux x64', node: 'v24' },
      evidenceIndex: [],
    });
    expect(xml).toContain('<testsuite name="SCN-X"');
    expect(xml).toContain('<skipped message="waived by WVR-X"');
    expect(xml.trim().endsWith('</testsuite>')).toBe(true);
  });
});
