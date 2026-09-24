/**
 * validate — ajv validation of adapter output against the committed
 * specs/sequential-ir.schema.json (REQ-SA-1).
 */

import { ajv } from '../../schema/ajv';
import sequentialIrSchema from '../../../../specs/sequential-ir.schema.json';
import type { SequentialIrDoc } from './types.ts';

let validator: ((doc: unknown) => boolean) | null = null;

export function validateSequentialIr(doc: unknown): { ok: boolean; errors: string[] } {
  if (!validator) {
    validator = ajv.compile(sequentialIrSchema);
  }
  const ok = validator(doc) as boolean;
  const errors = ok ? [] : ['schema validation failed'];
  return { ok, errors };
}

export function isSequentialIrDoc(doc: unknown): doc is SequentialIrDoc {
  return validateSequentialIr(doc).ok;
}
