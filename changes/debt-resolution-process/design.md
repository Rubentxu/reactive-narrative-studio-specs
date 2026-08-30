# Design: debt-resolution-process (m13-debt-resolution-process)

- **Cycle**: `p-7c4aff45199a2069/m13-debt-resolution-process` (A-lite, branch `feat/m13-debt-resolution-process-2026-08-30`, base `389e05a`)
- **Spec SHA-256**: `55580129fad003e42625ba23e488a571f5d9a722a474f959cd4492da266ada2` (282 LoC, 2 NEW capabilities, 23 ACs)
- **Proposal SHA-256**: `7257c99cdf1edb92bd1a904c59b9df0fc32552c56209d1969a3cad16f36359d8` (170 LoC, A-lite, 3 atomic blocks)
- **Architecture impact**: `boundary` (first post-pack-only `tools/` entry; docs→executable seam crossed; no `specs/*.schema.json` modified)

## Technical Approach

m13 closes all 6 carry-overs from m12 by introducing **two net-new capabilities** and a **one-place verifier fix**. Block A consolidates process rules into a `changes/debt-resolution-process/spec.md` (§"marker convention", §"payload-review", §"cross-coupling rule", §"AC-023c reformulation", §"duplication taxonomy", §"pack-overhead gate semantics", §"pack-only retirement"). Block B lands the **first post-pack-only `tools/` entry** — `tools/sddk-pack-audit` — as a **Bash** CLI (anchored to `tools/check-skill-crossrefs.sh`, 69 LoC Bash precedent, `set -euo pipefail`) exposing three sub-commands (`taxonomy`, `gate`, `resolve`); the runtime alias resolver (m12 R1/R5 closure) absorbs into the same entrypoint because the audit CLI already walks the pack where aliases live. Block 0 patches the stale AC-10 oracle (`changes/spec-completion/{tasks.md L439-442, WAVE-4-DEFERRED.md L84-87}`) to use **enum-coverage + count** on `properties.eventType.enum` instead of the broken `$defs`-key subset check (which always fails — `$defs` carries PascalCase names like `RunStarted`, the 8 event types are dotted.lowercase). **MANIFEST.json regen** adds `./tools/sddk-pack-audit` (127 → 128 entries) following the m11D + m8C precedent.

## Architecture Decisions

### Decision: CLI language — Bash (NOT Python)

**Choice**: Single Bash entrypoint `tools/sddk-pack-audit` with three sub-commands.
**Alternatives considered**: (i) Python with PyYAML pinning from D-02 (`changes/spec-completion/tasks.md:9`) — would work, but adds a second toolchain alongside the Bash precedent; (ii) Mixed (Bash wrapper + `python3 -c "import yaml..."` for `resolve`) — rejected: single-responsibility hygiene + extra complexity for a 20-line registry.
**Rationale**: **Anchored to `tools/check-skill-crossrefs.sh`** (69 LoC Bash, `set -euo pipefail`, scope-files-array pattern at L23-27). The project already declared Bash as the `tools/` convention; introducing Python here breaks the precedent for negligible benefit (`specs/profile-aliases.yaml` is 20 lines with a known shape — grep + awk is sufficient for `resolve`). No `pyyaml` import cost; no Python-vs-Bash reviewer-attention split on a multi-line `tools/` entry (R-blast-tools mitigation). Sub-command surface (`taxonomy`, `gate`, `resolve`) is fixed by the spec, not a choice; only the language is open.

### Decision: `resolve` placement — inside `sddk-pack-audit` (NOT a separate tool)

