"""CLI contract tests — traceability closure for changes/spec-completion (M9).

Requirements:
- REQ-CLI-001: specs/inspect.schema.json exists, draft 2020-12, stable $id.
- REQ-CLI-002: specs/next.schema.json exists, draft 2020-12, stable $id, top-level
  goal (string) + recommended_skills array.
- REQ-CLI-003: docs/16-CLI.md and docs/25-IMPLEMENTATION-STARTER.md reference
  specs/inspect.schema.json.
- REQ-CLI-004: docs/16-CLI.md cites specs/next.schema.json.
- REQ-CLI-005: docs/16-CLI.md contains the normative "Exit codes for `narrative check`"
  table mapping exit codes 0-4 to distinct documented conditions.
- REQ-CLI-006: docs/16-CLI.md §"CLI implementation" forbids shell-string business logic.
- REQ-CLI-007: `narrative inspect --json` emits a stable envelope with
  project.identity / project.profile / project.runtimePath.
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DOCS_16 = REPO_ROOT / "docs" / "16-CLI.md"
DOCS_25 = REPO_ROOT / "docs" / "25-IMPLEMENTATION-STARTER.md"
INSPECT_SCHEMA = REPO_ROOT / "specs" / "inspect.schema.json"
NEXT_SCHEMA = REPO_ROOT / "specs" / "next.schema.json"


class TestSchemaContracts:
    """REQ-CLI-001 / REQ-CLI-002."""

    def test_inspect_schema_exists_with_draft_and_id(self):
        assert INSPECT_SCHEMA.exists()
        schema = json.loads(INSPECT_SCHEMA.read_text())
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        assert isinstance(schema.get("$id"), str) and schema["$id"].startswith("https://")

    def test_next_schema_exists_with_goal_and_skills(self):
        assert NEXT_SCHEMA.exists()
        schema = json.loads(NEXT_SCHEMA.read_text())
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        assert isinstance(schema.get("$id"), str) and schema["$id"].startswith("https://")
        props = schema.get("properties", {})
        goal = props.get("goal", {})
        assert goal.get("type") == "string"
        assert "recommended_skills" in props
        skills = props["recommended_skills"]
        assert skills.get("type") == "array"


class TestDocsReferenceSchemas:
    """REQ-CLI-003 / REQ-CLI-004 / REQ-CLI-005 / REQ-CLI-006."""

    def test_doc16_and_doc25_reference_inspect_schema(self):
        text16 = DOCS_16.read_text()
        text25 = DOCS_25.read_text()
        assert "specs/inspect.schema.json" in text16
        assert "specs/inspect.schema.json" in text25

    def test_doc16_references_next_schema(self):
        assert "specs/next.schema.json" in DOCS_16.read_text()

    def test_doc16_exit_code_table_covers_0_to_4(self):
        text = DOCS_16.read_text()
        match = re.search(r"#+\s*Exit codes for `narrative check`(.*?)(?=\n#|\Z)", text, re.S)
        assert match, "exit-code table section missing"
        section = match.group(1)
        for code in range(0, 5):
            assert re.search(rf"\b{code}\b", section), f"exit code {code} not documented"

    def test_doc16_forbids_shell_string_business_logic(self):
        text = DOCS_16.read_text()
        assert "CLI implementation" in text
        assert re.search(r"[Ss]hell[- ]string", text), "shell-string policy statement missing"


class TestStableInspectEnvelope:
    """REQ-CLI-007: inspect --json emits the stable envelope shape."""

    def _inspect(self, tmp_path: Path) -> dict:
        """Render a plan to disk, then run inspect over the rendered tree."""
        import os
        import subprocess

        env = os.environ.copy()
        env["PYTHONPATH"] = f"{REPO_ROOT / 'tools'}:{REPO_ROOT / 'tools' / 'narrative-cli'}"
        out = tmp_path / "project"
        rc = subprocess.run(
            [sys.executable, "-c",
             "import sys; from narrative_cli.cli import main; main()",
             "init", "--recipe", "middle-grade-illustrated",
             "--param", "title=T", "--param", "projectId=inspect-smoke",
             "--out", str(out), "--force"],
            cwd=str(REPO_ROOT), capture_output=True, text=True, env=env,
        )
        assert rc.returncode == 0, rc.stderr
        rc = subprocess.run(
            [sys.executable, "-c",
             "import sys; from narrative_cli.cli import main; main()",
             "inspect", "--workspace", str(out), "--json"],
            cwd=str(REPO_ROOT), capture_output=True, text=True, env=env,
        )
        assert rc.returncode == 0, rc.stderr
        return json.loads(rc.stdout)

    def test_inspect_envelope_matches_contract_schema(self, tmp_path):
        import jsonschema

        payload = self._inspect(tmp_path)
        schema = json.loads(INSPECT_SCHEMA.read_text())
        jsonschema.validate(instance=payload, schema=schema,
                            format_checker=jsonschema.FormatChecker())

    def test_inspect_envelope_carries_contract_fields(self, tmp_path):
        payload = self._inspect(tmp_path)
        project = payload["project"]
        assert project["identity"]["name"] == "inspect-smoke"
        assert project["identity"]["namespace"] == "default"
        assert project["profile"] == "profile-middle-grade-10-11"
        assert project["runtimePath"].endswith("narrative.yaml")
