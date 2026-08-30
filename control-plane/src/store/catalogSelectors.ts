import type { CatalogEntity } from '../loader/ProjectSource';
import { EntityRef } from './entityRef';
import { useProjectionStore } from './projectionStore';

export const catalogSelectors = {
  byKind(kind: string): CatalogEntity[] {
    const entities = useProjectionStore.getState().catalogEntities;
    return entities.filter((e) => e.kind === kind);
  },
  byEntityRef(ref: EntityRef): CatalogEntity | undefined {
    const entities = useProjectionStore.getState().catalogEntities;
    return entities.find(
      (e) => e.kind === ref.kind && e.metadata?.name === ref.name && e.metadata?.namespace === ref.namespace
    );
  },
  byNamespace(namespace: string): CatalogEntity[] {
    const entities = useProjectionStore.getState().catalogEntities;
    return entities.filter((e) => e.metadata?.namespace === namespace);
  },
  count(kind: string): number {
    const entities = useProjectionStore.getState().catalogEntities;
    return entities.filter((e) => e.kind === kind).length;
  },
} as const;
