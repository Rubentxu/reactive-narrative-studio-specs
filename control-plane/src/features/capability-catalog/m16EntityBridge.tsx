/**
 * capability-catalog entity adapter
 *
 * Bridges capability-catalog entries to m16's CatalogEntity surface so the
 * capability detail page can reuse m16's `EntityHeader`/`MetadataCard`/
 * `RelationsList` via the Extension Registry (per spec REQ-CR-CAP-5).
 *
 * Pattern: register 6 capability-kind EntityCardExtensions (one per kind)
 * at module init. Each extension's predicate matches the capability kind;
 * each render synthesizes a CatalogEntity from the CapabilityEntry so m16's
 * components can render.
 */

import type { ReactElement } from 'react';
import { extensionRegistry, EXTENSIONS_API_VERSION } from '../../extensions';
import type { EntityCardExtension, ExtensionContext } from '../../extensions';
import { EntityHeader } from '../catalog/entity/EntityHeader';
import { MetadataCard } from '../catalog/entity/MetadataCard';
import { RelationsList } from '../catalog/entity/RelationsList';
import type { CatalogEntity } from '../../loader/ProjectSource';
import type { CapabilityEntry } from './parser';

const CAPABILITY_KINDS = ['skill', 'pack', 'profile', 'workflow', 'provider', 'recipe'] as const;
type CapabilityKind = typeof CAPABILITY_KINDS[number];

function isCapabilityKind(kind: unknown): kind is CapabilityKind {
  return typeof kind === 'string' && (CAPABILITY_KINDS as readonly string[]).includes(kind);
}

/**
 * Synthesize a m16 CatalogEntity from a capability-catalog CapabilityEntry.
 * The shape is:
 *   { apiVersion, kind, metadata: { namespace, name, path, sha256, origin, ...kind-specific } }
 */
export function capabilityEntryToCatalogEntity(entry: CapabilityEntry): CatalogEntity {
  const baseMetadata: Record<string, unknown> = {
    namespace: entry.namespace,
    name: entry.name,
    path: entry.path,
    sha256: entry.sha256,
  };
  if ('origin' in entry) baseMetadata.origin = entry.origin;

  // Kind-specific metadata fields surfaced for the MetadataCard
  switch (entry.kind) {
    case 'skill':
      baseMetadata.purpose = entry.purpose;
      // Full SKILL.md markdown, rendered by the docs/capability card through
      // docsSafeMarkdown so [[Kind:ns/name]] cross-refs become anchors
      // (REQ-CR-CAP-13). MetadataCard skips this key (no flat dump).
      baseMetadata.content = entry.content;
      break;
    case 'pack':
      baseMetadata.description = entry.description;
      break;
    case 'profile':
      baseMetadata.audience = entry.audience;
      baseMetadata.format = entry.format;
      baseMetadata.voice = entry.voice;
      baseMetadata.guardrails = entry.guardrails;
      break;
    case 'workflow':
      baseMetadata.provider = entry.provider;
      baseMetadata.model = entry.model;
      baseMetadata.description = entry.description;
      break;
    case 'recipe':
      baseMetadata.title = entry.title;
      baseMetadata.description = entry.description;
      break;
    case 'provider':
      // No instances today; nothing extra to surface.
      break;
  }

  return {
    apiVersion: 'control-plane/catalog-entity/v1',
    kind: entry.kind,
    metadata: baseMetadata,
  };
}

/**
 * Predicate: matches m16 CatalogEntity objects whose `kind` is a capability
 * kind. Used by the registered EntityCardExtensions below.
 */
const isCapabilityEntity = (entity: CatalogEntity): boolean => isCapabilityKind(entity.kind);

/**
 * Register one EntityCardExtension per (capability-kind × component).
 * Each card receives the synthesized CatalogEntity and delegates to the
 * m16 component implementation.
 */
for (const kind of CAPABILITY_KINDS) {
  // header (priority 5 — first card rendered)
  extensionRegistry.register({
    apiVersion: EXTENSIONS_API_VERSION,
    id: `capability-catalog/${kind}/header`,
    kind: 'card',
    targetKind: kind,
    priority: 5,
    predicate: isCapabilityEntity,
    render: (ctx: ExtensionContext): ReactElement => <EntityHeader entity={ctx.entity} />,
  } as EntityCardExtension);

  // metadata (priority 10)
  extensionRegistry.register({
    apiVersion: EXTENSIONS_API_VERSION,
    id: `capability-catalog/${kind}/metadata`,
    kind: 'card',
    targetKind: kind,
    priority: 10,
    predicate: isCapabilityEntity,
    render: (ctx: ExtensionContext): ReactElement => <MetadataCard entity={ctx.entity} />,
  } as EntityCardExtension);

  // relations (priority 20)
  extensionRegistry.register({
    apiVersion: EXTENSIONS_API_VERSION,
    id: `capability-catalog/${kind}/relations`,
    kind: 'card',
    targetKind: kind,
    priority: 20,
    predicate: isCapabilityEntity,
    render: (ctx: ExtensionContext): ReactElement => <RelationsList entity={ctx.entity} />,
  } as EntityCardExtension);
}

// Side-effect import guard: keep CapabilityEntry referenced so this module is
// not tree-shaken in production builds.
export type { CapabilityEntry };
