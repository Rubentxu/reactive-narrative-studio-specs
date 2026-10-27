"""Prompt compilation: deterministic eight-section output with hard numbers.

Requirements: REQ-CIN-18
"""

import hashlib
import subprocess
import sys
from pathlib import Path

from cinematic.prompt import VIDEO_LOCK, compile_prompt
from cinematic.shotplan import load_shot_plan, validate_shot_plan_file

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"
SECTIONS = [
    "## 1 — Reference definitions",
    "## 2 — Technical",
    "## 3 — Video lock",
    "## 4 — Action timing",
    "## 5 — Rules",
    "## 6 — Acting",
    "## 7 — Audio",
    "## 8 — Hold for the full timeline",
]


def test_compilation_is_byte_identical():
    plan = load_shot_plan(EXAMPLE)
    first = compile_prompt(plan)
    second = compile_prompt(plan)
    assert hashlib.sha256(first.encode()).hexdigest() == hashlib.sha256(second.encode()).hexdigest()


def test_all_eight_sections_present_in_order():
    text = compile_prompt(load_shot_plan(EXAMPLE))
    positions = [text.index(section) for section in SECTIONS]
    assert positions == sorted(positions)


def test_video_lock_is_verbatim():
    text = compile_prompt(load_shot_plan(EXAMPLE))
    assert VIDEO_LOCK in text


def test_action_timing_carries_geometry_numbers():
    plan = load_shot_plan(EXAMPLE)
    text = compile_prompt(plan)
    assert "frames 1–48" in text
    assert "4.03 m" in text, "distance at the first tracking segment start"
    assert "0.45 m height" in text
    assert "1.20 m height" in text
    assert "crane move" in text
    assert "END 6.0 s: figures 1 · maya walk · nothing else." in text


def test_references_get_disclaimers():
    text = compile_prompt(load_shot_plan(EXAMPLE))
    assert "@Image 1 — appearance of maya ONLY." in text
    assert "@Image 2 — style and grade ONLY." in text


def test_without_references_the_section_says_so():
    plan = load_shot_plan(EXAMPLE)
    plan.pop("styleReferences", None)
    plan.pop("characterReferences", None)
    text = compile_prompt(plan)
    assert "No reference images are attached" in text
    assert "@Image" not in text


def test_cli_prints_prompt_and_rejects_invalid_plans():
    accepted = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "prompt", "--shot-plan", str(EXAMPLE)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert accepted.returncode == 0
    assert "## 3 — Video lock" in accepted.stdout

    invalid = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "prompt", "--shot-plan",
         str(Path(__file__).resolve().parent / "fixtures/shot-plan-physics-invalid.yaml")],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert invalid.returncode == 1
    assert "below the rig minimum" in invalid.stderr
