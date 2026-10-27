"""Shared geometric camera model for validation and scene generation.

One module computes where the subject and the camera are at any frame, so the
physics gates and the generated keyframes can never disagree. The plan is a
piecewise authoring format: inside a segment the camera motion is continuous and
the rig envelope applies; between segments a height change is a declared
authoring transition, not a motion the rig performs. The gates reflect that
split — continuous-motion limits are checked per segment, while subject
visibility and minimum distance are checked on every frame.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from cinematic.shotplan import Violation

CAMERA_BACK_OFFSET_M = 4.0
AIM_HEIGHT_OFFSET_M = 0.9


@dataclass(frozen=True)
class RigLimits:
    """Physical envelope of one camera rig.

    Rotation and speed bounds are what separate a deliberate move from a
    mistake: a whip pan is a bug on a gimbal and the whole point on a robot
    arm; a dead stop is an error on a drone and the signature move on a tripod.
    """

    max_rotation_deg_per_s: float
    min_subject_distance_m: float
    min_speed_m_per_s: float
    max_speed_m_per_s: float


RIG_LIMITS: dict[str, RigLimits] = {
    # Ground-speed ceiling includes the vertical component on rising moves; a
    # hand-held tracking shot that gains height sits just above a flat run.
    "gimbal": RigLimits(30.0, 2.6, 0.05, 3.5),
    "tripod": RigLimits(20.0, 2.0, 0.0, 0.0),
    "steadicam": RigLimits(24.0, 2.4, 0.1, 2.5),
    "dolly": RigLimits(12.0, 3.0, 0.1, 2.0),
    "crane": RigLimits(18.0, 3.0, 0.05, 2.0),
}

DEFAULT_RIG = "gimbal"


class UnknownRigError(Exception):
    """Raised when a plan names a rig outside the supported table."""


def resolve_rig(plan: dict[str, Any]) -> RigLimits:
    name = plan.get("rig", DEFAULT_RIG)
    limits = RIG_LIMITS.get(name)
    if limits is None:
        raise UnknownRigError(
            f"unknown rig '{name}'; supported rigs: {', '.join(sorted(RIG_LIMITS))}"
        )
    return limits


def frame_end_of(plan: dict[str, Any]) -> int:
    return int(plan["durationSeconds"] * plan["fps"])


def segment_at(plan: dict[str, Any], frame: int) -> dict[str, Any]:
    for segment in plan["camera"]["segments"]:
        start, end = segment["frames"]
        if start <= frame <= end:
            return segment
    return plan["camera"]["segments"][-1]


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _subject_raw(plan: dict[str, Any], frame: int) -> tuple[float, float, float]:
    """Primary subject position at a frame, linear from start to end."""

    subject = plan["subjects"][0]
    total = frame_end_of(plan)
    t = 0.0 if total <= 1 else (frame - 1) / (total - 1)
    return (
        _lerp(float(subject["start"][0]), float(subject["end"][0]), t),
        _lerp(float(subject["start"][1]), float(subject["end"][1]), t),
        _lerp(float(subject["start"][2]), float(subject["end"][2]), t),
    )


def subject_center(plan: dict[str, Any], frame: int) -> tuple[float, float, float]:
    """Point the camera aims at: the primary subject's mid-height."""

    x, y, z = _subject_raw(plan, frame)
    return (x, y, z + AIM_HEIGHT_OFFSET_M)


def camera_position(plan: dict[str, Any], frame: int) -> tuple[float, float, float]:
    """Camera position at a frame, by the active segment's move.

    Tracking stays behind the subject at a constant offset; static freezes the
    pose of the segment's first frame; a crane tracks horizontally while its
    height interpolates from heightFrom to heightTo across the segment.
    """

    segment = segment_at(plan, frame)
    move = segment["move"]
    start, end = segment["frames"]
    if move == "static":
        x, y, _ = _subject_raw(plan, start)
        return (x, y - CAMERA_BACK_OFFSET_M, float(segment["height"]))
    t = 0.0 if end == start else (frame - start) / (end - start)
    x, y, _ = _subject_raw(plan, frame)
    if move == "crane_up":
        height = _lerp(float(segment["heightFrom"]), float(segment["heightTo"]), t)
    else:
        height = float(segment["height"])
    return (x, y - CAMERA_BACK_OFFSET_M, height)


