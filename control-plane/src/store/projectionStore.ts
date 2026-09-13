import { create } from 'zustand';
import type { ProjectionBundle, ProjectSource, CatalogEntity } from '../loader/ProjectSource';
import type { AjvError } from '../diagnostics/types';

export type ProjectionStatus = 'empty' | 'loading' | 'loaded' | 'failed';

/** One loaded project with its own runtime identity (REQ-MP-1). */
export interface LoadedProject {
  projectId: string;
  bundle: ProjectionBundle;
  catalogEntities: CatalogEntity[];
  diagnostics: AjvError[];
  sourceLabel: string;
}

export interface ProjectionState {
  /** Mirror of the ACTIVE project (existing views keep reading these). */
  status: ProjectionStatus;
  bundle: ProjectionBundle | null;
  catalogEntities: CatalogEntity[];
  diagnostics: AjvError[];
  sourceLabel: string | null;

  /** Multi-project runtime: every loaded project keeps its own identity. */
  projects: Record<string, LoadedProject>;
  activeProjectId: string | null;

  loadFrom(source: ProjectSource, projectId: string): Promise<{ projectId: string; title: string }>;
  setActive(projectId: string): void;
  reset(): void;
}

/**
 * Resolve the real project id from a loaded bundle. cp-project.json wraps the
 * descriptor as `{ project: { id, title, ... } }`; some fixtures also expose a
 * flat `{ id }`. Falls back to the caller-provided label.
 */
export function resolveProjectIdentity(bundle: ProjectionBundle, fallbackLabel: string): { projectId: string; title: string } {
  const doc = bundle.project as
    | { project?: { id?: unknown; title?: unknown; name?: unknown }; id?: unknown; title?: unknown; name?: unknown }
    | null;
  const descriptor = doc?.project ?? doc;
  const projectId =
    typeof descriptor?.id === 'string' && descriptor.id.length > 0 ? descriptor.id : fallbackLabel;
  const title =
    typeof descriptor?.title === 'string' && descriptor.title.length > 0
      ? descriptor.title
      : typeof descriptor?.name === 'string' && descriptor.name.length > 0
        ? descriptor.name
        : projectId;
  return { projectId, title };
}

export const useProjectionStore = create<ProjectionState>((set, get) => ({
  status: 'empty',
  bundle: null,
  catalogEntities: [],
  diagnostics: [],
  sourceLabel: null,
  projects: {},
  activeProjectId: null,

  async loadFrom(source, projectId) {
    set({ status: 'loading' });
    const result = await source.load(projectId);
    if (result.ok) {
      const { projectId: realId, title } = resolveProjectIdentity(result.data.bundle, projectId);
      const loaded: LoadedProject = {
        projectId: realId,
        bundle: result.data.bundle,
        catalogEntities: result.data.catalogEntities,
        diagnostics: [],
        sourceLabel: title,
      };
      set((state) => ({
        status: 'loaded',
        bundle: loaded.bundle,
        catalogEntities: loaded.catalogEntities,
        diagnostics: [],
        sourceLabel: title,
        projects: { ...state.projects, [realId]: loaded },
        activeProjectId: realId,
      }));
      return { projectId: realId, title };
    }
    set({
      status: 'failed',
      bundle: null,
      catalogEntities: [],
      diagnostics: result.errors,
      sourceLabel: projectId,
    });
    return { projectId, title: projectId };
  },

  setActive(projectId) {
    const project = get().projects[projectId];
    if (!project) return;
    set({
      status: 'loaded',
      bundle: project.bundle,
      catalogEntities: project.catalogEntities,
      diagnostics: project.diagnostics,
      sourceLabel: project.projectId,
      activeProjectId: project.projectId,
    });
  },

  reset() {
    set({
      status: 'empty',
      bundle: null,
      catalogEntities: [],
      diagnostics: [],
      sourceLabel: null,
      projects: {},
      activeProjectId: null,
    });
  },
}));
