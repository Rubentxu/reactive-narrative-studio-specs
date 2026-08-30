import React from 'react';
import type { CatalogEntity } from '../../../extensions';

export function RelationsList({ entity }: { entity: CatalogEntity }): React.ReactElement {
  const relations = (entity.metadata?.relations ?? []) as Array<{ target?: string; type?: string }>;

  return (
    <div className="relations-list">
      <h3>Relations</h3>
      {relations.length === 0 && <p>No relations</p>}
      <ul>
        {relations.map((rel, i) => (
          <li key={i}>
            {rel.type && <strong>{rel.type}: </strong>}
            {rel.target ?? '—'}
          </li>
        ))}
      </ul>
    </div>
  );
}
