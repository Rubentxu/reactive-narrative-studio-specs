import React from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectionStore } from '../store/projectionStore';
import { DirectoryProjectSource } from '../loader/DirectoryProjectSource';
import { SnapshotProjectSource } from '../loader/SnapshotProjectSource';
import { upsertRecent } from '../studio/projectRegistry';

export function SourcePicker(): React.ReactElement {
  const loadFrom = useProjectionStore((s) => s.loadFrom);
  const status = useProjectionStore((s) => s.status);
  const sourceLabel = useProjectionStore((s) => s.sourceLabel);
  const dirSource = new DirectoryProjectSource();

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const snap = new SnapshotProjectSource(files);
    const { projectId, title } = await loadFrom(snap, 'snapshot');
    // Registry keeps metadata only (REQ-MP-2) — never projections or docs.
    await upsertRecent({
      projectId,
      title,
      sourceKind: 'snapshot',
      fileNames: Array.from(files).map((f) => f.name),
    });
  }

  async function handleDirectoryPick() {
    try {
      const { projectId, title } = await loadFrom(dirSource, 'directory');
      await upsertRecent({ projectId, title, sourceKind: 'directory', fileNames: [] });
    } catch { /* cancelled */ }
  }

  return (
    <div className="source-picker">
      <h2>Load Project</h2>
      <p>
        <Link to="/home" className="source-picker-home-link">Studio Home</Link>
      </p>
      {sourceLabel !== null ? (
        <p>Source: {sourceLabel}</p>
      ) : (
        <p>No source loaded</p>
      )}
      <p>Current status: {status}</p>
      <input
        type="file"
        multiple
        accept=".json,.yaml,.yml,.md"
        onChange={handleFileInput}
        aria-label="Load snapshot"
      />
      <button onClick={handleDirectoryPick} type="button">Open Directory (Chromium)</button>
    </div>
  );
}
