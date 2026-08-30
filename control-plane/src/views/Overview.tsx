import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function Overview(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  if (!bundle) return <div>No project data</div>;
  return <div className="view-overview"><h1>Project Overview</h1></div>;
}
