/**
 * Docs feature module — capability documentation card.
 *
 * Registers an EntityCardExtension (kind: 'card', targetKind: 'skill') that
 * renders the full SKILL.md content carried in entity metadata through
 * docsSafeMarkdown, so [[Kind:ns/name]] capability cross-references appear as
 * resolved anchors in the capability detail page.
 *
 * Priority 15 places it between the metadata card (10) and relations (20)
 * registered by m16EntityBridge. Registration is additive: the extension
 * contract (apiVersion) is unchanged.
 *
 * Requirements: REQ-CR-CAP-13, REQ-VAH-CROSSREF-RENDER.
 */

import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityCardExtension, ExtensionContext } from '../../../extensions';
import { CapabilityDocCard } from './CapabilityDocCard';

/**
 * Matches skill entities whose metadata carries a non-empty markdown content
 * string (bridged from ParsedSkill.content by m16EntityBridge).
 */
const skillHasMarkdownContent = (entity: { kind: string; metadata?: Record<string, unknown> }): boolean =>
  entity.kind === 'skill' &&
  typeof entity.metadata?.content === 'string' &&
  (entity.metadata.content as string).length > 0;

extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'docs/capability/markdown',
  kind: 'card',
  targetKind: 'skill',
  priority: 15,
  predicate: skillHasMarkdownContent,
  render: (ctx: ExtensionContext) => <CapabilityDocCard entity={ctx.entity} />,
} as EntityCardExtension);