**Choice**: `tools/sddk-pack-audit resolve '<placeholder>'` is a sub-command of the audit CLI.
**Alternatives considered**: (i) Separate `tools/sddk-alias-resolve` tool (rejected: SRP at the cost of an extra `tools/` entry, blows the first multi-line entry budget, splits reviewer attention); (ii) Embed in `tools/check-skill-crossrefs.sh` (rejected: that script is scope-locked to skill SKILL.md cross-refs per its L23-27 scope_files array).
**Rationale**: The audit CLI already loads pack surfaces (`specs/`, `examples/`, `templates/`, `docs/`, `tools/`) for `taxonomy` + `gate`; the alias registry at `specs/profile-aliases.yaml` is one of those surfaces. Co-locating the resolver eliminates a second argv surface and reuses the registry read path. ADR-014 (control-plane projections, runtime consumer placement) already authorises the consumer; ADR-005 (project-local) authorises the registry. The CLI is the canonical m13A runtime consumer (REQ-PAC-3 / EVT-PAC-03 closes m12 R1/R5 by **consumption**).

### Decision: No ADR-026 (Block B does NOT force an irreversibility decision)

**Choice**: Skip `docs/adrs/ADR-026-sddk-pack-audit-cli.md`; ADR count stays at 25.
**Alternatives considered**: (i) Add ADR-026 to document the "first post-pack-only `tools/` entry" (rejected: not hard to reverse — the CLI is removable, the registry stays canonical); (ii) Add ADR-026 to document "alias consumption by audit CLI" (rejected: not surprising given ADR-005 + ADR-014 already authorise the pattern; the closure happens by spec REQ-PAC-3 + vault `findings_closed[]` entry, not by ADR).
**Rationale**: ADR candidate criteria require ALL THREE — hard to reverse + surprising + real trade-off. The CLI is forward-compatible and removable. ADR-005 (project-local) and ADR-014 (control-plane projections) already cover alias dereferencing + runtime consumer placement. ADR-026 is **reserved** (proposal §"Out of Scope") for M14+ if one observation cycle shows drift. Headroom preserved (R-coupling-budget: 25/26 → 0 headroom if added; 1 slot spare if skipped).

### Decision: Block 0 oracle shape — `enum-coverage + count` on `properties.eventType.enum`

**Choice**: Patch both `changes/spec-completion/tasks.md L439-442` and `changes/spec-completion/WAVE-4-DEFERRED.md L84-87` (canonical text mirror) to use `s['properties']['eventType']['enum']` with `len(e)==8 and set(e)>=req`.
**Alternatives considered**: (i) Keep `$defs`-key check (rejected: always fails — verified empirically: `$defs` keys = `{RunStarted, RunCompleted, CostRecorded, CandidateAccepted, CandidateRejected, …}` PascalCase; required events are dotted.lowercase; the two sets are disjoint); (ii) Add a new check without removing the stale one (rejected: leaves a known-bad oracle live — the verifier-fix exists precisely to retire the staleness).
**Rationale**: The event-type names live in `properties.eventType.enum` (verified: 8 entries), not in `$defs`. The new oracle is enum-coverage (`set(e) >= req`) + count (`len(e) == 8`) — concrete, deterministic, Python-stdlib-only. Both sites patched together (canonical text mirror) per AC-13.5b to prevent the WAVE-4-DEFERRED site from drifting again. LoC delta ≤ 3 per site.

## Data Flow

```
AC-10 oracle (Block 0)                    Profile alias resolution (Block B REQ-PAC-3)
─────────────────────────                  ──────────────────────────────────────────
python3 -c "import json;                   specs/profile-aliases.yaml
  s=json.load(open('specs/event.schema.json'))    id: profile-middle-grade-10-11    ──┐
  e=s['properties']['eventType']['enum'];         canonical_name: "Middle Grade ..." │
  req={...8 event types...};                      consumers_introduced: m12         │
  assert len(e)==8 and set(e)>=req"        ──►   AC-13.5 PASS                            │
                                                └─────────────────────────────────────────────┘
                                                                                  │
                                                                                  ▼
   `sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}'`
   ─► grep '^  - id:' | sed -E 's/.*id: ([^ ]+).*/\1/'   (id extraction)
   ─► awk '$1 == id {found=1} found && /canonical_name/ {print $2; exit}'  (lookup)
   ─► stdout: "Middle Grade (10-11)"
   ─► exit 0
   ─► appended to cycle-artifacts/.../m13-.../cli-receipts.jsonl  (AC-INV-rdd)
