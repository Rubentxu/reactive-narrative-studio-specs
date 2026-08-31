/**
 * cp-decisions-schema.spec.ts — additional schema boundary tests.
 *
 * These tests complement decision-projection.schema-fixtures.spec.ts with
 * additional schema boundary cases that are not covered by fixture round-trips.
 *
 * Deviation note (block3-schema-location):
 *   The cp-decisions schema lives at `specs/cp-decisions.schema.json`
 *   (confirmed by V1 pre-flight check). This is a deviation from the design
 *   intent of having it at `control-plane/src/schema/cp-decisions.schema.json`
 *   (design §D15). The schema is correctly loaded via import.meta.glob
 *   from specs/ and these tests reference the actual schema location.
 */
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { CP_DECISIONS_ID } from '../src/schema/registry';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_PATH = resolve(process.cwd(), '../specs/cp-decisions.schema.json');
const rawSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8')) as Record<string, unknown>;
// Strip $schema to avoid AJV needing the meta-schema URI (only needed for schema validation, not sub-schema resolution)
delete rawSchema['$schema'];
const cpDecisionsSchema = rawSchema as object;

// Build a fresh AJV instance for isolated boundary testing
const ajvBoundary = new Ajv({ allErrors: true, strict: false });
addFormats(ajvBoundary);
ajvBoundary.addSchema(cpDecisionsSchema, CP_DECISIONS_ID);

function validateAgainstCpDecisions(doc: unknown) {
  const validate = ajvBoundary.getSchema(CP_DECISIONS_ID);
  if (!validate) throw new Error(`Schema ${CP_DECISIONS_ID} not registered`);
  const valid = validate(doc as object);
  return { valid: valid as boolean, errors: validate.errors ?? [] };
}

describe('cp-decisions schema — boundary tests', () => {
  it('accepts minimal valid document with all required fields', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-minimal',
          action: 'Take initial action',
          targetRef: 'Scene:demo/scene-001',
          date: '2026-01-01T00:00:00Z',
          status: 'pending',
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(true);
  });

  it('rejects unknown status value', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-status',
          action: 'Test action',
          targetRef: 'Scene:demo/scene-001',
          date: '2026-01-01T00:00:00Z',
          status: 'maybe-accepted',
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath?.includes('status'))).toBe(true);
  });

  it('rejects extra top-level field (additionalProperties: false)', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [],
      extraField: 'should be rejected',
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
  });

  it('rejects extra field inside a decision object', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-extra',
          action: 'Valid action',
          targetRef: 'Scene:demo/scene-001',
          date: '2026-01-01T00:00:00Z',
          status: 'accepted',
          unauthorized: 'not allowed',
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
  });

  it('replaces field accepts null (nullable)', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-null-replaces',
          action: 'First action',
          targetRef: 'Scene:demo/scene-001',
          date: '2026-01-01T00:00:00Z',
          status: 'accepted',
          replaces: null,
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(true);
  });

  it('replaces field accepts string', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-string-replaces',
          action: 'Superseded action',
          targetRef: 'Scene:demo/scene-002',
          date: '2026-01-01T00:00:00Z',
          status: 'superseded',
          replaces: 'dec-001',
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(true);
  });

  it('rejects replaces field with number (wrong type)', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          id: 'dec-bad-replaces',
          action: 'Bad action',
          targetRef: 'Scene:demo/scene-001',
          date: '2026-01-01T00:00:00Z',
          status: 'accepted',
          replaces: 42 as unknown as string | null,
        },
      ],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
  });

  it('accepts empty decisions array (no minItems constraint)', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(true);
  });

  it('rejects missing schema field', () => {
    const doc = {
      // schema: 'control-plane/decisions/v1', // missing
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid generatedAt format (not ISO datetime)', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: 'not-a-date',
      sourceRevision: 'abc123',
      decisions: [],
    };
    const result = validateAgainstCpDecisions(doc);
    expect(result.valid).toBe(false);
  });
});
