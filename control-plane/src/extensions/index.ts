// Extension Registry public surface
export { EXTENSIONS_API_VERSION } from './types';
export type { ExtensionApiVersion } from './types';

export type {
  ExtensionPredicate,
  EntityTabExtension,
  EntityCardExtension,
  ControlPlaneFeature,
} from './types';
export type { ExtensionContext } from './types';

// EntityRef is defined in store/entityRef.ts
export type { EntityRef } from '../store/entityRef';

// CatalogEntity is defined in loader/ProjectSource.ts
export type { CatalogEntity } from '../loader/ProjectSource';

export { kindIs, and, or, always } from './predicates';

export { extensionRegistry } from './registry';
export type { ExtensionRegistry } from './registry';
