/**
 * buildCommandRecord — pure factory for outbound decision-command records (M17).
 *
 * Deterministic by construction: the caller may inject `now` (ISO timestamp
 * source) and `id`; defaults derive the id from the createdAt timestamp and
 * the command kind. No I/O, no store access.
 */

import type { CommandKind, CommandPayload, CommandRecord } from './types';

export const COMMANDS_SCHEMA = 'control-plane/commands/v1' as const;
export const DEFAULT_COMMAND_ORIGIN = 'control-plane/m17';

export interface BuildCommandRecordInput {
  command: CommandKind;
  targetRef: string;
  payload: CommandPayload;
  /** Explicit record id (e.g. injected by tests for determinism). */
  id?: string;
  /** ISO timestamp source; defaults to the current wall clock. */
  now?: () => string;
  /** Origin tag; defaults to 'control-plane/m17'. */
  origin?: string;
}

/** Compact UTC stamp: ISO string with every non-alphanumeric removed
 * (e.g. '2026-09-25T10:30:45.123Z' → '20260925T103045123Z'). */
export function compactUtc(date: Date): string {
  return date.toISOString().replace(/[^A-Za-z0-9]/g, '');
}

export function buildCommandRecord(input: BuildCommandRecordInput): CommandRecord {
  const createdAt = input.now ? input.now() : new Date().toISOString();
  const id = input.id ?? `cmd-${compactUtc(new Date(createdAt))}-${input.command}`;
  return {
    schema: COMMANDS_SCHEMA,
    id,
    command: input.command,
    targetRef: input.targetRef,
    createdAt,
    origin: input.origin ?? DEFAULT_COMMAND_ORIGIN,
    payload: input.payload,
  };
}
