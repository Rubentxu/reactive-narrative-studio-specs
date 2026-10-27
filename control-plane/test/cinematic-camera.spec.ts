/**
 * Camera physics model: rig envelopes, geometry, and gate discrimination —
 * the TypeScript mirror of the CLI's own unit tests, so both surfaces are
 * held to the same behavior locally before the cross-runtime oracle runs.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  cameraPosition,
  evaluateCameraGates,
  resolveRig,
  RIG_LIMITS,
  subjectCenter,
  type ShotPlan,
} from '../src/features/cinematic/camera';

const REPO_ROOT = join(import.meta.dirname ?? '.', '..');
const PHYSICS_FIXTURE = join(REPO_ROOT, '../tools/cinematic/tests/fixtures/shot-plan-physics-invalid.yaml');

function basePlan(): ShotPlan {
  return {
    id: 'PHYS-01',
    sceneRef: 'SC1',
    sequenceRef: 'SQ1',
    durationSeconds: 6,
    fps: 24,
    subjects: [
      { id: 'hero', representation: 'capsule', action: 'walk', start: [0, -8, 0], end: [0, 6, 0] },
    ],
    camera: {
      lensMm: 50,
      segments: [
        { frames: [1, 48], move: 'tracking_backward', height: 0.45 },
        { frames: [49, 96], move: 'tracking_backward', height: 1.2 },
        { frames: [97, 144], move: 'crane_up', heightFrom: 1.2, heightTo: 5.0 },
      ],
    },
  };
}

describe('rig envelopes', () => {
  it('defaults to gimbal', () => {
    expect(resolveRig(basePlan())).toBe(RIG_LIMITS.gimbal);
  });

  it('rejects an unknown rig with the supported list', () => {
    const plan = basePlan();
    plan.rig = 'hoverboard';
    const violations = evaluateCameraGates(plan);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.path).toBe('$.rig');
    expect(violations[0]!.message).toContain("unknown rig 'hoverboard'");
    expect(violations[0]!.message).toContain('crane, dolly, gimbal, steadicam, tripod');
  });
});

describe('shared geometry', () => {
  it('interpolates the subject and raises the aim point', () => {
    const plan = basePlan();
    expect(subjectCenter(plan, 1)!).toEqual([0, -8, 0.9]);
    expect(subjectCenter(plan, 144)!).toEqual([0, 6, 0.9]);
  });

  it('keeps tracking behind the subject at a constant offset', () => {
    const plan = basePlan();
    for (const frame of [1, 24, 48]) {
      const [sx, sy] = subjectCenter(plan, frame)!;
      const camera = cameraPosition(plan, frame);
      expect(camera[0]).toBeCloseTo(sx, 12);
      expect(camera[1]).toBeCloseTo(sy - 4.0, 12);
      expect(camera[2]).toBe(0.45);
    }
  });

  it('freezes a static camera at the segment start pose', () => {
    const plan = basePlan();
    plan.camera.segments = [{ frames: [1, 144], move: 'static', height: 1.5 }];
    const first = cameraPosition(plan, 1)!;
    expect(first).toEqual([0, -12, 1.5]);
    expect(cameraPosition(plan, 90)!).toEqual(first);
  });

  it('interpolates crane height across the segment', () => {
    const plan = basePlan();
    plan.camera.segments = plan.camera.segments.slice(2) as ShotPlan['camera']['segments'];
    expect(cameraPosition(plan, 97)![2]).toBeCloseTo(1.2, 12);
    expect(cameraPosition(plan, 144)![2]).toBeCloseTo(5.0, 12);
  });
});

describe('gate discrimination', () => {
  it('passes the canonical example', () => {
    expect(evaluateCameraGates(basePlan())).toEqual([]);
  });

  it('rejects a locked camera with a subject crossing the plane', () => {
    const plan = basePlan();
    plan.subjects[0]!.start = [0, 0, 0];
    plan.subjects[0]!.end = [0, -10, 0];
    plan.camera.segments = [{ frames: [1, 96], move: 'static', height: 1.0 }];
    plan.durationSeconds = 4;
    const messages = evaluateCameraGates(plan).map((v) => v.message);
    expect(messages.some((m) => m.includes('below the rig minimum'))).toBe(true);
    expect(messages.some((m) => m.includes('behind the camera plane'))).toBe(true);
  });

  it('rejects an impossible walk speed', () => {
    const plan = basePlan();
    plan.durationSeconds = 1;
    plan.camera.segments = [{ frames: [1, 24], move: 'tracking_backward', height: 0.45 }];
    const messages = evaluateCameraGates(plan).map((v) => v.message);
    expect(messages.some((m) => m.includes('exceeds the rig ceiling'))).toBe(true);
  });

  it('rejects a translating tripod', () => {
    const plan = basePlan();
    plan.rig = 'tripod';
    const messages = evaluateCameraGates(plan).map((v) => v.message);
    expect(messages.some((m) => m.includes('exceeds the rig ceiling'))).toBe(true);
  });

  it('rejects a moving move with a still subject as a stall', () => {
    const plan = basePlan();
    plan.subjects[0]!.end = [...plan.subjects[0]!.start];
    plan.camera.segments = [{ frames: [1, 144], move: 'tracking_backward', height: 1.0 }];
    const messages = evaluateCameraGates(plan).map((v) => v.message);
    expect(messages.some((m) => m.includes('stalls below the rig floor'))).toBe(true);
  });

  it('matches the CLI fixture violation count exactly', () => {
    const plan = parse(readFileSync(PHYSICS_FIXTURE, 'utf8')) as ShotPlan;
    const violations = evaluateCameraGates(plan);
    expect(violations.length).toBeGreaterThan(10);
    expect(violations.every((v) => v.path === '$.camera')).toBe(true);
  });
});
