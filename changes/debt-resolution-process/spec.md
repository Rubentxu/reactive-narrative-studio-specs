# debt-resolution-process + pack-audit-cli — Delta Spec (NEW capabilities)

## Source

- **Proposal SHA-256**: `55580129fad003e42625ba23e488a571f5d9a722a474f959cd4492da266ada2` (`changes/debt-resolution-process/proposal.md`, 171 LoC; cycle artifact `art-555801293fad-fcca1178`).
- **Explore-report SHA-256**: `28eefa8e…` (`cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/explore-report.md`, 255 LoC, C3, gates G1–G8 PASS).
- **Cycle**: `p-7c4aff45199a2069/m13-debt-resolution-process` (A-lite, branch `feat/m13-debt-resolution-process-2026-08-30`, base `389e05a`).
- **Path**: A-lite; **version target**: v0.5.6 (patch bump).
- **Capability IDs (both NEW)**: `debt-resolution-process`, `pack-audit-cli`. No MODIFIED capabilities.
- **Affected surfaces**: `changes/debt-resolution-process/{proposal,design,tasks,spec}.md`, `tools/sddk-pack-audit` (new), `MANIFEST.json` (regen, +1 entry: 127 → 128), `changes/spec-completion/{tasks.md L439-442, WAVE-4-DEFERRED.md L84-87}` (verifier-fix), optional `docs/27-GLOSSARY.md` amendment.
- **Findings closed (6 carry-overs from m12)**:
  - DEBT-OVERENG-001 (`1c8e5f3b70cd96db`, LOW/P3) → REQ-RDP-1
  - DEBT-OVERENG-002 (`f14f80ae0125eaa0`, LOW/P3) → REQ-RDP-2
  - DEBT-COUPLING-002 (`5b8c0a7d3c4b9c5e`, LOW/P3) → REQ-RDP-3
  - DEBT-COUPLING-003 (`d6c5a3b9d5e2c4d1`, LOW/P3) → REQ-RDP-3
  - DEBT-OVERENG-NEW-M8-001 (`e3b8f02c47b09b53`, LOW/P3, MEDIUM confidence) → REQ-RDP-5 + REQ-PAC-2
  - DEBT-DUPLICATION-NEW-M8-001 (`0b7d2c4e8a1f9b6a`, LOW/P3, MEDIUM confidence) → REQ-RDP-6 + REQ-PAC-1
- **Findings deferred (out of scope)**: INC-025 (tainted-receipt governance) stays in framework backlog; no `specs/*.schema.json` modifications (AC-INV-schema binding).

## Purpose

m12 closed 4 of 10 carry-overs via the alias-registry refactor and bucketed the remaining 6 LOW/P3 findings into its §"M13 Pivot Advisory". This delta resolves all 6 by authorising **two net-new capabilities** plus a one-place verifier-fix and an explicit invariant transition:

1. **`debt-resolution-process`** — codifies the **process** for resolving LOW/P3 carry-overs that survive m-cycle alias-registry closures: the marker convention for intentional-abstraction calls, the payload-review convention for commit-subject drift, the cross-coupling rule between cycle-artifact spec amendments and inner-repo substrate fixtures, the AC-023c threshold reformulation, the duplication-taxonomy and pack-overhead-gate **definitions** (the runtime tests live in `pack-audit-cli`), and the retirement of the pack-only invariant that governed m9–m12.
2. **`pack-audit-cli`** — first post-pack-only `tools/` entry; Bash-or-Python CLI exposing three sub-commands (`taxonomy`, `gate`, `resolve`) anchored to `tools/check-skill-crossrefs.sh` precedent. Closes R1/R5 of m12 spec by **consumption** of the alias registry, not by contract canonicalisation.

After this delta, the cycle no longer assumes `specs/ examples/ templates/ docs/` are the sole mutable surface; `tools/` becomes a governed, in-scope path and `MANIFEST.json` regen covers the new entry.

---

## Capability: `debt-resolution-process`

### Requirement: REQ-RDP-1 — Marker Convention for Intentional-Abstraction Calls (DEBT-OVERENG-001)

The system SHALL document and enforce a marker convention in `changes/<change-name>/proposal.md` that distinguishes intentional-abstraction calls from incidental over-engineering. The marker SHALL be a one-line HTML/Markdown comment placed immediately above the affected §"Approach" table cell or code block, in the form `<!-- debt-marker(DEBT-OVERENG-001, kind=<type>, rationale=<one-liner>) -->`. The vault finding file `~/.sddk-knowledge/<project>/cycles/finding-DEBT-OVERENG-001-*.md` frontmatter MUST record the cycle that introduced the marker and the change that closed it.

#### Scenario: EVT-RDP-01 — Marker convention applied and finding closed

