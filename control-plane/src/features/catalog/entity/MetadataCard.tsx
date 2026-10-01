import React from 'react';
import type { CatalogEntity } from '../../../extensions';
import { isReservedMetadataKey } from '../../../lib/metadata-reserved-keys';

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
            {/* Reserved keys carry rich payloads (e.g. 'content' holds raw capability
                SKILL.md markdown) — they are rendered by the docs/capability card via
                docsSafeMarkdown, never dumped flat (REQ-CR-CAP-13: a key bearing [[...]]
                must not print as plain text). The reserved set is the shared contract
                METADATA_RESERVED_KEYS (src/lib/metadata-reserved-keys, REQ-CP-008). */}
            {!isReservedMetadataKey(k) && (
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
