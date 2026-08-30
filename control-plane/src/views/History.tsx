import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

interface HistoryEntry {
  timestamp?: string;
  action?: string;
  detail?: string;
}

interface HistoryData {
  entries?: HistoryEntry[];
}

export function History(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);

  if (status === 'empty') {
    return <div className="view-history"><h1>History</h1><p>No project loaded</p></div>;
  }

  const history = (bundle?.history as HistoryData | null)?.entries ?? [];

  return (
    <div className="view-history">
      <h1>History</h1>
      {history.length === 0 && <p>No history entries</p>}
      <ul>
        {history.map((entry, i) => (
          <li key={i}>
            {entry.timestamp && <time>{entry.timestamp}</time>}
            {entry.action && <strong> {entry.action}</strong>}
            {entry.detail && <span> — {entry.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
