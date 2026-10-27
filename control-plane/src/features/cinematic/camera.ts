/**
 * Shared geometric camera model for validation and previz display.
 *
 * This is the TypeScript counterpart of the Python module that gates the shot
 * plan before anything is rendered: same rig table, same arithmetic in the same
 * IEEE-754 operation order, same violation messages down to the last decimal,
 * and the same loop structure so both runtimes report violations in the same
 * order. The cross-runtime oracle in the verification scenario compares their
 * outputs byte for byte — any divergence here is a loud failure, never a
 * silent disagreement between the web view and the CLI.
 */

export interface RigLimits {
  maxRotationDegPerS: number;
  minSubjectDistanceM: number;
  minSpeedMPerS: number;
  maxSpeedMPerS: number;
}

export const RIG_LIMITS: Readonly<Record<string, RigLimits>> = {
  // Ground-speed ceiling includes the vertical component on rising moves; a
  // hand-held tracking shot that gains height sits just above a flat run.
  gimbal: { maxRotationDegPerS: 30.0, minSubjectDistanceM: 2.6, minSpeedMPerS: 0.05, maxSpeedMPerS: 3.5 },
  tripod: { maxRotationDegPerS: 20.0, minSubjectDistanceM: 2.0, minSpeedMPerS: 0.0, maxSpeedMPerS: 0.0 },
  steadicam: { maxRotationDegPerS: 24.0, minSubjectDistanceM: 2.4, minSpeedMPerS: 0.1, maxSpeedMPerS: 2.5 },
  dolly: { maxRotationDegPerS: 12.0, minSubjectDistanceM: 3.0, minSpeedMPerS: 0.1, maxSpeedMPerS: 2.0 },
  crane: { maxRotationDegPerS: 18.0, minSubjectDistanceM: 3.0, minSpeedMPerS: 0.05, maxSpeedMPerS: 2.0 },
};

export const DEFAULT_RIG = 'gimbal';

const CAMERA_BACK_OFFSET_M = 4.0;
const AIM_HEIGHT_OFFSET_M = 0.9;

export interface CameraViolation {
  path: string;
  message: string;
}

export interface ShotPlan {
  id: string;
  sceneRef: string;
  sequenceRef: string;
  durationSeconds: number;
  fps: number;
  rig?: string;
  subjects: Array<{ id: string; representation: string; action: string; start: number[]; end: number[] }>;
  camera: {
    lensMm: number;
    segments: Array<{
      frames: [number, number];
      move: 'static' | 'tracking_backward' | 'crane_up';
      height?: number;
      heightFrom?: number;
      heightTo?: number;
    }>;
  };
}

type Vec3 = [number, number, number];

// Mirrors CPython math.degrees (x * (180/pi)) operation order so both runtimes
// round identically at the last decimal.
const RAD_TO_DEG = 180.0 / Math.PI;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const fmt2 = (value: number): string => value.toFixed(2);
const fmt1 = (value: number): string => value.toFixed(1);

export function resolveRig(plan: ShotPlan): RigLimits {
  const name = plan.rig ?? DEFAULT_RIG;
  const limits = RIG_LIMITS[name];
  if (!limits) {
    const supported = Object.keys(RIG_LIMITS).sort().join(', ');
    throw new Error(`unknown rig '${name}'; supported rigs: ${supported}`);
  }
  return limits;
}

export function frameEndOf(plan: ShotPlan): number {
  return Math.trunc(plan.durationSeconds * plan.fps);
}

function segmentAt(plan: ShotPlan, frame: number): ShotPlan['camera']['segments'][number] {
  for (const segment of plan.camera.segments) {
    const [start, end] = segment.frames;
    if (start <= frame && frame <= end) return segment;
  }
  return plan.camera.segments[plan.camera.segments.length - 1]!;
}

function subjectRaw(plan: ShotPlan, frame: number): Vec3 {
  const subject = plan.subjects[0]!;
  const total = frameEndOf(plan);
  const t = total <= 1 ? 0.0 : (frame - 1) / (total - 1);
  return [
    lerp(Number(subject.start[0]), Number(subject.end[0]), t),
    lerp(Number(subject.start[1]), Number(subject.end[1]), t),
    lerp(Number(subject.start[2]), Number(subject.end[2]), t),
  ];
}

