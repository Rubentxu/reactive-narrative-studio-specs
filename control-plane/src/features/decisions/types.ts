/**
 * Decisions feature types — M17 write-capable control plane.
 *
 * CommandRecord is the OUTBOUND decision-command artifact written by the
 * /decisions view (schema control-plane/commands/v1, see
 * specs/cp-commands.schema.json). Deliberately closed: the payload union
 * mirrors the per-kind payload branches of the schema.
 */

export type CommandKind = 'approve' | 'reject' | 'comment' | 'regenerate';
export type RegenerationScope = 'scene' | 'chapter' | 'edition';

export type CommandPayload =
  | { subjectDecision?: string; rationale?: string }
  | { text: string }
  | { reason: string; scope?: RegenerationScope };

export interface CommandRecord {
  schema: 'control-plane/commands/v1';
  id: string;
  command: CommandKind;
  targetRef: string;
  createdAt: string;
  origin: string;
  payload: CommandPayload;
}
