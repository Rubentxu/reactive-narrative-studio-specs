/**
 * validateCommandRecord — AJV boundary for outbound decision-command records.
 *
 * Validates through the schema registry (specs/cp-commands.schema.json is
 * registered there via import.meta.glob under CP_COMMANDS_ID, dispatched by
 * the schema const 'control-plane/commands/v1'). Returns AJV error messages;
 * an empty array means the record is valid.
 */

import type { ErrorObject } from 'ajv/dist/2020';
import { schemaIdFor, get } from '../../schema/registry';

/** Human-readable AJV error line: "<instancePath>: <message>". */
function formatError(error: ErrorObject): string {
  const path = error.instancePath.length > 0 ? error.instancePath : '/';
  return `${path}: ${error.message ?? 'is invalid'}`;
}

export function validateCommandRecord(record: unknown): string[] {
  const dispatch = schemaIdFor(record);
  if (!dispatch || dispatch.source !== 'const') {
    return ["schema: record must declare schema const 'control-plane/commands/v1'"];
  }
  const validator = get(dispatch.id);
  const valid = validator(record);
  if (valid) return [];
  return (validator.errors ?? []).map(formatError);
}
