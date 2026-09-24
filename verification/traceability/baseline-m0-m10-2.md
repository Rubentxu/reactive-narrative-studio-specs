# Baseline M0–M10.2 — Verification Coverage

- generated: 2026-09-24T20:18:37.066Z
- git: edbbca84d980ba49b6950b8a4cb620e5bff0a92b
- coverage: 67/67 requirements MAPPED (scenario or test) · 0 UNMAPPED · 8/21 UATs executable · 2 waiver(s)

## Per-milestone status

### M0 — Foundations / specs
- ⚪ UAT-M0-01 — MANUAL_ONLY

### M1 — Narrative workspace
- ⚪ UAT-M1-01 — MANUAL_ONLY

### M2 — Profiles
- ⚪ UAT-M2-01 — MANUAL_ONLY

### M3 — Skills & packs
- ⚪ UAT-M3-01 — MANUAL_ONLY

### M4 — Generation pipeline
- ⚪ UAT-M4-01 — MANUAL_ONLY

### M5 — Visual pipeline
- ⚪ UAT-M5-01 — MANUAL_ONLY

### M6 — Editor workbench
- ⚪ UAT-M6-01 — MANUAL_ONLY

### M7 — Export & publishing
- ⚪ UAT-M7-01 — MANUAL_ONLY

### M8 — Git-native storage
- ⚪ UAT-M8-01 — MANUAL_ONLY

### M9 — CLI
- ⚪ UAT-M9-01 — MANUAL_ONLY
- requirements MAPPED (7): REQ-CLI-001, REQ-CLI-002, REQ-CLI-003, REQ-CLI-004, REQ-CLI-005, REQ-CLI-006, REQ-CLI-007

### M10 — Control Plane Foundation
- ⚪ UAT-M10-01 — MANUAL_ONLY
- ⚪ UAT-M10-02-catalog-entity-pages — MANUAL_ONLY
- ⚪ UAT-M10-03-local-search-docs — MANUAL_ONLY
- 🟢 UAT-M10-05-multi-project-catalog — EXECUTABLE (scn-m10-05-001.yaml)
- requirements MAPPED (7): REQ-CP-001, REQ-CP-002, REQ-CP-003, REQ-CP-004, REQ-CP-005, REQ-CP-006, REQ-CP-007

### M10.1 — Creation Recipes
- 🟢 UAT-M10-04-creation-recipe — EXECUTABLE (scn-m10-04-001.yaml)
- 🟢 UAT-M10-07 — EXECUTABLE (scn-m10-01-001.yaml)
- requirements MAPPED (13): REQ-CR-1, REQ-CR-10, REQ-CR-11, REQ-CR-12, REQ-CR-2, REQ-CR-3, REQ-CR-4, REQ-CR-5, REQ-CR-6, REQ-CR-7, REQ-CR-8, REQ-CR-9, REQ-RECIPE-EQUIVALENCE

### M10.2 — Capability Catalog
- 🟢 UAT-M10-06-capability-catalog — EXECUTABLE (scn-m10-02-001.yaml)
- requirements MAPPED (16): REQ-CEP-1, REQ-CEP-2, REQ-CEP-3, REQ-CEP-4, REQ-CR-CAP-1, REQ-CR-CAP-10, REQ-CR-CAP-11, REQ-CR-CAP-12, REQ-CR-CAP-2, REQ-CR-CAP-3, REQ-CR-CAP-4, REQ-CR-CAP-5, REQ-CR-CAP-6, REQ-CR-CAP-7, REQ-CR-CAP-8, REQ-CR-CAP-9

### M10.2.1 — Verification & Audit Harness
- requirements MAPPED (12): REQ-VAH-AUDIT-GATE, REQ-VAH-BASELINE, REQ-VAH-BOOTSTRAP, REQ-VAH-BROWSER-AUDIT, REQ-VAH-CI-ARTIFACTS, REQ-VAH-CROSSREF-RENDER, REQ-VAH-EVIDENCE-INTEGRITY, REQ-VAH-FITNESS-SEPARATION, REQ-VAH-HARDENING, REQ-VAH-STORE-IMMUTABILITY, REQ-VAH-VERIFICATION-LEVEL, REQ-VAH-WAIVER

### M12 — Sequential Art Core
- 🟢 UAT-M12-01 — EXECUTABLE (scn-m12-01-001.yaml)

### M13 — Comic Renderer
- 🟢 UAT-M13-01 — EXECUTABLE (scn-m13-01-001.yaml)

### M14 — Manga Profile
- 🟢 UAT-M14-01 — EXECUTABLE (scn-m14-01-001.yaml)
- requirements MAPPED (6): REQ-M14-01, REQ-M14-02, REQ-M14-03, REQ-M14-04, REQ-M14-05, REQ-M14-06

### M15 — Digital Publishing
- 🟢 UAT-M15-01 — EXECUTABLE (scn-m15-01-001.yaml)
- requirements MAPPED (6): REQ-M15-01, REQ-M15-02, REQ-M15-03, REQ-M15-04, REQ-M15-05, REQ-M15-06

## Gaps / backlog
- [HIGH] uat-without-scenario: UAT-M10-01 (M10) — UAT doc exists but no executable scenario links it yet
- [HIGH] uat-without-scenario: UAT-M10-02-catalog-entity-pages (M10) — UAT doc exists but no executable scenario links it yet
- [HIGH] uat-without-scenario: UAT-M10-03-local-search-docs (M10) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M0-01 (M0) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M1-01 (M1) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M2-01 (M2) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M3-01 (M3) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M4-01 (M4) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M5-01 (M5) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M6-01 (M6) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M7-01 (M7) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M8-01 (M8) — UAT doc exists but no executable scenario links it yet
- [MEDIUM] uat-without-scenario: UAT-M9-01 (M9) — UAT doc exists but no executable scenario links it yet

## Waivers
- WVR-M10-2-1-001 — requirement REQ-VAH-CROSSREF-RENDER — No real capability content contains [[Kind:namespace/name]] cross-references, so positive cross-link rendering cannot be demonstrated as a functional browser UAT. The plugin semantics are covered at component level; functional coverage is deferred until the first real cross-reference lands in content. (scope: M10.2 capability catalog cross-links (SCN-M10-02-001 doesNotProve); owner: m10.2.1-baseline-audit cycle)
  - evidence: control-plane/test/capability-cross-ref.spec.ts (component-level plugin coverage)
  - evidence: grep -rn '\[\[' examples/ recipes/ → 0 occurrences (2026-09-13)
- WVR-M10-2-1-002 — requirement REQ-VAH-STORE-IMMUTABILITY — Projection-store non-mutation is proven at component level (round-trip no-op deep-equal pre/post route mount). It is not reachable black-box in the browser without test hooks (TEST_MODE is prohibited by the change spec), so the functional scenario explicitly does not claim it. (scope: M10.2 read-only catalog invariant (m10 no-write); owner: m10.2.1-baseline-audit cycle)
  - evidence: control-plane/test/capability-catalog.spec.ts (useProjectionStore.getState() deep-equal round-trip proof)
  - evidence: spec.md del slice: separación fitness/UAT (REQ-VAH-FITNESS-SEPARATION)
