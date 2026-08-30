import { create } from 'zustand';
import type { ProjectionBundle, ProjectSource, CatalogEntity } from '../loader/ProjectSource';
import type { AjvError } from '../diagnostics/types';

export type ProjectionStatus = 'empty' | 'loading' | 'loaded' | 'failed';

export interface ProjectionState {
  status: ProjectionStatus;
  bundle: ProjectionBundle | null;
  catalogEntities: CatalogEntity[];
  diagnostics: AjvError[];
  sourceLabel: string | null;
  loadFrom(source: ProjectSource, projectId: string): Promise<void>;
  reset(): void;
}

export const useProjectionStore = create<ProjectionState>((set) => ({
  status: 'empty',
  bundle: null,
  catalogEntities: [],
  diagnostics: [],
  sourceLabel: null,

  async loadFrom(source, projectId) {
    set({ status: 'loading' });
    const result = await source.load(projectId);
    if (result.ok) {
      set({ status: 'loaded', bundle: result.data, diagnostics: [], sourceLabel: projectId });
    } else {
      set({ status: 'failed', bundle: null, diagnostics: result.errors, sourceLabel: projectId });
    }
  },

  reset() {
    set({ status: 'empty', bundle: null, catalogEntities: [], diagnostics: [], sourceLabel: null });
  },
}));
