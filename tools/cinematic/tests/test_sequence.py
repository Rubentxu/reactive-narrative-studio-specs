"""Sequence plans: continuity validation and the multi-shot prompt.

Requirements: REQ-CIN-20
"""

import hashlib
import subprocess
import sys
from pathlib import Path

from cinematic.sequence import validate_sequence_file

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
SEQUENCE = FIXTURES / "sequence-two-shots.yaml"


def _write_variant(tmp_path: Path, text: str) -> Path:
    variant = tmp_path / "sequence-variant.yaml"
    variant.write_text(text, encoding="utf-8")
    return variant


def _variant_referencing(plan_path: Path, sequence_characters: str = "maya", shot_characters: str = "maya") -> str:
    return (
        "id: VAR-01\n"
        f"characters: [{sequence_characters}]\n"
        "shots:\n"
        f"  - id: only-shot\n"
        f"    shotPlan: {plan_path}\n"
        "    screenDirection: neutral\n"
        f"    characters: [{shot_characters}]\n"
    )


def test_example_sequence_validates_clean():
    _, violations = validate_sequence_file(SEQUENCE)
    assert violations == []


def test_sequence_prompt_is_byte_identical():
    from cinematic.prompt import compile_sequence_prompt
    from cinematic.sequence import load_sequence

    sequence = load_sequence(SEQUENCE)
    first = compile_sequence_prompt(sequence, SEQUENCE.parent)
    second = compile_sequence_prompt(sequence, SEQUENCE.parent)
    assert hashlib.sha256(first.encode()).hexdigest() == hashlib.sha256(second.encode()).hexdigest()


def test_undeclared_character_breaks_continuity(tmp_path):
    variant = _write_variant(
        tmp_path,
        _variant_referencing(FIXTURES / "shot-plan-first.yaml", shot_characters="ghost"),
    )
    _, violations = validate_sequence_file(variant)
    assert any("not declared in the sequence" in v.message and "ghost" in v.message for v in violations)


def test_subject_not_declared_as_character_is_rejected(tmp_path):
    variant = _write_variant(
        tmp_path,
        _variant_referencing(FIXTURES / "shot-plan-first.yaml", sequence_characters="other"),
    )
    _, violations = validate_sequence_file(variant)
    assert any(
        "not declared as sequence characters" in v.message and "maya" in v.message for v in violations
    )


def test_shot_citing_undeclared_character_is_rejected(tmp_path):
    variant = _write_variant(
        tmp_path,
        _variant_referencing(FIXTURES / "shot-plan-first.yaml", shot_characters="maya, ghost"),
    )
    _, violations = validate_sequence_file(variant)
    assert any("not declared in the sequence" in v.message and "ghost" in v.message for v in violations)


def test_invalid_referenced_plan_blocks_the_sequence(tmp_path):
    variant = _write_variant(tmp_path, _variant_referencing(FIXTURES / "shot-plan-physics-invalid.yaml"))
    _, violations = validate_sequence_file(variant)
    assert any("cannot be built on an impossible take" in v.message for v in violations)


def test_unknown_fields_are_rejected(tmp_path):
    variant = _write_variant(
        tmp_path,
        (FIXTURES / "sequence-two-shots.yaml").read_text(encoding="utf-8").replace(
            "id: SEQF-01", "id: SEQF-01\nnotes: extra"
        ),
    )
    _, violations = validate_sequence_file(variant)
    assert any("additional properties" in v.message.lower() for v in violations)


def test_sequence_prompt_declares_cuts_and_cumulative_timeline():
    from cinematic.prompt import compile_sequence_prompt
    from cinematic.sequence import load_sequence

    text = compile_sequence_prompt(load_sequence(SEQUENCE), SEQUENCE.parent)
    assert "CUT to shot 2." in text
    assert "SHOT 1 · track-and-rise (0.0–6.0 s)" in text
    assert "SHOT 2 · settle (6.0–8.0 s)" in text
    assert "6.0–8.0 s (frames 1–48)" in text
    assert "END 8.0 s: figures 1 · 2 shots · hard cuts declared · nothing else." in text
    assert "ONE continuous video, never an" in text
    assert "@Image 1" in text and "@Image 2" not in text, "the shared character reference is numbered once"


def test_cli_prints_sequence_prompt_and_rejects_broken_sequences(tmp_path):
    accepted = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "sequence-prompt", "--sequence", str(SEQUENCE)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert accepted.returncode == 0
    assert "## 3 — Video lock" in accepted.stdout

    broken = tmp_path / "broken.yaml"
    broken.write_text("id: BROKEN\ncharacters: [maya]\nshots: []\n", encoding="utf-8")
    rejected = subprocess.run(
        [sys.executable, "-m", "tools.cinematic", "sequence-prompt", "--sequence", str(broken)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert rejected.returncode == 1
