# Tasks: debt-resolution-process — close 6 m12 carry-overs + retire pack-only invariant (m13)

**Cycle**: `p-7c4aff45199a2069/m13-debt-resolution-process` | **Path**: A-lite | **Phase**: build (sequence 145)
**Base SHA**: `389e05a` (v0.5.5; working tree clean post-v0.5.5) | **Wave order (locked)**: `0 → A → B1 (CLI) → B2 (MANIFEST regen)`
**Spec REQ→Block coverage**: REQ-RDP-1..6 → Block A | REQ-PAC-1..3 → Block B | AC-INV-vfix → Block 0 | 23 ACs total

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | +404 to +1406 LoC (Block 0: ≤6; A: +200..+400; B: +400..+700 + MANIFEST regen ≤10) |
| 400-line budget risk | Low (per-block commit ≤400 LoC; CLI + regen ≤800 split by B1/B2 atomic commits) |
| Chained PRs recommended | No (4 atomic commits within A-lite 6-review-block ceiling) |
| Suggested split | Single PR; 4 atomic commits (B0 → B-A → B-B1 → B-B2); each independently revertible |
| Delivery strategy | exception-ok (A-lite; orchestrator-owned transitions; lease=null per engine v1.57.0) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

N/A — single PR within LoC budget per commit. Per-block revertibility via atomic commits. R-rebudget fallback (m13a + m13b split) NOT triggered; risk R6 closed in design.

---

## Phase 1: Foundation (Block 0 — verifier-fix)

**Commit**: `fix(spec-completion): ac-10-oracle-stale-script` | ≤6 LoC net (2 sites × ≤3) | no schema change.

- [ ] **1.1 T-0a** Replace broken `$defs`-key oracle at `changes/spec-completion/tasks.md` L439-442 with enum-coverage + count oracle reading `s['properties']['eventType']['enum']`; assert `len(e)==8 and set(e)>=req` (per design §"Decision: Block 0 oracle shape"). **Oracle**: `python3 -c "..."` (verbatim AC-13.5) → stdout `AC-13.5 PASS`, exit 0. **ACs**: AC-13.5 (REQ-RDP-vfix). **Dependencies**: none.
- [ ] **1.2 T-0b** Mirror patch at `changes/spec-completion/WAVE-4-DEFERRED.md` L84-87 with the identical fixed oracle (canonical text mirror; per design §"Search/Replace" + AC-13.5b). **Oracle**: `diff <(sed -n '439,442p' changes/spec-completion/tasks.md) <(sed -n '84,87p' changes/spec-completion/WAVE-4-DEFERRED.md)` → empty. **ACs**: AC-13.5b. **Dependencies**: T-0a (mirror of T-0a).

## Phase 2: Process Spec (Block A — `debt-resolution-process`)

**Commit**: `debt(spec|debt-resolution-process): debt-resolution-process-and-pack-only-retirement` | +200..+400 LoC | in-pack, no schema.

