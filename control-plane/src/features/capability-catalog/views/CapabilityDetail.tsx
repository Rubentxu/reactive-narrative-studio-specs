/**
 * CapabilityDetail — per-entity detail page for capability catalog.
 *
 * Route: /capabilities/$kind/$namespace/$name
 *
 * Looks up the capability from the manifest and renders a detail view.
 * Uses m16 EntityHeader/MetadataCard/RelationsList via Extension Registry
 * where possible, but synthesizes a compatible CatalogEntity for capability kinds.
 *
 * m10 invariant: does NOT import from useProjectionStore.
 */

import React from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useCapabilityManifest } from '../useCapabilityManifest';
import { selectByEntityRef } from '../capabilitySelectors';
import type { CapabilityEntry, ParsedSkill, ParsedPack, ParsedProfile, ParsedWorkflow, ParsedRecipe } from '../parser';

export function CapabilityDetail(): React.ReactElement {
  const params = useParams({} as any);
  const { kind, namespace, name } = params;

  const manifest = useCapabilityManifest();

  if (!kind || !namespace || !name) {
    return <NotFound />;
  }

  const entry = selectByEntityRef(manifest, kind as CapabilityEntry['kind'], namespace, name);

  if (!entry) {
    return <NotFound />;
  }

  return (
    <div className="view-capability-detail">
      <CapabilityHeader entry={entry} />
      <CapabilityMetadata entry={entry} />
      <CapabilityContent entry={entry} />
      <CapabilityRelations entry={entry} />
    </div>
  );
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

function CapabilityHeader({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  return (
    <div className="capability-detail-header">
      <span className="capability-kind-badge">{entry.kind}</span>
      {entry.namespace !== 'default' && (
        <span className="capability-namespace">{entry.namespace}</span>
      )}
      <h1 className="capability-name">{entry.name}</h1>
    </div>
  );
}

function CapabilityMetadata({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  return (
    <div className="capability-detail-metadata">
      <h2>Metadata</h2>
      <dl>
        <dt>Kind</dt><dd>{entry.kind}</dd>
        <dt>Namespace</dt><dd>{entry.namespace}</dd>
        <dt>Name</dt><dd>{entry.name}</dd>
        <dt>Path</dt><dd><code>{entry.path}</code></dd>
        <dt>SHA-256</dt><dd className="sha256">{entry.sha256 || 'pending'}</dd>

        {entry.kind === 'profile' && (
          <>
            <dt>Audience</dt><dd>{(entry as ParsedProfile).audience}</dd>
            <dt>Format</dt><dd>{(entry as ParsedProfile).format}</dd>
            <dt>Voice</dt><dd>{(entry as ParsedProfile).voice}</dd>
            <dt>Guardrails</dt><dd>{(entry as ParsedProfile).guardrails.join(', ') || 'none'}</dd>
          </>
        )}

        {entry.kind === 'workflow' && (
          <>
            <dt>Provider</dt><dd>{(entry as ParsedWorkflow).provider}</dd>
            <dt>Model</dt><dd>{(entry as ParsedWorkflow).model}</dd>
          </>
        )}

        {entry.kind === 'recipe' && (
          <>
            <dt>Title</dt><dd>{(entry as ParsedRecipe).title}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function CapabilityContent({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  let content: string | null = null;

  switch (entry.kind) {
    case 'skill':
      content = (entry as ParsedSkill).purpose;
      break;
    case 'pack':
      content = (entry as ParsedPack).description;
      break;
    case 'workflow':
      content = (entry as ParsedWorkflow).description;
      break;
    case 'recipe':
      content = (entry as ParsedRecipe).description;
      break;
    default:
      content = null;
  }

  if (!content) {
    return <></>;
  }

  return (
    <div className="capability-detail-content">
      <h2>Description</h2>
      <p>{content}</p>
    </div>
  );
}

function CapabilityRelations({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  // For V1, we don't have complex cross-references yet
  // The RelationsList shows the file path and sha256 as basic relations

  return (
    <div className="capability-detail-relations">
      <h2>Relations</h2>
      <ul>
        <li>
          <strong>Source:</strong>{' '}
          <code>{entry.path}</code>
        </li>
        <li>
          <strong>Checksum:</strong>{' '}
          <code className="sha256">{entry.sha256 || 'pending'}</code>
        </li>
      </ul>

      {/* Cross-reference links to other capabilities */}
      {entry.kind === 'skill' && (
        <div className="cross-refs">
          <h3>Used by</h3>
          <p className="cross-ref-note">
            Cross-reference drill-down will be implemented in a future cycle.
          </p>
        </div>
      )}

      <div className="back-link">
        <Link to="/capabilities">← Back to Capability Catalog</Link>
      </div>
    </div>
  );
}
