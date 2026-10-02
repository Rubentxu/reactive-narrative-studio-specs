import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  areaOfRequirement,
  loadRequirementDispositions,
  reqBelongsToMilestone,
  unownedGapDetail,
  type DispositionEntry,
} from '../src/traceability/build.ts';

// Requirements: REQ-DEI-9 — area disposition map for `requirement-unowned`
// gaps: every gap whose area has an entry carries the disposition in its
// detail; a missing/malformed map is a hard error (AC-2); areas without an
// entry keep the bare detail so the REQ-DEI-8 guard keeps its meaning (AC-3).
// Requirements: REQ-DEI-10 — REQ-M11-5 and REQ-M11-6 mapped to the M11
// inventory with real evidence (component-level ownership checks).

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('unownedGapDetail (REQ-DEI-9)', () => {
  const base = 'harvested from prose/tasks.md but no reqBelongsToMilestone area/override maps it to a milestone';

  it('appends the area disposition suffix to the base detail', () => {
    const dispositions = new Map<string, DispositionEntry>([
      ['PROJ-VAL', { disposition: 'cycle-prose-unmapped', note: 'prosa de ciclo (test)' }],
    ]);
    expect(unownedGapDetail({ reqId: 'REQ-PROJ-VAL-6', sources: ['prose/tasks.md'] }, dispositions)).toBe(
      `${base}; disposition: cycle-prose-unmapped (prosa de ciclo (test)) — see verification/traceability/requirement-dispositions.md`,
    );
  });

  it('an area without a map entry keeps the bare detail (REQ-DEI-9 AC-3)', () => {
    expect(unownedGapDetail({ reqId: 'REQ-UNKNOWN-1', sources: ['prose/tasks.md'] }, new Map())).toBe(base);
  });

  it('derives the area from ids with complex numeric suffixes', () => {
    expect(areaOfRequirement('REQ-PROJ-VAL-6')).toBe('PROJ-VAL');
    expect(areaOfRequirement('REQ-M11-5')).toBe('M11');
  });
});

describe('loadRequirementDispositions (REQ-DEI-9 AC-2)', () => {
  async function tempRepoRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'rns-disp-'));
  }

  async function writeMap(root: string, content: string): Promise<void> {
    const dir = join(root, 'verification', 'traceability');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'requirement-dispositions.json'), content, 'utf8');
  }

  it('missing file → hard error naming the path', async () => {
    const root = await tempRepoRoot();
    await expect(loadRequirementDispositions(root)).rejects.toThrow(
      /requirement-dispositions\.json is missing/,
    );
  });

  it('invalid JSON → hard error', async () => {
    const root = await tempRepoRoot();
    await writeMap(root, '{not json');
    await expect(loadRequirementDispositions(root)).rejects.toThrow(/malformed requirement-dispositions\.json/);
  });

  it('disposition outside the taxonomy → hard error naming the area and the valid keys', async () => {
    const root = await tempRepoRoot();
    await writeMap(root, JSON.stringify({ SA: { disposition: 'historical', note: 'whatever' } }));
    const err: unknown = await loadRequirementDispositions(root).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('area SA has invalid disposition "historical"');
    expect((err as Error).message).toContain(
      'cycle-prose-unmapped|deliberate-inventory-exclusion|implemented-out-of-inventory|mapped-with-evidence',
    );
  });

  it('empty note → hard error', async () => {
    const root = await tempRepoRoot();
    await writeMap(root, JSON.stringify({ SA: { disposition: 'cycle-prose-unmapped', note: '   ' } }));
    await expect(loadRequirementDispositions(root)).rejects.toThrow(/area SA needs a non-empty note/);
  });

  it('valid map → populated Map', async () => {
    const root = await tempRepoRoot();
    await writeMap(root, JSON.stringify({ SA: { disposition: 'cycle-prose-unmapped', note: 'prosa de ciclo' } }));
    const map = await loadRequirementDispositions(root);
    expect(map.get('SA')).toEqual({ disposition: 'cycle-prose-unmapped', note: 'prosa de ciclo' });
  });

  it('real repo map loads with the 25 disposed areas (integration)', async () => {
    const map = await loadRequirementDispositions(REPO_ROOT);
    expect(map.size).toBe(25);
    expect(map.get('M11')).toEqual({ disposition: 'mapped-with-evidence', note: expect.any(String) });
  });
});

describe('reqBelongsToMilestone (REQ-DEI-10 AC-1)', () => {
  it('REQ-M11-5 and REQ-M11-6 map to M11 (new evidence-backed overrides)', () => {
    expect(reqBelongsToMilestone('REQ-M11-5', 'M11')).toBe(true);
    expect(reqBelongsToMilestone('REQ-M11-6', 'M11')).toBe(true);
  });

  it('regression: existing overrides and scoping are unchanged', () => {
    expect(reqBelongsToMilestone('REQ-M11-1', 'M11')).toBe(true);
    expect(reqBelongsToMilestone('REQ-M11-5', 'M12')).toBe(false);
  });
});
