/**
 * cp-commands-schema.spec.ts — AJV boundary tests for the M17 outbound
 * decision-command schema (specs/cp-commands.schema.json).
 *
 * Mirrors cp-decisions-schema.spec.ts: fresh AJV instance, the schema is
 * registered under its registry id (CP_COMMANDS_ID) and validated in
 * isolation from the app registry. One valid record per command kind must
 * pass; malformed records of every listed boundary class must fail.
 *
 * Requirements: REQ-M17-1 (schema contract), REQ-M17-2 (approve/reject payload),
 * REQ-M17-3 (comment payload), REQ-M17-4 (regeneration payload),
 * REQ-M17-5 (record validation gate feeding the composer write path).
 */
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { CP_COMMANDS_ID } from '../src/schema/registry';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_PATH = resolve(process.cwd(), '../specs/cp-commands.schema.json');
const rawSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8')) as Record<string, unknown>;
// Strip $schema to avoid AJV needing the meta-schema URI (only needed for schema validation, not sub-schema resolution)
delete rawSchema['$schema'];
const cpCommandsSchema = rawSchema as object;

// Build a fresh AJV instance for isolated boundary testing
const ajvBoundary = new Ajv({ allErrors: true, strict: false });
addFormats(ajvBoundary);
ajvBoundary.addSchema(cpCommandsSchema, CP_COMMANDS_ID);

function validateAgainstCpCommands(doc: unknown) {
  const validate = ajvBoundary.getSchema(CP_COMMANDS_ID);
  if (!validate) throw new Error(`Schema ${CP_COMMANDS_ID} not registered`);
  const valid = validate(doc as object);
  return { valid: valid as boolean, errors: validate.errors ?? [] };
}

const T = '2026-01-01T00:00:00Z';
const REF = 'Scene:demo/scene-001';

describe('cp-commands schema — accepts one valid record per kind', () => {
  it('approve with subjectDecision + rationale', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-001',
      command: 'approve',
      targetRef: REF,
      createdAt: T,
      origin: 'control-plane/m17',
      payload: { subjectDecision: 'silver-key', rationale: 'Anchors the act-1 gate.' },
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('approve minimal (empty payload)', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-002',
      command: 'approve',
      targetRef: REF,
      createdAt: T,
      origin: 'control-plane/m17',
      payload: {},
    });
    expect(result.valid).toBe(true);
  });

  it('reject minimal (empty payload)', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-003',
      command: 'reject',
      targetRef: 'Character:demo/nora',
      createdAt: T,
      origin: 'control-plane/m17',
      payload: {},
    });
    expect(result.valid).toBe(true);
  });

  it('comment with text', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-004',
      command: 'comment',
      targetRef: REF,
      createdAt: T,
      origin: 'control-plane/m17',
      payload: { text: 'Needs a stronger motivation beat.' },
    });
    expect(result.valid).toBe(true);
  });

  it('regenerate with reason', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-005',
      command: 'regenerate',
      targetRef: REF,
      createdAt: T,
      origin: 'control-plane/m17',
      payload: { reason: 'Beat order contradicts the arc.' },
    });
    expect(result.valid).toBe(true);
  });

  it('regenerate with reason + scope', () => {
    const result = validateAgainstCpCommands({
      schema: 'control-plane/commands/v1',
      id: 'cmd-006',
      command: 'regenerate',
      targetRef: REF,
      createdAt: T,
      origin: 'control-plane/m17',
      payload: { reason: 'Beat order contradicts the arc.', scope: 'scene' },
    });
    expect(result.valid).toBe(true);
  });
});

describe('cp-commands schema — boundary rejections', () => {
  const base = {
    schema: 'control-plane/commands/v1',
    id: 'cmd-boundary',
    command: 'comment',
    targetRef: REF,
    createdAt: T,
    origin: 'control-plane/m17',
    payload: { text: 'ok' },
  };

  it('rejects unknown command value', () => {
    const result = validateAgainstCpCommands({ ...base, command: 'publish' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath?.includes('command'))).toBe(true);
  });

  it('rejects targetRef without namespace (Decision:x)', () => {
    const result = validateAgainstCpCommands({ ...base, targetRef: 'Decision:x' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'pattern')).toBe(true);
  });

  it('rejects targetRef with lowercase kind first char', () => {
    const result = validateAgainstCpCommands({ ...base, targetRef: 'scene:demo/scene-001' });
    expect(result.valid).toBe(false);
  });

  it('rejects targetRef with 3 path segments', () => {
    const result = validateAgainstCpCommands({ ...base, targetRef: 'Scene:demo/scene-001/extra' });
    expect(result.valid).toBe(false);
  });

  it('rejects extra top-level field (additionalProperties: false)', () => {
    const result = validateAgainstCpCommands({ ...base, extraField: 'not allowed' });
    expect(result.valid).toBe(false);
  });

  it('rejects extra payload field', () => {
    const result = validateAgainstCpCommands({
      ...base,
      payload: { text: 'ok', unexpected: true },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects comment with missing text', () => {
    const result = validateAgainstCpCommands({ ...base, payload: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'required' && e.params?.missingProperty === 'text')).toBe(true);
  });

  it('rejects comment with empty text', () => {
    const result = validateAgainstCpCommands({ ...base, payload: { text: '' } });
    expect(result.valid).toBe(false);
  });

  it('rejects regenerate with missing reason', () => {
    const result = validateAgainstCpCommands({ ...base, command: 'regenerate', payload: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === 'required' && e.params?.missingProperty === 'reason')).toBe(true);
  });

  it('rejects regenerate with empty reason', () => {
    const result = validateAgainstCpCommands({ ...base, command: 'regenerate', payload: { reason: '' } });
    expect(result.valid).toBe(false);
  });

  it('rejects regenerate with bad scope', () => {
    const result = validateAgainstCpCommands({
      ...base,
      command: 'regenerate',
      payload: { reason: 'drift', scope: 'book' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath?.includes('scope'))).toBe(true);
  });

  it('rejects approve with numeric rationale', () => {
    const result = validateAgainstCpCommands({
      ...base,
      command: 'approve',
      payload: { subjectDecision: 'silver-key', rationale: 42 as unknown as string },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects missing schema const', () => {
    const result = validateAgainstCpCommands({ ...base, schema: 'control-plane/other/v1' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing id and missing origin', () => {
    const { id: _id, ...withoutId } = base;
    expect(validateAgainstCpCommands(withoutId).valid).toBe(false);
    const { origin: _origin, ...withoutOrigin } = base;
    expect(validateAgainstCpCommands(withoutOrigin).valid).toBe(false);
  });

  it('rejects bad createdAt (not ISO date-time)', () => {
    const result = validateAgainstCpCommands({ ...base, createdAt: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath?.includes('createdAt'))).toBe(true);
  });

  it('rejects subjectDecision empty string', () => {
    const result = validateAgainstCpCommands({
      ...base,
      command: 'approve',
      payload: { subjectDecision: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath?.includes('subjectDecision'))).toBe(true);
  });

  it('rejects a payload field belonging to another kind (per-kind closure)', () => {
    // reason is a regenerate-only field: a comment carrying it violates the
    // comment branch's additionalProperties: false.
    const result = validateAgainstCpCommands({ ...base, payload: { text: 'ok', reason: 'drift' } });
    expect(result.valid).toBe(false);
  });
});
