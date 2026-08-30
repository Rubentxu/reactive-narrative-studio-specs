# Proposal: debt-resolution-process — close m12 carry-overs + retire pack-only invariant (m13)

- **Change id**: `debt-resolution-process`
- **Cycle**: `p-7c4aff45199a2069/m13-debt-resolution-process`
- **Evidence**: `explore-report.md` SHA-256 `28eefa8e…` (sha256:28eefa8e, 255 lines, C3, gates G1–G8 PASS)
- **Baseline**: branch `main`, HEAD `389e05a` (post-v0.5.5), working tree clean (only `changes/` + `cycle-artifacts/` untracked)
- **Path**: A-lite; **version target**: v0.5.6 (patch bump)
- **Rounds**: 1 (m13)

## Intent

m12 closed 4 of 10 carry-overs via the alias-registry refactor and left 6 LOW/P3 findings bucketed into its §"M13 Pivot Advisory". This change resolves all 6, introduces `tools/sddk-pack-audit` (the first post-pack-only `tools/` entry), and codifies the **retirement of the pack-only invariant** that governed m9–m12. After m13, the cycle no longer assumes `specs/ examples/ templates/ docs/` are the sole mutable surface; `tools/` becomes a governed, in-scope path. R8 (INC-025 tainted-receipt governance) stays in backlog per m12 advisory.

## Scope

### In Scope

- **`changes/debt-resolution-process/{proposal,design,tasks,spec}.md`** — the process spec closing 4 process-level findings (`DEBT-OVERENG-001/002`, `DEBT-COUPLING-002/003`).
- **`tools/sddk-pack-audit`** — Bash or Python CLI; structural-vs-content duplication taxonomy + pack-overhead review gate + `{{ profiles.X }}` alias resolver (one entrypoint, three responsibilities, anchored to `tools/check-skill-crossrefs.sh` precedent).
- **`MANIFEST.json` regen** — one new entry for the tool (regen-style; same pattern as m11D + m8C).
- **One-place verifier fix** at `changes/spec-completion/{tasks.md L439-442, WAVE-4-DEFERRED.md L84-87}` — replace the stale `$defs`-key oracle with an enum-coverage + `$defs`-count oracle (the AC-10 verifier falsely flags a structurally-complete schema; revalidated per explore §"AC-10 revalidation").
- **Optional** `docs/adrs/ADR-026-sddk-pack-audit-cli.md` if design forces an irreversibility decision (ADR budget 25/26; reserve only).
- **Optional** one-line `docs/27-GLOSSARY.md` amendment for "debt carry-over" term.

### Out of Scope

- R8 / INC-025 (tainted-receipt governance) — framework backlog only.
- CI workflows — separate change.
- Any modification to `specs/*.schema.json` (AC-INV-3 of m12 still binding).
- New IR / event / provider / publishing schemas (covered by m4 wave-4b, already landed at `b89ff0d`).
- Profile alias registry content (`specs/profile-aliases.yaml`) — already canonical; m13 only consumes it.

## Capabilities

> CONTRACT with sddk-spec. Vault research: `capability-m2-init-2026-08-28` exists and covers none of the surfaces below; all entries are net-new. The two m13-coined capability names below MUST be reused verbatim in `specs/<capability>/spec.md` by sddk-spec.

### New Capabilities

- `debt-resolution-process`: process spec that codifies (a) how LOW/P3 carry-overs are mapped to atomic blocks at proposal time, (b) the "marker convention" for intentional-abstraction calls in proposals (`DEBT-OVERENG-001`), (c) the payload-review convention for commit subjects that drift from diff content (`DEBT-OVERENG-002`), (d) the cross-coupling rule clarification between cycle-artifact spec amendments and inner-repo substrate fixtures (`DEBT-COUPLING-002`/`003`).
- `pack-audit-cli`: Bash-or-Python CLI under `tools/` exposing three sub-commands — `taxonomy` (structural-vs-content duplication report), `gate` (pack-overhead review gate producing PASS/WARN/FAIL with recorded argv/exit_code), `resolve` (consumes `specs/profile-aliases.yaml` and substitutes `{{ profiles.<id> }}` placeholders across `examples/`, `templates/`, `docs/`). Anchored to `tools/check-skill-crossrefs.sh` Bash precedent (69 lines, `set -euo pipefail`, scope-files array pattern) and to D-02 PyYAML pinning from `changes/spec-completion/tasks.md` if Python.

