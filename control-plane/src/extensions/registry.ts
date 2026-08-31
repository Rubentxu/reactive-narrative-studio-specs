import type { CatalogEntity } from '../loader/ProjectSource';
import type { ControlPlaneFeature, EntityTabExtension, EntityCardExtension, RecipeWidgetExtension } from './types';

export interface ExtensionRegistry {
  register(feature: ControlPlaneFeature): void;
  resolveEntityTabs(entity: CatalogEntity): readonly EntityTabExtension[];
  resolveEntityCards(entity: CatalogEntity): readonly EntityCardExtension[];
  resolveRecipeWizard(): RecipeWidgetExtension | undefined;
}

const features: ControlPlaneFeature[] = [];
const wizards: RecipeWidgetExtension[] = [];

function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

export const extensionRegistry: ExtensionRegistry = {
  register(feature: ControlPlaneFeature) {
    features.push(feature);
  },
  resolveEntityTabs(entity: CatalogEntity): readonly EntityTabExtension[] {
    // Include both 'tab' (m15 tabs: overview, arc, scenes, etc.) and 'docs' (DocTab per REQ-EXT-2)
    const tabs = features.filter(
      (f): f is EntityTabExtension => (f.kind === 'tab' || f.kind === 'docs') && f.predicate(entity)
    );
    return sortByPriority(tabs);
  },
  resolveEntityCards(entity: CatalogEntity): readonly EntityCardExtension[] {
    const cards = features.filter(
      (f): f is EntityCardExtension => f.kind === 'card' && f.predicate(entity)
    );
    return sortByPriority(cards);
  },
  resolveRecipeWizard(): RecipeWidgetExtension | undefined {
    return sortByPriority(wizards)[0];
  },
};

// Register a recipe wizard extension (app-level, not entity-bound)
// Called directly by the feature index.tsx
export function registerRecipeWizard(wizard: RecipeWidgetExtension): void {
  wizards.push(wizard);
}


