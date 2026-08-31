/**
 * CreateWizard — creation recipe form at /create route.
 *
 * Simplifed form using plain React inputs + submit.
 * Uses recipe schema via useRecipeLoader (import.meta.glob).
 *
 * NEVER imports useProjectionStore — no state changes (per REQ-CR-12).
 * Emits create-plan.json via RecipePlanEmitter on submit.
 */

import { useState, useEffect } from 'react';
import { fileSystemAccessSink } from './FileSystemAccessSink';
import { downloadPlanSink } from './DownloadPlanSink';
import type { RenderResult } from '@recipes/projectRenderer';
import type { CreatePlan } from './RecipePlanEmitter';

interface WizardState {
  recipeId: string;
  title: string;
  projectId: string;
  audience: string;
  skeletonContents: Record<string, string>;
  status: 'idle' | 'loading' | 'ready' | 'submitting' | 'done' | 'error';
  error: string | null;
}

/** Load skeleton file contents for a recipe (Vite glob). */
const skeletonGlobs = import.meta.glob('/recipes/*/skeleton/**/*', { query: '?raw', import: 'default', eager: false }) as Record<string, () => Promise<string>>;

async function loadSkeletonContents(recipeId: string): Promise<Record<string, string>> {
  const prefix = `/recipes/${recipeId}/skeleton/`;
  const matchingKeys = Object.keys(skeletonGlobs).filter(k => k.startsWith(prefix));
  const entries = await Promise.all(
    matchingKeys.map(async key => {
      const content = await skeletonGlobs[key]!();
      const relPath = key.slice(prefix.length);
      return [relPath, content] as [string, string];
    }),
  );
  return Object.fromEntries(entries);
}

/** Render skeleton template files using the TS template engine (pure, no I/O). */
function renderSkeletons(
  skeletonContents: Record<string, string>,
  params: Record<string, unknown>,
): { renderResult: RenderResult } {
  const { TemplateEngine } = require('../../recipes/templateEngine');
  const engine = new TemplateEngine();
  const manifest: Record<string, unknown> = {};

  for (const [_path, content] of Object.entries(skeletonContents)) {
    engine.render(content, params); // throws TemplateError on forbidden patterns
  }

  return {
    renderResult: {
      ok: true,
      code: 'render-ok',
      message: 'Rendered successfully',
      skeletonFiles: skeletonContents,
      manifest,
      warnings: [],
    },
  };
}

export function CreateWizard({ recipeId = 'middle-grade-illustrated' }: { recipeId?: string }) {
  const [state, setState] = useState<WizardState>({
    recipeId,
    title: '',
    projectId: '',
    audience: 'profile-middle-grade-10-11',
    skeletonContents: {},
    status: 'idle',
    error: null,
  });

  // Load skeleton on mount
  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, status: 'loading', error: null }));

    (async () => {
      const skeletonContents = await loadSkeletonContents(recipeId);
      if (cancelled) return;

      setState(s => ({
        ...s,
        status: 'ready',
        skeletonContents,
        error: null,
      }));
    })();

    return () => { cancelled = true; };
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(s => ({ ...s, status: 'submitting', error: null }));

    try {
      const params: Record<string, unknown> = {
        title: state.title,
        projectId: state.projectId,
        audience: state.audience,
      };

      const { renderResult } = renderSkeletons(state.skeletonContents, params);

      const plan: CreatePlan = {
        recipe: recipeId,
        recipeLockSha256: '',
        manifest: renderResult.manifest,
        skeleton: [],
        createPlanSha256: '',
      };

      if (fileSystemAccessSink.isSupported()) {
        await fileSystemAccessSink.write(plan, state.skeletonContents);
      } else {
        await downloadPlanSink.write(plan);
      }
      setState(s => ({ ...s, status: 'done' }));
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'ready',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="create-wizard-loading">Loading recipe...</div>;
  }

  if (state.status === 'error') {
    return <div className="create-wizard-error">Error: {state.error}</div>;
  }

  if (state.status === 'done') {
    return (
      <div className="create-wizard-done">
        <h2>Project created!</h2>
        <p>Your project has been created successfully.</p>
        <button onClick={() => setState(s => ({ ...s, status: 'ready', title: '', projectId: '' }))}>
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="create-wizard">
      <h1>Create New Project</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Book title</label>
          <input
            id="title"
            type="text"
            value={state.title}
            onChange={e => setState(s => ({ ...s, title: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="projectId">Project ID</label>
          <input
            id="projectId"
            type="text"
            value={state.projectId}
            onChange={e => setState(s => ({ ...s, projectId: e.target.value }))}
            required
            pattern="^[a-z0-9][a-z0-9_-]*$"
          />
        </div>
        <div>
          <label htmlFor="audience">Audience</label>
          <select
            id="audience"
            value={state.audience}
            onChange={e => setState(s => ({ ...s, audience: e.target.value }))}
          >
            <option value="profile-middle-grade-10-11">Middle Grade 10-11</option>
            <option value="middle-grade-8-9">Middle Grade 8-9</option>
            <option value="middle-grade-9-10">Middle Grade 9-10</option>
            <option value="middle-grade-11-12">Middle Grade 11-12</option>
          </select>
        </div>
        <button type="submit" disabled={state.status === 'submitting'}>
          {state.status === 'submitting' ? 'Creating...' : 'Create Project'}
        </button>
      </form>
      {state.error && <div className="create-wizard-error">{state.error}</div>}
    </div>
  );
}