```

Pack audit flow: `sddk-pack-audit gate --root .` reads `docs/adrs/ADR-*.md` (count), `MANIFEST.json.documents` (count), `tools/*` entries; thresholds: PASS / WARN (≤25% over budget) / FAIL (>25% over OR ADR > 26).

## File Changes

| File | Action | LoC | Description |
|---|---|---|---|
| `changes/debt-resolution-process/design.md` | Create | this file | Technical design (canonical) |
| `changes/debt-resolution-process/tasks.md` | Create (apply) | ~250–400 | Task decomposition for sddk-tasks |
| `tools/sddk-pack-audit` | Create | ~400–700 | Bash CLI; 3 sub-commands; `set -euo pipefail`; argv/exit_code receipt per SC-POL-1 |
| `MANIFEST.json` | Modify (regen) | +1 entry | Append `./tools/sddk-pack-audit`; bump `_meta.regenerated_at`; update `regeneration_reason` |
| `changes/spec-completion/tasks.md` | Modify | ≤3 | Patch L439-442 oracle (enum-coverage + count) |
| `changes/spec-completion/WAVE-4-DEFERRED.md` | Modify | ≤3 | Patch L84-87 oracle (canonical text mirror) |
| `docs/27-GLOSSARY.md` | Modify (opt) | +1 | One-line "debt carry-over" term (REQ-RDP-1..6 anchor) |
| `cycle-artifacts/.../m13-.../{design.md,cli-receipts.jsonl,archive-report.md}` | Create (cycle-artifact mirrors) | n/a | Per phase-common protocol; `cli-receipts.jsonl` populated by apply per AC-INV-rdd |
| `~/.sddk-knowledge/<proj>/cycles/finding-DEBT-*.md` | Modify (vault) | frontmatter | Add `findings_closed[]` entries referencing REQ-RDP-*/REQ-PAC-* per AC-13.7 |

**Net**: 4–6 new files, 2–4 modified (in-pack + out-of-pack + cycle-artifact mirrors). Zero `specs/*.schema.json` modified (AC-INV-schema binding). Zero existing ADR modified (ADR-001..025 untouched).

## Interfaces / Contracts

**CLI contract** (`tools/sddk-pack-audit`):

```bash
# taxonomy — structural-vs-content-vs-contract duplication report
tools/sddk-pack-audit taxonomy --root . [--json]
# exit: 0 on clean pack, 1 on parser error
# stdout: report with three axis labels (structural, content, contract)

# gate — pack-overhead review gate (PASS/WARN/FAIL)
tools/sddk-pack-audit gate --root .
# exit: 0 PASS or WARN (advisory); 1 FAIL
# stdout: PASS|WARN|FAIL line, then per-check breakdown (ADR cap, MANIFEST count, tool surface count)

# resolve — {{ profiles.<id> }} deref against specs/profile-aliases.yaml
tools/sddk-pack-audit resolve '<placeholder>' --root .
# exit: 0 on dereference, 1 on unknown alias
# stdout: canonical_name from registry
# stderr: error message on unknown alias
```

**Bash internals** (sketch):

```bash
#!/usr/bin/env bash
# tools/sddk-pack-audit
# First multi-subcommand tools/ entry; anchored to check-skill-crossrefs.sh pattern.
set -euo pipefail

root="."
cmd="${1:-}"; shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    *) echo "Usage: $0 {taxonomy|gate|resolve} [--root <path>]" >&2; exit 1 ;;
  esac
done

dispatch_taxonomy() { ... }   # walks pack, classifies into 3 axes
dispatch_gate()      { ... }   # threshold check + PASS/WARN/FAIL
dispatch_resolve()   { ... }   # grep + awk over specs/profile-aliases.yaml

case "$cmd" in
  taxonomy) dispatch_taxonomy "$@" ;;
  gate)      dispatch_gate "$@" ;;
  resolve)   dispatch_resolve "$@" ;;
  *) echo "Usage: $0 {taxonomy|gate|resolve} [--root <path>]" >&2; exit 1 ;;
esac
```

