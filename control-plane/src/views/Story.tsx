import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function Story(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  if (!bundle) return <div>No project data</div>;
  return <div className="view-story"><h1>Story</h1></div>;
}