- [ ] **2.1 T-A1** Author §"marker convention" in `changes/debt-resolution-process/spec.md` (new file) — `<!-- debt-marker(<id>, kind=<type>, rationale=<one-liner>) -->` syntax; kinds taxonomy `overeng | duplication | coupling`; placement rule (immediately above affected §"Approach" cell or code block). **Oracle**: `grep -cE 'debt-marker\(DEBT-OVERENG-001' changes/debt-resolution-process/spec.md` → ≥1; same for `kinds taxonomy|overeng\|duplication\|coupling`. **ACs**: REQ-RDP-1, EVT-RDP-01, AC-13.1. **Dependencies**: T-0a, T-0b (Block 0 lands first per design §"Ordering rule").
- [ ] **2.2 T-A2** Author §"payload-review convention" in `spec.md` — annotation syntax `<!-- payload-review(diff-scope=<list>, subject-scope=<list>, mismatch-rationale=<one-liner>) -->`; lifecycle (advisory at proposal → binding at archive); verification `git log --format=%s -1` vs `git diff --stat`. **Oracle**: `grep -c 'payload-review' changes/debt-resolution-process/{proposal,spec}.md` → ≥2. **ACs**: REQ-RDP-2, EVT-RDP-02. **Dependencies**: none (parallel-safe with T-A1).
- [ ] **2.3 T-A3** Author §"cross-coupling rule" + §"AC-023c threshold reformulation" in `spec.md` — cycle-artifact `spec.md` MAY reference inner-repo substrate but SHALL NOT introduce substrate coupling the pre-cycle substrate contract does not already authorise; AC-023c threshold derived from `examples/visual-spec.yaml` field count (content-derived), NOT `docs/10-VISUAL-IR.md` file count (artifact-derived); concrete derivation formula. **Oracle**: `grep -cE 'cross-coupling|AC-023c|content-derived' changes/debt-resolution-process/spec.md` → ≥3; `git diff --stat <cycle-artifact-dir>` introduced substrate coupling = 0. **ACs**: REQ-RDP-3 (parts 1+2), EVT-RDP-03. **Dependencies**: none (parallel-safe).
- [ ] **2.4 T-A4** Author §"pack-only retirement" (REQ-RDP-4) in `spec.md` — invariant transition `pack-only → pack+tools` declared; v0.5.5 (`9c87582…`) as last pack-only release; consequences for `sddk-verify` + `sddk-debt-verify` (`debt-tooling-cluster` additive for A-full, A-lite remains 4 required); Block 0 documented as last in-pack-only fragment. **Oracle**: `grep -c 'pack-only retirement\|pack+tools' changes/debt-resolution-process/spec.md` → ≥2; archive-record `## Invariant Transitions` exists (forward-reference; **owner = archive-phase**, not apply). **ACs**: REQ-RDP-4, EVT-RDP-04, AC-13.8 (archive-owned). **Dependencies**: T-A1..T-A3 (semantic context).
- [ ] **2.5 T-A5** Author §"pack-overhead review gate" (REQ-RDP-5) in `spec.md` — three threshold bands (PASS / WARN ≤25% over / FAIL >25% over OR ADR cap >26); metric set (LoC/cap, ADR count, MANIFEST entry count, tool surface count); argv/exit_code recorded per SC-POL-1 (semantic anchor for Block B; per design §"Decision: `resolve` placement"). **Oracle**: `grep -cE 'pack-overhead review gate|PASS.*WARN.*FAIL' changes/debt-resolution-process/spec.md` → ≥1. **ACs**: REQ-RDP-5, EVT-RDP-05 (semantic anchor; verification at Block B). **Dependencies**: T-A4 (pack-only retirement defines surface).
- [ ] **2.6 T-A6** Author §"duplication taxonomy" (REQ-RDP-6) in `spec.md` — three axes `structural | content | contract` with one pre-m13 example per axis (e.g. profile-middle-grade-10-11 content-duplication signature across `examples/catalog-project.yaml:21`, `templates/narrative.yaml:12`, `docs/08-PROFILES.md:38,95`, `docs/13-CONTROL-PLANE.md:91`). **Oracle**: `grep -cE 'structural.*content.*contract|^### |axis' changes/debt-resolution-process/spec.md` → ≥3 axis labels. **ACs**: REQ-RDP-6, EVT-RDP-06 (semantic anchor; verification at Block B). **Dependencies**: T-A5 (gate semantics context).
- [ ] **2.7 T-A7** (OPTIONAL) Append one-line "debt carry-over" entry to `docs/27-GLOSSARY.md` (term anchor for REQ-RDP-1..6). **Oracle**: `grep -c 'debt carry-over' docs/27-GLOSSARY.md` → ≥1. **ACs**: AC-INV-glossary. **Dependencies**: T-A1 (REQ-RDP-1 anchor). Skip without blocker if reviewer prefers.

## Phase 3: Tooling (Block B — `sddk-pack-audit` + MANIFEST regen)

**Commits**: 2 atomic commits (B1: CLI; B2: MANIFEST regen). Anchored to `tools/check-skill-crossrefs.sh` (69 LoC Bash precedent, `set -euo pipefail` at L6; per design §"Decision: Bash").