/** Point the camera aims at: the primary subject's mid-height. */
export function subjectCenter(plan: ShotPlan, frame: number): Vec3 {
  const [x, y, z] = subjectRaw(plan, frame);
  return [x, y, z + AIM_HEIGHT_OFFSET_M];
}

/** Camera position at a frame: tracking follows behind, static freezes, crane rises. */
export function cameraPosition(plan: ShotPlan, frame: number): Vec3 {
  const segment = segmentAt(plan, frame);
  const [start, end] = segment.frames;
  if (segment.move === 'static') {
    const [x, y] = subjectRaw(plan, start);
    return [x, y - CAMERA_BACK_OFFSET_M, Number(segment.height)];
  }
  const t = end === start ? 0.0 : (frame - start) / (end - start);
  const [x, y] = subjectRaw(plan, frame);
  const height =
    segment.move === 'crane_up'
      ? lerp(Number(segment.heightFrom), Number(segment.heightTo), t)
      : Number(segment.height);
  return [x, y - CAMERA_BACK_OFFSET_M, height];
}

function viewDirection(camera: Vec3, target: Vec3): Vec3 {
  const dx = target[0] - camera[0];
  const dy = target[1] - camera[1];
  const dz = target[2] - camera[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
  return [dx / length, dy / length, dz / length];
}

function distance3(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Check the plan's implied motion against its rig's physical envelope. */
export function evaluateCameraGates(plan: ShotPlan): CameraViolation[] {
  let limits: RigLimits;
  try {
    limits = resolveRig(plan);
  } catch (error) {
    return [{ path: '$.rig', message: (error as Error).message }];
  }

  const fps = Math.trunc(plan.fps);
  const total = frameEndOf(plan);

  const violations: CameraViolation[] = [];
  for (let frame = 1; frame <= total; frame++) {
    const camera = cameraPosition(plan, frame);
    const target = subjectCenter(plan, frame);
    const distance = distance3(camera, target);
    if (distance < limits.minSubjectDistanceM) {
      violations.push({
        path: '$.camera',
        message:
          `subject distance ${fmt2(distance)} m at frame ${frame} is below the rig minimum` +
          ` ${fmt2(limits.minSubjectDistanceM)} m (angular rate grows as distance shrinks)`,
      });
    }
    const direction = viewDirection(camera, target);
    if (direction[1] <= 0.0) {
      violations.push({
        path: '$.camera',
        message: `subject is behind the camera plane at frame ${frame}; the shot loses its subject`,
      });
    }
  }

  for (const segment of plan.camera.segments) {
    const [start, end] = segment.frames;
    const isStatic = segment.move === 'static';
    let previous: { camera: Vec3; direction: Vec3 } | null = null;
    for (let frame = start; frame <= end; frame++) {
      const camera = cameraPosition(plan, frame);
      const direction = viewDirection(camera, subjectCenter(plan, frame));
      if (previous !== null) {
        const step = distance3(camera, previous.camera) * fps;
        if (step > limits.maxSpeedMPerS + 1e-9) {
          violations.push({
            path: '$.camera',
            message:
              `camera speed ${fmt2(step)} m/s at frame ${frame} exceeds the rig ceiling` +
              ` ${fmt2(limits.maxSpeedMPerS)} m/s`,
          });
        }
        if (!isStatic && step < limits.minSpeedMPerS - 1e-9) {
          violations.push({
            path: '$.camera',
            message:
              `camera speed ${fmt2(step)} m/s at frame ${frame} stalls below the rig floor` +
              ` ${fmt2(limits.minSpeedMPerS)} m/s`,
          });
        }
        if (previous.direction[1] > 0.0 && direction[1] > 0.0) {
          let dot =
            direction[0] * previous.direction[0] +
            direction[1] * previous.direction[1] +
            direction[2] * previous.direction[2];
          dot = Math.max(-1.0, Math.min(1.0, dot));
          const rate = Math.acos(dot) * RAD_TO_DEG * fps;
          if (rate > limits.maxRotationDegPerS + 1e-9) {
            violations.push({
              path: '$.camera',
              message:
                `view rotation ${fmt1(rate)}°/s at frame ${frame} exceeds the rig ceiling` +
                ` ${fmt1(limits.maxRotationDegPerS)}°/s (whip pan)`,
            });
          }
        }
      }
      previous = { camera, direction };
    }
  }

  return violations;
}
