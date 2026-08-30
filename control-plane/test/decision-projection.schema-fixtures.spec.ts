/**
 * decision-projection.schema-fixtures.spec.ts
 *
 * cp-decisions schema round-trip and fixture validation tests.
 *
 * Validates:
 *   1. cp-decisions.json (snapshot-valid fixture) passes schema validation
 *   2. decision-silver-key.yaml round-trips to a Decision with the same fields
 *   3. An invalid status enum value is rejected by the schema
 *
 * Uses:
 *   - golden/control-plane/snapshot-valid/projections/cp-decisions.json
 *   - golden/control-plane/project-valid/decision-silver-key.yaml
 */
import { describe, it, expect } from 'vitest';
import { schemaIdFor, validate } from '../src/schema/registry';
import { loadFixtureText, parseYaml } from './support/fixtures';

describe('cp-decisions schema — fixture validation', () => {
  const FIXTURE_JSON = 'snapshot-valid/projections/cp-decisions.json';
  const FIXTURE_YAML = 'project-valid/decision-silver-key.yaml';

  it('cp-decisions.json fixture validates with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(FIXTURE_JSON));
    const dispatch = schemaIdFor(doc);
    expect(dispatch).not.toBeNull();
    expect(dispatch!.source).toBe('const');
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('decision-silver-key.yaml fixture has correct schema const', () => {
    const doc = parseYaml(loadFixtureText(FIXTURE_YAML)) as Record<string, unknown>;
    const dispatch = schemaIdFor(doc);
    expect(dispatch).not.toBeNull();
    expect(dispatch!.source).toBe('const');
  });

  it('decision-silver-key.yaml round-trips to a Decision with same field values', () => {
    const doc = parseYaml(loadFixtureText(FIXTURE_YAML)) as {
      schema: string;
      generatedAt: string;
      sourceRevision: string;
      decisions: Array<{
        id: string;
        sceneRef: string;
        status: string;
        rationale: string;
        replaces: string | null;
      }>;
    };
    const result = validate(doc);
    expect(result.valid).toBe(true);

    const decision = doc.decisions[0];
    expect(decision.id).toBe('dec-silver-key');
    expect(decision.sceneRef).toBe('scene-silver-key');
    expect(decision.status).toBe('accepted');
    expect(decision.rationale).toContain('Llave plateada');
    expect(decision.replaces).toBeNull();
  });

  it('rejects invalid status enum value', () => {
    const doc = JSON.parse(loadFixtureText(FIXTURE_JSON));
    // Mutate the first decision's status to an invalid value
    (doc.decisions as Array<Record<string, unknown>>)[0]!.status = 'invalid-status';
    const result = validate(doc);
    expect(result.valid).toBe(false);
  });

  it('rejects extra fields on decision objects (additionalProperties: false)', () => {
    const doc = JSON.parse(loadFixtureText(FIXTURE_JSON));
    // Add an extra field not in the schema
    (doc.decisions as Array<Record<string, unknown>>)[0]!.extraField = 'not allowed';
    const result = validate(doc);
    expect(result.valid).toBe(false);
  });

  it('accepts null replaces field (replaces is nullable)', () => {
    const doc = JSON.parse(loadFixtureText(FIXTURE_JSON));
    // Ensure first decision has null replaces
    (doc.decisions as Array<Record<string, unknown>>)[0]!.replaces = null;
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('accepts string replaces field', () => {
    const doc = JSON.parse(loadFixtureText(FIXTURE_JSON));
    // Set replaces to a string (referencing another decision id)
    (doc.decisions as Array<Record<string, unknown>>)[0]!.replaces = 'dec-001';
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('rejects missing required fields', () => {
    const doc = {
      schema: 'control-plane/decisions/v1',
      generatedAt: '2026-01-01T00:00:00Z',
      sourceRevision: 'abc123',
      decisions: [
        {
          // missing: id, sceneRef, status, rationale
          id: 'dec-test',
          // missing others
        },
      ],
    };
    const result = validate(doc);
    expect(result.valid).toBe(false);
  });
});
