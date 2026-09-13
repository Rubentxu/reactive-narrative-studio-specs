# Tasks — m11-human-reader-uat (M11)

**Cycle**: `p-7c4aff45199a2069/m11-human-reader-uat` (retomado; fase specify→design completadas hoy)

## Block Plan

```
B0  Feature folder human-reader + ruta /reader-uat + INC-015/INC-008
B1  Harness: oracle jsonl-entry + SCN-M11-01-001 + ejecución real
B2  INC-016 cierre en vault + docs + receipts
```

## Tareas

### B0
- [ ] T0.1 `features/human-reader/{types,readerId,roundId,feedbackSerializer}.ts` + tests unitarios del serializador y anonimato.
- [ ] T0.2 `ReaderFeedbackForm.tsx` + ruta `/reader-uat` + extension kind aditivo.
- [ ] T0.3 INC-015: fallback recursivo en `validate.py` (+ verificación exit 0 sin argumento).
- [ ] T0.4 INC-008: extensión de greps en `extension-isolation.spec.ts` (+ test de isolación del nuevo folder).

### B1
- [ ] T1.1 Harness: oracle `jsonl-entry` (parseo JSONL + semantic-json con ignoredPaths) + tests.
- [ ] T1.2 `SCN-M11-01-001` con claims D8 + ejecución real + evidence.
- [ ] T1.3 Ajustes derivados de la ejecución.

### B2
- [ ] T2.1 INC-016: verificación de que v0.11.0 lo cerró + actualización vault (status closed) + roadmap.
- [ ] T2.2 Docs (roadmap M11, README, glossary) + traceability/baseline regen + commits.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-M11-1 | T0.2, T1.2 | AC-1 |
| REQ-M11-2 | T0.1, T0.2, T1.1, T1.2 | AC-1, AC-2, AC-4 |
| REQ-M11-3 | T0.1, T0.2, T0.4, T1.2 | AC-3 |
| REQ-M11-4 | T0.2, T1.2 | AC-1, AC-3 |
| REQ-M11-5 | T0.3, T0.4, T2.1 | AC-5 |
| REQ-M11-6 | T1.2 | AC-1, AC-6 |