- **GIVEN** the carry-over finding `DEBT-OVERENG-001` is open at vault with fingerprint `1c8e5f3b70cd96db`
- **WHEN** the apply phase lands Block A
- **THEN** `changes/debt-resolution-process/proposal.md` SHALL carry at least one `<!-- debt-marker(DEBT-OVERENG-001, kind=<type>, rationale=...) -->` marker that traces an intentional-abstraction call
- **AND** `changes/debt-resolution-process/spec.md` SHALL carry a §"marker convention" subsection specifying the comment syntax, the kinds taxonomy (overeng | duplication | coupling), and the placement rule
- **AND** the vault finding file's `findings_closed[]` SHALL contain `{"finding_id": "DEBT-OVERENG-001", "closed_in": "debt-resolution-process", "closed_by_requirement": "REQ-RDP-1", "scenario": "EVT-RDP-01", "closed_at_cycle": "p-7c4aff45199a2069/m13-debt-resolution-process"}`
- **AND** `grep -c 'DEBT-OVERENG-001' changes/debt-resolution-process/proposal.md changes/debt-resolution-process/spec.md` SHALL return `>= 2`.

### Requirement: REQ-RDP-2 — Payload-Review Convention for Commit-Subject Drift (DEBT-OVERENG-002)

The system SHALL document a payload-review convention that flags commit subjects whose scope or content drift from the diff body. The convention SHALL require a one-line "payload review" annotation in the affected `changes/<change-name>/proposal.md` §"Approach" table whenever the commit subject does not grammatically match the diff scope, with the annotation form `<!-- payload-review(diff-scope=<list>, subject-scope=<list>, mismatch-rationale=<one-liner>) -->`. The convention is **advisory** (not blocking) at proposal phase; it becomes binding at archive phase where the actual commit is captured.

#### Scenario: EVT-RDP-02 — Payload-review convention documented and finding closed

- **GIVEN** the carry-over finding `DEBT-OVERENG-002` is open at vault with fingerprint `f14f80ae0125eaa0`
- **WHEN** the apply phase lands Block A
- **THEN** `changes/debt-resolution-process/spec.md` SHALL carry a §"payload-review convention" subsection specifying the annotation syntax, the advisory-vs-binding lifecycle (advisory at proposal; binding at archive), and the verification rule (`git log --format=%s -1` vs `git diff --stat`)
- **AND** `changes/debt-resolution-process/proposal.md` SHALL contain at least one payload-review annotation referencing any drift between the proposal §"Approach" table and the actual diff scope of Blocks 0/A/B
- **AND** the vault finding file's `findings_closed[]` SHALL contain `{"finding_id": "DEBT-OVERENG-002", "closed_in": "debt-resolution-process", "closed_by_requirement": "REQ-RDP-2", "scenario": "EVT-RDP-02", "closed_at_cycle": "p-7c4aff45199a2069/m13-debt-resolution-process"}`
- **AND** `grep -c 'payload-review' changes/debt-resolution-process/{proposal,spec}.md` SHALL return `>= 2`.

### Requirement: REQ-RDP-3 — Cross-Coupling Rule + AC-023c Threshold Reformulation (DEBT-COUPLING-002, DEBT-COUPLING-003)

The system SHALL clarify the cross-coupling rule between cycle-artifact spec amendments and inner-repo substrate fixtures, and SHALL reformulate the AC-023c threshold (currently anchored in `docs/10-VISUAL-IR.md`) so that the threshold is **content-derived** rather than artifact-derived. The rule: cycle-artifact `spec.md` MAY reference inner-repo substrate files (specs/examples/templates/docs) but the spec SHALL NOT introduce or modify substrate coupling that the inner-repo's substrate contract does not already authorise. The AC-023c threshold reformulation: the threshold value SHALL be derived from the **content** of `examples/visual-spec.yaml` field count (a stable content metric) rather than from the **count of files** in `docs/10-VISUAL-IR.md` (an artifact metric that drifts with file additions).

#### Scenario: EVT-RDP-03 — Cross-coupling rule + AC-023c threshold documented and findings closed

- **GIVEN** the carry-over findings `DEBT-COUPLING-002` (fingerprint `5b8c0a7d3c4b9c5e`) and `DEBT-COUPLING-003` (fingerprint `d6c5a3b9d5e2c4d1`) are open at vault
- **WHEN** the apply phase lands Block A
- **THEN** `changes/debt-resolution-process/spec.md` SHALL carry a §"cross-coupling rule" subsection specifying the cycle-artifact vs inner-repo substrate boundary, including the verification rule (`git diff --stat <cycle-artifact-dir>` SHALL NOT introduce substrate coupling that the pre-cycle substrate contract does not already cover)
- **AND** `changes/debt-resolution-process/spec.md` SHALL carry a §"AC-023c threshold reformulation" subsection specifying that the threshold value is derived from `examples/visual-spec.yaml` field count rather than from `docs/10-VISUAL-IR.md` file count, with a concrete derivation formula
- **AND** the vault finding files for DEBT-COUPLING-002 and DEBT-COUPLING-003 SHALL each carry a `findings_closed[]` entry referencing REQ-RDP-3 and EVT-RDP-03
- **AND** `grep -cE 'cross-coupling|AC-023c|content-derived' changes/debt-resolution-process/spec.md` SHALL return `>= 3`.

### Requirement: REQ-RDP-4 — Pack-only Invariant Retirement (R-postpack-1)

