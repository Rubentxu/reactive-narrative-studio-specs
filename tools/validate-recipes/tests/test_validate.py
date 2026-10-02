# Tests for the INC-015 fallback of tools/validate-recipes/validate.py
# (negative-fixtures recursive search). Requirements: REQ-M11-5
#
# Pattern: subprocess invocation (validate.py is a script with main() and module
# state), mirroring tools/narrative-cli/tests/test_cli.py. The target path is
# passed ABSOLUTE, so (repo_root / args.path).resolve() resolves to it by
# pathlib semantics regardless of cwd or the script's REPO_ROOT.

import subprocess
import sys
from pathlib import Path

import pytest

VALIDATE = Path(__file__).parent.parent / "validate.py"

# Minimal invalid recipe modeled on the real fixture
# recipes/middle-grade-illustrated/tests/negative-fixtures/missing-required.yaml:
# schema + metadata without the required "title" -> >= 1 error diagnostic.
BAD_RECIPE = """\
schema: creation-recipe/v1

metadata:
  id: negative-fixture
  # missing title

parameters:
  type: object
  properties: {}
"""


def write_fixture(negative_fixtures_dir: Path) -> Path:
    negative_fixtures_dir.mkdir(parents=True, exist_ok=True)
    fixture = negative_fixtures_dir / "bad.yaml"
    fixture.write_text(BAD_RECIPE, encoding="utf-8")
    return fixture


def run_negative_fixtures(target: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATE), "--negative-fixtures", str(target)],
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_fallback_single_nested_dir(tmp_path: Path) -> None:
    """INC-015: one nested negative-fixtures dir is found unambiguously (exit 0)."""
    write_fixture(tmp_path / "recipes" / "one" / "tests" / "negative-fixtures")
    # No top-level <tmp>/tests/negative-fixtures: the direct branch misses and
    # the recursive fallback must take over.
    result = run_negative_fixtures(tmp_path / "recipes")
    assert result.returncode == 0
    assert "correctly fails" in result.stdout


def test_fallback_reports_expected_error(tmp_path: Path) -> None:
    """INC-015: the validator reports the expected diagnostic for the fixture."""
    write_fixture(tmp_path / "recipes" / "one" / "tests" / "negative-fixtures")
    result = run_negative_fixtures(tmp_path / "recipes")
    assert result.returncode == 0
    # The error diagnostic line printed by the validator (code + message).
    assert "-> " in result.stdout


def test_fallback_multiple_dirs_ambiguous(tmp_path: Path) -> None:
    """INC-015: several nested dirs require an explicit argument (exit 2)."""
    write_fixture(tmp_path / "recipes" / "one" / "tests" / "negative-fixtures")
    write_fixture(tmp_path / "recipes" / "two" / "tests" / "negative-fixtures")
    result = run_negative_fixtures(tmp_path / "recipes")
    assert result.returncode == 2
    assert "Multiple negative-fixtures directories" in result.stderr


def test_direct_path_still_works(tmp_path: Path) -> None:
    """The non-fallback branch (<target>/tests/negative-fixtures) is unaffected."""
    write_fixture(tmp_path / "tests" / "negative-fixtures")
    result = run_negative_fixtures(tmp_path)
    assert result.returncode == 0
    assert "correctly fails" in result.stdout
