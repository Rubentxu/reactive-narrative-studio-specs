/**
 * Combined client-side validation of a shot plan: the same closed JSON Schema
 * contract the CLI enforces, then the same physics gates — so the web view and
 * the command line can never disagree about whether a shot is possible.
 */

import { parse } from 'yaml';
import shotPlanSchema from '../../../../specs/shot-plan.schema.json';
import { ajv } from '../../schema/ajv';
import { evaluateCameraGates, type CameraViolation, type ShotPlan } from './camera';

export interface ValidationOutcome {
  parseError: string | null;
  schemaErrors: CameraViolation[];
  gateViolations: CameraViolation[];
}

interface AjvError {
  instancePath: string;
  message?: string;
}

const validateSchema = ajv.compile(shotPlanSchema);

function ajvErrorsToViolations(errors: AjvError[] | null | undefined): CameraViolation[] {
  return (errors ?? []).map((error) => ({
    path: `$${error.instancePath}`,
    message: error.message ?? 'schema violation',
  }));
}

export function validatePlan(yamlText: string): ValidationOutcome {
  let document: unknown;
  try {
    document = parse(yamlText);
  } catch (error) {
    return { parseError: String(error), schemaErrors: [], gateViolations: [] };
  }
  if (!validateSchema(document)) {
    return {
      parseError: null,
      schemaErrors: ajvErrorsToViolations(validateSchema.errors),
      gateViolations: [],
    };
  }
  const plan = document as unknown as ShotPlan;
  return {
    parseError: null,
    schemaErrors: [],
    gateViolations: evaluateCameraGates(plan),
  };
}

export type { ShotPlan, CameraViolation };
