/**
 * CapabilityDetail — per-entity detail page for capability catalog.
 *
 * Route: /capabilities/$kind/$namespace/$name
 *
 * Looks up the capability from the manifest, synthesizes a m16 CatalogEntity,
 * and renders the detail view via m16's `EntityHeader`/`MetadataCard`/
 * `RelationsList` Extension Registry — NOT custom subcomponents.
 *
 * Per spec REQ-CR-CAP-5, the detail page SHALL reuse the m16 entity
 * composition pattern via the Extension Registry. The bridge is in
 * `./m16EntityBridge.tsx`.
 *
 * m10 invariant: does NOT import from useProjectionStore.
 */

import React from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useCapabilityManifest } from '../useCapabilityManifest';
import { selectByEntityRef } from '../capabilitySelectors';
import { extensionRegistry } from '../../../extensions';
import { capabilityEntryToCatalogEntity } from '../m16EntityBridge'; // static import: registration + resolver (no require in browser)
import type { CapabilityEntry } from '../parser';

/**
 * Route segments are plural (`/capabilities/skills/...`) while the manifest
 * kind union is singular (`skill`). PR-8 (M10.2.1 baseline audit): without this
 * normalization the detail page always rendered NotFound — the detail route had
 * never mounted in the built app before SCN-M10-02-001 exercised it.
 */
const KIND_FROM_ROUTE_SEGMENT: Record<string, CapabilityEntry['kind'] | undefined> = {
  skills: 'skill',
  packs: 'pack',
  profiles: 'profile',
  workflows: 'workflow',
  providers: 'provider',
  recipes: 'recipe',
};

export function CapabilityDetail(): React.ReactElement {
  const params = useParams({} as any);
  const { kind, namespace, name } = params;

  const manifest = useCapabilityManifest();

  if (!kind || !namespace || !name) {
    return <NotFound />;
  }

  const manifestKind = KIND_FROM_ROUTE_SEGMENT[String(kind)];
  if (!manifestKind) {
    return <NotFound />;
  }

  const entry = selectByEntityRef(manifest, manifestKind, namespace, name);

  if (!entry) {
    return <NotFound />;
  }

  return <CapabilityDetailBody entry={entry} />;
}

function NotFound(): React.ReactElement {
  return (
    <div className="view-capability-detail not-found">
      <h1>Capability Not Found</h1>
      <p>The requested capability does not exist in the catalog.</p>
      <Link to="/capabilities">← Back to Capability Catalog</Link>
    </div>
  );
}

/**
 * Renders the detail via m16 EntityHeader + MetadataCard + RelationsList.
 *
 * We import the bridge module dynamically here too so the registration is
 * guaranteed even if a different entry path imports CapabilityDetail first.
 */
function CapabilityDetailBody({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  const entity = capabilityEntryToCatalogEntity(entry);
  const entityRef = { kind: entry.kind, namespace: entry.namespace, name: entry.name };
  const cards = extensionRegistry.resolveEntityCards(entity);

  return (
    <div className="view-capability-detail">
      <div className="entity-cards">
        {cards.map((card) => (
          <div key={card.id} className="entity-card">
            {card.render({
              entity,
              entityRef,
              getProjection: () => undefined,
              now: () => new Date(),
            })}
          </div>
        ))}
      </div>
      <div className="back-link">
        <Link to="/capabilities">← Back to Capability Catalog</Link>
      </div>
    </div>
  );
}
