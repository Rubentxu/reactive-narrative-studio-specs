# Verification Report — SCN-M10-04-001

- **Run**: `run-2026-09-13T13-55-09-740Z-d38ea65e`
- **UAT**: UAT-M10-04
- **Requirements**: REQ-RECIPE-EQUIVALENCE
- **Overall**: **FAIL**
- **Git**: bb0f8b630f9fda5f61250028b7b84218d4a3a582 (feat/m10-2-1-verification-harness) — DIRTY
- **Environment**: linux x64, node v25.9.0, python Python 3.14.7

## Steps
- ✅ `workspace.prepare` (filesystem.temp-workspace, 2ms)
- ✅ `cli.create` (cli.create-project, 394ms)
- ✅ `ui.build` (process.run, 1656ms)
- ✅ `ui.start-preview` (browser.start-preview, 1045ms)
- ✅ `ui.navigate` (browser.navigate, 1044ms)
- ❌ `ui.fill` (browser.fill-wizard, 30004ms) — page.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#title, input[name="title"], select[name="title"], textarea[name="title"]')


## Oracles
- ❌ `plan.recipe-owned-equivalence` [cross-language/structural] oracle error: artifact "browser.ui.submit-download.create-plan.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a
- ❌ `skeleton.tree-replay` [filesystem-tree/structural] oracle error: artifact "filesystem.cli.replay-ui-plan.tree.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a
- ❌ `skeleton.narrative-content` [file-content/structural] oracle error: ENOENT: no such file or directory, open '{{workspace.prepare.dir}}/from-cli/narrative.yaml'
  - proves: n/a
  - doesNotProve: n/a
- ❌ `browser.health` [browser/structural] oracle error: artifact "browser.ui.submit-download.console.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a

## Unproven requirements
- REQ-RECIPE-EQUIVALENCE

## Evidence index
- `environment.json` — artifacts/environment.json (sha256:5e60cd1f18fd…, 125B)
- `git.observation.json` — artifacts/git.observation.json (sha256:3b51b9c59404…, 428B)
- `git.dirty-files.json` — artifacts/git.dirty-files.json (sha256:c72f5595559e…, 304B)
- `filesystem.workspace.prepare.path.txt` — artifacts/filesystem.workspace.prepare.path.txt (sha256:c7906f55af70…, 22B)
- `cli.cli.create.stdout.txt` — artifacts/cli.cli.create.stdout.txt (sha256:0b232f49ba29…, 9238B)
- `cli.cli.create.stderr.txt` — artifacts/cli.cli.create.stderr.txt (sha256:e3b0c44298fc…, 0B)
- `filesystem.cli.create.tree.json` — artifacts/filesystem.cli.create.tree.json (sha256:4186d6f4a6f2…, 2194B)
- `cli.cli.create.create-plan.json` — artifacts/cli.cli.create.create-plan.json (sha256:e3dbe54cd327…, 9237B)
- `process.ui.build.stdout.txt` — artifacts/process.ui.build.stdout.txt (sha256:d325382287fd…, 352B)
- `process.ui.build.stderr.txt` — artifacts/process.ui.build.stderr.txt (sha256:71c384b4a1fc…, 373B)
- `browser/ui.navigate.png` — artifacts/browser/ui.navigate.png (sha256:f68e25f3edc1…, 14656B)
- `browser/ui.fill-trace.zip` — artifacts/browser/ui.fill-trace.zip (sha256:dea426520779…, 39606B)
- `browser/ui.fill-failure.png` — artifacts/browser/ui.fill-failure.png (sha256:f68e25f3edc1…, 14656B)
- `browser/ui.fill-console.json` — artifacts/browser/ui.fill-console.json (sha256:4e768728e3a6…, 46B)
