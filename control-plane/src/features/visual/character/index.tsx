import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityCardExtension, EntityTabExtension } from '../../../extensions';
import { VisualCard } from './VisualCard';
import { VisualDNATab } from './VisualDNATab';
import type { ExtensionContext } from '../../../extensions';
import { kindIs } from '../../../extensions';

// Register VisualCard as EntityCardExtension (priority 15)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'visual/card',
  kind: 'card',
  targetKind: 'Character',
  priority: 15,
  predicate: kindIs('Character'),
  render: (ctx: ExtensionContext) => <VisualCard ctx={ctx} />,
} as EntityCardExtension);

// Register VisualDNATab as EntityTabExtension (priority 40)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'visual/dna',
  kind: 'tab',
  targetKind: 'Character',
  priority: 40,
  predicate: kindIs('Character'),
  title: 'Visual DNA',
  render: (ctx: ExtensionContext) => <VisualDNATab ctx={ctx} />,
} as EntityTabExtension);