### Modified Capabilities

- None. Existing capabilities (`catalog-vocabulary-normalization`, `cli-json-contracts`, `control-plane-projection-schemas`, `profile-alias-consumption`, `event-log-schema`, …) are unchanged at spec level; m13 only consumes them.

## Approach

<!-- debt-marker(DEBT-OVERENG-001, kind=overeng, rationale=approach table synthesizes 3 blocks into one change record for A-lite efficiency) -->
<!-- debt-marker(DEBT-OVERENG-002, kind=duplication, rationale=block scope descriptions simplified; detailed specs deferred to spec.md sections) -->

**Approach 1 + Approach A3** from explore §"Approaches" — 3 atomic blocks, fits A-lite 6-block budget with 3 to spare.

<!-- payload-review(diff-scope=Block A adds 7 process §s in spec.md + Block B adds CLI + MANIFEST regen + Block 0 fixes oracle, subject-scope=debt-resolution-process, mismatch-rationale=proposal approach describes blocks but actual commit prefixes are debt(spec|debt-resolution-process) and feat(tools|sddk-pack-audit)) -->

| Block | Path | Files | Est. LoC | Risk |
|---|---|---|---|---|
| **0** verifier-fix | in-pack (`changes/spec-completion/`) | 2 | ≤3 | Trivial |
| **A** debt-resolution-process spec | pack (`changes/debt-resolution-process/` + optional `docs/27`) | 4–5 | ~200–400 | Low |
| **B** `tools/sddk-pack-audit` (taxonomy + gate + alias resolver) | out-of-pack (`tools/`, `MANIFEST.json`) | 2 + regen | ~400–800 | Medium |
| optional **C** ADR-026 | pack (`docs/adrs/`) | 1 | ~50–80 | Low (only if Block B warrants) |

Block B absorbs the runtime alias consumer (Approach A3) — the pack-audit CLI is the natural home because it already inspects the pack surface where aliases live. Block 0 is independent and lives in-pack so the launch packet's flagged drift is closed before the next verifier run.

## Findings-Closure Mapping

| Finding ID | Fingerprint | Severity | Confidence | Vault node | M13 Block | Closure surface |
|---|---|---|---|---|---|---|
| **DEBT-OVERENG-001** | `1c8e5f3b70cd96db` | LOW | HIGH | `finding-DEBT-OVERENG-001-2026-08-28.md` | Block A | `debt-resolution-process` capability §"marker convention" |
| **DEBT-OVERENG-002** | `f14f80ae0125eaa0` | LOW | HIGH | `finding-DEBT-OVERENG-002-2026-08-28.md` | Block A | `debt-resolution-process` capability §"payload review" |
| **DEBT-COUPLING-002** | `5b8c0a7d3c4b9c5e` | LOW | HIGH | `finding-DEBT-COUPLING-002-2026-08-28.md` | Block A | `debt-resolution-process` capability §"cross-coupling rule" |
| **DEBT-COUPLING-003** | `d6c5a3b9d5e2c4d1` | LOW | HIGH | `finding-DEBT-COUPLING-003-2026-08-28.md` | Block A | `debt-resolution-process` capability §"AC-023c threshold reformulation" |
| **DEBT-OVERENG-NEW-M8-001** | `e3b8f02c47b09b53` | LOW | MEDIUM | (none) | Block A + Block B | `pack-audit-cli` `gate` subcommand; semantically anchored in `debt-resolution-process` §"pack-overhead review gate" |
| **DEBT-DUPLICATION-NEW-M8-001** | `0b7d2c4e8a1f9b6a` | LOW | MEDIUM | (none) | Block A + Block B | `pack-audit-cli` `taxonomy` subcommand + structural-vs-content taxonomy definition in `debt-resolution-process` §"duplication taxonomy" |

