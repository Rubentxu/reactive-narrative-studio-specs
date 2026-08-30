import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useParams } from '@tanstack/react-router';
import { catalogSelectors } from '../store/catalogSelectors';
import { parseEntityRef } from '../store/entityRef';
import { extensionRegistry } from '../extensions';

export function EntityPage(): React.ReactElement {
  const rawParams = useParams({} as any);
  const kind = rawParams['kind'] as string | undefined;
  const namespace = rawParams['namespace'] as string | undefined;
  const name = rawParams['name'] as string | undefined;

  if (!kind || !namespace || !name) {
    return <div className="view-entity"><h1>Entity</h1><p>Invalid entity reference</p></div>;
  }

  const refString = `${kind}:${namespace}/${name}`;
  let ref: { kind: string; namespace: string; name: string };
  try {
    ref = parseEntityRef(refString);
  } catch {
    return <div className="view-entity"><h1>Entity</h1><p>Invalid entity reference: {refString}</p></div>;
  }

  const entity = catalogSelectors.byEntityRef(ref);
  if (!entity) {
    return <div className="view-entity"><h1>{kind}:{namespace}/{name}</h1><p>Entity not found in catalog</p></div>;
  }

  const tabs = extensionRegistry.resolveEntityTabs(entity);
  const cards = extensionRegistry.resolveEntityCards(entity);

  const defaultTabId = tabs[0]?.id ?? '';

  return (
    <div className="view-entity">
      <h1>{entity.kind}:{String(entity.metadata?.namespace)}/{String(entity.metadata?.name)}</h1>

      {cards.length > 0 && (
        <div className="entity-cards">
          {cards.map((card) => (
            <div key={card.id} className="entity-card">
              {card.render({ entity, entityRef: ref, getProjection: () => undefined, now: () => new Date() })}
            </div>
          ))}
        </div>
      )}

      {tabs.length > 0 && (
        <Tabs.Root defaultValue={defaultTabId}>
          <Tabs.List aria-label="Entity tabs">
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id}>
                {tab.title}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Content key={tab.id} value={tab.id}>
              {tab.render({ entity, entityRef: ref, getProjection: () => undefined, now: () => new Date() })}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
    </div>
  );
}
