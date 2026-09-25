/**
 * CommandComposer — form that emits ONE outbound decision-command record (M17).
 *
 * Pure component: builds the record via buildCommandRecord, validates it
 * against the cp-commands schema via the registry, and only then hands it to
 * the outbound command sink (File System Access preferred, download
 * fallback). Invalid records are never written — errors render instead.
 *
 * NEVER imports the projection store and never reads the bundle: the record
 * targets come in through props/prefill. No network I/O.
 */

import React, { useEffect, useState } from 'react';
import type { CommandKind, CommandPayload, RegenerationScope } from './types';
import { buildCommandRecord } from './record';
import { downloadCommandSink, fileSystemAccessCommandSink } from './commandSinks';
import { validateCommandRecord } from './validate';

export interface ComposerPrefill {
  command?: CommandKind;
  targetRef?: string;
  subjectDecision?: string;
}

interface CommandComposerProps {
  /** Prefill from a decisions-table row action (undefined = blank form). */
  prefill?: ComposerPrefill | undefined;
  /** Deterministic id source for tests; forwarded to buildCommandRecord. */
  idGenerator?: () => string;
}

interface WrittenCommand {
  fileName: string;
  id: string;
  json: string;
  /** Set when the FSA picker failed and the download fallback was used. */
  fallback?: string;
}

const COMMAND_KINDS: readonly CommandKind[] = ['approve', 'reject', 'comment', 'regenerate'];
const REGEN_SCOPES: readonly RegenerationScope[] = ['scene', 'chapter', 'edition'];

function isSubjectDecisionKind(kind: CommandKind): boolean {
  return kind === 'approve' || kind === 'reject';
}

export function CommandComposer({ prefill, idGenerator }: CommandComposerProps): React.ReactElement {
  const [command, setCommand] = useState<CommandKind>(prefill?.command ?? 'approve');
  const [targetRef, setTargetRef] = useState<string>(prefill?.targetRef ?? '');
  const [subjectDecision, setSubjectDecision] = useState<string>(prefill?.subjectDecision ?? '');
  const [rationale, setRationale] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [regenReason, setRegenReason] = useState<string>('');
  const [regenScope, setRegenScope] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [written, setWritten] = useState<WrittenCommand | null>(null);

  // Apply a new prefill from the parent (e.g. a decisions-table action button).
  // The view keeps the prefill object stable between clicks, so this only
  // re-runs when a row action is actually pressed.
  useEffect(() => {
    if (!prefill) return;
    if (prefill.command) setCommand(prefill.command);
    if (prefill.targetRef !== undefined) setTargetRef(prefill.targetRef);
    if (prefill.subjectDecision !== undefined) setSubjectDecision(prefill.subjectDecision);
  }, [prefill]);

  const buildPayload = (): CommandPayload => {
    if (command === 'comment') {
      return { text: commentText };
    }
    if (command === 'regenerate') {
      return regenScope
        ? { reason: regenReason, scope: regenScope as RegenerationScope }
        : { reason: regenReason };
    }
    // approve | reject — include only the fields the user actually filled.
    const payload: { subjectDecision?: string; rationale?: string } = {};
    if (subjectDecision) payload.subjectDecision = subjectDecision;
    if (rationale) payload.rationale = rationale;
    return payload;
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const record = buildCommandRecord({
      command,
      targetRef,
      payload: buildPayload(),
      ...(idGenerator ? { id: idGenerator() } : {}),
    });
    const validationErrors = validateCommandRecord(record);
    if (validationErrors.length > 0) {
      // Gate: invalid records never reach the outbound sink.
      setErrors(validationErrors);
      setWritten(null);
      return;
    }
    setErrors([]);
    const json = JSON.stringify(record);
    // Prefer the File System Access sink; if the picker cannot be completed
    // (unsupported, user abort, headless), fall back to the record download —
    // same discipline as the CreateWizard plan sinks.
    void (async () => {
      try {
        const result = await fileSystemAccessCommandSink.write(record);
        setWritten({ fileName: result.fileName, id: record.id, json });
      } catch (sinkErr) {
        const result = await downloadCommandSink.write(record);
        setWritten({ fileName: result.fileName, id: record.id, json, fallback: sinkErr instanceof Error ? sinkErr.message : String(sinkErr) });
      }
    })().catch((err: unknown) => {
      setErrors([err instanceof Error ? err.message : String(err)]);
    });
  };

  return (
    <form className="command-composer" onSubmit={handleSubmit}>
      <label>
        Command
        <select
          data-testid="command-kind"
          value={command}
          onChange={(e) => setCommand(e.target.value as CommandKind)}
        >
          {COMMAND_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>

      <label>
        Target ref
        <input
          data-testid="command-target-ref"
          value={targetRef}
          placeholder="Scene:demo/scene-001"
          onChange={(e) => setTargetRef(e.target.value)}
        />
      </label>

      {isSubjectDecisionKind(command) && (
        <label>
          Subject decision
          <input
            data-testid="command-subject-decision"
            value={subjectDecision}
            onChange={(e) => setSubjectDecision(e.target.value)}
          />
        </label>
      )}

      {isSubjectDecisionKind(command) && (
        <label>
          Rationale
          <textarea
            data-testid="command-rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </label>
      )}

      {command === 'comment' && (
        <label>
          Comment
          <textarea
            data-testid="command-comment-text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </label>
      )}

      {command === 'regenerate' && (
        <>
          <label>
            Reason
            <textarea
              data-testid="command-regen-reason"
              value={regenReason}
              onChange={(e) => setRegenReason(e.target.value)}
            />
          </label>
          <label>
            Scope
            <select
              data-testid="command-regen-scope"
              value={regenScope}
              onChange={(e) => setRegenScope(e.target.value)}
            >
              <option value="">(none)</option>
              {REGEN_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <button type="submit" data-testid="command-submit">
        Write command
      </button>

      {errors.length > 0 && (
        <ul className="command-validation-error" data-testid="command-validation-error">
          {errors.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      )}

      {written && (
        <div className="command-write-success">
          <p data-testid="command-write-result">
            Command written to <code>{written.fileName}</code>
          </p>
          <p>
            record id: <span data-testid="command-record-id">{written.id}</span>
          </p>
          {written.fallback !== undefined && (
            <p data-testid="command-write-fallback">Directory access unavailable; downloaded instead.</p>
          )}
          <pre data-testid="command-record-json">{written.json}</pre>
        </div>
      )}
    </form>
  );
}
