import { describe, expect, it } from 'vitest';
import { canonicalJson, semanticCompare, sha256 } from '../src/util/canonical.ts';
import { redactSecrets } from '../src/util/redact.ts';

describe('canonicalJson', () => {
  it('sorts keys recursively and normalizes NFC', () => {
    const value = { b: { d: 1, c: 2 }, a: [{ y: 'ñ'.normalize('NFD'), x: 1 }] };
    expect(canonicalJson(value)).toBe(
      '{"a":[{"x":1,"y":"ñ"}],"b":{"c":2,"d":1}}',
    );
  });

  it('is stable across key order', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});

describe('sha256', () => {
  it('matches known digest', () => {
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('semanticCompare', () => {
  it('detects real differences', () => {
    const diff = semanticCompare({ a: 1 }, { a: 2 });
    expect(diff.equal).toBe(false);
    expect(diff.differences).toHaveLength(1);
  });

  it('ignores only declared paths, but lists them', () => {
    const ignored = [{ path: 'createdAt', reason: 'timestamp' }];
    const diff = semanticCompare(
      { createdAt: '2026-01-01', id: 'x' },
      { createdAt: '2026-02-02', id: 'x' },
      ignored,
    );
    expect(diff.equal).toBe(true);
    expect(diff.differences).toHaveLength(1);
    expect(diff.differences[0]?.ignored).toBe(true);
  });

  it('handles nested and array differences', () => {
    const diff = semanticCompare(
      { project: { profiles: ['a'] } },
      { project: { profiles: ['a', 'b'] } },
    );
    expect(diff.equal).toBe(false);
    expect(diff.differences[0]?.path).toContain('project.profiles');
  });
});

describe('redactSecrets', () => {
  it('redacts KEY=VALUE assignments', () => {
    expect(redactSecrets('GITHUB_TOKEN=abc123 done')).toBe('GITHUB_TOKEN=***REDACTED*** done');
  });

  it('redacts bearer tokens and extra literals', () => {
    expect(redactSecrets('Authorization: Bearer abc.def-ghi')).toBe(
      'Authorization: ***REDACTED***',
    );
    expect(redactSecrets('password hunter2', ['hunter2'])).toBe('password ***REDACTED***');
  });
});
