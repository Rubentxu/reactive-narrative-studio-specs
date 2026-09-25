/**
 * cp-projection-schemas.spec.ts — M10 projection-schema contract tests
 * (traceability closure for changes/spec-completion).
 *
 * Requirements:
 * - REQ-CP-001: the 13 declared cp-*.schema.json projection schemas exist
 *   (plus cp-decisions, the later documented decision-projection addition,
 *   and cp-commands, the M17 OUTBOUND artifact schema — envelope-exempt).
 * - REQ-CP-002: every schema pins schema: "control-plane/<type>/v1".
 * - REQ-CP-003: each is reachable from specs/control-plane.schema.json via $ref.
 * - REQ-CP-004: envelope requires generatedAt + sourceRevision.
 * - REQ-CP-005: every schema uses draft/2020-12.
 * - REQ-CP-006: additionalProperties: false at root.
 * - REQ-CP-007: each schema file is cited by ≥1 of the listed prose docs.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const specsDir = join(__dirname, '..', '..', 'specs');
const cpFiles = readdirSync(specsDir).filter((f) => /^cp-.*\.schema\.json$/.test(f)).sort();

/** The 13 schemas from the spec-completion contract. cp-decisions.schema.json
 *  was added afterwards by the decision-projection cycle (see
 *  cp-decisions-schema.spec.ts); the envelope covers it the same way.
 *  cp-commands.schema.json was added by M17 (write-capable control plane) as
 *  an OUTBOUND artifact schema: it is deliberately NOT referenced from
 *  specs/control-plane.schema.json $defs — the envelope describes a loaded
 *  project, while commands are outbound records written by the /decisions
 *  view. It therefore appears in the file count but is exempt from the
 *  envelope reachability (REQ-CP-003), envelope-freshness (REQ-CP-004) and
 *  prose-citation (REQ-CP-007) checks below. */
const EXPECTED_BASE_13 = [
  'cp-assets.schema.json',
  'cp-approvals.schema.json',
  'cp-characters.schema.json',
  'cp-chapters.schema.json',
  'cp-commands.schema.json',
  'cp-costs.schema.json',
  'cp-graph.schema.json',
  'cp-history.schema.json',
  'cp-project.schema.json',
  'cp-progress.schema.json',
  'cp-scm.schema.json',
  'cp-uat.schema.json',
  'cp-visual-quality.schema.json',
  'cp-workflow.schema.json',
  'cp-decisions.schema.json',
].sort();

/** M17 outbound artifact — see the EXPECTED_BASE_13 note above. */
const OUTBOUND_ARTIFACT_SCHEMAS = ['cp-commands.schema.json'];

/** Envelope projection schemas (everything except outbound artifacts). */
const ENVELOPE_PROJECTION_FILES = cpFiles.filter((f) => !OUTBOUND_ARTIFACT_SCHEMAS.includes(f));

function loadSchema(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(specsDir, file), 'utf8'));
}

/** REQ-CP-006 prose permits extension only where explicitly stated; schemas
 *  allowed to stay open are enumerated here from the spec prose. */
const EXTENSION_PERMITTED: string[] = [];

describe('CP projection schema contract (REQ-CP-001..006)', () => {
  it('REQ-CP-001: exactly the declared projection schemas exist (14 + cp-commands outbound artifact)', () => {
    expect(cpFiles).toHaveLength(15);
    expect(cpFiles).toEqual(EXPECTED_BASE_13);
  });

  for (const file of cpFiles) {
    it(`${file}: discriminator, draft, freshness, closed root (REQ-CP-002/004/005/006)`, () => {
      const schema = loadSchema(file);
      // REQ-CP-002: discriminator constant shape control-plane/<type>/v1.
      const props = (schema.properties ?? {}) as Record<string, unknown>;
      const schemaProp = props.schema as Record<string, unknown> | undefined;
      const schemaConst = schemaProp?.const ?? (schemaProp as { enum?: string[] } | undefined)?.enum?.[0];
      expect(schemaConst, 'schema discriminator const').toMatch(/^control-plane\/[a-z-]+\/v1$/);
      // REQ-CP-005: 2020-12 draft.
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      // REQ-CP-004: freshness metadata required at envelope level. Outbound
      // artifact schemas (M17 cp-commands) carry createdAt instead — commands
      // are point-in-time records, not envelope projections.
      const required = (schema.required ?? []) as string[];
      if (OUTBOUND_ARTIFACT_SCHEMAS.includes(file)) {
        expect(required).toContain('createdAt');
      } else {
        expect(required).toContain('generatedAt');
        expect(required).toContain('sourceRevision');
      }
      // REQ-CP-006: closed root unless prose permits extension.
      if (!EXTENSION_PERMITTED.includes(file)) {
        expect(schema.additionalProperties, 'additionalProperties false at root').toBe(false);
      }
    });
  }

  it('REQ-CP-003: every envelope projection is reachable from control-plane.schema.json via $ref', () => {
    const envelope = JSON.parse(readFileSync(join(specsDir, 'control-plane.schema.json'), 'utf8'));
    const envelopeText = JSON.stringify(envelope);
    // Outbound artifact schemas (M17 cp-commands) are deliberately NOT
    // referenced from the envelope — commands are outbound records.
    for (const file of ENVELOPE_PROJECTION_FILES) {
      const schema = loadSchema(file);
      const id = schema.$id as string | undefined;
      expect(id, `${file} declares $id`).toBeTruthy();
      expect(envelopeText).toContain(id ?? '');
      expect(envelopeText).toContain('$ref');
    }
  });

  it('cp-commands is an OUTBOUND artifact — NOT reachable from control-plane.schema.json (M17 negative)', () => {
    const envelope = JSON.parse(readFileSync(join(specsDir, 'control-plane.schema.json'), 'utf8'));
    const envelopeText = JSON.stringify(envelope);
    const commandsSchema = loadSchema('cp-commands.schema.json');
    const id = commandsSchema.$id as string | undefined;
    expect(id).toBe('https://narrative.dev/schemas/cp-commands.schema.json');
    expect(envelopeText, 'envelope must not reference the outbound commands schema by $id').not.toContain(id ?? '');
    expect(envelopeText, 'envelope must not reference the outbound commands schema by file name').not.toContain(
      'cp-commands.schema.json'
    );
  });
});

describe('CP projection prose cross-reference (REQ-CP-007)', () => {
  const docsDir = join(__dirname, '..', '..', 'docs');
  const citingDocs = [
    '13-CONTROL-PLANE.md',
    '14-PUBLISHING.md',
    '15-SCM-PROVENANCE.md',
    '23-OBSERVABILITY-COST.md',
    '29-NARRATIVE-CATALOG.md',
    '33-STUDIO-HOME-WORKBENCH.md',
    '34-CONTROL-PLANE-DATA-CONTRACTS.md',
  ];

  it('each envelope projection schema file is cited by at least one listed doc (by name or family glob)', () => {
    const docTexts = citingDocs.map((d) => {
      try {
        return readFileSync(join(docsDir, d), 'utf8');
      } catch {
        return '';
      }
    });
    // Outbound artifact schemas (M17 cp-commands) are documented through the
    // M17 change set, not the projection prose docs — exempt here.
    for (const file of ENVELOPE_PROJECTION_FILES) {
      const type = file.replace(/^cp-/, '').replace(/\.schema\.json$/, '');
      const cited = docTexts.some((text) => text.includes(file) || text.includes(`specs/cp-${type}`) || text.includes('specs/cp-*.schema.json'));
      expect(cited, `${file} cited in prose`).toBe(true);
    }
  });
});
