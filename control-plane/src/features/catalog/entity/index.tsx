import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityCardExtension } from '../../../extensions';
import { MetadataCard } from './MetadataCard';
import { RelationsList } from './RelationsList';
import { EntityHeader } from './EntityHeader';
import type { ExtensionContext } from '../../../extensions';
import { kindIs } from '../../../extensions';

// Register MetadataCard as EntityCardExtension
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'catalog/metadata',
  kind: 'card',
  targetKind: 'Character',
  priority: 10,
  predicate: kindIs('Character'),
  render: (ctx: ExtensionContext) => <MetadataCard entity={ctx.entity} />,
} as EntityCardExtension);

// Register RelationsList as EntityCardExtension
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'catalog/relations',
  kind: 'card',
  targetKind: 'Character',
  priority: 20,
  predicate: kindIs('Character'),
  render: (ctx: ExtensionContext) => <RelationsList entity={ctx.entity} />,
} as EntityCardExtension);

// Register EntityHeader as EntityCardExtension
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'catalog/header',
  kind: 'card',
  targetKind: 'Character',
  priority: 5,
  predicate: kindIs('Character'),
  render: (ctx: ExtensionContext) => <EntityHeader entity={ctx.entity} />,
} as EntityCardExtension);