def _view_direction(camera: tuple[float, float, float], target: tuple[float, float, float]) -> tuple[float, float, float]:
    dx, dy, dz = target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]
    length = math.sqrt(dx * dx + dy * dy + dz * dz) or 1.0
    return (dx / length, dy / length, dz / length)


def evaluate_camera_gates(plan: dict[str, Any]) -> list[Violation]:
    """Check the plan's implied motion against its rig's physical envelope.

    Every frame: the subject stays in front of the camera and never comes
    closer than the rig's minimum distance. Within each segment: camera speed
    stays inside the rig's range (static segments are exempt from the floor —
    a locked-off camera is legitimate) and the view direction never rotates
    faster than the rig allows. Across segment boundaries the plan may jump
    (an authored transition, like a cut), so continuous-motion limits are not
    evaluated between the last frame of one segment and the first of the next.
    """

    try:
        limits = resolve_rig(plan)
    except UnknownRigError as exc:
        return [Violation(path="$.rig", message=str(exc))]

    fps = int(plan["fps"])
    total = frame_end_of(plan)

    violations: list[Violation] = []
    for frame in range(1, total + 1):
        camera = camera_position(plan, frame)
        target = subject_center(plan, frame)
        distance = math.dist(camera, target)
        if distance < limits.min_subject_distance_m:
            violations.append(
                Violation(
                    "$.camera",
                    f"subject distance {distance:.2f} m at frame {frame} is below the rig minimum"
                    f" {limits.min_subject_distance_m:.2f} m (angular rate grows as distance shrinks)",
                )
            )
        direction = _view_direction(camera, target)
        if direction[1] <= 0.0:
            violations.append(
                Violation(
                    "$.camera",
                    f"subject is behind the camera plane at frame {frame}; the shot loses its subject",
                )
            )

    for segment in plan["camera"]["segments"]:
        start, end = segment["frames"]
        is_static = segment["move"] == "static"
        previous = None
        for frame in range(start, end + 1):
            camera = camera_position(plan, frame)
            direction = _view_direction(camera, subject_center(plan, frame))
            if previous is not None:
                previous_camera, previous_direction = previous
                step = math.dist(camera, previous_camera) * fps
                if step > limits.max_speed_m_per_s + 1e-9:
                    violations.append(
                        Violation(
                            "$.camera",
                            f"camera speed {step:.2f} m/s at frame {frame} exceeds the rig ceiling"
                            f" {limits.max_speed_m_per_s:.2f} m/s",
                        )
                    )
                if not is_static and step < limits.min_speed_m_per_s - 1e-9:
                    violations.append(
                        Violation(
                            "$.camera",
                            f"camera speed {step:.2f} m/s at frame {frame} stalls below the rig floor"
                            f" {limits.min_speed_m_per_s:.2f} m/s",
                        )
                    )
                if previous_direction[1] > 0.0 and direction[1] > 0.0:
                    dot = max(-1.0, min(1.0, sum(a * b for a, b in zip(direction, previous_direction))))
                    rate = math.degrees(math.acos(dot)) * fps
                    if rate > limits.max_rotation_deg_per_s + 1e-9:
                        violations.append(
                            Violation(
                                "$.camera",
                                f"view rotation {rate:.1f}°/s at frame {frame} exceeds the rig ceiling"
                                f" {limits.max_rotation_deg_per_s:.1f}°/s (whip pan)",
                            )
                        )
            previous = (camera, direction)

    return violations