No dedicated vault node exists for the two M8 carry-overs; per m12 debt-report.md §"Pre-Existing Findings" they are LOW+MEDIUM (non-blocking) so absence does not trigger INCONCLUSIVE. The proposal-phase `findings_closed[]` entry will reference the Block-A spec section + Block-B CLI subcommand for each.

## Pack-Only Invariant Retirement (R-postpack-1)

The pack-only invariant that governed m9–m12 (cycles MAY modify ONLY `specs/ examples/ templates/ docs/`) **is RETIRED with the landing of m13's Block B**. Consequences for `sddk-verify` and `sddk-debt-verify`:

- **Pack-only profile no longer applies.** The `verify/` and `debt-verify/` profiles used by m9–m12 were scoped to pack surfaces only; m13 introduces a new `tools/` surface and a new `MANIFEST.json` regen pattern.
- **Tooling-gate adds a new cluster.** `debt-tooling-cluster` joins `debt-architecture`, `debt-coupling`, `debt-duplication`, `debt-smells`, `debt-overeng` for A-full paths. A-lite remains at the original 4 required clusters (`coupling`, `duplication`, `smells`, `overeng`); `tooling` is optional additive coverage.
- **`{{ profiles.X }}` consumption becomes first-class.** The runtime alias resolver in Block B closes R1/R5 of m12 spec by consumption (not by contract canonicalisation); the `profile-alias-consumption` capability of m12 stops carrying the "consumer to be introduced M13+" caveat.
- **A-lite budget re-confirmed at 4 required clusters** (the m13 debt-verify run does not extend the A-lite gate). v0.5.6 ships with `debt-tooling-cluster` as additive evidence only; v0.6.x may promote to required if drift appears.
- **MANIFEST.json is now in-cycle mutable by tooling.** Regen-style entries (m11D, m8C precedent) are still in-scope; `sddk-pack-audit gate` MAY add a future `manifest.coherent` check but m13 stops at the structural-vs-content taxonomy.

This retirement is a **process decision**, not a code change — it lives in the `debt-resolution-process` capability §"Pack-only retirement" (Block A) and is recorded in `cycle-artifacts/.../m13-.../archive-report.md` as an explicit invariant transition (`pack-only → pack+tools`).

## Quality Intent

- Production surfaces: `changes/debt-resolution-process/{proposal,design,tasks,spec}.md`, `tools/sddk-pack-audit`, `MANIFEST.json` (one regen), `changes/spec-completion/{tasks.md,WAVE-4-DEFERRED.md}` (verifier fix).
- Changed public APIs: `tools/sddk-pack-audit` CLI surface (new); `MANIFEST.json` schema unchanged.
- Readiness dimensions: contract completeness (the new spec MUST close all 6 carry-overs), internal consistency (no `specs/*.schema.json` modified), testability of `sddk-pack-audit` (Bash `set -euo pipefail` + recorded argv/exit_code per SC-POL-1 / REQ-IPV).
- Required real boundaries: (a) `sddk-pack-audit taxonomy` MUST distinguish structural from content duplication on the **real** pack (not a fixture); (b) `sddk-pack-audit resolve` MUST resolve `{{ profiles.profile-middle-grade-10-11 }}` against the **real** `specs/profile-aliases.yaml` and produce exit `0`.

## Architecture Impact

