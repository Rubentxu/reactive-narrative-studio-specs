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
export interface EntityTabExtension {
  readonly apiVersion: 'control-plane.extensions/v1';
  readonly id: string;
  readonly kind: 'tab';
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

