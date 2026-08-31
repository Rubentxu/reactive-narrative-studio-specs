"""Tests for the narrative CLI."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest


# Path to the narrative CLI entry point
NARRATIVE_CLI = Path(__file__).parent.parent / "narrative_cli" / "cli.py"


def run_narrative(args: list[str], recipes_root: str = "recipes") -> tuple[int, str, str]:
    """Run the narrative CLI and return (exit_code, stdout, stderr)."""
    env = os.environ.copy()
    env["PYTHONPATH"] = f"tools:{os.environ.get('PYTHONPATH', '')}"
    result = subprocess.run(
        [sys.executable, "-m", "narrative_cli.cli"] + args,
        cwd=Path(__file__).parent.parent.parent,
        capture_output=True,
        text=True,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


def run_narrative_via_entry_point(args: list[str], recipes_root: str = "recipes") -> tuple[int, str, str]:
    """Run the narrative CLI by invoking main() directly."""
    # repo_root is 4 parents up from tools/narrative-cli/tests/test_cli.py
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{repo_root}/tools:{env.get('PYTHONPATH', '')}"
    code = f"""
import sys
from pathlib import Path
repo_root = Path('{repo_root}')
sys.path.insert(0, str(repo_root / 'tools'))
from narrative_cli.cli import main
main()
"""
    result = subprocess.run(
        [sys.executable, "-c", code] + args,
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


class TestNarrativeInit:
    """Tests for `narrative init`."""

    def test_init_happy_path(self, tmp_path):
        """narrative init happy path — exits 0, creates all skeleton files."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init",
            "--recipe", "middle-grade-illustrated",
            "--param", "title=Test Book",
            "--param", "projectId=test-book",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
        ])
        assert rc == 0, f"Expected 0, got {rc}. stderr: {stderr}"
        # Check all skeleton files exist
        expected_files = [
            "narrative.yaml",
            "goals.yaml",
            "canon/chapters/01-opening.md",
            "canon/chapters/02-incident.md",
            "canon/chapters/03-resolution.md",
            "canon/characters/protagonist.yaml",
            "canon/characters/deuteragonist.yaml",
            "profiles/profile-middle-grade-10-11.yaml",
            "packs/story_core/story_intake.md",
            "packs/characters/character_design.md",
            "packs/editorial/editorial_pass.md",
            "packs/visual_core/visual_bible_seed.md",
        ]
        for f in expected_files:
            assert (out / f).exists(), f"Missing: {f}"
        # Check .narrative/create-plan.json
        plan_path = out / ".narrative" / "create-plan.json"
        assert plan_path.exists(), ".narrative/create-plan.json missing"
        plan = json.loads(plan_path.read_text())
        assert plan["recipe"] == "middle-grade-illustrated"
        assert plan["manifest"]["id"] == "test-book"
        assert "createPlanSha256" in plan
        assert "skeleton" in plan
        assert len(plan["skeleton"]) == 12

    def test_init_invalid_project_id(self, tmp_path):
        """Invalid projectId exits 1; no files written."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init",
            "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            "--param", "projectId=invalid project",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
        ])
        assert rc == 1, f"Expected 1, got {rc}"
        assert "does not match" in stderr
        assert not out.exists()

    def test_init_missing_required_param(self, tmp_path):
        """Missing required parameter exits 1; no files written."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init",
            "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            # missing projectId and audience
            "--out", str(out),
        ])
        assert rc == 1, f"Expected 1, got {rc}"
        assert not out.exists()

    def test_init_missing_recipe(self, tmp_path):
        """Nonexistent recipe exits 3."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init",
            "--recipe", "nonexistent-recipe",
            "--param", "title=X",
            "--param", "projectId=x",
            "--out", str(out),
        ])
        assert rc == 3, f"Expected 3, got {rc}"
        assert not out.exists()

    def test_init_dry_run(self, tmp_path):
        """--dry-run exits 0; no files created."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init",
            "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
            "--dry-run",
        ])
        assert rc == 0, f"Expected 0, got {rc}"
        assert not out.exists()
        assert "Dry run" in stderr

    def test_init_force(self, tmp_path):
        """--force overwrites existing files."""
        out = tmp_path / "project"
        # Create project once
        rc1, _, _ = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--param", "title=X", "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
        ])
        assert rc1 == 0
        # Create a marker file in the output dir
        marker = out / "MARKER.txt"
        marker.write_text("marker")
        # Force overwrite
        rc2, _, _ = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--param", "title=Y", "--param", "projectId=y",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out), "--force",
        ])
        assert rc2 == 0
        assert marker.exists()  # force should have kept it

    def test_init_conflict_without_force(self, tmp_path):
        """Without --force, conflicting files cause exit 2."""
        out = tmp_path / "project"
        # Create project once
        rc1, _, _ = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--param", "title=X", "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
        ])
        assert rc1 == 0
        # Try again without --force
        rc2, stdout, stderr = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--param", "title=Y", "--param", "projectId=y",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out),
        ])
        assert rc2 == 2, f"Expected 2, got {rc2}"
        assert "not empty" in stderr

    def test_init_json_output(self, tmp_path):
        """--json outputs canonical JSON to stdout."""
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--param", "title=X", "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out), "--json",
        ])
        assert rc == 0
        plan = json.loads(stdout)
        assert plan["recipe"] == "middle-grade-illustrated"
        assert "createPlanSha256" in plan

    def test_init_params_file(self, tmp_path):
        """--params-file reads parameters from a JSON file."""
        params_file = tmp_path / "params.json"
        params_file.write_text(json.dumps({
            "title": "From File",
            "projectId": "from-file",
            "audience": "profile-middle-grade-10-11",
        }))
        out = tmp_path / "project"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "init", "--recipe", "middle-grade-illustrated",
            "--params-file", str(params_file),
            "--out", str(out),
        ])
        assert rc == 0
        plan_path = out / ".narrative" / "create-plan.json"
        plan = json.loads(plan_path.read_text())
        assert plan["manifest"]["id"] == "from-file"