- [ ] **3.1 T-B1a** Create `tools/sddk-pack-audit` shell scaffold — `#!/usr/bin/env bash` + `set -euo pipefail` + `--root` flag parser + 3-arm dispatcher (`case "$cmd" in taxonomy|gate|resolve ...)`); receiver functions `dispatch_taxonomy` / `dispatch_gate` / `dispatch_resolve`. **Oracle**: `test -x tools/sddk-pack-audit` → exit 0; `bash -n tools/sddk-pack-audit` → exit 0 (syntax check). **ACs**: AC-13.2 (sub-command surface). **Dependencies**: T-A5, T-A6 (gate + taxonomy semantics cited).
- [ ] **3.2 T-B1b** Implement `taxonomy` subcommand — walk `specs/ examples/ templates/ docs/ tools/` (Bash glob); classify into the 3 REQ-RDP-6 axes (`structural | content | contract`); emit report with verbatim axis labels. **Oracle**: `tools/sddk-pack-audit taxonomy --root .` → exit 0, stdout contains `structural`, `content`, `contract`. **ACs**: REQ-PAC-1, EVT-PAC-01, AC-13.2. **Dependencies**: T-B1a, T-A6 (taxonomy semantics).
- [ ] **3.3 T-B1c** Implement `gate` subcommand — read `docs/adrs/ADR-*.md` count + `MANIFEST.json.documents` count + `tools/*` count; apply REQ-RDP-5 thresholds (PASS / WARN ≤25% over / FAIL >25% OR ADR >26); first stdout line `PASS|WARN|FAIL`. **Oracle**: `tools/sddk-pack-audit gate --root .` → exit 0, `head -1` == `PASS` (baseline 25 ADRs, 127 MANIFEST entries, 1 tool entry). **ACs**: REQ-PAC-2, EVT-PAC-02, AC-13.3. **Dependencies**: T-B1b (sub-command pattern), T-A5 (gate semantics).
- [ ] **3.4 T-B1d** Implement `resolve` sub-command — grep `specs/profile-aliases.yaml` for `id: profile-middle-grade-10-11` then `canonical_name:` line; print canonical name; stderr + exit 1 on unknown alias. **Oracle**: `tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root .` → exit 0, stdout `Middle Grade (10-11)`. **ACs**: REQ-PAC-3, EVT-PAC-03, AC-13.4 (closes m12 R1/R5 by consumption). **Dependencies**: T-B1a (scaffold), m12A canonical `specs/profile-aliases.yaml`.
- [ ] **3.5 T-B1e** Wire SC-POL-1 receipts — append `{"argv": [...], "exit_code": <n>, "command": "<sub>", "timestamp": "<ISO8601>"}` JSONL line to `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl` at the end of each `taxonomy`/`gate`/`resolve` execution (before exit). **Oracle**: `test "$(wc -l < cycle-artifacts/.../cli-receipts.jsonl)" -eq 3 && python3 -c "import json;[json.loads(l) for l in open('cycle-artifacts/.../cli-receipts.jsonl')]"` → exit 0. **ACs**: AC-INV-rdd. **Dependencies**: T-B1b, T-B1c, T-B1d (each sub-command must reach exit point first).
- [ ] **3.6 T-B2** MANIFEST.json regen — append `./tools/sddk-pack-audit` (sorted, before `_meta`); bump `_meta.regenerated_at`; update `_meta.regeneration_reason` = `"m13: added tools/sddk-pack-audit CLI (taxonomy+gate+resolve); count 127 → 128"`. **Oracle**: `jq '.documents | length' MANIFEST.json` → 128; `jq '.documents | map(select(. | startswith("./tools/"))) | length' MANIFEST.json` → 2. **ACs**: AC-13.6, AC-INV-packonly. **Dependencies**: T-B1a (CLI must exist before regen references it).

## Phase 4: Vault closures (6 finding files; **owner = apply-phase** at frontmatter update time)

**Commit**: included in Block A (T-A1..T-A6 sub-tasks each carry their own `findings_closed[]` reference in spec); vault frontmatter updates by apply executor post-Block A landing per design §"File Changes" vault row. No new atomic commit for vault alone.

- [ ] **4.1 T-V1** Update 4 vault finding files (`finding-DEBT-OVERENG-001`, `finding-DEBT-OVERENG-002`, `finding-DEBT-COUPLING-002`, `finding-DEBT-COUPLING-003`) under `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/` — append `findings_closed[]` entry referencing REQ-RDP-{1,2,3} + EVT-RDP-{01,02,03} + `closed_at_cycle: p-7c4aff45199a2069/m13-debt-resolution-process`. **Oracle**: `for f in DEBT-OVERENG-001 DEBT-OVERENG-002 DEBT-COUPLING-002 DEBT-COUPLING-003; do grep -lE "findings_closed.*$f" ~/.sddk-knowledge/.../cycles/finding-$f-*.md | grep -q . || exit 1; done` → exit 0. **ACs**: AC-13.7 (partial; 4/6). **Dependencies**: T-A1..T-A3 (spec authoring precedes closure record).
- [ ] **4.2 T-V2** For the 2 M8 carry-overs lacking vault nodes (`DEBT-OVERENG-NEW-M8-001`, `DEBT-DUPLICATION-NEW-M8-001`): create `finding-DEBT-OVERENG-NEW-M8-001-2026-08-30.md` and `finding-DEBT-DUPLICATION-NEW-M8-001-2026-08-30.md` in vault; append `findings_closed[]` referencing REQ-PAC-{1,2} + EVT-PAC-{01,02} + `{"anchored_in": "REQ-RDP-{5,6}", "implemented_in": "REQ-PAC-{1,2}"}`. **Oracle**: same as 4.1, expanded to 6 IDs; `ls ~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-DEBT-OVERENG-NEW-M8-001*.md` exists. **ACs**: AC-13.7 (full; 6/6). **Dependencies**: T-A5, T-A6, T-B1c, T-B1b (semantic + runtime anchors).

