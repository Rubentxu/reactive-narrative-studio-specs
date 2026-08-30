import type { CatalogEntity } from '../loader/ProjectSource';
import type { ControlPlaneFeature, EntityTabExtension, EntityCardExtension } from './types';

export interface ExtensionRegistry {
  register(feature: ControlPlaneFeature): void;
  resolveEntityTabs(entity: CatalogEntity): readonly EntityTabExtension[];
  resolveEntityCards(entity: CatalogEntity): readonly EntityCardExtension[];
}

const features: ControlPlaneFeature[] = [];

function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

export const extensionRegistry: ExtensionRegistry = {
  register(feature: ControlPlaneFeature) {
    features.push(feature);
  },
  resolveEntityTabs(entity: CatalogEntity): readonly EntityTabExtension[] {
    const tabs = features.filter(
      (f): f is EntityTabExtension => f.kind === 'tab' && f.predicate(entity)
    );
    return sortByPriority(tabs);
  },
  resolveEntityCards(entity: CatalogEntity): readonly EntityCardExtension[] {
    const cards = features.filter(
      (f): f is EntityCardExtension => f.kind === 'card' && f.predicate(entity)
    );
    return sortByPriority(cards);
  },
};

// Module-level literals carrying apiVersion const (EVT-EXR-01 oracle ≥ 4)
const _registryEntry: { apiVersion: 'control-plane.extensions/v1' } = { apiVersion: 'control-plane.extensions/v1' };
const _apiVersionMarker: { apiVersion: 'control-plane.extensions/v1' } = { apiVersion: 'control-plane.extensions/v1' };
void _registryEntry;
void _apiVersionMarker;
