# Evidence index repair (one-time, 2026-09-13)

The harness `finalize()` used to write `hashes.sha256` and then append the
`run.finalized` event to `events.jsonl`, leaving the recorded hash of
`events.jsonl` stale in every bundle produced before the fix (cycle
m10-2-1-audit-gate-hardening). Hardening tests (H10) detected it.

Content files were **not modified**; only the `hashes.sha256` index was
recomputed from the immutable content so `audit retention` can verify these
bundles. The old index hash is recorded below for provenance.

- changes/m10-2-1-baseline-audit/evidence/after-run-pass: reindexed 47 files (index sha256 1065f5652548… → 57ccdeb0b6ad…)
- changes/m10-2-1-baseline-audit/evidence/before-run-catalog-unreachable: reindexed 46 files (index sha256 45f6d50962d9… → eb5e2c79aed6…)
- changes/m10-2-1-verification-audit-harness/evidence/after-run-pass: reindexed 32 files (index sha256 2c0f76afd1a4… → ea9a33206a3f…)
- changes/m10-2-1-verification-audit-harness/evidence/before-run-fail-wizard-unreachable: reindexed 21 files (index sha256 b7fb0de1f745… → 1a2f351b485c…)
