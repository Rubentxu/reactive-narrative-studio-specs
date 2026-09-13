/**
 * CreateWizard — creation recipe form at /create route.
 *
 * Renders the recipe skeleton with the TS template engine and emits a
 * CLI-consumable create-plan.json via RecipePlanEmitter (PR-1, M10.2.1 audit).
 * The manifest is parsed from the rendered narrative.yaml — the same source of
 * truth as the Python CLI (yaml.safe_load of the rendered template).
 *
 * NEVER imports useProjectionStore — no state changes (per REQ-CR-12).
 */

import { useState, useEffect } from 'react';
import { parse } from 'yaml';
import { TemplateEngine, TemplateError } from '../../recipes/templateEngine';
import { fileSystemAccessSink } from './FileSystemAccessSink';
import { downloadPlanSink } from './DownloadPlanSink';
import { emitPlan, recipeLockSha256 } from './RecipePlanEmitter';
import type { CreatePlan } from './RecipePlanEmitter';

/** Recipe asset bundle, pre-computed at build time by scripts/generate-recipe-assets.mjs.
 *  import.meta.glob cannot include files outside the Vite root (recipes/ is at the
 *  repo root) — the same defect class the m10.2 capability-catalog manifest solved
 *  with a pre-computed JSON bundle. NO fetch(), NO network I/O (AC-INV-serverless). */
import recipeAssets from '../../generated/recipe-assets.json';

interface WizardState {
  recipeId: string;
  title: string;
  projectId: string;
  audience: string;
  skeletonContents: Record<string, string>;
  lockData: Record<string, unknown> | null;
  status: 'idle' | 'loading' | 'ready' | 'submitting' | 'done' | 'error';
  error: string | null;
  info: string | null;
}

/** Load skeleton file contents for a recipe from the generated asset bundle. */
function loadSkeletonContents(recipeId: string): Record<string, string> {
  const assets = (recipeAssets as Record<string, { skeleton?: Record<string, string> }>)[recipeId];
  return { ...(assets?.skeleton ?? {}) };
}

function loadLockData(recipeId: string): Record<string, unknown> | null {
  const assets = (recipeAssets as Record<string, { 'recipe.lock.json'?: string }>)[recipeId];
  const raw = assets?.['recipe.lock.json'];
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}

export function CreateWizard({ recipeId = 'middle-grade-illustrated' }: { recipeId?: string }) {
  const [state, setState] = useState<WizardState>({
    recipeId,
    title: '',
    projectId: '',
    audience: 'profile-middle-grade-10-11',
    skeletonContents: {},
    lockData: null,
    status: 'idle',
    error: null,
    info: null,
  });

  // Load skeleton + lock on mount (synchronous reads from the generated bundle)
  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, status: 'loading', error: null, info: null }));

    (async () => {
      const skeletonContents = loadSkeletonContents(recipeId);
      const lockData = loadLockData(recipeId);
      if (cancelled) return;

      setState(s => ({
        ...s,
        status: 'ready',
        skeletonContents,
        lockData,
        error: null,
      }));
    })();

    return () => { cancelled = true; };
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(s => ({ ...s, status: 'submitting', error: null, info: null }));

    try {
      // Same parameter set the CLI receives: the form fields only. Missing
      // template variables render empty exactly like the Python engine.
      const params: Record<string, unknown> = {
        title: state.title,
        projectId: state.projectId,
        audience: state.audience,
      };

      // Render every skeleton file (mirrors ProjectRenderer.render in Python).
      const engine = new TemplateEngine();
      const renderedSkeleton: Record<string, string> = {};
      for (const [path, content] of Object.entries(state.skeletonContents)) {
        renderedSkeleton[path] = engine.render(content, params); // throws TemplateError on forbidden patterns
      }

      // The manifest is the parsed rendered narrative.yaml (Python parity).
      const renderedNarrative = renderedSkeleton['narrative.yaml'];
      if (renderedNarrative === undefined) {
        throw new Error('recipe skeleton is missing narrative.yaml');
      }
      const manifest = (parse(renderedNarrative) ?? {}) as Record<string, unknown>;

      const lockSha = state.lockData ? await recipeLockSha256(state.lockData) : '';
      const plan: CreatePlan = await emitPlan(recipeId, manifest, renderedSkeleton, lockSha);

      // Prefer the File System Access sink; if the picker cannot be completed
      // (unsupported, user abort, headless), fall back to the plan download.
      try {
        await fileSystemAccessSink.write(plan, renderedSkeleton);
      } catch (sinkErr) {
        await downloadPlanSink.write(plan);
        const reason = sinkErr instanceof Error ? sinkErr.message : String(sinkErr);
        setState(s => ({ ...s, info: `Directory access unavailable (${reason}); create-plan.json downloaded instead.` }));
      }
      setState(s => ({ ...s, status: 'done' }));
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'ready',
        error: err instanceof TemplateError
          ? `Template error: ${err.message}`
          : err instanceof Error ? err.message : String(err),
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
        {state.info && <p className="create-wizard-info">{state.info}</p>}
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
            pattern="^[a-z0-9][a-z0-9_\-]*$"
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
