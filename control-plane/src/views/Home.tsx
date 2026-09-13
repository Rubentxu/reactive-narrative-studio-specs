/**
 * Home — Studio Home (M10.3): cross-project surface.
 *
 * Shows Continue Working (last opened project), Recent Projects from the
 * IndexedDB registry (metadata only), favorites, and which projects are loaded
 * in the current runtime. Home never reads narrative content from the registry:
 * opening a project always goes through a real project source (file/directory).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectionStore } from '../store/projectionStore';
import {
  listProjects,
  removeProject,
  setFavorite,
  type ProjectRecord,
} from '../studio/projectRegistry';

export function Home(): React.ReactElement {
  const projects = useProjectionStore((s) => s.projects);
  const activeProjectId = useProjectionStore((s) => s.activeProjectId);
  const setActive = useProjectionStore((s) => s.setActive);
  const [recent, setRecent] = useState<ProjectRecord[] | null>(null);

  const refresh = useCallback(async () => {
    setRecent(await listProjects());
  }, []);

  // Refresh whenever the runtime set of loaded projects changes: loading a
  // project updates the registry, and Home must reflect it without a remount.
  const loadedCount = Object.keys(projects).length;
  useEffect(() => {
    void refresh();
  }, [refresh, loadedCount, activeProjectId]);

  const toggleFavorite = async (record: ProjectRecord): Promise<void> => {
    await setFavorite(record.projectId, !record.favorite);
    await refresh();
  };

  const forget = async (record: ProjectRecord): Promise<void> => {
    await removeProject(record.projectId);
    await refresh();
  };

  const loadedIds = Object.keys(projects);
  const continueWorking = recent?.[0] ?? null;

  return (
    <div className="view-home">
      <h1>Studio Home</h1>

      <section className="home-continue">
        <h2>Continue Working</h2>
        {continueWorking ? (
          <p>
            <strong>{continueWorking.title}</strong> ({continueWorking.projectId})
            {loadedIds.includes(continueWorking.projectId) && (
              <button type="button" onClick={() => setActive(continueWorking.projectId)}>
                Focus
              </button>
            )}
          </p>
        ) : (
          <p className="home-empty">No projects yet. Open one below.</p>
        )}
      </section>

      <section className="home-recent">
        <h2>Recent Projects</h2>
        {recent === null ? (
          <p>Loading…</p>
        ) : recent.length === 0 ? (
          <p className="home-empty">No recent projects recorded.</p>
        ) : (
          <ul className="home-project-list">
            {recent.map((record) => (
              <li key={record.projectId} className="home-project-item">
                <button
                  type="button"
                  className="home-favorite"
                  aria-label={`${record.favorite ? 'Unstar' : 'Star'} ${record.projectId}`}
                  onClick={() => void toggleFavorite(record)}
                >
                  {record.favorite ? '★' : '☆'}
                </button>
                <span className="home-project-title">{record.title}</span>
                <span className="home-project-id">{record.projectId}</span>
                <span className="home-project-source">{record.sourceKind}</span>
                <span className="home-project-opened">{record.lastOpenedAt}</span>
                {loadedIds.includes(record.projectId) ? (
                  <span className="home-project-loaded" data-loaded="true">
                    loaded in runtime
                  </span>
                ) : (
                  <span className="home-project-loaded" data-loaded="false">
                    not loaded
                  </span>
                )}
                <button type="button" onClick={() => void forget(record)}>
                  Forget
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-open">
        <h2>Open a project</h2>
        <p>
          Use the <strong>Load Project</strong> panel above to choose project files or a directory —
          Studio Home only stores project metadata, never narrative content.
        </p>
      </section>

      {activeProjectId && (
        <p className="home-active">
          Active project: <strong>{activeProjectId}</strong>{' '}
          <Link to="/catalog" className="home-catalog-link">Browse catalog</Link>
        </p>
      )}
    </div>
  );
}
