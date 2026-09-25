/**
 * CapabilityDocCard — renders the full markdown content of a capability entry
 * (today: a SKILL.md) through the docsSafeMarkdown pipeline so capability
 * cross-references ([[Kind:namespace/name]]) render as resolved anchors
 * (REQ-DOC-5) and no raw "[[" text leaks into the page (detail.no-raw-crossref).
 *
 * Lives in features/docs so the markdown pipeline stays inside its own feature
 * boundary — this module only imports from src/extensions (outside features)
 * and from its own feature (docsSafeMarkdown). No cross-feature import.
 *
 * Requirements: REQ-CR-CAP-13, REQ-VAH-CROSSREF-RENDER.
 */

import React from 'react';
import type { CatalogEntity } from '../../../extensions';
import { docsSafeMarkdown } from '../docsSafeMarkdown';

export function CapabilityDocCard({ entity }: { entity: CatalogEntity }): React.ReactElement {
  const content = entity.metadata?.content;
  if (typeof content !== 'string' || content.length === 0) {
    return <></>;
  }
  return <div className="capability-doc-card">{docsSafeMarkdown(content)}</div>;
}
