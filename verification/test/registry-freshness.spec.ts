import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { checkRegistryFreshness } from '../src/audit/audit.ts';
import type { TraceabilityRegistry } from '../src/traceability/build.ts';

// Requirements: REQ-DEI-7 — the audit gate must refuse to emit evidence when
// the canonical registry on disk no longer matches a rebuild at HEAD
// (freshness guard, FAIL decision, scope: audit all).
//
// Amended semantics: a committed registry can never record the sha of the
// commit that contains it (self-reference), so freshness is CONTENT equality
// against the in-memory rebuild, ignoring the volatile provenance fields
// (gitSha, generatedAt). Content drift still fails the gate.
describe('checkRegistryFreshness (REQ-DEI-7)', () => {
  const headRegistry = (overrides: Record<string, unknown> = {}): TraceabilityRegistry =>
    ({
      schemaVersion: 'traceability-registry/v1',
      generatedAt: '2026-10-01T00:00:00.000Z',
      gitSha: 'b'.repeat(40),
      milestones: [{ id: 'M11', uats: [], requirements: [] }],
      brokenReferences: [],
      waivers: [],
      gaps: [],
      coverage: { requirements: 0, mapped: 0, unmapped: 0, uats: 0, executable: 0, waived: 0 },
      ...overrides,
    }) as unknown as TraceabilityRegistry;

  async function writeDiskRegistry(root: string, registry: unknown): Promise<void> {
    await writeFile(join(root, 'traceability', 'registry.json'), JSON.stringify(registry), 'utf8');
  }

  async function tempVerificationRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'rns-fresh-'));
    await mkdir(join(root, 'traceability'), { recursive: true });
    return root;
  }

  it('content drift on disk → fresh: false with the disk gitSha', async () => {
    const root = await tempVerificationRoot();
    const disk = headRegistry({
      gitSha: 'a'.repeat(40),
      coverage: { requirements: 3, mapped: 0, unmapped: 3, uats: 0, executable: 0, waived: 0 },
    });
    await writeDiskRegistry(root, disk);
    const result = await checkRegistryFreshness(root, headRegistry());
    expect(result.fresh).toBe(false);
    expect(result.diskGitSha).toBe('a'.repeat(40));
  });

  it('same content with different gitSha/generatedAt (regen-commit offset) → fresh: true', async () => {
    const root = await tempVerificationRoot();
    // The committed registry was regenerated one commit before HEAD: its
    // provenance fields differ, its content does not — this is the normal
    // fresh state (the regen commit can never contain its own sha).
    const disk = headRegistry({ gitSha: 'a'.repeat(40), generatedAt: '2026-09-30T00:00:00.000Z' });
    await writeDiskRegistry(root, disk);
    const result = await checkRegistryFreshness(root, headRegistry());
    expect(result.fresh).toBe(true);
    expect(result.diskGitSha).toBe('a'.repeat(40));
  });

  it('extra milestone in the head rebuild (new code at HEAD) → fresh: false', async () => {
    const root = await tempVerificationRoot();
    await writeDiskRegistry(root, headRegistry({ gitSha: 'a'.repeat(40) }));
    const head = headRegistry({
      milestones: [
        { id: 'M11', uats: [], requirements: [] },
        { id: 'M17', uats: [], requirements: [] },
      ],
    });
    const result = await checkRegistryFreshness(root, head);
    expect(result.fresh).toBe(false);
  });

  it('missing registry.json → fresh: false with the (missing) sentinel', async () => {
    const root = await tempVerificationRoot();
    const result = await checkRegistryFreshness(root, headRegistry());
    expect(result).toEqual({ fresh: false, diskGitSha: '(missing)' });
  });

  it('malformed registry.json is a hard error (no silent downgrade)', async () => {
    const root = await tempVerificationRoot();
    await writeFile(join(root, 'traceability', 'registry.json'), '{not json', 'utf8');
    await expect(checkRegistryFreshness(root, headRegistry())).rejects.toThrow(/registry\.json/);
  });

  it('registry without a gitSha string is a hard error', async () => {
    const root = await tempVerificationRoot();
    await writeDiskRegistry(root, { generatedAt: 'x' });
    await expect(checkRegistryFreshness(root, headRegistry())).rejects.toThrow(/gitSha/);
  });
});
