import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Waiver {
  id: string;
  requirement: string;
  reason: string;
  scope: string;
  owner: string;
  evidence: string[];
}

export class WaiverValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaiverValidationError';
  }
}

const REQUIRED_FIELDS: Array<keyof Waiver> = ['id', 'requirement', 'reason', 'scope', 'owner', 'evidence'];

export function validateWaiver(raw: unknown, source: string): Waiver {
  const w = raw as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    const value = w[field];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
      throw new WaiverValidationError(
        `${source}: waiver is missing required field "${field}" (VAH waiver model: id/requirement/reason/scope/owner/evidence)`,
      );
    }
  }
  return {
    id: String(w.id),
    requirement: String(w.requirement),
    reason: String(w.reason),
    scope: String(w.scope),
    owner: String(w.owner),
    evidence: (w.evidence as unknown[]).map(String),
  };
}

/**
 * Load waivers from verification/traceability/waivers.json.
 * Absent file → no waivers. Present but malformed → hard error (never silently ignored).
 */
export async function loadWaivers(verificationRoot: string): Promise<Waiver[]> {
  const path = join(verificationRoot, 'traceability', 'waivers.json');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new WaiverValidationError(`${path}: waivers file must be a JSON array`);
  }
  const waivers = parsed.map((entry) => validateWaiver(entry, path));
  const ids = new Set<string>();
  for (const waiver of waivers) {
    if (ids.has(waiver.id)) throw new WaiverValidationError(`${path}: duplicate waiver id ${waiver.id}`);
    ids.add(waiver.id);
  }
  return waivers;
}

export function findWaiver(waivers: Waiver[], id: string): Waiver | undefined {
  return waivers.find((w) => w.id === id);
}
