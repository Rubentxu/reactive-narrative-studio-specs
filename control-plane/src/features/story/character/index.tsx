import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityTabExtension } from '../../../extensions';
import { OverviewTab } from './OverviewTab';
import { ArcTab } from './ArcTab';
import { ScenesTab } from './ScenesTab';
import type { ExtensionContext } from '../../../extensions';
import { kindIs } from '../../../extensions';

// Register OverviewTab (priority 10)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'story/overview',
  kind: 'tab',
  targetKind: 'Character',
  priority: 10,
  predicate: kindIs('Character'),
  title: 'Overview',
  render: (ctx: ExtensionContext) => <OverviewTab ctx={ctx} />,
} as EntityTabExtension);

// Register ArcTab (priority 20)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'story/arc',
  kind: 'tab',
  targetKind: 'Character',
  priority: 20,
  predicate: kindIs('Character'),
  title: 'Arc',
  render: (ctx: ExtensionContext) => <ArcTab ctx={ctx} />,
} as EntityTabExtension);

// Register ScenesTab (priority 30)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'story/scenes',
  kind: 'tab',
  targetKind: 'Character',
  priority: 30,
  predicate: kindIs('Character'),
  title: 'Scenes',
  render: (ctx: ExtensionContext) => <ScenesTab ctx={ctx} />,
} as EntityTabExtension);