**Verbatim oracle (Block 0)** — to be patched at `changes/spec-completion/{tasks.md L439-442, WAVE-4-DEFERRED.md L84-87}`:

```bash
python3 -c "import json;s=json.load(open('specs/event.schema.json'));\
e=s['properties']['eventType']['enum'];\
req={'run.started','run.completed','cost.recorded','candidate.accepted',\
'candidate.rejected','asset.generated','approval.granted','publish.completed'};\
assert len(e)==8 and set(e)>=req,(set(e)^req);print('AC-10 PASS')"
```

## Architecture Model

- **Impact**: `boundary` (docs→executable seam; first multi-line `tools/` entry)
- **Observed baseline**: `tools/` = 1 entry (`check-skill-crossrefs.sh`); `MANIFEST.json` = 127 entries; ADR count = 25; pack = `specs/ examples/ templates/ docs/`
- **Planned intent**: `tools/` = 2 entries (Bash preflight + pack-audit CLI); `MANIFEST.json` = 128 entries; ADR count = 25 (no ADR-026); pack surface = `specs/ examples/ templates/ docs/ tools/` (pack-only invariant retired; R-postpack-1)
- **Render**: `unavailable` (no C4 preview produced — proposal §"Architecture Impact" notes the boundary impact but does not require `sddk-c4-likec4` for A-lite; fallback table above is the canonical intent)

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `resolve` against `specs/profile-aliases.yaml` (m12A canonical registry) | `tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root .` → stdout `Middle Grade (10-11)`, exit 0 (AC-13.4) |
| Unit | `gate` thresholds on HEAD `389e05a` baseline | `tools/sddk-pack-audit gate --root .` → first stdout line `PASS`, exit 0 (AC-13.3) |
| Unit | `taxonomy` three-axis classification on real pack | `tools/sddk-pack-audit taxonomy --root .` → exit 0, contains axis labels `structural`, `content`, `contract` (AC-13.2, EVT-PAC-01) |
| Integration | Block 0 oracle on `specs/event.schema.json` | `python3 -c "..."` (verbatim above) → stdout `AC-10 PASS`, exit 0 (AC-13.5, AC-13.5b) |
| Integration | MANIFEST regen | `jq '.documents | length' MANIFEST.json` → 128; `jq '.documents | map(select(. | startswith("./tools/")))' MANIFEST.json` → 2 entries (AC-13.6, AC-INV-packonly) |
| Cluster | CLI receipts recorded per SC-POL-1 | `cycle-artifacts/.../m13-.../cli-receipts.jsonl` JSONL parse, exactly 3 entries with `exit_code: 0` (AC-INV-rdd) |
| Cluster | ADR cap preserved | `test "$(ls docs/adrs/ADR-*.md \| wc -l)" -le 26` → exit 0 (AC-13.9) |
| Vault | 6 carry-over closures | `sddk` vault verify on 6 finding files; each carries `findings_closed[]` entry referencing REQ-RDP-*/REQ-PAC-* (AC-13.7) |
| E2E | Pack-only invariant transition recorded | `grep 'pack-only → pack+tools' cycle-artifacts/.../m13-.../archive-report.md` → ≥1 (AC-13.8, EVT-RDP-04) |

## Migration / Rollout

No migration required. Content + tooling change with no runtime state, no DB, no remote dependency. Rollback per proposal §"Rollback Plan":

- Block 0: `git revert <verifier-fix-commit>` (≤3 LoC, in-pack, no schema change)
- Block A: `git revert <debt-resolution-process-commit>` (in-pack, no schema change)
- Block B: `git revert <pack-audit-commit>` (≤10 LoC net; removes `tools/sddk-pack-audit` + reverts MANIFEST.json regen)

Tag: `v0.5.6` (patch bump per release convention; release notes link the 6 carry-overs by fingerprint).

## Open Questions

None blocking. All 4 open design questions from the launch packet are resolved by the 4 decisions above. Apply phase needs no further disambiguation; sddk-tasks decomposes the 3 atomic blocks (Block 0 + Block A + Block B).

## ADR Candidates

