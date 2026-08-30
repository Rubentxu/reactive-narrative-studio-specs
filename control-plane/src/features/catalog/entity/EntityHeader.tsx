import React from 'react';
import type { CatalogEntity } from '../../../extensions';

export function EntityHeader({ entity }: { entity: CatalogEntity }): React.ReactElement {
  const name = String(entity.metadata?.name ?? '—');
  const namespace = String(entity.metadata?.namespace ?? '—');

  return (
    <div className="entity-header">
      <span className="entity-kind">{entity.kind}</span>
      <span className="entity-namespace">{namespace}</span>
      <span className="entity-name">{name}</span>
    </div>
  );
}
