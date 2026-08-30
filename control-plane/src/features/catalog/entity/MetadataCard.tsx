import React from 'react';
import type { CatalogEntity } from '../../../extensions';

export function MetadataCard({ entity }: { entity: CatalogEntity }): React.ReactElement {
  return (
    <div className="metadata-card">
      <h3>Metadata</h3>
      <dl>
        <dt>Kind</dt><dd>{entity.kind}</dd>
        <dt>Name</dt><dd>{String(entity.metadata?.name ?? '—')}</dd>
        <dt>Namespace</dt><dd>{String(entity.metadata?.namespace ?? '—')}</dd>
        {Object.entries(entity.metadata ?? {}).map(([k, v]) => (
          <React.Fragment key={k}>
            {k !== 'name' && k !== 'namespace' && (
              <>
                <dt>{k}</dt><dd>{String(v)}</dd>
              </>
            )}
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}