None. Per Decision §"No ADR-026": the three ADR criteria are not jointly met. ADR-005 + ADR-014 already authorise the pattern. ADR count stays at 25 (≤ 26 cap). ADR-026 reserved for M14+ if one observation cycle shows drift.

## Block Decomposition

| Block | Subject | Files | LoC | Order | Dependency |
|---|---|---|---|---|---|
| **0** | `fix(spec-completion): ac-10-oracle-stale-script` — enum-coverage + count oracle at `tasks.md L439-442` and `WAVE-4-DEFERRED.md L84-87` | 2 modified | ≤3 net each site | 1st | none (independent; closes drift) |
| **A** | `debt(spec\|debt-resolution-process): debt-resolution-process-and-pack-only-retirement` — process spec authoring the 4 §s (marker, payload-review, cross-coupling, AC-023c) + duplication-taxonomy + pack-overhead-gate + pack-only-retirement | `changes/debt-resolution-process/spec.md` + optional `docs/27-GLOSSARY.md` | ~200–400 | 2nd | none |
| **B** | `feat(tools\|sddk-pack-audit): taxonomy-gate-resolve-subcommands` + `chore(manifest): regen-for-m13-pack-audit-cli` (1 commit each) | `tools/sddk-pack-audit` (new), `MANIFEST.json` (regen, +1 entry) | ~400–700 + regen | 3rd | A (gate semantics §"pack-overhead review gate" cited) |

**Ordering rule**: Block 0 lands first (closes verifier drift, no schema change). Block A lands second (process spec is the cited authority for Block B's gate semantics). Block B lands third (CLI cites Block A's §"pack-overhead review gate" + §"duplication taxonomy" as its semantic anchor per REQ-RDP-5/REQ-RDP-6).

## Implementation Strategy per Block

### Block 0 — verifier fix (≤3 LoC, 2 sites)

- **Search/Replace** at both sites (`changes/spec-completion/tasks.md L439-442` and `changes/spec-completion/WAVE-4-DEFERRED.md L84-87`):
  - Old: `d=set(s.get('$defs',{}));req={...};assert not req-d,req-d;print('AC-10 PASS')`
  - New: `e=s['properties']['eventType']['enum'];req={...};assert len(e)==8 and set(e)>=req,(set(e)^req);print('AC-10 PASS')`
