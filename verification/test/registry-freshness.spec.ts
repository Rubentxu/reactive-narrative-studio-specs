import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { checkRegistryFreshness } from '../src/audit/audit.ts';

// Requirements: REQ-DEI-7 — the audit gate must refuse to emit evidence when
// the canonical registry on disk describes another revision (freshness guard,
// FAIL decision, scope: audit all).
describe('checkRegistryFreshness (REQ-DEI-7)', () => {
  async function tempVerificationRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'rns-fresh-'));
    await mkdir(join(root, 'traceability'), { recursive: true });
    return root;
  }

  it('stale registry on disk → fresh: false with the disk gitSha', async () => {
    const root = await tempVerificationRoot();
    await writeFile(
      join(root, 'traceability', 'registry.json'),
      JSON.stringify({ schemaVersion: 'traceability-registry/v1', gitSha: 'a'.repeat(40) }),
      'utf8',
    );
    const result = await checkRegistryFreshness(root, 'b'.repeat(40));
    expect(result).toEqual({ fresh: false, diskGitSha: 'a'.repeat(40) });
  });

  it('registry matching HEAD → fresh: true', async () => {
    const root = await tempVerificationRoot();
    await writeFile(
      join(root, 'traceability', 'registry.json'),
      JSON.stringify({ gitSha: 'b'.repeat(40) }),
      'utf8',
    );
    const result = await checkRegistryFreshness(root, 'b'.repeat(40));
    expect(result.fresh).toBe(true);
    expect(result.diskGitSha).toBe('b'.repeat(40));
  });

  it('missing registry.json → fresh: false with the (missing) sentinel', async () => {
    const root = await tempVerificationRoot();
    const result = await checkRegistryFreshness(root, 'b'.repeat(40));
    expect(result).toEqual({ fresh: false, diskGitSha: '(missing)' });
  });

  it('malformed registry.json is a hard error (no silent downgrade)', async () => {
    const root = await tempVerificationRoot();
    await writeFile(join(root, 'traceability', 'registry.json'), '{not json', 'utf8');
    await expect(checkRegistryFreshness(root, 'b'.repeat(40))).rejects.toThrow(/registry\.json/);
  });

  it('only reads gitSha: extra fields of the real registry schema are tolerated', async () => {
    const root = await tempVerificationRoot();
    await writeFile(
      join(root, 'traceability', 'registry.json'),
      JSON.stringify({
        schemaVersion: 'traceability-registry/v1',
        generatedAt: '2026-10-01T00:00:00.000Z',
        gitSha: 'c'.repeat(40),
        milestones: [{ id: 'M11', uats: [], requirements: [] }],
        brokenReferences: [],
        waivers: [],
        gaps: [],
        coverage: { requirements: 0, mapped: 0, unmapped: 0, uats: 0, executable: 0, waived: 0 },
      }),
      'utf8',
    );
    const result = await checkRegistryFreshness(root, 'c'.repeat(40));
    expect(result.fresh).toBe(true);
  });

  it('registry without a gitSha string is a hard error', async () => {
    const root = await tempVerificationRoot();
    await writeFile(join(root, 'traceability', 'registry.json'), JSON.stringify({ generatedAt: 'x' }), 'utf8');
    await expect(checkRegistryFreshness(root, 'b'.repeat(40))).rejects.toThrow(/gitSha/);
  });
});
