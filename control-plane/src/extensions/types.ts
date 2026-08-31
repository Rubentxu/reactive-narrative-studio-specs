import type { CatalogEntity } from '../loader/ProjectSource';

export const EXTENSIONS_API_VERSION = 'control-plane.extensions/v1' as const;
export type ExtensionApiVersion = typeof EXTENSIONS_API_VERSION;

export interface ExtensionContext {
  readonly entity: CatalogEntity;
  readonly entityRef: { readonly kind: string; readonly namespace: string; readonly name: string };
  getProjection<T = unknown>(key: string): T | undefined;
  now(): Date;
}

export type ExtensionPredicate = (entity: CatalogEntity) => boolean;

// NOTE: Each feature object literal carries apiVersion: 'control-plane.extensions/v1' at runtime
// interface carries the string literal type for compile-time enforcement
// No apiVersion bump required: kind: 'docs' is additive metadata that does not change the
// extension contract. Existing tabs (overview, arc, scenes, visual-dna, continuity-status)
// continue to work without modification; only docs tabs will use kind: 'docs'.
export interface EntityTabExtension {
  readonly apiVersion: 'control-plane.extensions/v1';
  readonly id: string;
  readonly kind: 'tab' | 'docs';
  readonly targetKind: string;
  readonly priority: number;
  readonly predicate: ExtensionPredicate;
  readonly title: string;
  render(ctx: ExtensionContext): React.ReactElement;
}

export interface EntityCardExtension {
  readonly apiVersion: 'control-plane.extensions/v1';
  readonly id: string;
  readonly kind: 'card';
  readonly targetKind: string;
  readonly priority: number;
  readonly predicate: ExtensionPredicate;
  render(ctx: ExtensionContext): React.ReactElement;
}

export type ControlPlaneFeature = EntityTabExtension | EntityCardExtension;

// RecipeWidgetExtension — app-level wizard registered at /create, not bound to any entity.
// Registered separately from entity-bound extensions; rendered directly by the Create view.
export interface RecipeWidgetExtension {
  readonly apiVersion: 'control-plane.extensions/v1';
  readonly id: string;
  readonly kind: 'wizard';
  readonly priority: number;
  render(): React.ReactElement;
}

export type ControlPlaneExtension = ControlPlaneFeature | RecipeWidgetExtension;

