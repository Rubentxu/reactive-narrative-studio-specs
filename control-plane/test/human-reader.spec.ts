/**
 * human-reader.spec.ts — M11 unit tests (UAT-M11-01).
 *
 * Requirements: REQ-M11-1 (no required PII field), REQ-M11-2 (JSONL round
 * report linked to the revision decision), REQ-M11-3 (anonymous ids; no
 * persistence beyond sessionStorage), REQ-M11-4 (human/synthetic separation).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntry, roundReportToJsonl, parseJsonl, FEEDBACK_SCHEMA } from '../src/features/human-reader/feedbackSerializer';
import { getOrCreateReaderId, newRoundId } from '../src/features/human-reader/readerId';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const FEATURE_DIR = join(REPO_ROOT, 'control-plane/src/features/human-reader');

describe('feedback entry (REQ-M11-1, REQ-M11-2, REQ-M11-4)', () => {
  it('an empty form yields a valid entry with no PII fields', () => {
    const entry = buildEntry({ roundId: 'r1', readerId: 'a'.repeat(16) });
    expect(entry.schema).toBe(FEEDBACK_SCHEMA);
    expect(entry.source).toBe('human-reader');
    expect(entry.roundId).toBe('r1');
    expect(entry.readerId).toBe('a'.repeat(16));
    expect(typeof entry.submittedAt).toBe('string');
    // no optional field is required — and no PII key exists at all
    for (const forbidden of ['name', 'email', 'address', 'birthday', 'phone']) {
      expect(Object.keys(entry)).not.toContain(forbidden);
    }
  });

  it('carries the revision-decision link (revisionImpact + manuscriptRevision)', () => {
    const entry = buildEntry({
      roundId: 'r2',
      readerId: 'b'.repeat(16),
      revisionImpact: 'major',
      manuscriptRevision: 'draft-v3',
    });
    expect(entry.revisionImpact).toBe('major');
    expect(entry.manuscriptRevision).toBe('draft-v3');
  });

  it('serializes one JSONL line per entry and round-trips', () => {
    const entries = [
      buildEntry({ roundId: 'r1', readerId: 'c'.repeat(16), likert: { pacing: 5, clarity: 4 } }),
      buildEntry({ roundId: 'r2', readerId: 'c'.repeat(16), freeTextHighlights: ['a', 'b'] }),
    ];
    const jsonl = roundReportToJsonl(entries);
    expect(jsonl.endsWith('\n')).toBe(true);
    expect(jsonl.trim().split('\n')).toHaveLength(2);
    expect(parseJsonl(jsonl)).toEqual(entries);
  });

  it('caps free-text highlights and drops blank revisions', () => {
    const entry = buildEntry({
      roundId: 'r3',
      readerId: 'd'.repeat(16),
      freeTextHighlights: Array.from({ length: 15 }, (_, i) => `h${i}`),
      manuscriptRevision: '   ',
    });
    expect(entry.freeTextHighlights).toHaveLength(10);
    expect(entry.manuscriptRevision).toBeUndefined();
  });

  it('does not invent likert when empty', () => {
    const entry = buildEntry({ roundId: 'r4', readerId: 'e'.repeat(16), likert: {} });
    expect(entry.likert).toBeUndefined();
  });
});

describe('anonymous reader identity (REQ-M11-3)', () => {
  function fakeStorage(): Storage {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  }

  it('generates a hex-only id and reuses it within the session', () => {
    const storage = fakeStorage();
    const first = getOrCreateReaderId(storage);
    const second = getOrCreateReaderId(storage);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(second).toBe(first);
  });

  it('round ids are unique hex tokens', () => {
    const a = newRoundId();
    const b = newRoundId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe('feature isolation (REQ-M11-3, REQ-M11-4)', () => {
  it('does not use fetch, IndexedDB/Dexie/Orama, localStorage or the projection store', () => {
    const files = readdirSync(FEATURE_DIR).filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    // Comments may mention prohibited APIs when explaining the constraints;
    // strip // and /** */ comment content before the token check.
    const stripComments = (source: string): string =>
      source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, ''))
        .join('\n');
    for (const file of files) {
      const code = stripComments(readFileSync(join(FEATURE_DIR, file), 'utf8'));
      for (const forbidden of ['fetch(', 'indexedDB', 'Dexie', 'dexie', 'orama', 'Orama', 'localStorage', 'useProjectionStore']) {
        expect(code, `${file} must not reference ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
