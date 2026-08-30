import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function QA(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  if (!bundle) return <div>No project data</div>;
  return <div className="view-qa"><h1>QA</h1></div>;
}
