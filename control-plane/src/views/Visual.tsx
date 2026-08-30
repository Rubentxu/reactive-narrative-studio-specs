import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

interface Asset {
  id?: string;
  name?: string;
  type?: string;
  path?: string;
}

interface AssetsData {
  assets?: Asset[];
}

export function Visual(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);

  if (status === 'empty') {
    return <div className="view-visual"><h1>Visual Assets</h1><p>No project loaded</p></div>;
  }

  const assets = (bundle?.assets as AssetsData | null)?.assets ?? [];

  return (
    <div className="view-visual">
      <h1>Visual Assets</h1>
      {assets.length === 0 && <p>No assets found</p>}
      <ul>
        {assets.map((asset, i) => (
          <li key={asset.id ?? i}>
            {asset.name ?? `Asset ${i + 1}`}
            {asset.type && <span> ({asset.type})</span>}
            {asset.path && <span> — {asset.path}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
