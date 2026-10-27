"""Deterministic compilation of a shot plan into a production-ready video prompt.

The prompt follows the eight-section anatomy the operator's workflow teaches:
reference definitions with explicit disclaimers, a technical block, the video
lock, timecoded action with hard numbers mined from the shared geometric model
(the same numbers the physics gates enforce), containment rules, acting notes,
audio, and a closing hold. The same plan always compiles to byte-identical
text — the prompt never invents camera language the plan does not contain.
"""

from __future__ import annotations

from typing import Any

from cinematic.camera import camera_position, frame_end_of, subject_center

VIDEO_LOCK = (
    "@Video is the SOLE authority for camera movement, cuts and timing, 1:1 "
    "frame-aligned. If this text and the video disagree, the video wins. Any "
    "deviation is a failure. The previz is re-dressed, never re-imagined."
)

_MOVE_LANGUAGE = {
    "tracking_backward": "camera tracks backward, keeping its offset from the subject",
    "static": "camera is locked off",
    "crane_up": "camera rises in a continuous crane move",
}

_REPRESENTATION_NAME = {
    "capsule": "capsule",
    "sphere": "sphere",
    "cube": "box",
}


def _fmt(value: float) -> str:
    return f"{value:.2f}"


def _timestamp(frame: int, fps: int) -> str:
    return f"{(frame - 1) / fps:.1f}"


def _distance_to_subject(plan: dict[str, Any], frame: int) -> float:
    camera = camera_position(plan, frame)
    target = subject_center(plan, frame)
    return sum((a - b) ** 2 for a, b in zip(camera, target)) ** 0.5


def _reference_definitions(plan: dict[str, Any]) -> list[str]:
    lines = [
        "@Video — camera, cuts and timing ONLY. Not colour, not styling, not content."
    ]
    subject = plan["subjects"][0]
    proxy = _REPRESENTATION_NAME[str(subject["representation"])]
    start = ", ".join(f"{float(c):g}" for c in subject["start"])
    end = ", ".join(f"{float(c):g}" for c in subject["end"])
    lines.append(
        f"The {proxy} proxy IS {subject['id']}. The plan blocks its path from"
        f" ({start}) to ({end}); everything else about its appearance comes from"
        " its reference."
    )
    next_image = 1
    for reference in plan.get("characterReferences", []):
        lines.append(
            f"@Image {next_image} — appearance of {subject['id']} ONLY. Not its"
            f" motion, not its framing, not the environment. ({reference})"
        )
        next_image += 1
    for reference in plan.get("styleReferences", []):
        lines.append(
            f"@Image {next_image} — style and grade ONLY. Not the subject, not"
            f" the timing. ({reference})"
        )
        next_image += 1
    if next_image == 1:
        lines.append("No reference images are attached; the previz video defines everything structural.")
    return lines


def _action_timing(plan: dict[str, Any]) -> list[str]:
    fps = int(plan["fps"])
    subject = plan["subjects"][0]
    lines = []
    for segment in plan["camera"]["segments"]:
        f0, f1 = segment["frames"]
        move = _MOVE_LANGUAGE[str(segment["move"])]
        height = float(camera_position(plan, f0)[2])
        distance = _distance_to_subject(plan, f0)
        lines.append(
            f"- {_timestamp(f0, fps)}–{_timestamp(f1, fps)} s (frames {f0}–{f1}):"
            f" {move}; camera about {_fmt(distance)} m from {subject['id']}"
            f" at {_fmt(height)} m height."
        )
    total = frame_end_of(plan)
    lines.append(
        f"END {_timestamp(total + 1, fps)} s: figures {len(plan['subjects'])}"
        f" · {subject['id']} {subject['action']} · nothing else."
    )
    return lines


def compile_prompt(plan: dict[str, Any]) -> str:
    """Compile a validated shot plan into the eight-section video prompt."""

    fps = int(plan["fps"])
    duration = frame_end_of(plan) / fps
    subject = plan["subjects"][0]

    sections: list[str] = []
    sections.append("\n\n".join(["## 1 — Reference definitions", *_reference_definitions(plan)]))
    sections.append(
        "\n\n".join(
            [
                "## 2 — Technical",
                f"Duration {duration:.1f} s at {fps} fps"
                f" ({frame_end_of(plan)} frames). {_fmt(float(plan['camera']['lensMm']))} mm lens."
                " Live-action photography, no CGI look, no readable text on screen.",
            ]
        )
    )
    sections.append("\n\n".join(["## 3 — Video lock", VIDEO_LOCK]))
    sections.append("\n\n".join(["## 4 — Action timing", *_action_timing(plan)]))
    sections.append(
        "\n\n".join(
            [
                "## 5 — Rules",
                f"1. There is exactly {len(plan['subjects'])} figure"
                f" ({subject['id']}). No extras, no duplicates, no half-bodies"
                " at the frame edges.",
                "2. The camera language is the one @Video shows; this text adds"
                " no camera moves of its own.",
                "3. Anything not visible in the previz stays out of frame unless"
                " a rule above states otherwise.",
            ]
        )
    )
    sections.append(
        "\n\n".join(
            [
                "## 6 — Acting",
                f"{subject['id']}: {subject['action']} with intent, steady gait,"
                " continuous small business so they never freeze; gaze engaged,"
                " natural blink cadence, never glassy.",
            ]
        )
    )
    sections.append(
        "\n\n".join(
            [
                "## 7 — Audio",
                "[Sound design] quiet ambient bed only. [SFX] none specified by"
                " the plan. [Dialogue] none. [Music] none.",
            ]
        )
    )
    sections.append(
        "\n\n".join(
            [
                "## 8 — Hold for the full timeline",
                "Every lock above holds from the first to the last frame. When"
                " in doubt, @Video wins.",
            ]
        )
    )
    return "\n\n".join(sections) + "\n"