class TestNarrativePlan:
    """Tests for `narrative plan`."""

    def test_plan_emits_json_to_stdout(self):
        """narrative plan emits JSON to stdout with all required fields."""
        rc, stdout, stderr = run_narrative_via_entry_point([
            "plan", "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--json",
        ])
        assert rc == 0, f"Expected 0, got {rc}. stderr: {stderr}"
        plan = json.loads(stdout)
        assert plan["recipe"] == "middle-grade-illustrated"
        assert "createPlanSha256" in plan
        assert "recipeLockSha256" in plan
        assert "manifest" in plan
        assert "skeleton" in plan
        assert len(plan["skeleton"]) == 12

    def test_plan_invalid_params(self):
        """narrative plan with invalid params exits 1."""
        rc, stdout, stderr = run_narrative_via_entry_point([
            "plan", "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            "--param", "projectId=invalid id",
            "--param", "audience=profile-middle-grade-10-11",
            "--json",
        ])
        assert rc == 1
        assert "does not match" in stderr

    def test_plan_missing_recipe(self):
        """narrative plan with nonexistent recipe exits 3."""
        rc, stdout, stderr = run_narrative_via_entry_point([
            "plan", "--recipe", "nonexistent",
            "--param", "title=X",
            "--param", "projectId=x",
        ])
        assert rc == 3

    def test_plan_to_file(self, tmp_path):
        """narrative plan --out writes to a file."""
        out_file = tmp_path / "plan.json"
        rc, stdout, stderr = run_narrative_via_entry_point([
            "plan", "--recipe", "middle-grade-illustrated",
            "--param", "title=X",
            "--param", "projectId=x",
            "--param", "audience=profile-middle-grade-10-11",
            "--out", str(out_file),
            "--json",
        ])
        assert rc == 0
        plan = json.loads(out_file.read_text())
        assert plan["recipe"] == "middle-grade-illustrated"
        assert "plan written" in stderr.lower()