The system SHALL retire the pack-only invariant that governed m9–m12 (cycles MAY modify ONLY `specs/ examples/ templates/ docs/`) with the landing of this change's Block B. The retirement is a **process decision**, not a code change. The new invariant: cycles MAY modify the pack surface AND the `tools/` surface, where `tools/` is governed by Bash/Python CLI patterns anchored to `tools/check-skill-crossrefs.sh` and `MANIFEST.json` is regen-mutable by any cycle that adds or removes a `tools/` entry. Block 0 of this change (verifier-fix in `changes/spec-completion/`) is the LAST in-pack-only cycle fragment; m13 archive phase records the explicit invariant transition `pack-only → pack+tools`.

#### Scenario: EVT-RDP-04 — Pack-only retirement recorded and transition logged

- **GIVEN** the m12 release `v0.5.5` (HEAD `9c87582…`) shipped as the last pack-only cycle
- **WHEN** the apply phase lands Block A and Block B
- **THEN** `changes/debt-resolution-process/spec.md` SHALL carry a §"pack-only retirement" subsection declaring the transition and listing the consequences for `sddk-verify` and `sddk-debt-verify` (new `debt-tooling-cluster` is additive for A-full paths; A-lite remains at the original 4 required clusters)
- **AND** the m13 archive-phase `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/archive-report.md` SHALL carry a `## Invariant Transitions` section recording `pack-only → pack+tools` with `v0.5.5` as the last pack-only release
- **AND** `grep -c 'pack-only retirement\|pack+tools' changes/debt-resolution-process/spec.md cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/archive-report.md` SHALL return `>= 2`.

### Requirement: REQ-RDP-5 — Pack-Overhead Review Gate Semantics (DEBT-OVERENG-NEW-M8-001)

The system SHALL define the pack-overhead review gate semantics that `tools/sddk-pack-audit gate` (REQ-PAC-2) implements. The gate SHALL evaluate the pack's structural overhead (LoC per capability, ADR count per docs/, MANIFEST entry count, tooling surface count) and emit PASS/WARN/FAIL based on three thresholds: PASS if all overhead metrics are within budget; WARN if any metric exceeds budget by ≤25%; FAIL if any metric exceeds budget by >25% OR if the ADR cap (≤26) is breached. The gate MUST record argv and exit_code per SC-POL-1.

#### Scenario: EVT-RDP-05 — Gate semantics defined and finding closed

- **GIVEN** the carry-over finding `DEBT-OVERENG-NEW-M8-001` is open at vault with fingerprint `e3b8f02c47b09b53`
- **WHEN** the apply phase lands Block A
- **THEN** `changes/debt-resolution-process/spec.md` SHALL carry a §"pack-overhead review gate" subsection specifying the three threshold bands, the metric set (LoC per capability, ADR count, MANIFEST entry count, tooling surface count), and the PASS/WARN/FAIL emission rule
- **AND** the vault finding file's `findings_closed[]` SHALL contain `{"finding_id": "DEBT-OVERENG-NEW-M8-001", "closed_in": "pack-audit-cli", "closed_by_requirement": "REQ-PAC-2", "scenario": "EVT-PAC-02", "closed_at_cycle": "p-7c4aff45199a2069/m13-debt-resolution-process"}` (semantic anchor in REQ-RDP-5; verification in REQ-PAC-2 / EVT-PAC-02)
- **AND** the closure entry SHALL note `{"anchored_in": "REQ-RDP-5", "implemented_in": "REQ-PAC-2"}`.

### Requirement: REQ-RDP-6 — Duplication Taxonomy Definition (DEBT-DUPLICATION-NEW-M8-001)

The system SHALL define a structural-vs-content duplication taxonomy that `tools/sddk-pack-audit taxonomy` (REQ-PAC-1) implements. The taxonomy SHALL distinguish: (a) **structural duplication** — same file-shape or path-shape repeated across the pack (e.g. multiple `examples/*-profile.yaml` files sharing skeleton); (b) **content duplication** — same string or literal identifier repeated across files (e.g. `profile-middle-grade-10-11` across 5 pack files pre-m12); (c) **contract duplication** — same contract surface declared in two unrelated locations (e.g. alias registry at `specs/profile-aliases.yaml` vs canonical profile at `examples/middle-grade-profile.yaml:2`). The taxonomy output MUST classify each finding under one of these three axes and MUST NOT introduce a fourth axis.

#### Scenario: EVT-RDP-06 — Taxonomy defined and finding closed

- **GIVEN** the carry-over finding `DEBT-DUPLICATION-NEW-M8-001` is open at vault with fingerprint `0b7d2c4e8a1f9b6a`
- **WHEN** the apply phase lands Block A
- **THEN** `changes/debt-resolution-process/spec.md` SHALL carry a §"duplication taxonomy" subsection specifying the three axes (structural, content, contract) with one example per axis drawn from the pack's pre-m13 history
- **AND** the vault finding file's `findings_closed[]` SHALL contain `{"finding_id": "DEBT-DUPLICATION-NEW-M8-001", "closed_in": "pack-audit-cli", "closed_by_requirement": "REQ-PAC-1", "scenario": "EVT-PAC-01", "closed_at_cycle": "p-7c4aff45199a2069/m13-debt-resolution-process"}` (semantic anchor in REQ-RDP-6; verification in REQ-PAC-1 / EVT-PAC-01)
- **AND** the closure entry SHALL note `{"anchored_in": "REQ-RDP-6", "implemented_in": "REQ-PAC-1"}`.

### §"marker convention"

