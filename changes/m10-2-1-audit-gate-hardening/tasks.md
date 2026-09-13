# Tasks — m10-2-1-audit-gate-hardening (H9 + H10)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-audit-gate-hardening` · branch `feat/m10-2-1-audit-gate-hardening` · base `49fe7f8` (v0.12.0)

## Block Plan

```
B0  H9: audit milestone/range + requirement-levels + JUnit + CI workflow
B1  H10: verify-evidence + audit retention + flakiness + hardening tests
B2  Audits reales (M10.2.1 PASS, M10.1 FAIL honesto) + docs + commits
```

## Tareas

### B0 — H9
- [ ] T0.1 `src/audit/audit.ts`: AuditGate (milestone/range) con estados PROVEN/WAIVED/PARTIALLY_VERIFIED/FAILED/UNMAPPED.
- [ ] T0.2 `requirement-levels.json` + loader/validación (functional default, fitness declarado).
- [ ] T0.3 CLI `audit milestone|range` + salida JSON/markdown + exit codes.
- [ ] T0.4 JUnit reporter (por run + agregado `junit-all.xml`).
- [ ] T0.5 Citarr requisitos: tests de H8 del harness citan REQ-VAH-BASELINE/WAIVER/FITNESS-SEPARATION + levels.
- [ ] T0.6 `.github/workflows/verification.yml` (gates bloqueantes + auditorías + artifacts).

### B1 — H10
- [ ] T1.1 `verify-evidence` (hashes + ficheros obligatorios) + `audit retention`.
- [ ] T1.2 `audit flakiness` (histórico por scenario).
- [ ] T1.3 `test/hardening.spec.ts`: corrupt-evidence, dirty-tree, redaction proceso, parallel isolation, flakiness.

### B2 — Cierre
- [ ] T2.1 Ejecutar `audit milestone M10.2.1` (PASS esperado), `audit milestone M10.1` (FAIL honesto), `audit retention`, `audit flakiness`.
- [ ] T2.2 Docs (roadmap/README/glossary) + commits atómicos.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-VAH-AUDIT-GATE | T0.1, T0.3, T2.1 | AC-1 |
| REQ-VAH-VERIFICATION-LEVEL | T0.2, T0.5 | AC-2 |
| REQ-VAH-CI-ARTIFACTS | T0.4, T0.6 | AC-3 |
| REQ-VAH-EVIDENCE-INTEGRITY | T1.1, T2.1 | AC-4 |
| REQ-VAH-HARDENING | T1.2, T1.3 | AC-5 |
