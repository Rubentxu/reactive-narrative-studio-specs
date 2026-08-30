import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

export function History(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  if (!bundle) return <div>No project data</div>;
  return <div className="view-history"><h1>History</h1></div>;
}
