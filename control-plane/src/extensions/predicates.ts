import type { CatalogEntity } from '../loader/ProjectSource';
import type { ExtensionPredicate } from './types';

export function kindIs(kind: string): ExtensionPredicate {
  return (entity: CatalogEntity) => entity.kind === kind;
}

export function and(...preds: ExtensionPredicate[]): ExtensionPredicate {
  return (entity: CatalogEntity) => preds.every((p) => p(entity));
}

export function or(...preds: ExtensionPredicate[]): ExtensionPredicate {
  return (entity: CatalogEntity) => preds.some((p) => p(entity));
}

export function always(): ExtensionPredicate {
  return () => true;
}
