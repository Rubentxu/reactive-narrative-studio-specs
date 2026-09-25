import { describe, expect, it, beforeAll } from 'vitest';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateWaiver, loadWaivers, WaiverValidationError } from '../src/evidence/waivers.ts';
import { browserContentOracle } from '../src/oracles/index.ts';
import { EvidenceStore } from '../src/evidence/store.ts';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

// Requirements: REQ-VAH-WAIVER (waiver model + PASS_WITH_WAIVER semantics; levels declared in
// traceability/requirement-levels.json). State pinned after m10-2-1-crossref-render:
// WVR-M10-2-1-001 removed (cross-link render proven by SCN-M10-02-001); WVR-M10-2-1-002
// (store immutability) remains the single accepted gap.
describe('waivers (VAH: PASS_WITH_WAIVER, never PASS)', () => {
  it('rejects waivers missing required fields', () => {
    expect(() => validateWaiver({ id: 'W1', requirement: 'R' }, 'test')).toThrow(WaiverValidationError);
    expect(() => validateWaiver({ id: 'W1', requirement: 'R', reason: '', scope: 's', owner: 'o', evidence: ['e'] }, 'test')).toThrow(/reason/);
    expect(() => validateWaiver({ id: 'W1', requirement: 'R', reason: 'r', scope: 's', owner: 'o', evidence: [] }, 'test')).toThrow(/evidence/);
  });

  it('accepts a complete waiver', () => {
    const waiver = validateWaiver(
      { id: 'W1', requirement: 'R', reason: 'r', scope: 's', owner: 'o', evidence: ['e'] },
      'test',
    );
    expect(waiver.id).toBe('W1');
  });

  it('returns [] when the waivers file is absent and errors on malformed files', async () => {
    const emptyRoot = await mkdtemp(join(tmpdir(), 'rns-wv-'));
    await mkdir(join(emptyRoot, 'traceability'), { recursive: true });
    expect(await loadWaivers(emptyRoot)).toEqual([]);

    await writeFile(join(emptyRoot, 'traceability', 'waivers.json'), '{"not":"an-array"}', 'utf8');
    await expect(loadWaivers(emptyRoot)).rejects.toThrow(/must be a JSON array/);

    await writeFile(
      join(emptyRoot, 'traceability', 'waivers.json'),
      JSON.stringify([
        { id: 'W1', requirement: 'R', reason: 'r', scope: 's', owner: 'o', evidence: ['e'] },
        { id: 'W1', requirement: 'R2', reason: 'r', scope: 's', owner: 'o', evidence: ['e'] },
      ]),
      'utf8',
    );
    await expect(loadWaivers(emptyRoot)).rejects.toThrow(/duplicate waiver id/);
  });

  it('the repo waivers file is valid and covers the accepted gaps', async () => {
    // State after m10-2-1-crossref-render: the positive cross-link render is
    // proven by SCN-M10-02-001, so WVR-M10-2-1-001 was removed; only the
    // store-immutability gap (WVR-M10-2-1-002) remains waived.
    const waivers = await loadWaivers(join(REPO_ROOT, 'verification'));
    expect(waivers.length).toBeGreaterThanOrEqual(1);
    const ids = waivers.map((w) => w.id);
    expect(ids).not.toContain('WVR-M10-2-1-001');
    expect(ids).toContain('WVR-M10-2-1-002');
    for (const waiver of waivers) {
      expect(waiver.evidence.length).toBeGreaterThan(0);
      expect(waiver.reason.length).toBeGreaterThan(20);
    }
  });
});

describe('browser-content oracle', () => {
  async function runOracle(dom: unknown) {
    const store = new EvidenceStore(await mkdtemp(join(tmpdir(), 'rns-bc-')));
    const run = await store.createRun();
    await run.writeJson('dom.json', dom);
    return browserContentOracle(
      { id: 'bc', type: 'browser-content', config: { artifact: 'dom.json', h1Contains: ['Skills'], linksContain: ['/capabilities/skills/'], noRawTextContains: ['[['] } },
      { run, stepOutputs: new Map(), repoRoot: REPO_ROOT },
    );
  }

  const goodDom = {
    url: 'http://localhost:4173/capabilities/skills',
    title: 'CP',
    h1s: ['Skills'],
    h2s: [],
    links: ['/capabilities/skills/default/character-consistency'],
    bodyText: 'Skills 3 entries character-consistency',
  };

  it('passes when all declarative assertions hold', async () => {
    const result = await runOracle(goodDom);
    expect(result.verdict).toBe('passed');
  });

  it('fails with concrete diagnostics when assertions break', async () => {
    const result = await runOracle({ ...goodDom, h1s: ['Packs'], links: [], bodyText: 'raw [[Skill:default/x]]' });
    expect(result.verdict).toBe('failed');
    expect(result.message).toContain('no <h1> contains "Skills"');
    expect(result.message).toContain('forbidden raw text');
  });

  it('claims declare what it does and does not prove', async () => {
    const result = await runOracle(goodDom);
    expect(result.classification).toBe('functional');
    expect(result.doesNotProve).toContain('internal app semantics');
  });
});

// Requirements: REQ-VAH-BASELINE (baseline generator), REQ-VAH-FITNESS-SEPARATION
// (requirement -> test refs kept separate from functional UAT).
describe('baseline M0-M10.2 (H8)', () => {
  it('registry includes testRefs, waivers and gaps for M0-M10.2', async () => {
    const { buildRegistry, renderBaseline } = await import('../src/traceability/build.ts');
    const registry = await buildRegistry(REPO_ROOT);
    expect(registry.coverage.waived).toBeGreaterThanOrEqual(1);
    expect(registry.gaps.length).toBeGreaterThan(0);
    const baseline = renderBaseline(registry);
    expect(baseline).toContain('## Gaps / backlog');
    expect(baseline).not.toContain('WVR-M10-2-1-001');
    // test refs harvested from component tests (M10.2 requirements cite their tests)
    const m10_2 = registry.milestones.find((m) => m.id === 'M10.2');
    expect(m10_2?.requirements.some((r) => r.testRefs.length > 0)).toBe(true);
    // the harness's own milestone is tracked with its mapped requirements
    const m1021 = registry.milestones.find((m) => m.id === 'M10.2.1');
    expect(m1021?.requirements.some((r) => r.id === 'REQ-VAH-WAIVER')).toBe(true);
  }, 120_000);
});

describe('scenario SCN-M10-02-001 shape', () => {
  it('validates and navigates all six kinds with honest claims', async () => {
    const { loadScenario } = await import('../src/scenario/loader.ts');
    const scenario = await loadScenario(join(REPO_ROOT, 'verification/scenarios/scn-m10-02-001.yaml'));
    expect(scenario.uat).toBe('UAT-M10-06');
    const paths = scenario.steps.filter((s) => s.action === 'navigate').map((s) => s.params?.path as string);
    for (const kindPath of ['/capabilities/skills', '/capabilities/packs', '/capabilities/profiles', '/capabilities/workflows', '/capabilities/providers', '/capabilities/recipes']) {
      expect(paths).toContain(kindPath);
    }
    expect(scenario.claims.doesNotProve.join(' ')).toContain('projection store');
    expect(scenario.claims.doesNotProve.join(' ')).toContain('cross-links');
    expect(scenario.oracles.some((o) => o.type === 'browser-content')).toBe(true);
  });
});
