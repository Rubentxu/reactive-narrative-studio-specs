"""Deterministic generation of the Blender scene script from a shot plan.

The generator is a pure function: the same validated plan always yields a
byte-identical script (fixed float formatting, sorted emission, no host paths,
no clocks, no randomness). The generated script builds the blocking geometry
and camera, saves the scene, optionally renders a workbench playblast, and
writes the execution metadata at the very end — a run is only successful when
the metadata file exists and validates.
"""

from __future__ import annotations

from typing import Any

_REPRESENTATION_TO_PRIMITIVE = {
    "capsule": "uv_sphere",
    "sphere": "uv_sphere",
    "cube": "cube",
}

_CAMERA_BACK_OFFSET = 4.0
_CAMERA_NAME = "CIN_CAMERA"
_CAMERA_ROTATION = "(1.5707963267948966, 0.0, 3.141592653589793)"

_SCRIPT_TEMPLATE = '''\
"""Scene generated from a validated shot plan.

Builds the blocking geometry and camera, saves the scene file, and writes the
execution metadata describing what was created. All work happens inside the
current working directory.
"""

import hashlib
import json
import math
import sys
import traceback

MODE = {mode!r}
SHOT_ID = {shot_id!r}
FPS = {fps}
FPS_BASE = 1.0
FRAME_START = 1
FRAME_END = {frame_end}
CAMERA_LENS_MM = {lens_mm:.6f}
CAMERA_BACK_OFFSET = {back_offset:.6f}
CAMERA_NAME = {camera_name!r}
SUBJECTS = {subjects}
SEGMENTS = {segments}

RENDER_ENGINE = "BLENDER_WORKBENCH"
RENDER_WIDTH = 640
RENDER_HEIGHT = 360


def _sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _camera_position(segment, frame_start, frame_end):
    f0, f1 = segment["frames"]
    t = 0.0 if f1 == f0 else min(max((frame_start - f0) / (f1 - f0), 0.0), 1.0)
    move = segment["move"]
    if move == "crane_up":
        height = segment["heightFrom"] + (segment["heightTo"] - segment["heightFrom"]) * t
    else:
        height = segment["height"]
    return (-CAMERA_BACK_OFFSET, 0.0, height)


def build_scene():
    import bpy

    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = FPS_BASE
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END

    for subject in SUBJECTS:
        primitive = {primitive_map}
        if primitive == "cube":
            bpy.ops.mesh.primitive_cube_add(location=(subject["start"][0], subject["start"][1], subject["start"][2]))
        else:
            bpy.ops.mesh.primitive_uv_sphere_add(location=(subject["start"][0], subject["start"][1], subject["start"][2]))
        obj = bpy.context.active_object
        obj.name = subject["id"]

        obj.location = subject["start"]
        obj.keyframe_insert(data_path="location", frame=FRAME_START)
        obj.location = subject["end"]
        obj.keyframe_insert(data_path="location", frame=FRAME_END)
        for fcurve in obj.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = "LINEAR"

    camera_data = bpy.data.cameras.new(CAMERA_NAME)
    camera_data.lens = CAMERA_LENS_MM
    camera = bpy.data.objects.new(CAMERA_NAME, camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.rotation_euler = {camera_rotation}
    for segment in SEGMENTS:
        f0, f1 = segment["frames"]
        x, y, height = _camera_position(segment, f0, f0)
        camera.location = (x, y, height)
        camera.keyframe_insert(data_path="location", frame=f0)
        if f1 != f0:
            x, y, height = _camera_position(segment, f1, f1)
            camera.location = (x, y, height)
            camera.keyframe_insert(data_path="location", frame=f1)
    for fcurve in camera.animation_data.action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "LINEAR"

    return scene


def render_playblast(scene):
    import bpy

    scene.render.engine = RENDER_ENGINE
    scene.render.resolution_x = RENDER_WIDTH
    scene.render.resolution_y = RENDER_HEIGHT
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.filepath = "//playblast"
    bpy.ops.render.render(animation=True)
    expected = "playblast{{:04d}}-{{:04d}}.mp4".format(FRAME_START, FRAME_END)
    import os
    if not os.path.isfile(bpy.path.abspath("//" + expected)):
        raise RuntimeError("expected playblast artifact was not produced: " + expected)


def write_metadata():
    import bpy
    import os

    outputs = []
    blend_path = "scene.blend"
    outputs.append({{"path": blend_path, "sha256": _sha256_of(bpy.path.abspath("//" + blend_path))}})
    if MODE == "playblast":
        mp4_path = "playblast{{:04d}}-{{:04d}}.mp4".format(FRAME_START, FRAME_END)
        outputs.append({{"path": mp4_path, "sha256": _sha256_of(bpy.path.abspath("//" + mp4_path))}})

    metadata = {{
        "version": 1,
        "shotId": SHOT_ID,
        "mode": MODE,
        "fps": FPS,
        "fps_base": FPS_BASE,
        "frame_start": FRAME_START,
        "frame_end": FRAME_END,
        "camera": {{"lensMm": CAMERA_LENS_MM, "segments": SEGMENTS}},
        "objects": [s["id"] for s in SUBJECTS] + [CAMERA_NAME],
        "render": {{
            "engine": RENDER_ENGINE,
            "resolution": {{"width": RENDER_WIDTH, "height": RENDER_HEIGHT}},
            "container": "FFMPEG",
            "codec": "H264",
        }},
        "outputs": outputs,
    }}
    with open("scene-metadata.json", "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, sort_keys=True, indent=2)
        handle.write("\\n")


def main():
    import bpy

    scene = build_scene()
    if MODE == "playblast":
        render_playblast(scene)
    bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath("//scene.blend"))
    write_metadata()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
'''


def _format_number(value: Any) -> float:
    """Normalize to float so the emitted literals are valid Python numbers.

    ``repr`` of a float is deterministic for the same value, which keeps the
    generated script byte-identical across runs.
    """

    return float(value)


def _subjects_literal(plan: dict[str, Any]) -> str:
    subjects = [
        {
            "id": subject["id"],
            "representation": subject["representation"],
            "start": [_format_number(c) for c in subject["start"]],
            "end": [_format_number(c) for c in subject["end"]],
        }
        for subject in plan["subjects"]
    ]
    return repr(subjects)


def _segments_literal(plan: dict[str, Any]) -> str:
    segments = []
    for segment in plan["camera"]["segments"]:
        entry: dict[str, Any] = {"frames": list(segment["frames"]), "move": segment["move"]}
        if "height" in segment:
            entry["height"] = _format_number(segment["height"])
        if "heightFrom" in segment:
            entry["heightFrom"] = _format_number(segment["heightFrom"])
        if "heightTo" in segment:
            entry["heightTo"] = _format_number(segment["heightTo"])
        segments.append(entry)
    return repr(segments)


def generate_scene_script(plan: dict[str, Any], mode: str = "scene") -> str:
    """Render the deterministic scene script for a validated shot plan."""

    frame_end = int(plan["durationSeconds"] * plan["fps"])
    return _SCRIPT_TEMPLATE.format(
        mode=mode,
        shot_id=str(plan["id"]),
        fps=int(plan["fps"]),
        frame_end=frame_end,
        lens_mm=float(plan["camera"]["lensMm"]),
        back_offset=_CAMERA_BACK_OFFSET,
        camera_name=_CAMERA_NAME,
        camera_rotation=_CAMERA_ROTATION,
        subjects=_subjects_literal(plan),
        segments=_segments_literal(plan),
        primitive_map=repr(_REPRESENTATION_TO_PRIMITIVE),
    )
