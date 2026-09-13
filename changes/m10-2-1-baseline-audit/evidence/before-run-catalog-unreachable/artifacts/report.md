# Verification Report — SCN-M10-02-001

- **Run**: `run-2026-09-13T14-55-20-858Z-13ccbfe2`
- **UAT**: UAT-M10-06
- **Requirements**: REQ-VAH-BROWSER-AUDIT
- **Overall**: **FAIL**
- **Git**: 0a5de69e5c8f5ee9582adce2fdf0a04b5b8829d0 (feat/m10-2-1-baseline-audit) — DIRTY
- **Environment**: linux x64, node v25.9.0, python Python 3.14.7

## Steps
- ✅ `ui.build` (process.run, 1773ms)
- ✅ `ui.start-preview` (browser.start-preview, 32ms)
- ✅ `ui.overview` (browser.navigate, 868ms)
- ✅ `ui.kind.skills` (browser.navigate, 867ms)
- ✅ `ui.kind.packs` (browser.navigate, 822ms)
- ✅ `ui.kind.profiles` (browser.navigate, 821ms)
- ✅ `ui.kind.workflows` (browser.navigate, 834ms)
- ✅ `ui.kind.providers` (browser.navigate, 818ms)
- ✅ `ui.kind.recipes` (browser.navigate, 811ms)
- ✅ `ui.detail.skills` (browser.navigate, 814ms)
- ❌ `ui.detail.click` (browser.click, 30007ms) — page.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('a.capability-name')


## Oracles
- ✅ `overview.content` [browser-content/functional] DOM assertions hold on http://localhost:4173/capabilities
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.skills` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Skills"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.packs` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Packs"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.profiles` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Profiles"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.workflows` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Comfy Workflows"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.providers` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Image Providers"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `kinds.recipes` [browser-content/functional] 1 DOM assertion(s) failed: no <h1> contains "Recipes"
  - proves: the rendered UI page satisfies the declared DOM expectations
  - doesNotProve: internal app semantics (store mutation, data provenance) or content quality
- ❌ `detail.entity` [browser-content/structural] oracle error: artifact "browser.ui.detail.click.dom.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a
- ❌ `detail.no-raw-crossref` [browser-content/structural] oracle error: artifact "browser.ui.detail.click.dom.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a
- ❌ `browser.health` [browser/structural] oracle error: artifact "browser.ui.detail.click.console.json" not found in evidence bundle
  - proves: n/a
  - doesNotProve: n/a

## Unproven requirements
- REQ-VAH-BROWSER-AUDIT

## Evidence index
- `environment.json` — artifacts/environment.json (sha256:5e60cd1f18fd…, 125B)
- `git.observation.json` — artifacts/git.observation.json (sha256:96e973ee39de…, 1087B)
- `git.dirty-files.json` — artifacts/git.dirty-files.json (sha256:a56bc9c03995…, 969B)
- `process.ui.build.stdout.txt` — artifacts/process.ui.build.stdout.txt (sha256:b17fe0c5f774…, 413B)
- `process.ui.build.stderr.txt` — artifacts/process.ui.build.stderr.txt (sha256:269c223a4320…, 416B)
- `browser/ui.overview.png` — artifacts/browser/ui.overview.png (sha256:778a112d901b…, 75419B)
- `browser.ui.overview.console.json` — artifacts/browser.ui.overview.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.overview.dom.json` — artifacts/browser.ui.overview.dom.json (sha256:a7e5b3bbd1b7…, 2115B)
- `browser/ui.kind.skills.png` — artifacts/browser/ui.kind.skills.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.skills.console.json` — artifacts/browser.ui.kind.skills.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.skills.dom.json` — artifacts/browser.ui.kind.skills.dom.json (sha256:b00a00bb3fbb…, 2122B)
- `browser/ui.kind.packs.png` — artifacts/browser/ui.kind.packs.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.packs.console.json` — artifacts/browser.ui.kind.packs.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.packs.dom.json` — artifacts/browser.ui.kind.packs.dom.json (sha256:7265b982410d…, 2121B)
- `browser/ui.kind.profiles.png` — artifacts/browser/ui.kind.profiles.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.profiles.console.json` — artifacts/browser.ui.kind.profiles.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.profiles.dom.json` — artifacts/browser.ui.kind.profiles.dom.json (sha256:a36ad224f933…, 2124B)
- `browser/ui.kind.workflows.png` — artifacts/browser/ui.kind.workflows.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.workflows.console.json` — artifacts/browser.ui.kind.workflows.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.workflows.dom.json` — artifacts/browser.ui.kind.workflows.dom.json (sha256:0be8989f2b18…, 2125B)
- `browser/ui.kind.providers.png` — artifacts/browser/ui.kind.providers.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.providers.console.json` — artifacts/browser.ui.kind.providers.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.providers.dom.json` — artifacts/browser.ui.kind.providers.dom.json (sha256:a7d5ddfe2fd9…, 2125B)
- `browser/ui.kind.recipes.png` — artifacts/browser/ui.kind.recipes.png (sha256:778a112d901b…, 75419B)
- `browser.ui.kind.recipes.console.json` — artifacts/browser.ui.kind.recipes.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.kind.recipes.dom.json` — artifacts/browser.ui.kind.recipes.dom.json (sha256:bcd0a8c2efe6…, 2123B)
- `browser/ui.detail.skills.png` — artifacts/browser/ui.detail.skills.png (sha256:778a112d901b…, 75419B)
- `browser.ui.detail.skills.console.json` — artifacts/browser.ui.detail.skills.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.detail.skills.dom.json` — artifacts/browser.ui.detail.skills.dom.json (sha256:b00a00bb3fbb…, 2122B)
- `browser/ui.detail.click-trace.zip` — artifacts/browser/ui.detail.click-trace.zip (sha256:d99721fd47e5…, 214062B)
- `browser/ui.detail.click-failure.png` — artifacts/browser/ui.detail.click-failure.png (sha256:778a112d901b…, 75419B)
- `browser/ui.detail.click-console.json` — artifacts/browser/ui.detail.click-console.json (sha256:4e768728e3a6…, 46B)