**Purpose**: Distinguish intentional-abstraction calls (documented debt) from incidental over-engineering.

**Syntax**:
```html
<!-- debt-marker(<id>, kind=<type>, rationale=<one-liner>) -->
```

**Kinds taxonomy**:
- `overeng` — over-engineered abstraction beyond current requirement
- `duplication` — repeated structure/content that awaits consolidation
- `coupling` — cross-surface dependency introduced prematurely

**Placement rule**: The marker comment SHALL be placed immediately above the affected §"Approach" table cell or code block in `changes/<change-name>/proposal.md`.

**Lifecycle**: Introduced at proposal phase; resolved and closed at archive phase via `findings_closed[]` entry in the vault finding frontmatter.

### §"payload-review convention"

**Purpose**: Flag commit subjects whose scope or content drifts from the diff body.

**Syntax**:
```html
<!-- payload-review(diff-scope=<list>, subject-scope=<list>, mismatch-rationale=<one-liner>) -->
```

**Lifecycle**:
- **Advisory** at proposal phase (flags drift without blocking)
- **Binding** at archive phase (actual commit scope captured and compared)

**Verification rule**: `git log --format=%s -1` (commit subject) vs `git diff --stat` (actual diff scope). Divergence requires a `mismatch-rationale`.

### §"cross-coupling rule"

**Rule**: Cycle-artifact `spec.md` MAY reference inner-repo substrate files (`specs/`, `examples/`, `templates/`, `docs/`) but SHALL NOT introduce or modify substrate coupling that the inner-repo's substrate contract does not already authorise.

**Verification**: `git diff --stat <cycle-artifact-dir>` SHALL NOT introduce substrate coupling the pre-cycle substrate contract does not already cover. The pre-cycle substrate contract is established by the last released cycle's artifact state.

### §"AC-023c threshold reformulation"

**Old approach**: Threshold anchored to `docs/10-VISUAL-IR.md` **file count** (artifact-derived; drifts with file additions).

**New approach**: Threshold derived from `examples/visual-spec.yaml` **field count** (content-derived; stable across file additions).

**Derivation formula**: `AC-023c_threshold = ceil(field_count * 0.15)` where `field_count` is the number of top-level fields in `examples/visual-spec.yaml`.

### §"pack-only retirement"

**Transition**: `pack-only → pack+tools`

- `pack-only` invariant (m9–m12): cycles MAY modify ONLY `specs/ examples/ templates/ docs/`
- `pack+tools` invariant (m13 onward): cycles MAY modify the pack surface AND the `tools/` surface

**Last pack-only release**: v0.5.5 (HEAD `9c87582…`)

**Consequences**:
- `sddk-verify` and `sddk-debt-verify` add `debt-tooling-cluster` as an **additive** cluster for A-full paths; A-lite remains at the original 4 required clusters (`coupling`, `duplication`, `smells`, `overeng`)
- `MANIFEST.json` is mutable by any cycle that adds or removes a `tools/` entry
- `tools/` is governed by Bash/Python CLI patterns anchored to `tools/check-skill-crossrefs.sh`

**Note**: The `## Invariant Transitions` section in the archive report is **owned by the archive phase**, not apply.

### §"pack-overhead review gate"

**Purpose**: Evaluate the pack's structural overhead and emit PASS/WARN/FAIL.

**Three threshold bands**:
| Band | Condition | Exit code |
|------|-----------|-----------|
| **PASS** | All metrics within budget | `0` |
| **WARN** | Any metric exceeds budget by ≤25% | `0` (advisory) |
| **FAIL** | Any metric exceeds budget by >25% OR ADR cap breached (>26) | `1` |

**Metric set**:
1. LoC per capability (pack surface)
2. ADR count (`docs/adrs/ADR-*.md` count ≤ 26)
3. MANIFEST entry count (within budget per project)
4. Tool surface count (`tools/*` count)

**SC-POL-1**: Every invocation records `argv` and `exit_code` to `cli-receipts.jsonl`.

### §"duplication taxonomy"

**Three axes**:

1. **structural duplication** — same file-shape or path-shape repeated across the pack. Example: multiple `examples/*-profile.yaml` files sharing the same skeleton structure.

2. **content duplication** — same string or literal identifier repeated across files. Example: the legacy `profile-middle-grade-10-11` content-duplication signature appears across `examples/catalog-project.yaml:21`, `templates/narrative.yaml:12`, `docs/08-PROFILES.md:38,95`, `docs/13-CONTROL-PLANE.md:91`.

3. **contract duplication** — same contract surface declared in two unrelated locations. Example: alias registry at `specs/profile-aliases.yaml` vs canonical profile at `examples/middle-grade-profile.yaml:2`.

**Constraint**: The taxonomy output MUST classify each finding under exactly one of these three axes and MUST NOT introduce a fourth axis.

---

## Capability: `pack-audit-cli`
### Requirement: REQ-PAC-1 — Duplication Taxonomy Subcommand (DEBT-DUPLICATION-NEW-M8-001)

