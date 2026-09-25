/**
 * Decisions — decision-projection table + outbound command composer (M17).
 *
 * Reads the loaded bundle's cp-decisions projection (raw parsed JSON:
 * { schema, generatedAt, sourceRevision, decisions: [...] }) and offers one
 * command action per decision. The buttons only PREFILL the composer — the
 * actual outbound record is built/validated/written by the decisions feature
 * (CommandComposer + command sinks), never by this view.
 */

import React, { useState } from 'react';
import { useProjectionStore } from '../store/projectionStore';
import { CommandComposer } from '../features/decisions/CommandComposer';
import type { ComposerPrefill } from '../features/decisions/CommandComposer';
import type { CommandKind } from '../features/decisions/types';

interface DecisionRow {
  id: string;
  action: string;
  targetRef: string;
  status: string;
}

interface DecisionsData {
  decisions?: DecisionRow[];
}

const ROW_COMMANDS: readonly CommandKind[] = ['approve', 'reject', 'comment', 'regenerate'];

export function Decisions(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);
  const [prefill, setPrefill] = useState<ComposerPrefill | undefined>(undefined);

  if (status === 'empty') {
    return (
      <section className="view-decisions">
        <h1>Decisions</h1>
        <p>No project loaded</p>
      </section>
    );
  }

  const decisions = (bundle?.decisions as DecisionsData | undefined)?.decisions ?? [];

  return (
    <section className="view-decisions">
      <h1>Decisions</h1>
      <p className="decisions-meta">
        <span data-testid="decisions-count">{decisions.length}</span> decision projections loaded. Row actions prefill
        the command composer; submission validates and writes an outbound command record.
      </p>

      {decisions.length === 0 && <p>No decision entries</p>}

      {decisions.length > 0 && (
        <table className="decisions-table">
          <thead>
            <tr>
              <th>id</th>
              <th>action</th>
              <th>targetRef</th>
              <th>status</th>
              <th>commands</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.id} data-testid={'decision-row-' + d.id}>
                <td>{d.id}</td>
                <td>{d.action}</td>
                <td>{d.targetRef}</td>
                <td>
                  <span data-testid={'decision-status-' + d.id}>{d.status}</span>
                </td>
                <td>
                  {ROW_COMMANDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      data-testid={`decision-${d.id}-${kind}`}
                      onClick={() => setPrefill({ command: kind, targetRef: d.targetRef, subjectDecision: d.id })}
                    >
                      {kind}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="decisions-command">
        <h2>Command</h2>
        <CommandComposer prefill={prefill} />
      </section>

      <section className="decisions-new-command">
        <h2>New command</h2>
        <CommandComposer />
      </section>
    </section>
  );
}