- **Edge cases**: Both sites carry the **identical** broken oracle (canonical text mirror); replace both with the **identical** fixed oracle. Site 1 has 4-line continuation with `\`; site 2 has 4-line continuation with `\` (verified — read L439-442 and L84-87).
- **Verification (AC-13.5, AC-13.5b)**:
  ```bash
  python3 -c "import json;s=json.load(open('specs/event.schema.json'));\
    e=s['properties']['eventType']['enum'];\
    req={'run.started','run.completed','cost.recorded','candidate.accepted',\
    'candidate.rejected','asset.generated','approval.granted','publish.completed'};\
    assert len(e)==8 and set(e)>=req,(set(e)^req);print('AC-13.5 PASS')"
  # Expected: AC-13.5 PASS (exit 0)
  # Mirror check: same oracle present in both files
  diff <(grep -A3 'event.schema.json' changes/spec-completion/tasks.md | head -4) \
       <(grep -A3 'event.schema.json' changes/spec-completion/WAVE-4-DEFERRED.md | head -4)
  # Expected: empty diff
  ```

### Block A — `changes/debt-resolution-process/spec.md` (process spec)

- **Create** the 7 §s in spec.md (Block A consumes the spec authority for sddk-tasks; sddk-apply writes the spec.md body):
  - §"marker convention" (REQ-RDP-1) — comment syntax `<!-- debt-marker(<id>, kind=<type>, rationale=<one-liner>) -->`; kinds taxonomy `overeng | duplication | coupling`; placement rule (immediately above affected §"Approach" table cell or code block)
  - §"payload-review convention" (REQ-RDP-2) — annotation syntax; advisory-vs-binding lifecycle (proposal advisory → archive binding); verification rule `git log --format=%s -1` vs `git diff --stat`
  - §"cross-coupling rule" (REQ-RDP-3 part 1) — cycle-artifact `spec.md` MAY reference inner-repo substrate; spec SHALL NOT introduce or modify substrate coupling not already authorised by the substrate contract; verification `git diff --stat <cycle-artifact-dir>` SHALL NOT introduce substrate coupling the pre-cycle substrate contract does not already cover
  - §"AC-023c threshold reformulation" (REQ-RDP-3 part 2) — threshold derived from `examples/visual-spec.yaml` field count (content-derived) NOT `docs/10-VISUAL-IR.md` file count (artifact-derived); concrete derivation formula
  - §"duplication taxonomy" (REQ-RDP-6) — three axes (structural / content / contract) with one example per axis from the pack's pre-m13 history
  - §"pack-overhead review gate" (REQ-RDP-5) — three threshold bands (PASS / WARN ≤25% over / FAIL >25% over OR ADR cap breach); metric set (LoC per capability, ADR count, MANIFEST entry count, tool surface count)
  - §"pack-only retirement" (REQ-RDP-4) — invariant transition `pack-only → pack+tools`; v0.5.5 (HEAD `9c87582…`) as last pack-only release; consequences for `sddk-verify` + `sddk-debt-verify` (new `debt-tooling-cluster` additive for A-full; A-lite remains at 4 required)
- **Optional** `docs/27-GLOSSARY.md` one-line amendment for "debt carry-over" term.
- **Verification (AC-13.1, AC-13.7)**:
  ```bash
  test -f changes/debt-resolution-process/{proposal,design,tasks,spec}.md && echo "AC-13.1 files PASS"
  grep -c 'DEBT-OVERENG-001\|DEBT-OVERENG-002\|DEBT-COUPLING-002\|DEBT-COUPLING-003\|DEBT-OVERENG-NEW-M8-001\|DEBT-DUPLICATION-NEW-M8-001' \
    changes/debt-resolution-process/spec.md
  # Expected: ≥4 (one mention per finding + EVT-RDP-* references)
  grep -cE 'cross-coupling|AC-023c|content-derived' changes/debt-resolution-process/spec.md
  # Expected: ≥3
  ```

### Block B — `tools/sddk-pack-audit` (Bash CLI)

- **Create** `tools/sddk-pack-audit` as a Bash entrypoint with `set -euo pipefail`, three dispatchers:
  - `dispatch_taxonomy`: walk `specs/`, `examples/`, `templates/`, `docs/`, `tools/`; classify duplication into 3 axes; emit report with verbatim axis labels
  - `dispatch_gate`: read `docs/adrs/ADR-*.md` count, `MANIFEST.json.documents` count, `tools/` count; apply PASS/WARN/FAIL thresholds (REQ-RDP-5); emit verdict line + per-check breakdown
  - `dispatch_resolve`: read `specs/profile-aliases.yaml`; extract `id:` and `canonical_name:` via grep + awk; print canonical name on stdout
- **Append** to `MANIFEST.json.documents` (sorted): `./tools/sddk-pack-audit` before `_meta`; bump `_meta.regenerated_at` to apply timestamp; update `_meta.regeneration_reason` to `"m13: added tools/sddk-pack-audit CLI (taxonomy+gate+resolve); count 127 → 128"`.
- **Receipts**: at the end of each sub-command (before exit), append a `cli-receipts.jsonl` entry in form `{"argv": [...], "exit_code": 0, "command": "<taxonomy|gate|resolve>", "timestamp": "<ISO8601>"}` to `cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl`. (Per SC-POL-1 evidence.)
- **Verification (AC-13.2, AC-13.3, AC-13.4, AC-13.6, AC-INV-rdd, AC-INV-packonly)**:
  ```bash
  test -x tools/sddk-pack-audit && tools/sddk-pack-audit taxonomy --root . && echo "AC-13.2 taxonomy PASS"
  tools/sddk-pack-audit gate --root . | head -1 | grep -q '^PASS$' && echo "AC-13.3 PASS"
  tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root . | grep -qFx 'Middle Grade (10-11)' && echo "AC-13.4 PASS"
  jq '.documents | length' MANIFEST.json | grep -qFx 128 && echo "AC-13.6 PASS"
  jq '.documents | map(select(. | startswith("./tools/")))' MANIFEST.json | grep -c sddk-pack-audit | grep -qFx 1 && echo "AC-INV-packonly PASS"
  test "$(wc -l < cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl)" -eq 3 \
    && python3 -c "import json;[json.loads(l) for l in open('cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl')]" \
    && echo "AC-INV-rdd PASS"
  test "$(ls docs/adrs/ADR-*.md | wc -l)" -le 26 && echo "AC-13.9 ADR cap PASS"
  git diff --stat 389e05a..HEAD -- 'specs/*.schema.json' | wc -l | grep -qFx 0 && echo "AC-INV-schema PASS"
  ```

## Test Plan

### Verification greps (Bash, deterministic)

```bash
# AC-INV-schema (no schema modified)
git diff --stat 389e05a..HEAD -- 'specs/*.schema.json' | wc -l   # =0

