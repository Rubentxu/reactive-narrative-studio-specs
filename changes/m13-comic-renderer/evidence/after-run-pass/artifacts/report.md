# Verification Report — SCN-M13-01-001

- **Run**: `run-2026-09-24T18-50-33-811Z-44dc63b7`
- **UAT**: UAT-M13-01
- **Requirements**: REQ-CR-2, REQ-CR-3, REQ-CR-4, REQ-CR-5, REQ-CR-6
- **Overall**: **PASS**
- **Git**: e9e49809783e0049b7769063457e46a0f5035570 (feat/m13-comic-renderer) — DIRTY
- **Environment**: linux x64, node v25.9.0, python Python 3.14.7

## Steps
- ✅ `ui.build` (process.run, 1607ms)
- ✅ `ui.start-preview` (browser.start-preview, 1044ms)
- ✅ `ui.comic` (browser.navigate, 874ms)
- ✅ `ui.probe-layers` (browser.evaluate, 112ms)
- ✅ `ui.toggle-art` (browser.click, 165ms)
- ✅ `ui.probe-after-toggle` (browser.evaluate, 92ms)
- ✅ `ui.download-cbz` (browser.submit, 142ms)

## Oracles
- ✅ `comic.layers-separated` [browser-evaluate/functional] evaluate result matches expectations (browser.ui.probe-layers.eval.json)
  - proves: the declared in-page probe (DOM/storage/state) returns the expected observable result
  - doesNotProve: anything outside the probe script; probe correctness is reviewer-audited
  - diff: artifacts/comic.layers-separated.diff.json
- ✅ `comic.toggle-works` [browser-evaluate/functional] evaluate result matches expectations (browser.ui.probe-after-toggle.eval.json)
  - proves: the declared in-page probe (DOM/storage/state) returns the expected observable result
  - doesNotProve: anything outside the probe script; probe correctness is reviewer-audited
  - diff: artifacts/comic.toggle-works.diff.json
- ✅ `cbz.proof-contents` [zip-entries/structural] zip ok: 11 entries [page-01.svg, page-02.svg, page-03.svg, page-04.svg, page-05.svg, page-06.svg, page-07.svg, page-08.svg, page-09.svg, pag…]
  - proves: the exported archive carries the declared entries and searchable raw content
  - doesNotProve: visual rendering quality of the pages
- ✅ `browser.health` [browser/runtime-health] browser session healthy (0 page errors, 0 console errors)
  - proves: the UI surface completed the flow without runtime errors
  - doesNotProve: semantic equivalence of produced artifacts

## Evidence index
- `environment.json` — artifacts/environment.json (sha256:5e60cd1f18fd…, 125B)
- `git.observation.json` — artifacts/git.observation.json (sha256:45f12d279308…, 925B)
- `git.dirty-files.json` — artifacts/git.dirty-files.json (sha256:0169cbcc15d1…, 811B)
- `process.ui.build.stdout.txt` — artifacts/process.ui.build.stdout.txt (sha256:499215dc07ad…, 413B)
- `process.ui.build.stderr.txt` — artifacts/process.ui.build.stderr.txt (sha256:269c223a4320…, 416B)
- `browser/ui.comic.png` — artifacts/browser/ui.comic.png (sha256:811396ff0c1b…, 69590B)
- `browser.ui.comic.console.json` — artifacts/browser.ui.comic.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.comic.dom.json` — artifacts/browser.ui.comic.dom.json (sha256:d980a64850a5…, 990B)
- `browser.ui.probe-layers.eval.json` — artifacts/browser.ui.probe-layers.eval.json (sha256:abb2f814c12e…, 137B)
- `browser/ui.probe-layers.png` — artifacts/browser/ui.probe-layers.png (sha256:811396ff0c1b…, 69590B)
- `browser/ui.toggle-art.png` — artifacts/browser/ui.toggle-art.png (sha256:cd352a971e72…, 62675B)
- `browser.ui.toggle-art.console.json` — artifacts/browser.ui.toggle-art.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.toggle-art.dom.json` — artifacts/browser.ui.toggle-art.dom.json (sha256:d980a64850a5…, 990B)
- `browser.ui.probe-after-toggle.eval.json` — artifacts/browser.ui.probe-after-toggle.eval.json (sha256:84ae6b7b98d4…, 57B)
- `browser/ui.probe-after-toggle.png` — artifacts/browser/ui.probe-after-toggle.png (sha256:cd352a971e72…, 62675B)
- `comic.proof.cbz` — artifacts/comic.proof.cbz (sha256:92a0e87ad289…, 29697B)
- `browser/ui.download-cbz.png` — artifacts/browser/ui.download-cbz.png (sha256:2217769923d6…, 67378B)
- `browser.ui.download-cbz.console.json` — artifacts/browser.ui.download-cbz.console.json (sha256:4e768728e3a6…, 46B)
- `browser.ui.download-cbz.dom.json` — artifacts/browser.ui.download-cbz.dom.json (sha256:cb626f7dd435…, 1034B)
- `comic.layers-separated.actual.json` — artifacts/comic.layers-separated.actual.json (sha256:abb2f814c12e…, 137B)
- `comic.layers-separated.diff.json` — artifacts/comic.layers-separated.diff.json (sha256:4c9c9c59cd38…, 41B)
- `comic.toggle-works.actual.json` — artifacts/comic.toggle-works.actual.json (sha256:84ae6b7b98d4…, 57B)
- `comic.toggle-works.diff.json` — artifacts/comic.toggle-works.diff.json (sha256:4c9c9c59cd38…, 41B)
- `cbz.proof-contents.entries.txt` — artifacts/cbz.proof-contents.entries.txt (sha256:b0430c409304…, 221B)
