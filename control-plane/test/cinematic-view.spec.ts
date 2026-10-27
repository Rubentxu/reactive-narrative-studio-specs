// @vitest-environment jsdom
/**
 * cinematic-view.spec.ts
 *
 * Component-level proof for the shot-planning surface: the view renders, the
 * bundled samples validate or reject exactly as the CLI would (canonical →
 * ready, impossible shot → physics violations listed), and the previz reader
 * turns run artifacts into the display model. Built with React.createElement
 * so this spec keeps the plain .ts extension used by the harness-facing test
 * naming convention.
 *
 * Requirements: REQ-CIN-16 (testRefs source for the traceability registry).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { Cinematic } from '../src/views/Cinematic';
import { readPrevizBundle, type PrevizBundle } from '../src/features/cinematic/previz';
import {
  CANONICAL_EXAMPLE_YAML,
  IMPOSSIBLE_SHOT_YAML,
} from '../src/features/cinematic/samplePlans';

const METADATA_JSON = JSON.stringify({
  version: 1,
  shotId: 'SC12-SH03',
  mode: 'scene',
  fps: 24,
  fps_base: 1.0,
  frame_start: 1,
  frame_end: 144,
  camera: { lensMm: 50, segments: [] },
  objects: ['maya', 'CIN_CAMERA', 'CIN_TARGET'],
  render: { engine: 'BLENDER_WORKBENCH', resolution: { width: 640, height: 360 }, container: 'FFMPEG', codec: 'H264' },
  outputs: [{ path: 'scene.blend', sha256: 'a'.repeat(64) }],
});

const PROVENANCE_JSON = JSON.stringify({
  version: 1,
  shotPlan: { path: 'examples/video/shot-plan.yaml', sha256: 'b'.repeat(64) },
  generatedScript: { path: 'generated-scene.py', sha256: 'c'.repeat(64) },
  sceneMetadata: { path: 'scene-metadata.json', sha256: 'd'.repeat(64) },
  outputs: [{ path: 'scene.blend', sha256: 'a'.repeat(64) }],
});

function fileFrom(name: string, content: string, type = 'application/json'): File {
  return new File([content], name, { type });
}

describe('cinematic shot-planning view', () => {
  // Explicit cleanup: vitest runs with globals:false in this package, so
  // @testing-library/react auto-cleanup is not registered (same convention as
  // the other component specs).
  afterEach(cleanup);

  it('renders the editor with sample actions and a previz picker', () => {
    const { getByTestId, getByText } = render(createElement(Cinematic));
    expect(getByText('Cinematic Shot Planning')).toBeTruthy();
    expect(getByTestId('cinematic-load-canonical')).toBeTruthy();
    expect(getByTestId('cinematic-load-impossible')).toBeTruthy();
    expect(getByTestId('cinematic-validate')).toBeTruthy();
  });

  it('validates the canonical example as ready', async () => {
    const view = render(createElement(Cinematic));
    fireEvent.click(view.getByTestId('cinematic-load-canonical'));
    fireEvent.click(view.getByTestId('cinematic-validate'));
    await waitFor(() => {
      expect(view.getByTestId('cinematic-status').textContent).toContain('ready for previz');
    });
    expect(view.queryByTestId('cinematic-gate-violations')).toBeNull();
  });

  it('lists typed physics violations for the impossible shot', async () => {
    const view = render(createElement(Cinematic));
    fireEvent.click(view.getByTestId('cinematic-load-impossible'));
    fireEvent.click(view.getByTestId('cinematic-validate'));
    await waitFor(() => {
      const list = view.getByTestId('cinematic-gate-violations');
      expect(list.textContent).toContain('behind the camera plane');
      expect(list.textContent).toContain('below the rig minimum');
    });
    expect(view.queryByTestId('cinematic-status')).toBeNull();
  });

  it('builds the previz display model from run artifacts', async () => {
    const metadataFile = fileFrom('scene-metadata.json', METADATA_JSON);
    const provenanceFile = fileFrom('provenance.json', PROVENANCE_JSON);
    const clipFile = fileFrom('playblast0001-0144.mp4', 'fake-bytes', 'video/mp4');
    const bundle: PrevizBundle = await readPrevizBundle([metadataFile, provenanceFile, clipFile], null);
    expect(bundle.metadata?.shotId).toBe('SC12-SH03');
    expect(bundle.metadata?.fps).toBe(24);
    expect(bundle.metadata?.objects).toEqual(['maya', 'CIN_CAMERA', 'CIN_TARGET']);
    expect(bundle.provenance?.generatedScript.path).toBe('generated-scene.py');
    expect(bundle.clipName).toBe('playblast0001-0144.mp4');
    expect(bundle.clipUrl).toBeTruthy();
  });

  it('reports a malformed metadata file instead of throwing', async () => {
    const bundle = await readPrevizBundle([fileFrom('scene-metadata.json', '{not json')], null);
    expect(bundle.metadata).toBeNull();
    expect(bundle.metadataError).toContain('scene-metadata.json');
  });

  it('ships the two bundled samples with the expected contracts', () => {
    expect(CANONICAL_EXAMPLE_YAML).toContain('id: SC12-SH03');
    expect(IMPOSSIBLE_SHOT_YAML).toContain('move: static');
  });
});