# AC-INV-packonly (manifest tools/ count)
jq '.documents | map(select(. | startswith("./tools/"))) | length' MANIFEST.json   # =2

# AC-13.5 + AC-13.5b (Block 0 oracle)
python3 -c "import json;s=json.load(open('specs/event.schema.json'));e=s['properties']['eventType']['enum'];req={'run.started','run.completed','cost.recorded','candidate.accepted','candidate.rejected','asset.generated','approval.granted','publish.completed'};assert len(e)==8 and set(e)>=req,(set(e)^req);print('AC-10 PASS')"
diff <(sed -n '439,442p' changes/spec-completion/tasks.md) \
     <(sed -n '84,87p' changes/spec-completion/WAVE-4-DEFERRED.md)   # mirror check

# AC-13.2 (CLI subcommands all exit 0 on HEAD 389e05a)
for sub in taxonomy gate; do
  tools/sddk-pack-audit "$sub" --root . >/dev/null && echo "$sub PASS" || echo "$sub FAIL"
done
tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root . | grep -Fx 'Middle Grade (10-11)' && echo "resolve PASS"

# AC-13.4 (resolve verbatim)
tools/sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}' --root .   # stdout: Middle Grade (10-11)

# AC-INV-rdd (3 CLI receipts recorded)
test "$(wc -l < cycle-artifacts/p-7c4aff45199a2069/m13-debt-resolution-process/cli-receipts.jsonl)" -eq 3

# AC-13.9 (ADR cap preserved)
test "$(ls docs/adrs/ADR-*.md | wc -l)" -le 26

# AC-13.7 (6 carry-over closures in vault)
for f in DEBT-OVERENG-001 DEBT-OVERENG-002 DEBT-COUPLING-002 DEBT-COUPLING-003 DEBT-OVERENG-NEW-M8-001 DEBT-DUPLICATION-NEW-M8-001; do
  test "$(grep -lE "findings_closed.*$f" ~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-$f-*.md | wc -l)" -ge 1 \
    && echo "$f closed PASS" || echo "$f closed FAIL"
