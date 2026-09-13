import React from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectionStore, resolveProjectIdentity } from '../store/projectionStore';
import { catalogSelectors } from '../store/catalogSelectors';

export function Catalog(): React.ReactElement {
  const catalogEntities = useProjectionStore((s) => s.catalogEntities);
  const bundle = useProjectionStore((s) => s.bundle);
  const projects = useProjectionStore((s) => s.projects);
  const activeProjectId = useProjectionStore((s) => s.activeProjectId);
  const setActive = useProjectionStore((s) => s.setActive);

  if (!bundle) {
    return <div className="view-catalog"><h1>Catalog</h1><p>No project loaded</p></div>;
  }

  const loadedIds = Object.keys(projects).sort();

  const kinds = ['Project', 'Character', 'Build', 'UATRun'];
  // Identity comes from the nested cp-project descriptor (M10.3 fix): the flat
  // `bundle.project.name` shape never matched real fixtures.
  const projectName = resolveProjectIdentity(bundle, activeProjectId ?? 'Unnamed Project').title;

  return (
    <div className="view-catalog">
      <h1>Catalog — {projectName}</h1>

      {loadedIds.length > 1 && (
        <div className="catalog-project-filter" role="group" aria-label="Filter catalog by project">
          <span className="catalog-filter-label">Project:</span>
          {loadedIds.map((projectId) => (
            <button
              key={projectId}
              type="button"
              className={`catalog-project-chip${projectId === activeProjectId ? ' active' : ''}`}
              data-project-id={projectId}
              data-active={projectId === activeProjectId}
              onClick={() => setActive(projectId)}
            >
              {projectId}
            </button>
          ))}
        </div>
      )}

      <p>Loaded {catalogEntities.length} entities</p>
      {kinds.map((kind) => {
        const count = catalogSelectors.count(kind);
        if (count === 0) return null;
        const entities = catalogSelectors.byKind(kind);
        return (
          <section key={kind}>
            <h2>{kind} ({count})</h2>
            <ul>
              {entities.map((entity) => {
                const kind2 = entity.kind;
                const namespace = String(entity.metadata?.namespace ?? '');
                const name = String(entity.metadata?.name ?? '');
                const href = `/entity/${encodeURIComponent(kind2)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
                return (
                  <li key={`${namespace}/${name}`}>
                    <Link to={href}>{namespace}/{name}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