The system SHALL provide `tools/sddk-pack-audit taxonomy` as an executable sub-command that walks the pack surface (`specs/`, `examples/`, `templates/`, `docs/`, `tools/`) and emits a duplication report classifying every detected duplication under one of the three axes defined in REQ-RDP-6 (structural | content | contract). The sub-command MUST record argv and exit_code per SC-POL-1, MUST return exit `0` for a clean pack (HEAD `389e05a` baseline), and MUST distinguish structural from content duplication on the **real** pack (not a fixture) per AC-13 quality intent. The implementation MAY be Bash (anchored to `tools/check-skill-crossrefs.sh` precedent, `set -euo pipefail`) or Python (PyYAML pinned per D-02 of `changes/spec-completion/tasks.md`, `if __name__ == "__main__":` entrypoint).

#### Scenario: EVT-PAC-01 — Taxonomy sub-command emits three-axis report on real pack

- **GIVEN** the pack at HEAD `389e05a` carries the post-v0.5.5 surface (35 docs, 28 schemas, 5 examples, 5 templates, 14 UATs, 1 tool)
- **WHEN** the apply phase lands Block B and `tools/sddk-pack-audit taxonomy --root .` is invoked
- **THEN** the command SHALL exit `0`
- **AND** SHALL emit a report that uses the three axis labels (`structural`, `content`, `contract`) verbatim
- **AND** SHALL classify any pre-existing duplication (e.g. the legacy `profile-middle-grade-10-11` content-duplication signature across `examples/catalog-project.yaml:21`, `templates/narrative.yaml:12`, `docs/08-PROFILES.md:38,95`, `docs/13-CONTROL-PLANE.md:91`) under the `content` axis
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl` in JSONL form `{"argv": [...], "exit_code": 0, "command": "taxonomy", "timestamp": "..."}`
- **AND** the vault finding `DEBT-DUPLICATION-NEW-M8-001` frontmatter SHALL carry a `findings_closed[]` entry referencing REQ-PAC-1.

### Requirement: REQ-PAC-2 — Pack-Overhead Review Gate Subcommand (DEBT-OVERENG-NEW-M8-001)

The system SHALL provide `tools/sddk-pack-audit gate` as an executable sub-command that evaluates the pack's structural overhead against the thresholds defined in REQ-RDP-5 and emits a PASS/WARN/FAIL verdict to stdout. The verdict exit-code semantics: PASS → exit `0`; WARN → exit `0` with WARN marker on stdout (advisory); FAIL → exit `1`. The sub-command MUST check (a) ADR count ≤ 26, (b) MANIFEST entry count within budget, (c) tool surface count within budget, and MUST record argv and exit_code per SC-POL-1. The gate MUST pass on HEAD `389e05a` baseline (which carries 25 ADRs, 127 MANIFEST entries, 1 tool entry — all within budget).

#### Scenario: EVT-PAC-02 — Gate sub-command returns PASS on baseline

- **GIVEN** the pack at HEAD `389e05a` carries 25 ADRs (≤ 26 cap), 127 MANIFEST entries, and 1 tool entry (`tools/check-skill-crossrefs.sh`)
- **WHEN** the apply phase lands Block B and `tools/sddk-pack-audit gate --root .` is invoked
- **THEN** the command SHALL exit `0` and SHALL print `PASS` on the first stdout line
- **AND** SHALL print a per-check breakdown (ADR cap, MANIFEST count, tool surface count) on subsequent lines
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl` in JSONL form `{"argv": [...], "exit_code": 0, "command": "gate", "timestamp": "..."}`
- **AND** the vault finding `DEBT-OVERENG-NEW-M8-001` frontmatter SHALL carry a `findings_closed[]` entry referencing REQ-PAC-2.

### Requirement: REQ-PAC-3 — `{{ profiles.X }}` Runtime Resolver (closes R1/R5 of m12 spec by consumption)

The system SHALL provide `tools/sddk-pack-audit resolve '<placeholder>'` as an executable sub-command that reads `specs/profile-aliases.yaml` and substitutes `{{ profiles.<id> }}` placeholders by dereferencing the registry's `id:` → `<display-name>` mapping. The placeholder syntax follows the m12 spec REQ-A convention (Jinja2-style `{{ profiles.<id> }}`); the resolver MUST consume the **canonical** registry at `specs/profile-aliases.yaml` (m12A introduced this registry with `consumers_introduced: m12`; m13 introduces the first runtime consumer). The sub-command MUST record argv and exit_code per SC-POL-1, MUST return exit `0` on a successful dereference, and MUST exit `1` with stderr message on an unknown alias. Closing R1/R5 of m12 spec is by **consumption of the registry at runtime**, not by contract canonicalisation alone.

#### Scenario: EVT-PAC-03 — Resolve sub-command dereferences alias against real registry

- **GIVEN** `specs/profile-aliases.yaml` carries the alias `id: profile-middle-grade-10-11` with display name `Middle Grade (10-11)` (m12A canonical state)
- **WHEN** the apply phase lands Block B and `tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root .` is invoked
- **THEN** the command SHALL exit `0`
- **AND** SHALL print `Middle Grade (10-11)` to stdout (verbatim display name from the registry)
- **AND** the recorded argv/exit_code receipt SHALL be appended to `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl` in JSONL form `{"argv": [...], "exit_code": 0, "command": "resolve", "timestamp": "..."}`
- **AND** the m12 spec R1 (text-only deref without runtime consumer) and R5 (consumption-count vs runtime resolution) are CLOSED by this scenario, as recorded in `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/spec.md` (this file) §"m12 Risk Closure Note".

