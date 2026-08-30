import type { Diagnostic } from '../diagnostics/types';

export interface ProjectionBundle {
  project: unknown;
  chapters: unknown;
  characters: unknown;
  assets: unknown;
  uat: unknown;
  visualQuality: unknown;
  history: unknown;
}

export interface CatalogEntity {
  apiVersion: string;
  kind: string;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProjectSource {
  discover(): Promise<Diagnostic<readonly string[]>>;
  load(projectId: string): Promise<Diagnostic<ProjectionBundle>>;
  refresh?(): Promise<Diagnostic<ProjectionBundle>>;
}
