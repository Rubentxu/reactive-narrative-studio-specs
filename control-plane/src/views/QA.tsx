import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

interface UATRun {
  id?: string;
  timestamp?: string;
  status?: string;
  duration?: number;
}

interface UATData {
  runs?: UATRun[];
}

interface VisualQualityData {
  overallStatus?: string;
  structuralStatus?: string;
  aestheticStatus?: string;
  narrativeStatus?: string;
}

export function QA(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);

  if (status === 'empty') {
    return <div className="view-qa"><h1>QA</h1><p>No project loaded</p></div>;
  }

  const uat = (bundle?.uat as UATData | null)?.runs ?? [];
  const vq = bundle?.visualQuality as VisualQualityData | null;
  const overallStatus = vq?.overallStatus ?? 'unknown';
  const structural = vq?.structuralStatus ?? 'unknown';
  const aesthetic = vq?.aestheticStatus ?? 'unknown';
  const narrative = vq?.narrativeStatus ?? 'unknown';

  return (
    <div className="view-qa">
      <h1>QA</h1>

      <section>
        <h2>Visual Quality</h2>
        <dl>
          <dt>Overall</dt><dd>{overallStatus}</dd>
          <dt>Structural</dt><dd>{structural}</dd>
          <dt>Aesthetic</dt><dd>{aesthetic}</dd>
          <dt>Narrative</dt><dd>{narrative}</dd>
        </dl>
      </section>

      <section>
        <h2>UAT Runs ({uat.length})</h2>
        {uat.length === 0 && <p>No UAT runs recorded</p>}
        <ul>
          {uat.map((run, i) => (
            <li key={run.id ?? i}>
              {run.id ?? `Run ${i + 1}`}
              {run.status && <span> — {run.status}</span>}
              {run.timestamp && <span> ({run.timestamp})</span>}
              {run.duration !== undefined && <span> — {run.duration}ms</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
