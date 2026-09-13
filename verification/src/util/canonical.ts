import { createHash } from 'node:crypto';

/**
 * Canonical JSON: NFC-normalized, recursively key-sorted, deterministic separators.
 * This is the Harness's own independent canonicalizer — production canonicalizers
 * (TS and Python) are audited against this behavior, never trusted (VAH-012).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') return value.normalize('NFC');
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key.normalize('NFC')] = canonicalize(record[key]);
  }
  return out;
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export interface IgnoredPath {
  path: string;
  reason: string;
}

export interface SemanticDiff {
  equal: boolean;
  differences: Array<{ path: string; expected: string; actual: string; ignored: boolean }>;
}

/**
 * Parse a dotted path like `project.profiles[0].id` against a JSON value.
 */
function resolvePath(value: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = value;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const arrayMatch = /^(.*?)\[(\d+)\]$/.exec(part);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key ?? ''];
      if (Array.isArray(current)) current = current[Number(index)];
      else return undefined;
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

function collectDifferences(
  expected: unknown,
  actual: unknown,
  path: string,
  ignored: IgnoredPath[],
  out: SemanticDiff['differences'],
): void {
  const ignoredPaths = new Set(ignored.map((i) => i.path));
  if (canonicalJson(expected) === canonicalJson(actual)) return;

  const bothObjects =
    typeof expected === 'object' && typeof actual === 'object' &&
    expected !== null && actual !== null &&
    !Array.isArray(expected) && !Array.isArray(actual);

  if (bothObjects) {
    const keys = new Set([
      ...Object.keys(expected as object),
      ...Object.keys(actual as object),
    ]);
    for (const key of keys) {
      collectDifferences(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
        ignored,
        out,
      );
    }
    return;
  }

  const bothArrays = Array.isArray(expected) && Array.isArray(actual);
  if (bothArrays) {
    const length = Math.max(expected.length, actual.length);
    for (let i = 0; i < length; i++) {
      collectDifferences(expected[i], actual[i], `${path}[${i}]`, ignored, out);
    }
    return;
  }

  out.push({
    path,
    expected: JSON.stringify(expected ?? null),
    actual: JSON.stringify(actual ?? null),
    ignored: ignoredPaths.has(path),
  });
}

/**
 * Semantic JSON comparison with explicitly declared ignored paths (VAH-013).
 * A difference on an ignored path does not flip `equal`, but it is still listed
 * with `ignored: true` so reviewers see exactly what was normalized away.
 */
export function semanticCompare(
  expected: unknown,
  actual: unknown,
  ignored: IgnoredPath[] = [],
): SemanticDiff {
  const differences: SemanticDiff['differences'] = [];
  collectDifferences(expected, actual, '', ignored, differences);
  return {
    equal: differences.every((d) => d.ignored),
    differences,
  };
}

export { resolvePath };
