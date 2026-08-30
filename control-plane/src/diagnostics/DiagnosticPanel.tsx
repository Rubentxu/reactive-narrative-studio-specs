import React from 'react';
import type { AjvError } from './types';

interface Props { errors: AjvError[]; }

export function DiagnosticPanel({ errors }: Props): React.ReactElement {
  if (errors.length === 0) return <div className="diagnostic-empty">No errors.</div>;
  return (
    <div className="diagnostic-panel" role="alert" aria-live="polite">
      <h2 className="diagnostic-title">Validation Errors ({errors.length})</h2>
      <ul className="diagnostic-list">
        {errors.map((err, i) => (
          <li key={i} className="diagnostic-item">
            {err.instancePath && <span className="diagnostic-path">{err.instancePath}: </span>}
            <span className="diagnostic-keyword">[{err.keyword}]</span> <span className="diagnostic-message">{err.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