## Phase 5: Cluster verification (cross-cut; no source modification; **owner = verify-phase** for AC-CC gate)

- [ ] **5.1 T-X1** Run AC-13.5/13.5b (Block 0) + AC-13.1/13.2/13.3/13.4 (Blocks A+B ACs) + AC-13.6/AC-INV-packonly (MANIFEST regen) + AC-INV-rdd (3-entry JSONL) + AC-INV-schema (`git diff --stat 389e05a..HEAD -- 'specs/*.schema.json'` = empty) + AC-13.9 (`ls docs/adrs/ADR-*.md | wc -l` ≤26). **Oracle**: see Design §"Test Plan" greps; cluster closure by consumption count (EVT-PAC-01..03 produce exit `0` receipts). **ACs**: AC-13.5/5b, AC-13.1..13.6, AC-13.9, AC-INV-{schema,packonly,rdd,vfix}. **Dependencies**: all preceding.
- [ ] **5.2 T-X2** Confirm 6 vault `findings_closed[]` entries valid per AC-13.7; cross-check against REQ-RDP-* / REQ-PAC-* (one-to-one mapping). **Oracle**: `for f in <6 IDs>; do test "$(grep -c "findings_closed.*$f" ~/.sddk-knowledge/.../cycles/finding-$f-*.md)" -ge 1; done` → 6 PASS. **ACs**: AC-13.7. **Dependencies**: T-V1, T-V2.

---

## Blocking edges

| Edge | Reason |
|------|--------|
| **T-0a → T-0b** | T-0b is the canonical text mirror of T-0a; AC-13.5b diff-equality requires identical patch (R4). |
| **T-0a,T-0b → T-A1..T-A6** | Block A cites the new oracle's exit-0 evidence as a precedent; design §"Ordering rule" mandates Block 0 first. |
| **T-A1..T-A6 → T-B1a..T-B1e** | Block B's `gate` (REQ-PAC-2) cites spec §"pack-overhead review gate" (REQ-RDP-5); Block B's `taxonomy` (REQ-PAC-1) cites spec §"duplication taxonomy" (REQ-RDP-6); design §"Decision: `resolve` placement" anchors CLI to Block A semantics. |
| **T-B1a → T-B1b, T-B1c, T-B1d** | Scaffold defines sub-command dispatcher; sub-commands require scaffold existence. |
| **T-B1b, T-B1c, T-B1d → T-B1e** | Receipt wiring appends to JSONL after each sub-command exits; sub-commands must exist first. |
| **T-B1a → T-B2** | MANIFEST regen references the CLI path; CLI must exist before MANIFEST entry is meaningful (AC-13.6 manifest coherent). |
| **T-A1..T-A6 → T-V1, T-V2** | Vault `findings_closed[]` entries reference REQ-RDP-*/REQ-PAC-*; spec authoring precedes closure recording. |
| **All → T-X1, T-X2** | Cluster oracles run after all blocks land (AC-13.10 zero introduced HIGH/MEDIUM/CRITICAL). |

## Work-unit commit plan (4 atomic commits across 3 reviewable blocks)

| # | Commit subject | Block | Touched files | Owner phase |
|---|----------------|-------|---------------|-------------|
| 1 | `fix(spec-completion): ac-10-oracle-stale-script` | 0 | `changes/spec-completion/{tasks.md,WAVE-4-DEFERRED.md}` | apply |
| 2 | `debt(spec\|debt-resolution-process): debt-resolution-process-and-pack-only-retirement` | A | `changes/debt-resolution-process/spec.md` (new) + optional `docs/27-GLOSSARY.md` + vault frontmatter (4 of 6 finding files) | apply |
| 3 | `feat(tools\|sddk-pack-audit): taxonomy-gate-resolve-subcommands` | B1 | `tools/sddk-pack-audit` (new, ~400-700 LoC) | apply |
| 4 | `chore(manifest): regen-for-m13-pack-audit-cli` | B2 | `MANIFEST.json` (+1 entry; 127 → 128) + `cycle-artifacts/.../m13-.../cli-receipts.jsonl` (3 entries) + vault frontmatter (2 of 6 finding files: NEW-M8-001 + DUPLICATION-NEW-M8-001) | apply |

