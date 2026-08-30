import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function Overview(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);
  const sourceLabel = useProjectionStore((s) => s.sourceLabel);

  if (status === 'empty') {
    return <div className="view-overview"><h1>Project Overview</h1><p>No project loaded</p></div>;
  }

  const project = bundle?.project as { name?: string; description?: string; version?: string } | null;
  const diagnostics = useProjectionStore((s) => s.diagnostics);

  return (
    <div className="view-overview">
      <h1>Project Overview</h1>
      {sourceLabel && <p>Source: {sourceLabel}</p>}
      {project && (
        <dl>
          <dt>Name</dt><dd>{project.name ?? '—'}</dd>
          <dt>Version</dt><dd>{project.version ?? '—'}</dd>
          <dt>Description</dt><dd>{project.description ?? '—'}</dd>
        </dl>
      )}
      {diagnostics.length > 0 && (
        <div className="diagnostics">
          <h2>Diagnostics</h2>
          <ul>
            {diagnostics.map((d, i) => (
              <li key={i}>[{d.keyword}] {d.instancePath}: {d.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