- **Level**: `boundary` — the new `tools/` entry crosses the documentation→executable seam; pack-audit reads pack surfaces (`specs/`, `examples/`, `templates/`, `docs/`) but produces no new schema.
- **Evidence**: `tools/check-skill-crossrefs.sh` (Bash precedent, 69 LoC, `set -euo pipefail`), `specs/profile-aliases.yaml` (consumer surface, m7F canonical), `MANIFEST.json` (regen pattern, m8C + m11D), ADR-001 (profile-as-knowledge-artifact), ADR-005 (alias dereferencing), ADR-014 (runtime consumer placement).
- **Architecture intent**: A proposal-phase observed/planned C4 preview is produced by `sddk-c4-likec4` if available; otherwise the fallback table below is the canonical intent for design phase to deepen.

| Element | Observed (today) | Planned (after m13) |
|---|---|---|
| Container `tools/` | 1 entry (Bash preflight) | 2 entries (Bash preflight + pack-audit CLI) |
| Container `changes/` | 1 change (`spec-completion`) | 2 changes (`spec-completion`, `debt-resolution-process`) |
| External actor `sddk-verify` | reads pack surfaces | reads pack + `tools/` registry |
| External actor `sddk-debt-verify` | 4 clusters, pack-only | 4 clusters required + 1 additive (`tooling`) |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `changes/debt-resolution-process/` | New | `proposal.md`, `design.md`, `tasks.md`, `spec.md` (4–5 files) |
| `changes/spec-completion/tasks.md` | Modified | AC-10 oracle at L439-442: replace `assert not req-d` with enum-coverage + count check |
| `changes/spec-completion/WAVE-4-DEFERRED.md` | Modified | Same oracle fix at L84-87 |
| `tools/sddk-pack-audit` | New | Bash or Python CLI; three sub-commands |
| `MANIFEST.json` | Modified | +1 entry for the new tool (regen pattern) |
| `docs/27-GLOSSARY.md` | Optional | One-line entry for "debt carry-over" term |
| `docs/adrs/ADR-026-*.md` | Optional | Only if Block B forces an irreversibility decision |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **R-postpack-1** — verify / debt-verify re-profile needed post-pack-only-retirement | Med | Documented in `debt-resolution-process` §"Pack-only retirement"; A-lite re-execution accepted with `coverage.rationale_for_extra_cluster` for `debt-tooling-cluster` |
| **R-blast-tools** — first multi-line `tools/` entry; reviewer attention may overflow | Med | Block B ≤700 LoC; one revision round; record argv/exit_code per SC-POL-1 |
| **R-coupling-budget** — ADR count 25/26; adding ADR-026 leaves 0 headroom | Low | Reserve ADR-026 only if Block B forces it; Block A typically needs no new ADR |
| **R-verifier-drift** — AC-10 oracle remains stale in another file | Low | Block 0 patches both `tasks.md` and `WAVE-4-DEFERRED.md` (canonical text mirror) |
| **R-ungrounded-tool** — `sddk-pack-audit` has no precedent beyond Bash preflight | Med | Anchor to `tools/check-skill-crossrefs.sh` pattern + D-02 PyYAML pinning if Python |
| **R-rebudget** — 3 atomic blocks + optional ADR may exceed A-lite 6-block ceiling | Low | Plan ≤3 blocks; if reviewer wants more, follow explore Approach 3 (split m13a + m13b) |
| **R-inc-025** — INC-025 may be re-prioritised mid-cycle | Closed | Stays in framework backlog; project scope narrower |
| **R-m12-artifact-drift** — `cycle-m12` `debts_deferred` lists 5 but debt-report has 6 carry-overs | Doc-internal | Non-blocker; reconciliation handled in m13 archive phase if requested |

## Rollback Plan

This is a content+tooling change with no runtime state. Per the A-lite contract:

1. Every block lands as its own commit, prefixed `debt(spec|debt-resolution-process): …` for Block A and `feat(tools|sddk-pack-audit): …` for Block B; verifier-fix lands as `fix(spec-completion): ac-10-oracle-stale-script` (≤3 LoC).
2. Released under tag `v0.5.6` (patch bump per release convention); release notes link the 6 carry-overs by fingerprint.
3. Full rollback: `git revert v0.5.5..v0.5.6` — or `--no-commit <first>..<last>` for selective revert.
4. Partial rollback: Block 0 / Block A / Block B revertible independently. Block B's CLI surface is removable without affecting Block A's spec; Block A's spec is removable without affecting Block 0.
5. Tooling rollback removes `tools/sddk-pack-audit` + reverts `MANIFEST.json` regen (single commit, ≤10 LoC net).
6. No remote dependency; no DB migration; no CI integration to undo.

## Dependencies

- Baseline `389e05a` (post-v0.5.5) MUST remain unamended.
- m12 cycle closure receipt (`release-receipt-m6-…`-equivalent for m12) MUST exist — confirmed via `git log v0.5.5^{} -1 --format=%H` = `9c87582…`.
- D-02 PyYAML pin from `changes/spec-completion/tasks.md` if Python is chosen for Block B.
- 6 carry-over findings MUST remain open until m13 archive closure (per `cycle-m12-…` `debts_deferred`); no premature status flip to `closed` in vault frontmatter.

## Success Criteria

| id | Criterion | Milestone |
|---|---|---|
| AC-13.1 | `changes/debt-resolution-process/{proposal,design,tasks,spec}.md` all exist; spec.md declares the 6 carry-over closures | M13 |
| AC-13.2 | `tools/sddk-pack-audit` script exists, is executable, has `set -euo pipefail` (or `if __name__ == "__main__":` Python entrypoint); three sub-commands (`taxonomy`, `gate`, `resolve`) all return exit `0` on a clean pack | M13 |
| AC-13.3 | `sddk-pack-audit gate` produces PASS for HEAD `389e05a` with recorded argv/exit_code (SC-POL-1 evidence) | M13 |
| AC-13.4 | `sddk-pack-audit resolve '{{ profiles.profile-middle-grade-10-11 }}'` substitutes the alias against `specs/profile-aliases.yaml` and returns the dereferenced `Middle Grade (10-11)` value with exit `0` | M13 |
| AC-13.5 | AC-10 oracle at `changes/spec-completion/{tasks.md L439-442, WAVE-4-DEFERRED.md L84-87}` passes against HEAD `389e05a`'s `specs/event.schema.json` (enum-coverage + count check, NOT `$defs`-key equality) | M13 |
| AC-13.6 | `MANIFEST.json` regen includes `tools/sddk-pack-audit`; total entry count = 128 (was 127) | M13 |
| AC-13.7 | All 6 carry-over findings carry a `findings_closed[]` entry referencing the Block-A spec section + Block-B CLI subcommand that closes them | M13 |
| AC-13.8 | `cycle-artifacts/.../m13-.../archive-report.md` records the explicit invariant transition `pack-only → pack+tools` with m12/v0.5.5 as the last pack-only release | M13 |
| AC-13.9 | ADR count ≤ 26 after m13 (1 free slot post-block; ADR-026 only if Block B forces it) | M13 |
| AC-13.10 | Zero introduced HIGH/MEDIUM/CRITICAL findings (only 6 pre-existing LOW/P3 closures expected) | M13 |

## Vault References

- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-DEBT-OVERENG-001-2026-08-28.md`
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-DEBT-OVERENG-002-2026-08-28.md`
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-DEBT-COUPLING-002-2026-08-28.md`
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/finding-DEBT-COUPLING-003-2026-08-28.md`
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/cycle-m12-spec-completion-followup-7-2026-08-30.md` (deferred owner)
- `~/.sddk-knowledge/p-7c4aff45199a2069/cycles/review-block-{6A..6E}-2026-08-28.md` (m6 review precedents)
- Cycle artifact: `p-7c4aff45199a2069/m13-debt-resolution-process/explore-report.md` (SHA-256 `28eefa8e…`)
- Cycle artifact: `p-7c4aff45199a2069/m12-spec-completion-followup-7/debt-report.json` (SHA-256 `a4d00f40…`; carry-over authority)