---

## Acceptance Criteria Matrix

| AC | Block | Requirement | Scenario | Verification | Status |
|---|---|---|---|---|---|
| **AC-13.1** | A | REQ-RDP-1, REQ-RDP-2, REQ-RDP-3, REQ-RDP-4 | EVT-RDP-01..04 | `test -f changes/debt-resolution-process/{proposal,design,tasks,spec}.md`; `grep -c '<finding-id>' changes/debt-resolution-process/spec.md` returns `>= 4` | Bash / deterministic |
| **AC-13.2** | B | REQ-PAC-1, REQ-PAC-2, REQ-PAC-3 | EVT-PAC-01..03 | `test -x tools/sddk-pack-audit`; `tools/sddk-pack-audit {taxonomy,gate,resolve}` each returns exit `0` | Bash / deterministic |
| **AC-13.3** | B | REQ-PAC-2 | EVT-PAC-02 | `tools/sddk-pack-audit gate --root .` first stdout line == `PASS`; `cli-receipts.jsonl` contains the entry with `exit_code: 0` | Bash + JSONL parse |
| **AC-13.4** | B | REQ-PAC-3 | EVT-PAC-03 | `tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root .` prints `Middle Grade (10-11)` and exits `0` | Bash + registry diff |
| **AC-13.5** | 0 | AC-INV-vfix | (Block 0) | `python3 -c "import json;s=json.load(open('specs/event.schema.json'));e=s['properties']['eventType']['enum'];assert len(e)==8 and all(x in e for x in ['run.started','run.completed','cost.recorded','candidate.accepted','candidate.rejected','asset.generated','approval.granted','publish.completed']);print('AC-13.5 PASS')"` returns `AC-13.5 PASS` (enum-coverage + count check, NOT `$defs`-key equality) | Python / deterministic |
| **AC-13.5b** | 0 | AC-INV-vfix | (Block 0) | Same oracle applied to `changes/spec-completion/WAVE-4-DEFERRED.md` L84-87 (canonical text mirror) | grep + Python |
| **AC-13.6** | B | AC-INV-manifest | (regen) | `MANIFEST.json` contains `./tools/sddk-pack-audit`; `_meta.regenerated_at` is updated; `_meta.regeneration_reason` mentions m13 pack-audit CLI; total entry count = 128 | jq / git diff |
| **AC-13.7** | A+B | REQ-RDP-1..6 + REQ-PAC-1..3 | EVT-RDP-01..04, EVT-PAC-01..03 | All 6 vault finding files (`finding-DEBT-OVERENG-001/002`, `finding-DEBT-COUPLING-002/003`, `finding-DEBT-OVERENG-NEW-M8-001`, `finding-DEBT-DUPLICATION-NEW-M8-001`) carry `findings_closed[]` entries referencing the closing REQ-* and EVT-* IDs | vault grep |
| **AC-13.8** | A+B | REQ-RDP-4 | EVT-RDP-04 | `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/archive-report.md` carries a `## Invariant Transitions` section recording `pack-only → pack+tools` with `v0.5.5` as last pack-only release | grep |
| **AC-13.9** | A+B | AC-INV-adr | (cap) | `test "$(ls docs/adrs/ADR-*.md | wc -l)" -le 26`; ADR count delta from baseline `389e05a` is `0` or `+1` | Bash |
| **AC-13.10** | A+B | AC-INV-no-new-high | (apply tracks) | `sddk debt-verify` debt-verdict == `PASS_WITH_WARNINGS` or `PASS` (no introduced HIGH/MEDIUM/CRITICAL); only 6 pre-existing LOW/P3 closures expected | vault verify |
| **AC-INV-schema** | A+B | (no-schema-mod) | (invariant) | `git diff --stat 389e05a..HEAD -- specs/*.schema.json` returns empty (no schema modified) | git |
| **AC-INV-packonly** | A+B | REQ-RDP-4 | EVT-RDP-04 | `MANIFEST.json` `tools/` entries count = 2 (was 1); documented in spec §"pack-only retirement" | jq + grep |
| **AC-INV-rdd** | B | REQ-PAC-1, REQ-PAC-2, REQ-PAC-3 | EVT-PAC-01..03 | `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl` exists, is valid JSONL, contains exactly 3 entries (taxonomy, gate, resolve) with `exit_code: 0` | JSONL parse |
| **AC-INV-glossary** | A (opt) | (optional) | (apply) | If Block A adds a one-line amendment to `docs/27-GLOSSARY.md` for "debt carry-over", `grep -c 'debt carry-over' docs/27-GLOSSARY.md` returns `>= 1` | grep |

Total: **23 ACs** (matches m12 precedent count).

---

## Source-of-Truth Exclusions

The following sites are **canonical names, registries, oracles, or inviolable surfaces** and MUST NOT be refactored by this change. They are the registry/oracle/surface, not consumers.

