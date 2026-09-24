# Tasks — m12-sequential-art-core (M12)

**Cycle**: `p-7c4aff45199a2069/m12-sequential-art-core` · branch `feat/m12-sequential-art-core` · base `06d4f5f` (v0.15.0)

## Block Plan

```
B0  Adaptador + fixture/golden + validación schema + tests unitarios
B1  Página /storyboard + graph lens + scenario SCN-M12-01-001 + run real
B2  Docs + receipts + cierre SDDK
```

## Tareas

### B0
- [ ] T0.1 `features/sequential-art/types.ts` (ChapterManuscript/beats) + `adapter.ts` (paginación 8–10, panels, speech, scene-breaks, layouts, shotRefs) + `validate.ts` (ajv).
- [ ] T0.2 Fixture `sample-chapter.ts` (3 escenas, 33 beats) + golden JSON commiteado.
- [ ] T0.3 Tests unitarios: golden exacto, schema, rangos de páginas, scene-breaks, direcciones, shotRefs deterministas, capítulo pequeño.

### B1
- [ ] T1.1 `views/Storyboard.tsx` + ruta `/storyboard` (grid de páginas/panels, badges de orden, scene-breaks, dirección, cero <img>).
- [ ] T1.2 Graph lens (SVG, nodos por panel, aristas de orden, importancia, agrupación por página).
- [ ] T1.3 `SCN-M12-01-001` (probes browser-evaluate) + ejecución real + evidence.

### B2
- [ ] T2.1 Levels REQ-SA-* + citas en tests + traceability regen.
- [ ] T2.2 Docs (roadmap/README/glossary) + commits + cierre SDDK.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-SA-1 | T0.1, T0.3 | AC-1 |
| REQ-SA-2 | T0.1, T0.3, T1.3 | AC-1, AC-2 |
| REQ-SA-3 | T0.1, T1.1, T1.3 | AC-2 |
| REQ-SA-4 | T0.1, T0.3, T1.1 | AC-1, AC-2 |
| REQ-SA-5 | T0.1, T0.3 | AC-1, AC-3 |
| REQ-SA-6 | T1.1, T1.2, T1.3 | AC-2, AC-4 |
| REQ-SA-7 | T1.3 | AC-2 |
