import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function Visual(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  if (!bundle) return <div>No project data</div>;
  return <div className="view-visual"><h1>Visual Assets</h1></div>;
}
