/**
 * Cross-runtime parity of the camera physics verdicts: the TypeScript model
 * used by the web view and the Python model used by the CLI must report the
 * exact same violations — same order, same paths, same words down to the last
 * decimal — for the canonical example and for a physically impossible shot.
 * Any divergence is a loud failure: the two surfaces can never disagree about
 * whether a shot is possible.
 */

import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { evaluateCameraGates, type ShotPlan } from '../src/features/cinematic/camera';
import { CANONICAL_EXAMPLE_YAML } from '../src/features/cinematic/samplePlans';

const exec = promisify(execFile);

const CONTROL_PLANE_ROOT = join(import.meta.dirname ?? '.', '..');
const REPO_ROOT = join(CONTROL_PLANE_ROOT, '..');
const PHYSICS_FIXTURE = join(REPO_ROOT, 'tools/cinematic/tests/fixtures/shot-plan-physics-invalid.yaml');
const CANONICAL_EXAMPLE = join(REPO_ROOT, 'examples/video/shot-plan.yaml');

const PYTHON_GATES = `
import json, sys
sys.path.insert(0, sys.argv[2])
from cinematic.shotplan import load_shot_plan
from cinematic.camera import evaluate_camera_gates
plan = load_shot_plan(sys.argv[1])
violations = [{"message": v.message, "path": v.path} for v in evaluate_camera_gates(plan)]
print(json.dumps(violations, separators=(",", ":"), sort_keys=True, ensure_ascii=False))
`;

async function pythonVerdicts(planPath: string): Promise<string> {
  const { stdout } = await exec(
    'python3',
    ['-c', PYTHON_GATES, planPath, join(REPO_ROOT, 'tools/cinematic')],
    { cwd: CONTROL_PLANE_ROOT },
  );
  return stdout;
}

function typescriptVerdicts(yamlText: string): string {
  const plan = parse(yamlText) as ShotPlan;
  const payload = evaluateCameraGates(plan).map((violation) => ({
    message: violation.message,
    path: violation.path,
  }));
  return JSON.stringify(payload) + '\n';
}

describe('cross-runtime camera gate parity (python ↔ typescript)', () => {
  it('agrees byte for byte on the canonical example (no violations)', async () => {
    const python = await pythonVerdicts(CANONICAL_EXAMPLE);
    const typescript = typescriptVerdicts(CANONICAL_EXAMPLE_YAML);
    expect(python).toBe(typescript);
    expect(typescript.trim()).toBe('[]');
  });

  it('agrees byte for byte on the physically impossible shot', async () => {
    const fixtureYaml = readFileSync(PHYSICS_FIXTURE, 'utf8');
    const python = await pythonVerdicts(PHYSICS_FIXTURE);
    const typescript = typescriptVerdicts(fixtureYaml);
    expect(python).toBe(typescript);
    const violations = JSON.parse(typescript) as Array<{ message: string }>;
    expect(violations.length).toBeGreaterThan(10);
    expect(violations.some((v) => v.message.includes('behind the camera plane'))).toBe(true);
    expect(violations.some((v) => v.message.includes('below the rig minimum'))).toBe(true);
    expect(violations.some((v) => v.message.includes('whip pan'))).toBe(true);
  });
}, 60_000);
