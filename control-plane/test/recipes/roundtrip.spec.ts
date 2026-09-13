/**
 * roundtrip.spec.ts — canonicalization unit tests (TypeScript side).
 *
 * PR-5, M10.2.1: this file previously claimed to be a "cross-language equivalence
 * oracle" while comparing a hand-written manifest against itself — a false-green
 * identified by the Verification & Audit Harness (it never executed the recipe
 * render nor the Python runtime).
 *
 * The REAL cross-language equivalence (CLI ↔ UI, both runtimes executing for
 * real) is owned by scenario SCN-M10-04-001 in verification/scenarios/, run by
 * the Verification & Audit Harness (`pnpm --dir verification uat all`).
 *
 * What remains here are honest unit-level guarantees of canonicalJson itself.
 */

import { describe, it, expect } from 'vitest';
import { canonicalJson, canonicalJsonEqual, stripRecipeOwned } from '../../src/recipes/equivalenceOracle';

describe('canonicalJson — unit guarantees', () => {
  it('is deterministic across key insertion order (recursive sort)', () => {
    const a = { project: { packs: ['x'], profiles: ['y'] }, id: 1 };
    const b = { id: 1, project: { profiles: ['y'], packs: ['x'] } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('sorts NESTED keys (regression: top-level-only sort masked divergence)', () => {
    // The pre-PR-3 implementation only sorted top-level keys, so nested objects
    // kept insertion order and diverged from the Python canonicalizer.
    const a = { outer: { b: 1, a: 2 } };
    const b = { outer: { a: 2, b: 1 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('canonicalJsonEqual semantics', () => {
    expect(canonicalJsonEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(canonicalJsonEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('different values produce different canonical JSON', () => {
    expect(canonicalJson({ id: 'foo' })).not.toBe(canonicalJson({ id: 'bar' }));
  });
});

describe('stripRecipeOwned — unit guarantees', () => {
  it('keeps recipe-owned fields and strips metadata', () => {
    const manifest = {
      id: 'x',
      createdAt: '2026-01-01T00:00:00.000Z',
      audience: { profile: 'p' },
      format: { type: 'novel', illustrated: true },
      publishing: { target: 'print-pdf' },
      initialGoals: ['a'],
      project: {
        profiles: ['p'],
        packs: ['pk'],
        skills: ['s'],
        publishingTargets: ['print-pdf'],
        nonOwned: 'drop-me',
      },
    };
    const stripped = stripRecipeOwned(manifest);
    expect(stripped).toEqual({
      audience: { profile: 'p' },
      format: { type: 'novel', illustrated: true },
      publishing: { target: 'print-pdf' },
      initialGoals: ['a'],
      project: { profiles: ['p'], packs: ['pk'], skills: ['s'], publishingTargets: ['print-pdf'] },
    });
  });
});
