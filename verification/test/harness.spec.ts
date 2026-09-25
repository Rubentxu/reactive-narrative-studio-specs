import { describe, expect, it } from 'vitest';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { EvidenceStore } from '../src/evidence/store.ts';
import { semanticJsonOracle, filesystemTreeOracle, fileContentOracle, schemaOracle } from '../src/oracles/index.ts';
import { FilesystemDriver } from '../src/drivers/filesystem.ts';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

describe('EvidenceStore', () => {
  it('creates immutable bundles with hashes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rns-ev-'));
    const store = new EvidenceStore(root);
    const run = await store.createRun();
    const ref = await run.writeArtifact('x.json', '{"a":1}');
    expect(ref.sha256).toMatch(/^[0-9a-f]{64}$/);
    await run.finalize();
    const hashes = await readFile(join(run.dir, 'hashes.sha256'), 'utf8');
    expect(hashes).toContain('events.jsonl');
    expect(hashes).toContain('x.json');
  });

  it('two createRun calls produce distinct runIds (VAH-014)', async () => {
    const store = new EvidenceStore(await mkdtemp(join(tmpdir(), 'rns-ev-')));
    const a = await store.createRun();
    const b = await store.createRun();
    expect(a.runId).not.toBe(b.runId);
  });
});

describe('oracles', () => {
  async function oracleRun() {
    const store = new EvidenceStore(await mkdtemp(join(tmpdir(), 'rns-or-')));
    return store.createRun();
  }

  it('semanticJsonOracle passes when equal and fails with diff refs when not', async () => {
    const run = await oracleRun();
    await run.writeJson('expected.json', { id: 'x', project: { packs: ['a'] } });
    await run.writeJson('actual.json', { id: 'x', project: { packs: ['a'] } });
    const ok = await semanticJsonOracle(
      { id: 'o', type: 'semantic-json', config: { expectedArtifact: 'expected.json', actualArtifact: 'actual.json', ignoredPaths: [] } },
      { run, stepOutputs: new Map(), repoRoot: REPO_ROOT },
    );
    expect(ok.verdict).toBe('passed');

    await run.writeJson('other.json', { id: 'x', project: { packs: ['b'] } });
    const bad = await semanticJsonOracle(
      { id: 'o2', type: 'semantic-json', config: { expectedArtifact: 'expected.json', actualArtifact: 'other.json', ignoredPaths: [] } },
      { run, stepOutputs: new Map(), repoRoot: REPO_ROOT },
    );
    expect(bad.verdict).toBe('failed');
    expect(bad.diffRef).toBeDefined();
  });

  it('filesystemTreeOracle detects missing and differing files', async () => {
    const run = await oracleRun();
    const wsA = await mkdtemp(join(tmpdir(), 'rns-wsa-'));
    const wsB = await mkdtemp(join(tmpdir(), 'rns-wsb-'));
    await mkdir(join(wsA, 'canon'), { recursive: true });
    await mkdir(join(wsB, 'canon'), { recursive: true });
    await writeFile(join(wsA, 'canon', 'a.md'), 'same');
    await writeFile(join(wsB, 'canon', 'a.md'), 'same');
    await writeFile(join(wsA, 'only-a.md'), 'x');

    const fs = new FilesystemDriver(run);
    await fs.writeTreeArtifact('treeA.json', wsA);
    await fs.writeTreeArtifact('treeB.json', wsB);
    const result = await filesystemTreeOracle(
      { id: 'tree', type: 'filesystem-tree', config: { expectedArtifact: 'treeA.json', actualArtifact: 'treeB.json', ignoredPathPatterns: [{ pattern: '^only-a\\.md$', reason: 'plan copy metadata' }] } },
      { run, stepOutputs: new Map(), repoRoot: REPO_ROOT },
    );
    expect(result.verdict).toBe('passed');
    expect(result.message).toContain('ignored by declared patterns');
  });

  it('fileContentOracle compares real files', async () => {
    const run = await oracleRun();
    const ws = await mkdtemp(join(tmpdir(), 'rns-fc-'));
    await writeFile(join(ws, 'a.yaml'), 'id: x\n');
    await writeFile(join(ws, 'b.yaml'), 'id: x\n');
    const result = await fileContentOracle(
      { id: 'fc', type: 'file-content', config: { expectedFile: join(ws, 'a.yaml'), actualFile: join(ws, 'b.yaml') } },
      { run, stepOutputs: new Map(), repoRoot: REPO_ROOT },
    );
    expect(result.verdict).toBe('passed');
  });

  it('schemaOracle resolves relative scenario schemaPath against repoRoot, not process cwd', async () => {
    // Regression for SCN-M17-01-001 ENOENT under the canonical
    // `cd verification && pnpm verify` invocation: schemaPath is declared
    // repo-root-relative, so the oracle must resolve it against ctx.repoRoot.
    const run = await oracleRun();
    const ws = await mkdtemp(join(tmpdir(), 'rns-schema-'));
    await mkdir(join(ws, 'schemas'), { recursive: true });
    await writeFile(
      join(ws, 'schemas', 'cmd.schema.json'),
      JSON.stringify({
        type: 'object',
        required: ['schema'],
        additionalProperties: false,
        properties: { schema: { type: 'string' } },
      }),
      'utf8',
    );
    await run.writeJson('cmd.json', { schema: 'cp-commands/v1' });
    const ok = await schemaOracle(
      { id: 'sch', type: 'schema', config: { artifact: 'cmd.json', schemaPath: 'schemas/cmd.schema.json' } },
      { run, stepOutputs: new Map(), repoRoot: ws },
    );
    expect(ok.verdict).toBe('passed');
    expect(ok.message).toContain('cmd.schema.json');

    // A schema violation still fails the oracle through the resolved path.
    await run.writeJson('bad.json', { unexpected: true });
    const bad = await schemaOracle(
      { id: 'sch-bad', type: 'schema', config: { artifact: 'bad.json', schemaPath: 'schemas/cmd.schema.json' } },
      { run, stepOutputs: new Map(), repoRoot: ws },
    );
    expect(bad.verdict).toBe('failed');
  });
});

describe('traceability registry (H1)', () => {
  it('builds a registry covering M0–M10.2 with UAT linkage', async () => {
    const { buildRegistry } = await import('../src/traceability/build.ts');
    const registry = await buildRegistry(REPO_ROOT);
    expect(registry.schemaVersion).toBe('traceability-registry/v1');
    const m10_1 = registry.milestones.find((m) => m.id === 'M10.1');
    expect(m10_1?.uats.some((u) => u.id.startsWith('UAT-M10-04'))).toBe(true);
    expect(m10_1?.uats.find((u) => u.id.startsWith('UAT-M10-04'))?.status).toBe('EXECUTABLE');
    const reqIds = registry.milestones.flatMap((m) => m.requirements.map((r) => r.id));
    expect(reqIds).toContain('REQ-CR-12');
  }, 120_000);
});
