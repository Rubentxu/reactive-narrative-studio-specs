import React from 'react';
import type { ExtensionContext } from '../../../extensions';

interface ContinuityStatus {
  status?: string;
  issues?: string[];
  lastChecked?: string;
}

interface VisualQualityProjection {
  continuityStatus?: ContinuityStatus;
}

export function ContinuityStatusTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const vq = ctx.getProjection<VisualQualityProjection>('cp-visual-quality');
  const cs = vq?.continuityStatus;

  return (
    <div className="tab-continuity-status">
      <h3>Continuity Status</h3>
      {cs ? (
        <>
          <dl>
            <dt>Status</dt><dd>{cs.status ?? 'unknown'}</dd>
            <dt>Last Checked</dt><dd>{cs.lastChecked ?? '—'}</dd>
          </dl>
          {cs.issues && cs.issues.length > 0 && (
            <div>
              <h4>Issues</h4>
              <ul>
                {cs.issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p>No continuity data available</p>
      )}
    </div>
  );
}