Each commit independently revertible. Block A + B1 + B2 cite Block 0's oracle as evidence of deterministic verification. Block 0 commits first to close verifier drift before next verifier run (R4 mitigation per design §"R4 | AC-10 oracle may be re-stale-proofed in another file").

## Risk propagation (R1–R11 → per-task mitigations)

| Risk | Mitigated in |
|------|--------------|
| **R1** first post-pack-only cycle | T-A4 transitions `pack-only → pack+tools`; T-X1 confirms AC-INV-packonly (`tools/` count = 2) |
| **R2** first multi-line `tools/` entry; reviewer attention | T-B1a anchors to `check-skill-crossrefs.sh` precedent (`set -euo pipefail`, scope-files array); T-B1e enforces SC-POL-1 receipts |
| **R3** ADR headroom 25/26 | Design Decision §"No ADR-026"; no ADR task; T-X1 verifies `ls docs/adrs/ADR-*.md \| wc -l` ≤ 26 |
| **R4** AC-10 oracle stale in another file | T-0b mirrors T-0a patch at canonical text mirror (`WAVE-4-DEFERRED.md`); T-X1 diff-equality check |
| **R5** `sddk-pack-audit` precedent | T-B1a anchors Bash precedent; T-B1e records argv/exit_code per SC-POL-1 |
| **R6** 3 atomic blocks may exceed 6-block ceiling | 4 atomic commits in 3 blocks ≤ 6; design §"R6" closed. **R-rebudget fallback (m13a + m13b split)** NOT triggered |
| **R7** INC-025 (tainted-receipt governance) | Out of scope §"Out of Scope"; framework backlog; no apply task |
| **R8** marker convention ceremonial | T-A1 enforces marker placement + kinds taxonomy at proposal; T-V1 binds via `findings_closed[]` |
| **R9** cross-coupling rule "redocumenting" | T-A3 introduces concrete content-derived threshold (AC-023c reformulation); T-V1 binds |
| **R10** `{{ profiles.X }}` divergence from m12 syntax | T-B1d mirrors m12 REQ-A verbatim; T-X1 AC-13.4 against m12A canonical registry |
| **R11** pack-only retirement "process-only" | T-A4 + AC-INV-packonly (concrete `tools/` count = 2); archive-phase records `## Invariant Transitions` section |

## Gate evaluation & transition (recommendation)

- **Gate**: `tasks-executable` → **passed** | **Transition**: `phase.build.complete` (A-lite build → apply; orchestrator owns)
- **Requirement coverage**: REQ-RDP-1 → T-A1 | REQ-RDP-2 → T-A2 | REQ-RDP-3 → T-A3 | REQ-RDP-4 → T-A4 | REQ-RDP-5 → T-A5 | REQ-RDP-6 → T-A6 | REQ-PAC-1 → T-B1b | REQ-PAC-2 → T-B1c | REQ-PAC-3 → T-B1d | AC-INV-vfix → T-0a+0b | AC-INV-rdd → T-B1e | AC-INV-manifest → T-B2 | AC-INV-packonly → T-B2 | AC-INV-schema → T-X1 | AC-INV-glossary → T-A7 | AC-INV-no-new-high → T-X1 (post-apply verify) | 23 ACs total. 11 m1 invariants preserved; ADR count 25 ≤ 26 cap; LoC budget +404..+1406; ~6-10 files touched.
- **CLI ledger contract**: per A-lite path, the orchestrator owns `evaluate-gate` + `transition` + `ledger verify` (no lease/fencing token provided to this executor; m7 + m12 precedents confirm A-lite executors do not invoke CLI transitions).

## Next recommended

`sddk-apply` (commit-by-commit: T-0a,b → T-A1..T-A7 → T-B1a..T-B1e → T-B2 → T-V1,V2 → T-X1,X2). **M14+ pivot**: M14 may promote `debt-tooling-cluster` from optional to required for A-full paths; M14 may also land ADR-026 if `sddk-pack-audit` semantics warrant an irreversibility decision after one observation cycle. **INC-025** (R7) stays in framework backlog. **Archive-phase owner**: AC-13.8 `## Invariant Transitions` section in `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/archive-report.md` records `pack-only → pack+tools` with v0.5.5 as last pack-only release — flagged for archive, not apply.

---

*End of tasks.md. 19 tasks across 5 phases: Phase 1 (Block 0: 2) + Phase 2 (Block A: 6 mandatory + 1 optional glossary) + Phase 3 (Block B: 6) + Phase 4 (vault closures: 2) + Phase 5 (cluster verification: 2). A-lite path; 4 atomic commits within 6-review-block ceiling; orchestrator owns phase transition; R-rebudget fallback NOT triggered.*
