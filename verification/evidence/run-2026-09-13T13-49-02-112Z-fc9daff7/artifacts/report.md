# Verification Report — SCN-HARNESS-BOOTSTRAP-001

- **Run**: `run-2026-09-13T13-49-02-112Z-fc9daff7`
- **UAT**: SELF-TEST
- **Requirements**: REQ-VAH-BOOTSTRAP
- **Overall**: **PASS**
- **Git**: 3aa6b825756d5faa762dd5d1ac0770fb320649cb (feat/m10-2-1-verification-harness) — DIRTY
- **Environment**: linux x64, node v25.9.0, python Python 3.14.7

## Steps
- ✅ `workspace.prepare` (filesystem.temp-workspace, 2ms)
- ✅ `git.observe` (git.observe, 38ms)

## Oracles
- ✅ `artifact-roundtrip` [semantic-json/functional-equivalence] semantic JSON equal (ignored paths: 0, declared and justified)
  - proves: recipe-owned fields are semantically equivalent under declared normalization
  - doesNotProve: equivalence of fields outside the compared artifacts; narrative quality
  - diff: artifacts/artifact-roundtrip.diff.json

## Evidence index
- `environment.json` — artifacts/environment.json (sha256:5e60cd1f18fd…, 125B)
- `git.observation.json` — artifacts/git.observation.json (sha256:9d3dbdcf9e6b…, 420B)
- `git.dirty-files.json` — artifacts/git.dirty-files.json (sha256:a4ab6d4a90ee…, 296B)
- `filesystem.workspace.prepare.path.txt` — artifacts/filesystem.workspace.prepare.path.txt (sha256:8af87b718024…, 23B)
- `git.git.observe.json` — artifacts/git.git.observe.json (sha256:9d3dbdcf9e6b…, 420B)
- `artifact-roundtrip.expected.json` — artifacts/artifact-roundtrip.expected.json (sha256:9d3dbdcf9e6b…, 420B)
- `artifact-roundtrip.actual.json` — artifacts/artifact-roundtrip.actual.json (sha256:9d3dbdcf9e6b…, 420B)
- `artifact-roundtrip.diff.json` — artifacts/artifact-roundtrip.diff.json (sha256:4c9c9c59cd38…, 41B)
