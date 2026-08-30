import React from 'react';
import { useProjectionStore } from '../store/projectionStore';
import { DirectoryProjectSource } from '../loader/DirectoryProjectSource';
import { SnapshotProjectSource } from '../loader/SnapshotProjectSource';

export function SourcePicker(): React.ReactElement {
  const loadFrom = useProjectionStore((s) => s.loadFrom);
  const status = useProjectionStore((s) => s.status);
  const sourceLabel = useProjectionStore((s) => s.sourceLabel);
  const dirSource = new DirectoryProjectSource();

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const snap = new SnapshotProjectSource(files);
    await loadFrom(snap, 'snapshot');
  }

  async function handleDirectoryPick() {
    try { await loadFrom(dirSource, 'directory'); } catch { /* cancelled */ }
  }

  return (
    <div className="source-picker">
      <h2>Load Project</h2>
      {sourceLabel !== null ? (
        <p>Source: {sourceLabel}</p>
      ) : (
        <p>No source loaded</p>
      )}
      <p>Current status: {status}</p>
      <input type="file" multiple accept=".json" onChange={handleFileInput} aria-label="Load snapshot" />
      <button onClick={handleDirectoryPick} type="button">Open Directory (Chromium)</button>
    </div>
  );
}
