# Verification Report — SCN-M10-04-001

- **Run**: `run-2026-09-13T14-18-34-226Z-01437b8f`
- **UAT**: UAT-M10-04
- **Requirements**: REQ-RECIPE-EQUIVALENCE
- **Overall**: **PASS**
- **Git**: 42ce944f2e05991348c39b8f551cd0e9c90af0c2 (feat/m10-2-1-verification-harness) — DIRTY
- **Environment**: linux x64, node v25.9.0, python Python 3.14.7

## Steps
- ✅ `workspace.prepare` (filesystem.temp-workspace, 2ms)
- ✅ `cli.create` (cli.create-project, 494ms)
- ✅ `ui.build` (process.run, 1715ms)
- ✅ `ui.start-preview` (browser.start-preview, 1044ms)
- ✅ `ui.navigate` (browser.navigate, 792ms)
- ✅ `ui.fill` (browser.fill-wizard, 39ms)
- ✅ `ui.select-audience` (browser.select-option, 15ms)
- ✅ `ui.submit-download` (browser.submit, 99ms)
- ✅ `cli.replay-ui-plan` (cli.create-project, 352ms)

## Oracles
- ✅ `plan.recipe-owned-equivalence` [cross-language/cross-runtime] cross-runtime semantic equivalence holds (cli.cli.create.create-plan.json vs browser.ui.submit-download.create-plan.json)
  - proves: both real runtimes produced equivalent output (no manual construction of either side)
  - doesNotProve: runtimes are equivalent for inputs outside this scenario
  - diff: artifacts/plan.recipe-owned-equivalence.diff.json
- ✅ `skeleton.tree-replay` [filesystem-tree/structural] trees equal (13 files; 2 paths ignored by declared patterns)
  - proves: the produced file skeleton (paths + bytes) matches the expected skeleton
  - doesNotProve: semantic manifest equivalence or narrative content quality
  - diff: artifacts/skeleton.tree-replay.tree-diff.json
- ✅ `skeleton.narrative-content` [file-content/structural] byte-equal: /tmp/rns-m10-04-tpeNTD/from-cli/narrative.yaml vs /tmp/rns-m10-04-tpeNTD/from-ui-plan/narrative.yaml
  - proves: exact file content equality (hash-level)
  - doesNotProve: anything about files not compared
  - diff: artifacts/skeleton.narrative-content.content-diff.txt
- ✅ `browser.health` [browser/runtime-health] browser session healthy (0 page errors, 0 console errors)
  - proves: the UI surface completed the flow without runtime errors
  - doesNotProve: semantic equivalence of produced artifacts

## Evidence index
- `environment.json` — artifacts/environment.json (sha256:5e60cd1f18fd…, 125B)
- `git.observation.json` — artifacts/git.observation.json (sha256:0b7d7b9cdb28…, 597B)
- `git.dirty-files.json` — artifacts/git.dirty-files.json (sha256:6c2c9a93ea84…, 473B)
- `filesystem.workspace.prepare.path.txt` — artifacts/filesystem.workspace.prepare.path.txt (sha256:d7f36a1ead52…, 22B)
- `cli.cli.create.stdout.txt` — artifacts/cli.cli.create.stdout.txt (sha256:0b232f49ba29…, 9238B)
- `cli.cli.create.stderr.txt` — artifacts/cli.cli.create.stderr.txt (sha256:e3b0c44298fc…, 0B)
- `filesystem.cli.create.tree.json` — artifacts/filesystem.cli.create.tree.json (sha256:264db978172f…, 2194B)
- `cli.cli.create.create-plan.json` — artifacts/cli.cli.create.create-plan.json (sha256:e3dbe54cd327…, 9237B)
- `process.ui.build.stdout.txt` — artifacts/process.ui.build.stdout.txt (sha256:9bd042c4a5b5…, 413B)
- `process.ui.build.stderr.txt` — artifacts/process.ui.build.stderr.txt (sha256:269c223a4320…, 416B)
- `browser/ui.navigate.png` — artifacts/browser/ui.navigate.png (sha256:dda553ffcb65…, 23453B)
- `browser.ui.submit-download.create-plan.json` — artifacts/browser.ui.submit-download.create-plan.json (sha256:d562776e8165…, 9237B)
- `browser/ui.submit-download.png` — artifacts/browser/ui.submit-download.png (sha256:999f3e9fa098…, 31857B)
- `browser.ui.submit-download.console.json` — artifacts/browser.ui.submit-download.console.json (sha256:4e768728e3a6…, 46B)
- `cli.cli.replay-ui-plan.stdout.txt` — artifacts/cli.cli.replay-ui-plan.stdout.txt (sha256:0b232f49ba29…, 9238B)
- `cli.cli.replay-ui-plan.stderr.txt` — artifacts/cli.cli.replay-ui-plan.stderr.txt (sha256:e3b0c44298fc…, 0B)
- `filesystem.cli.replay-ui-plan.tree.json` — artifacts/filesystem.cli.replay-ui-plan.tree.json (sha256:8eacb8dd1a1a…, 2198B)
- `cli.cli.replay-ui-plan.create-plan.json` — artifacts/cli.cli.replay-ui-plan.create-plan.json (sha256:e3dbe54cd327…, 9237B)
- `plan.recipe-owned-equivalence.expected.json` — artifacts/plan.recipe-owned-equivalence.expected.json (sha256:0b232f49ba29…, 9238B)
- `plan.recipe-owned-equivalence.actual.json` — artifacts/plan.recipe-owned-equivalence.actual.json (sha256:9b2b2ccaac06…, 9238B)
- `plan.recipe-owned-equivalence.diff.json` — artifacts/plan.recipe-owned-equivalence.diff.json (sha256:4c9c9c59cd38…, 41B)
- `skeleton.tree-replay.tree-diff.json` — artifacts/skeleton.tree-replay.tree-diff.json (sha256:47af6810f50f…, 406B)
- `skeleton.narrative-content.content-diff.txt` — artifacts/skeleton.narrative-content.content-diff.txt (sha256:b6bdd4aa9aea…, 23B)
