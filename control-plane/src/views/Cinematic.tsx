import React from 'react';
import {
  CANONICAL_EXAMPLE_YAML,
  IMPOSSIBLE_SHOT_YAML,
} from '../features/cinematic/samplePlans';
import { validatePlan, type ValidationOutcome } from '../features/cinematic/validatePlan';
import { readPrevizBundle, type PrevizBundle } from '../features/cinematic/previz';

const EMPTY_OUTCOME: ValidationOutcome = { parseError: null, schemaErrors: [], gateViolations: [] };

export function Cinematic(): React.ReactElement {
  const [planText, setPlanText] = React.useState('');
  const [outcome, setOutcome] = React.useState<ValidationOutcome>(EMPTY_OUTCOME);
  const [previz, setPreviz] = React.useState<PrevizBundle | null>(null);

  const totalViolations = outcome.schemaErrors.length + outcome.gateViolations.length;

  function handleValidate() {
    setOutcome(validatePlan(planText));
  }

  async function handlePrevizFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setPreviz(await readPrevizBundle(files, previz?.clipUrl ?? null));
  }

  return (
    <section className="view-cinematic">
      <h1>Cinematic Shot Planning</h1>
      <p>
        Author a shot plan, check it against the closed contract and the camera
        physics, and inspect the previz a run produced — all in the browser, on
        the same rules the command line enforces.
      </p>

      <div className="cinematic-editor">
        <h2>Shot plan</h2>
        <div className="cinematic-actions">
          <button type="button" data-testid="cinematic-load-canonical" onClick={() => setPlanText(CANONICAL_EXAMPLE_YAML)}>
            Load canonical example
          </button>
          <button type="button" data-testid="cinematic-load-impossible" onClick={() => setPlanText(IMPOSSIBLE_SHOT_YAML)}>
            Load impossible shot
          </button>
          <button type="button" data-testid="cinematic-validate" onClick={handleValidate}>
            Validate
          </button>
        </div>
        <textarea
          className="cinematic-plan-text"
          data-testid="cinematic-plan-text"
          aria-label="Shot plan YAML"
          rows={16}
          spellCheck={false}
          value={planText}
          onChange={(event) => setPlanText(event.target.value)}
        />
        <div className="cinematic-results" data-testid="cinematic-results">
          {outcome.parseError && (
            <p className="cinematic-parse-error" role="alert">YAML parse error: {outcome.parseError}</p>
          )}
          {outcome.schemaErrors.length > 0 && (
            <div>
              <h3>Contract violations</h3>
              <ul className="cinematic-violations" data-testid="cinematic-schema-errors">
                {outcome.schemaErrors.map((violation, index) => (
                  <li key={index}>{violation.path} — {violation.message}</li>
                ))}
              </ul>
            </div>
          )}
          {outcome.gateViolations.length > 0 && (
            <div>
              <h3>Camera physics violations</h3>
              <ul className="cinematic-violations" data-testid="cinematic-gate-violations">
                {outcome.gateViolations.map((violation, index) => (
                  <li key={index}>{violation.path} — {violation.message}</li>
                ))}
              </ul>
            </div>
          )}
          {outcome.parseError === null && totalViolations === 0 && planText.length > 0 && (
            <p className="cinematic-status cinematic-status-ready" data-testid="cinematic-status">Plan valid — ready for previz.</p>
          )}
          {totalViolations === 0 && planText.length === 0 && (
            <p className="cinematic-status" data-testid="cinematic-status">Load a sample or paste a shot plan, then validate.</p>
          )}
        </div>
      </div>

      <div className="cinematic-previz">
        <h2>Previz artifacts</h2>
        <p>
          Select the files a previz run wrote to its workspace
          (scene-metadata.json, the playblast mp4, provenance.json).
        </p>
        <input
          type="file"
          multiple
          accept=".json,.mp4"
          aria-label="Load previz artifacts"
          onChange={handlePrevizFiles}
        />
        {previz?.metadataError && <p role="alert">{previz.metadataError}</p>}
        {previz?.provenanceError && <p role="alert">{previz.provenanceError}</p>}
        {previz?.metadata && (
          <table className="cinematic-metadata-table" data-testid="cinematic-metadata">
            <tbody>
              <tr><th>Shot</th><td>{previz.metadata.shotId} ({previz.metadata.mode})</td></tr>
              <tr><th>Timing</th><td>{previz.metadata.fps} fps (base {previz.metadata.fpsBase}), frames {previz.metadata.frameStart}–{previz.metadata.frameEnd}</td></tr>
              <tr><th>Lens</th><td>{previz.metadata.lensMm} mm</td></tr>
              <tr><th>Objects</th><td>{previz.metadata.objects.join(', ')}</td></tr>
              <tr><th>Outputs</th><td>{previz.metadata.outputs.map((o) => `${o.path} (sha256 ${o.sha256.slice(0, 12)}…)`).join(', ')}</td></tr>
            </tbody>
          </table>
        )}
        {previz?.provenance && (
          <p className="cinematic-provenance" data-testid="cinematic-provenance">
            Derivation chain verified: {previz.provenance.shotPlan.path} →{' '}
            {previz.provenance.generatedScript.path} → {previz.provenance.sceneMetadata.path} →{' '}
            {previz.provenance.outputs.map((o) => o.path).join(', ')}
          </p>
        )}
        {previz?.clipUrl && (
          <video className="cinematic-clip" data-testid="cinematic-clip" src={previz.clipUrl} controls />
        )}
      </div>
    </section>
  );
}