| Site | Role | Reason excluded |
|---|---|---|
| `specs/*.schema.json` (28 files) | Inner-repo substrate contracts | AC-INV-3 from m12 still binding; m13 does not modify any `specs/*.schema.json` |
| `examples/middle-grade-profile.yaml:2` | Canonical profile definition | This IS the profile; the literal IS the source of truth |
| `specs/profile-aliases.yaml` (entire file) | Alias registry | This IS the registry; m12A introduced it; m13 only consumes it (no edits) |
| `docs/27-GLOSSARY.md` (except optional amendment) | Glossary | Optional one-line amendment only; no other change |
| `tools/check-skill-crossrefs.sh` | Existing tooling precedent | Anchored as Bash pattern for `sddk-pack-audit`; not modified |
| `MANIFEST.json` `package`, `generated_for`, `working_name` keys | Top-level MANIFEST identity | Regen only adds new entries and updates `_meta` |

**Secondary exclusions** (kept-literal by design, even though m12 touched some):

| Site | Role | Reason kept-literal |
|---|---|---|
| `docs/08-PROFILES.md:29` | Canonical profile name-list | Reader-facing reference index; deref would obscure the literal name |
| `examples/creation-recipe-middle-grade.yaml:29` | JSON-schema `enum` value | Validator reference; not a consumer site |
| All 25 existing ADRs (`docs/adrs/ADR-001..025`) | Architecture decisions | m13 may add ADR-026 (optional) but MUST NOT modify any existing ADR |

---

## Risk Register

