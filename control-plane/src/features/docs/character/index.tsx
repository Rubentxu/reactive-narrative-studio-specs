/**
 * Docs feature module — Character entity documentation tab.
 *
 * Registers the EntityTabExtension with kind: 'docs' for Character entities
 * that have a docRef in their projections.
 */

import { extensionRegistry } from '../../../extensions';
import { EXTENSIONS_API_VERSION } from '../../../extensions';
import type { EntityTabExtension } from '../../../extensions';
import { DocTab } from './DocTab';
import type { ExtensionContext } from '../../../extensions';
import { kindIs } from '../../../extensions';

/**
 * Predicate that returns true if the entity is a Character.
 * The actual docRef check is done in the DocTab component.
 */
const characterHasDocRef = kindIs('Character');

// Register DocTab as EntityTabExtension with kind: 'docs'
extensionRegistry.register({
  apiVersion: EXTENSIONS_API_VERSION,
  id: 'docs/character',
  kind: 'docs',
  targetKind: 'Character',
  priority: 50, // Lower priority than story tabs (10, 20, 30) and visual tab (40)
  predicate: characterHasDocRef,
  title: 'Documentación',
  render: (ctx: ExtensionContext) => <DocTab ctx={ctx} />,
} as EntityTabExtension);
