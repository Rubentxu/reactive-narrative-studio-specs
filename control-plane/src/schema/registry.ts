import type { ValidateFunction } from 'ajv/dist/2020';
import { ajv } from './ajv';

const cpSchemas = import.meta.glob<{ $id: string; $defs?: object }>(
  '../../../specs/cp-*.schema.json',
  { eager: true, import: 'default' }
) as Record<string, { $id: string; $defs?: object }>;

import catalogEntitySchema from '../../../specs/catalog-entity.schema.json';
import controlPlaneSchema from '../../../specs/control-plane.schema.json';
import controlPlaneExtSchema from '../../../specs/control-plane-extension.schema.json';

export const CP_PROJECT_ID = 'https://narrative.dev/schemas/cp-project.schema.json';
export const CP_CHAPTERS_ID = 'https://narrative.dev/schemas/cp-chapters.schema.json';
export const CP_CHARACTERS_ID = 'https://narrative.dev/schemas/cp-characters.schema.json';
export const CP_ASSETS_ID = 'https://narrative.dev/schemas/cp-assets.schema.json';
export const CP_UAT_ID = 'https://narrative.dev/schemas/cp-uat.schema.json';
export const CP_VISUAL_QUALITY_ID = 'https://narrative.dev/schemas/cp-visual-quality.schema.json';
export const CP_HISTORY_ID = 'https://narrative.dev/schemas/cp-history.schema.json';
export const CP_PROGRESS_ID = 'https://narrative.dev/schemas/cp-progress.schema.json';
export const CP_GRAPH_ID = 'https://narrative.dev/schemas/cp-graph.schema.json';
export const CP_WORKFLOW_ID = 'https://narrative.dev/schemas/cp-workflow.schema.json';
export const CP_SCM_ID = 'https://narrative.dev/schemas/cp-scm.schema.json';
export const CP_COSTS_ID = 'https://narrative.dev/schemas/cp-costs.schema.json';
export const CP_APPROVALS_ID = 'https://narrative.dev/schemas/cp-approvals.schema.json';
// NOTE: CP_DECISIONS_ID — full schema lives in specs/cp-decisions.schema.json.
export const CP_DECISIONS_ID = 'https://narrative.dev/schemas/cp-decisions.schema.json';
// M17 outbound artifact: decision-command records written by the /decisions view.
// Deliberately NOT referenced from specs/control-plane.schema.json $defs — the
// envelope describes a loaded project; commands are outbound records.
export const CP_COMMANDS_ID = 'https://narrative.dev/schemas/cp-commands.schema.json';
export const CATALOG_ENTITY_ID = 'https://narrative.dev/schemas/catalog-entity-v1alpha1.json';
export const CONTROL_PLANE_ID = 'https://narrative.dev/schemas/control-plane-project-v1.json';
export const CONTROL_PLANE_EXT_ID = 'https://narrative.dev/schemas/control-plane-extension-v1.json';

const BY_SCHEMA_CONST: Readonly<Record<string, string>> = {
  'control-plane/project/v1': CP_PROJECT_ID,
  'control-plane/chapters/v1': CP_CHAPTERS_ID,
  'control-plane/characters/v1': CP_CHARACTERS_ID,
  'control-plane/assets/v1': CP_ASSETS_ID,
  'control-plane/uat/v1': CP_UAT_ID,
  'control-plane/visual-quality/v1': CP_VISUAL_QUALITY_ID,
  'control-plane/history/v1': CP_HISTORY_ID,
  'control-plane/progress/v1': CP_PROGRESS_ID,
  'control-plane/graph/v1': CP_GRAPH_ID,
  'control-plane/workflow/v1': CP_WORKFLOW_ID,
  'control-plane/scm/v1': CP_SCM_ID,
  'control-plane/costs/v1': CP_COSTS_ID,
  'control-plane/approvals/v1': CP_APPROVALS_ID,
  'control-plane/decisions/v1': CP_DECISIONS_ID,
  'control-plane/commands/v1': CP_COMMANDS_ID, // M17 outbound artifact
  'control-plane-extension-config/v1': CONTROL_PLANE_EXT_ID,
};

const BY_API_VERSION: Readonly<Record<string, string>> = {
  'narrative.dev/v1alpha1': CATALOG_ENTITY_ID,
};

const schemaById: Map<string, object> = new Map();

for (const [, schema] of Object.entries(cpSchemas)) {
  if (schema.$id) schemaById.set(schema.$id, schema);
}

schemaById.set(CATALOG_ENTITY_ID, catalogEntitySchema as object);
schemaById.set(CONTROL_PLANE_ID, controlPlaneSchema as object);
schemaById.set(CONTROL_PLANE_EXT_ID, controlPlaneExtSchema as object);

for (const [id, schema] of schemaById) {
  ajv.addSchema(schema, id);
}

const lazyValidatorCache: Map<string, ValidateFunction> = new Map();

export function get(id: string): ValidateFunction {
  const cached = lazyValidatorCache.get(id);
  if (cached) return cached;
  const validator = ajv.getSchema(id)!;
  lazyValidatorCache.set(id, validator);
  return validator;
}

export function schemaIdFor(doc: unknown): { id: string; source: 'const' | 'apiVersion' } | null {
  const d = doc as Record<string, unknown>;
  if (typeof d.schema === 'string') {
    const id = BY_SCHEMA_CONST[d.schema];
    if (id) return { id, source: 'const' };
  }
  if (typeof d.apiVersion === 'string') {
    const id = BY_API_VERSION[d.apiVersion];
    if (id) return { id, source: 'apiVersion' };
  }
  return null;
}

export function validate<T>(
  doc: unknown
): { valid: true; data: T } | { valid: false; schemaId: string; errors: object[] } {
  const dispatch = schemaIdFor(doc);
  if (!dispatch) {
    // Deterministic hard error (REQ-DEI-3): a document without a known `schema`
    // const or `apiVersion` cannot be dispatched. The previous behavior iterated
    // schemaById in insertion order and surfaced an arbitrary schema's errors —
    // a non-deterministic diagnostic. Dispatch with schemaIdFor() first.
    return {
      valid: false,
      schemaId: '',
      errors: [
        {
          keyword: 'schema-undispatchable',
          instancePath: '',
          message:
            'document has no known `schema` const or `apiVersion`; dispatch with schemaIdFor() before validate()',
        },
      ],
    };
  }
  const validator = get(dispatch.id);
  const valid = validator(doc);
  if (valid) {
    return { valid: true, data: doc as T };
  }
  return { valid: false, schemaId: dispatch.id, errors: validator.errors ?? [] };
}
