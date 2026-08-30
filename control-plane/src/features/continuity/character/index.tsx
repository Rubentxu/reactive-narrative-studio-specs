import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityTabExtension } from '../../../extensions';
import { ContinuityStatusTab } from './ContinuityStatusTab';
import type { ExtensionContext } from '../../../extensions';
import { kindIs } from '../../../extensions';

// Register ContinuityStatusTab as EntityTabExtension (priority 50)
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'continuity/status',
  kind: 'tab',
  targetKind: 'Character',
  priority: 50,
  predicate: kindIs('Character'),
  title: 'Continuity',
  render: (ctx: ExtensionContext) => <ContinuityStatusTab ctx={ctx} />,
} as EntityTabExtension);