done
```

## Risk Register (propagated from spec.md R1–R11)

| # | Risk | Mitigation in this design |
|---|---|---|
| **R1** | First post-pack-only cycle; verify + debt-verify gates ran under pack-only profile | Decision §"No ADR-026" preserves ADR headroom; Block A §"pack-only retirement" records transition; AC-13.8 verifies archive-receipt; `debt-tooling-cluster` is additive only for A-full |
| **R2** | First multi-line `tools/` entry; reviewer attention may overflow on Block B | Decision §"Bash" anchors to `check-skill-crossrefs.sh` precedent; one round of revisions; AC-13.2 enforces `set -euo pipefail`; AC-INV-rdd records argv/exit_code per SC-POL-1 |
| **R3** | ADR count 25/26 at start; adding 1 ADR leaves 0 headroom | Decision §"No ADR-026"; ADR count stays at 25; AC-13.9 enforces ≤26 cap |
| **R4** | AC-10 oracle may be re-stale-proofed in another file | Decision §"Block 0 oracle shape" patches both `tasks.md L439-442` and `WAVE-4-DEFERRED.md L84-87` (canonical text mirror); AC-13.5b verifies both sites |
| **R5** | `sddk-pack-audit` has no precedent in `tools/` beyond Bash preflight | Decision §"Bash" anchors to `check-skill-crossrefs.sh` (69 LoC Bash precedent, `set -euo pipefail`); SC-POL-1 argv/exit_code recorded per AC-INV-rdd |
| **R6** | 3 atomic blocks + optional ADR may exceed the 6-block A-lite ceiling | Plan ≤3 blocks (Block 0 + Block A + Block B); no optional ADR; if reviewer wants more, follow explore Approach 3 (split m13a + m13b) |
| **R7** | INC-025 (tainted-receipt governance) may be re-prioritised mid-cycle | Stays in framework backlog; out of scope §"Out of Scope" in proposal |
| **R8** | Marker convention may be challenged as "ceremonial" without enforcement | REQ-RDP-1 + AC-13.1 enforce marker placement at proposal phase; archive phase binds to commit subjects |
| **R9** | Cross-coupling rule clarification may be challenged as "redocumenting" rather than tightening | REQ-RDP-3 introduces concrete content-derived threshold formula (AC-023c reformulation); AC-13.7 closes 2 DEBT-COUPLING findings |
| **R10** | `{{ profiles.X }}` resolver may diverge from m12's Jinja2-style declaration | REQ-PAC-3 mirrors m12 REQ-A syntax verbatim; AC-13.4 verifies against m12A canonical `specs/profile-aliases.yaml` |
| **R11** | Pack-only retirement may be challenged as a process-only change with no code | REQ-RDP-4 + EVT-RDP-04 record transition in spec + archive; consequence is concrete (Block B's `tools/` entry + MANIFEST regen) and verifiable (AC-13.6, AC-INV-packonly) |

## Gate Evaluation

- **Gate**: `architecture-consistent`
- **Transition**: `phase.design.complete.a-lite` (A-lite path; `lease=null` per engine v1.57.0 — orchestrator owns lifecycle)
- **Outcome**: `passed`
- **Architecture impact**: `boundary` (per proposal §"Architecture Impact"; first multi-line `tools/` entry crosses docs→executable seam)
- **Requirement coverage**: REQ-RDP-1..6 covered by Block A; REQ-PAC-1..3 covered by Block B; AC-INV-vfix covered by Block 0; 23 ACs + 6 AC-INV-* total
- **Boundary / dependency check**: Block 0 independent; Block A independent; Block B depends on Block A (cites §"pack-overhead review gate" + §"duplication taxonomy"); MANIFEST regen coupled to Block B
- **Risk register**: 11 risks (R1–R11) all Med/Low; 4 design decisions resolve all 4 launch-packet open questions

## Next Recommended

`sddk-tasks` to decompose the 3 atomic blocks (Block 0 verifier-fix + Block A process spec + Block B pack-audit CLI) into implementation tasks for `sddk-apply`. Apply-phase acceptance gates:
- All 23 ACs + 6 AC-INV-* must pass before archive (AC-13.10: zero introduced HIGH/MEDIUM/CRITICAL; only 6 pre-existing LOW/P3 closures).
- Block 0 commits first as `fix(spec-completion): ac-10-oracle-stale-script` (≤3 LoC, in-pack, no schema change).
- Block A commits as `debt(spec|debt-resolution-process): debt-resolution-process-and-pack-only-retirement` (≤400 LoC, in-pack).
- Block B commits as `feat(tools|sddk-pack-audit): taxonomy-gate-resolve-subcommands` + `chore(manifest): regen-for-m13-pack-audit-cli` (≤700 LoC + regen, out-of-pack).

**M14+ pivot**: M14 may promote `debt-tooling-cluster` from optional to required for A-full paths; M14 may also land ADR-026 if `sddk-pack-audit` semantics warrant an irreversibility decision after one observation cycle.