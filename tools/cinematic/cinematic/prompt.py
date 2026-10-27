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
    lines = _segment_lines(plan, fps)
    total = frame_end_of(plan)
    lines.append(
        f"END {_timestamp(total + 1, fps)} s: figures {len(plan['subjects'])}"
        f" · {subject['id']} {subject['action']} · nothing else."
    )
    return lines


def _segment_lines(plan: dict[str, Any], fps: int, offset: float = 0.0) -> list[str]:
    """Timecoded camera lines for one plan, optionally shifted on the timeline."""

    subject = plan["subjects"][0]
    lines = []
    for segment in plan["camera"]["segments"]:
        f0, f1 = segment["frames"]
        move = _MOVE_LANGUAGE[str(segment["move"])]
        height = float(camera_position(plan, f0)[2])
        distance = _distance_to_subject(plan, f0)
        start = f"{offset + (f0 - 1) / fps:.1f}"
        end = f"{offset + (f1 - 1) / fps:.1f}"
        lines.append(
            f"- {start}–{end} s (frames {f0}–{f1}):"
            f" {move}; camera about {_fmt(distance)} m from {subject['id']}"
            f" at {_fmt(height)} m height."
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


def compile_sequence_prompt(sequence: dict[str, Any], base_dir) -> str:
    """Compile a validated multi-shot sequence into one continuous video prompt.

    The shots are already validated (the caller runs the sequence checks); the
    timeline is cumulative over each plan's real duration, cuts between shots
    are declared explicitly, and reference images are numbered by first
    appearance across the whole sequence.
    """

    from pathlib import Path

    from cinematic.shotplan import load_shot_plan

    base = Path(base_dir)
    shots = sequence["shots"]
    plans = [load_shot_plan(base / str(shot["shotPlan"])) for shot in shots]

    durations = [frame_end_of(plan) / int(plan["fps"]) for plan in plans]
    total = sum(durations)
    starts = [sum(durations[:index]) for index in range(len(durations))]

    lines_by_image: list[str] = []
    image_numbers: dict[tuple[str, str], int] = {}
    next_image = 1
    for plan in plans:
        subject_id = str(plan["subjects"][0]["id"])
        for reference in plan.get("characterReferences", []):
            key = ("character", str(reference))
            if key not in image_numbers:
                image_numbers[key] = next_image
                lines_by_image.append(
                    f"@Image {next_image} — appearance of {subject_id} ONLY. Not its"
                    f" motion, not its framing, not the environment. ({reference})"
                )
                next_image += 1
        for reference in plan.get("styleReferences", []):
            key = ("style", str(reference))
            if key not in image_numbers:
                image_numbers[key] = next_image
                lines_by_image.append(
                    f"@Image {next_image} — style and grade ONLY. Not the subject, not"
                    f" the timing. ({reference})"
                )
                next_image += 1

    characters = [str(name) for name in sequence["characters"]]
    character_actions: dict[str, list[str]] = {name: [] for name in characters}
    for plan in plans:
        for subject in plan["subjects"]:
            action = str(subject["action"])
            if action not in character_actions[str(subject["id"])]:
                character_actions[str(subject["id"])].append(action)

    timing: list[str] = []
    for index, (shot, plan) in enumerate(zip(shots, plans)):
        timing.append(
            f"SHOT {index + 1} · {shot['id']} ({starts[index]:.1f}–{starts[index] + durations[index]:.1f} s)"
            f" — {shot['shotPlan']}, screen direction {shot['screenDirection']}."
        )
        timing.extend(_segment_lines(plan, int(plan["fps"]), offset=starts[index]))
        if index + 1 < len(shots):
            timing.append(f"CUT to shot {index + 2}.")
    timing.append(
        f"END {total:.1f} s: figures {len(characters)} · {len(shots)} shots"
        " · hard cuts declared · nothing else."
    )

    acting = [
        f"{name}: {'; '.join(actions)} — with intent, steady, continuous small"
        " business so they never freeze; gaze engaged, natural blink cadence,"
        " never glassy."
        for name, actions in character_actions.items()
    ]

    sections: list[str] = []
    sections.append(
        "\n\n".join(
            [
                "## 1 — Reference definitions",
                "@Video — camera, cuts and timing ONLY. Not colour, not styling, not content.",
                *[
                    f"{name}: same appearance and wardrobe across every shot."
                    for name in characters
                ],
                *lines_by_image,
            ]
        )
    )
    sections.append(
        "\n\n".join(
            [
                "## 2 — Technical",
                f"Duration {total:.1f} s across {len(shots)} shots"
                f" ({sum(frame_end_of(plan) for plan in plans)} frames) at"
                f" {int(plans[0]['fps'])} fps."
                " Live-action photography, no CGI look, no readable text on screen.",
            ]
        )
    )
    sections.append("\n\n".join(["## 3 — Video lock", VIDEO_LOCK]))
    sections.append("\n\n".join(["## 4 — Action timing", *timing]))
    sections.append(
        "\n\n".join(
            [
                "## 5 — Rules",
                f"1. The figures are exactly {', '.join(characters)}. No extras, no"
                " duplicates, no half-bodies at the frame edges.",
                "2. The cuts are hard and happen exactly where declared; the camera"
                " language inside each shot is the one @Video shows.",
                "3. Anything not visible in the previz stays out of frame unless a"
                " rule above states otherwise.",
            ]
        )
    )
    sections.append("\n\n".join(["## 6 — Acting", *acting]))
    sections.append(
        "\n\n".join(
            [
                "## 7 — Audio",
                "[Sound design] quiet ambient bed only. [SFX] none specified by"
                " the plans. [Dialogue] none. [Music] none.",
            ]
        )
    )
    sections.append(
        "\n\n".join(
            [
                "## 8 — Hold for the full timeline",
                "Every lock above holds from the first to the last frame of every"
                " shot. The sequence renders as ONE continuous video, never an"
                " edited reel. When in doubt, @Video wins.",
            ]
        )
    )
    return "\n\n".join(sections) + "\n"
