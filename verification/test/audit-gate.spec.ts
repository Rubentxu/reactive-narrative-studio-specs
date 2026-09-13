import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  deriveRequirementStatus,
  loadRequirementLevels,
  milestoneRange,
} from '../src/audit/audit.ts';
import type { Waiver } from '../src/evidence/waivers.ts';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

// Requirements: REQ-VAH-AUDIT-GATE (status derivation + range),
// REQ-VAH-VERIFICATION-LEVEL (declared levels validation).
describe('audit gate — status derivation (REQ-VAH-AUDIT-GATE)', () => {
  const verdict = (overall: string, scenarioId = 'scn-x') => ({
    runId: `run-${overall}`,
    scenarioId,
    overall,
    requirements: [],
  });
  const waiver: Waiver = {
    id: 'WVR-T',
    requirement: 'REQ-T',
    reason: 'accepted',
    scope: 'test',
    owner: 't',
    evidence: ['e'],
  };

  it('scenario PASS → PROVEN', () => {
    expect(deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [verdict('PASS')], testRefs: [] }).status).toBe('PROVEN');
  });

  it('scenario FAIL without waiver → FAILED (blocking)', () => {
    expect(deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [verdict('FAIL')], testRefs: [] }).status).toBe('FAILED');
  });

  it('scenario FAIL with waiver → WAIVED (never PASS)', () => {
    expect(
      deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [verdict('FAIL')], testRefs: [], waiver }).status,
    ).toBe('WAIVED');
  });

  it('functional requirement with only test refs → PARTIALLY_VERIFIED (blocking, VAH-003)', () => {
    expect(
      deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [], testRefs: ['test/a.spec.ts'] }).status,
    ).toBe('PARTIALLY_VERIFIED');
  });

  it('fitness requirement with test refs → PROVEN at its declared level', () => {
    expect(
      deriveRequirementStatus({ level: 'fitness', scenarioVerdicts: [], testRefs: ['test/a.spec.ts'] }).status,
    ).toBe('PROVEN');
  });

  it('no refs → UNMAPPED; with waiver → WAIVED', () => {
    expect(deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [], testRefs: [] }).status).toBe('UNMAPPED');
    expect(
      deriveRequirementStatus({ level: 'functional', scenarioVerdicts: [], testRefs: [], waiver }).status,
    ).toBe('WAIVED');
  });
});

describe('audit gate — milestone ranges (REQ-VAH-AUDIT-GATE)', () => {
  it('resolves inclusive ranges in canonical order', () => {
    const ids = milestoneRange('M10', 'M10.2');
    expect(ids).toEqual(['M10', 'M10.1', 'M10.2']);
  });
  it('rejects inverted or unknown ranges', () => {
    expect(() => milestoneRange('M10.2', 'M10')).toThrow(/invalid milestone range/);
    expect(() => milestoneRange('M99', 'M10')).toThrow(/invalid milestone range/);
  });
});

describe('requirement levels (REQ-VAH-VERIFICATION-LEVEL)', () => {
  it('the repo levels file is valid and referenced by the audit', async () => {
    const levels = await loadRequirementLevels(join(REPO_ROOT, 'verification'));
    expect(levels.get('REQ-VAH-AUDIT-GATE')?.level).toBe('fitness');
    expect(levels.get('REQ-VAH-BROWSER-AUDIT')?.level).toBe('functional');
    for (const [, cfg] of levels) expect(cfg.rationale.length).toBeGreaterThanOrEqual(10);
  });

  it('rejects invalid levels and missing rationales (hard error)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rns-lvl-'));
    await mkdir(join(root, 'traceability'), { recursive: true });
    const file = join(root, 'traceability', 'requirement-levels.json');

    await writeFile(file, JSON.stringify({ 'REQ-X': { level: 'vibes', rationale: 'because' } }), 'utf8');
    await expect(loadRequirementLevels(root)).rejects.toThrow(/invalid level/);

    await writeFile(file, JSON.stringify({ 'REQ-X': { level: 'fitness', rationale: 'short' } }), 'utf8');
    await expect(loadRequirementLevels(root)).rejects.toThrow(/rationale/);

    await writeFile(file, JSON.stringify({ 'REQ-X': { level: 'fitness', rationale: 'a valid rationale text' } }), 'utf8');
    const ok = await loadRequirementLevels(root);
    expect(ok.get('REQ-X')?.level).toBe('fitness');
  });
});
