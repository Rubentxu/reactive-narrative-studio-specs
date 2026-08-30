import React from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectionStore } from '../store/projectionStore';
import { catalogSelectors } from '../store/catalogSelectors';

export function Catalog(): React.ReactElement {
  const catalogEntities = useProjectionStore((s) => s.catalogEntities);
  const bundle = useProjectionStore((s) => s.bundle);

  if (!bundle) {
    return <div className="view-catalog"><h1>Catalog</h1><p>No project loaded</p></div>;
  }

  const kinds = ['Project', 'Character', 'Build', 'UATRun'];
  const project = bundle.project as { name?: string } | null;
  const projectName = project?.name ?? 'Unnamed Project';

  return (
    <div className="view-catalog">
      <h1>Catalog — {projectName}</h1>
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