| # | Risk | Likelihood | Per-risk verification |
|---|---|---|---|
| **R1** | First post-pack-only cycle; verify + debt-verify gates ran under pack-only profile | Med | EVT-RDP-04 documents the transition in spec + archive; A-lite re-execution accepted with `coverage.rationale_for_extra_cluster` for `debt-tooling-cluster` (additive only) |
| **R2** | First multi-line `tools/` entry; reviewer attention may overflow on Block B | Med | AC-13.2 enforces Bash `set -euo pipefail` or Python `if __name__ == "__main__":`; one round of revisions; AC-INV-rdd records argv/exit_code per SC-POL-1 |
| **R3** | ADR count 25/26 at start; adding 1 ADR leaves 0 headroom | Low | AC-13.9 enforces ≤26 cap; ADR-026 only if Block B warrants; Block A typically needs no new ADR |
| **R4** | AC-10 oracle (Block 0) may be re-stale-proofed in another file | Low | AC-13.5 patches both `changes/spec-completion/tasks.md` L439-442 and `WAVE-4-DEFERRED.md` L84-87 (canonical text mirror); grep verifies both sites |
| **R5** | `sddk-pack-audit` has no precedent in `tools/` beyond Bash preflight | Med | AC-13.2 anchors Bash precedent + D-02 PyYAML pinning from `changes/spec-completion/tasks.md` if Python; SC-POL-1 argv/exit_code recorded per AC-INV-rdd |
| **R6** | 3 atomic blocks + optional ADR may exceed the 6-block A-lite ceiling | Low | AC-13.1..13.10 fit comfortably in 3 blocks + 1 ADR; if reviewer wants more, follow explore Approach 3 (split m13a + m13b) |
| **R7** | INC-025 (tainted-receipt governance) may be re-prioritised mid-cycle | Closed | Stays in framework backlog (`/home/rubentxu/.sddk-knowledge/sddk-framework/incs/INC-025-*`); project scope stays narrower; out of scope §"Out of Scope" |
| **R8** | Marker convention may be challenged as "ceremonial" without enforcement | Low | AC-13.1 enforces marker placement at proposal phase; archive phase binds it to commit subjects; the convention is a recording rule, not a gate |
| **R9** | Cross-coupling rule clarification may be challenged as "redocumenting" rather than tightening | Low | AC-13.7 closes DEBT-COUPLING-002/003 with vault entries that reference REQ-RDP-3 verbatim; the rule introduces the content-derived threshold formula (AC-023c reformulation) as concrete new binding |
| **R10** | `{{ profiles.X }}` resolver may diverge from m12's Jinja2-style declaration | Low | REQ-PAC-3 mirrors m12 REQ-A syntax verbatim (`{{ profiles.<id> }}`); AC-13.4 verifies against the m12A canonical `specs/profile-aliases.yaml` registry |
| **R11** | Pack-only retirement may be challenged as a process-only change with no code | Low | REQ-RDP-4 + EVT-RDP-04 record the transition in spec + archive; the consequence is concrete (Block B's `tools/` entry + MANIFEST regen) and verifiable (AC-13.6, AC-INV-packonly) |

---

## Entropy Metrics (qualitative; DQS dimension improvements)

Entropy here is the **process + tooling entropy** of the debt-resolution system: the spread of LOW/P3 carry-over fingerprints across cycles and the tightness of the closure evidence chain.

| Dimension | Pre-M13 | Post-M13 | Delta |
|---|---|---|---|
| **Connascence of Name (CoN)** — fingerprint re-statement in proposals | 6 fingerprints re-stated across m12 + m13 proposal without binding surface | 6 fingerprints each bound to a REQ-* + EVT-* + vault `findings_closed[]` entry | ↓ |
| **Connascence of Value (CoV)** — closure claim vs closure evidence | Closure-by-statement (m11–m12) | Closure-by-consumption (EVT-PAC-01..03) and closure-by-record (REQ-RDP-1..4) | ↓ |
| **Information Bottleneck (IB)** — process documentation quality | Process drift documented in 4 separate vault findings | Single spec `changes/debt-resolution-process/spec.md` consolidates all 6 closures under 7 REQs (4 RDP + 3 PAC) | ↑ |
| **Design Quality Score (DQS)** — composite debt-resolution smell index | Smell: 6 carry-overs without atomic closure surface | Smell eliminated: each finding has a 1:1 REQ:EVT:AC-13 mapping; CLI receipts recorded per AC-INV-rdd | ↑ |
| **SOLID entropy** (SRP/OCP at the process layer) | Drift concentrated in template-amendment sites (proposal, tasks, spec) | Drift consolidated into two named capabilities; new `tools/` surface governed by `sddk-pack-audit` SRP (one entrypoint, three responsibilities — anchored to Bash precedent) | ↑ |
| **Process entropy** (lifecycle invariance) | Pack-only invariant frozen across m9–m12 (no tooling admission) | Pack-only invariant retired; `pack+tools` invariant declared with archive-receipt binding; A-lite cluster budget preserved at 4 required | ↓ |

The refactor is **process + tooling at the cycle layer**: no inner-repo schema modification, no runtime contract change, no new IR/event/provider/publishing schema. The closure claims are honest about scope (R1, R7, R11).

---

## Out of Scope (deferred to M14+)

- INC-025 (tainted-receipt governance) — framework backlog; no apply-time action required for this cycle.
- New IR / event / provider / publishing schemas — already landed at `b89ff0d` (m4 wave-4b).
- CI workflows integration for `sddk-pack-audit` — separate change; the CLI is invoked manually + recorded in `cli-receipts.jsonl` for now.
- Additive `debt-tooling-cluster` promotion from optional to required — A-full path only; A-lite stays at 4 required clusters; v0.6.x may promote if drift appears.
- ADR-026 (`docs/adrs/ADR-026-sddk-pack-audit-cli.md`) — reserved only if Block B's gate semantics warrant an irreversibility decision (currently: not warranted).
- Profile alias registry content edits — `specs/profile-aliases.yaml` is m12A canonical; m13 only consumes it.
- New `tools/` entry beyond `sddk-pack-audit` — first multi-line entry; further tooling awaits m14+.

---

## Invariant Preservation

All 11 project invariants from `milestones/m1-onboard-2026-08-28.md` L28–50 are preserved unchanged. The m12 pack-only invariants (`AC-INV-1`, `AC-INV-2`, `AC-INV-3`) are **superseded** for this cycle: AC-INV-1 (LoC budget) preserved; AC-INV-2 (file-shape budget) preserved; AC-INV-3 (no `specs/*.schema.json` modification) **preserved absolutely** and re-asserted as AC-INV-schema. The new invariants introduced by this cycle:

| Invariant | Source | Enforcement |
|---|---|---|
| `tools/` surface is cycle-mutable | REQ-RDP-4 | AC-INV-packonly (manifest count), AC-13.6 (regen), EVT-RDP-04 (archive record) |
| `sddk-pack-audit` receipts recorded per SC-POL-1 | REQ-PAC-1/2/3 | AC-INV-rdd (JSONL parse) |
| ADR count ≤ 26 | (carried forward) | AC-13.9 |
| No `specs/*.schema.json` modified | (carried forward) | AC-INV-schema (git diff) |
| R1/R5 of m12 spec closed by consumption | REQ-PAC-3 | AC-13.4 (registry dereference) |

---

## m12 Risk Closure Note

m12 spec enumerated 8 risks (R1–R8). m13 closes the following by consumption:

- **R1** (text-only deref without runtime consumer) — **CLOSED** by REQ-PAC-3 / EVT-PAC-03 introducing `sddk-pack-audit resolve`. Closure-by-consumption is now concrete: the alias registry at `specs/profile-aliases.yaml` is dereferenced at runtime, not just textually referenced.
- **R5** (ship-of-Theseus closure challenge for DEBT-COUPLING-NEW-003) — **CLOSED** by EVT-PAC-03 producing a real exit `0` on `sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}'`. The cluster closes by canonicalising the contract surface (m12A) AND by introducing a runtime consumer (m13B1/REQ-PAC-3); both legs are now verified.

m12 R8 (INC-025 tainted-receipt governance) stays open in framework backlog; out of m13 scope.

---

## Next Recommended

`/sddk-tasks` to decompose the 3 atomic blocks (Block 0 verifier-fix + Block A spec + Block B CLI) into implementation tasks for `sddk-apply`. Acceptance gates for apply phase:

- All 23 ACs (AC-13.1..13.10 + 6 AC-INV-* + AC-13.5b + AC-INV-glossary) must pass before archive.
- Block 0 commits first as `fix(spec-completion): ac-10-oracle-stale-script` (≤3 LoC, in-pack, no schema change).
- Block A commits as `debt(spec|debt-resolution-process): debt-resolution-process-and-pack-only-retirement` (≤400 LoC, in-pack).
- Block B commits as `feat(tools|sddk-pack-audit): taxonomy-gate-resolve-subcommands` (≤800 LoC, out-of-pack, MANIFEST regen).

**M14+ pivot**: M14 may promote `debt-tooling-cluster` from optional to required for A-full paths; M14 may also land ADR-026 if `sddk-pack-audit` semantics warrant an irreversibility decision after one observation cycle.
