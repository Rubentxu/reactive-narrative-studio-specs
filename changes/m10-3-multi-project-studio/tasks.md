# Tasks — m10-3-multi-project-studio (M10.3)

**Cycle**: `p-7c4aff45199a2069/m10-3-multi-project-studio` · branch `feat/m10-3-multi-project-studio`

## Block Plan

```
B0  Store multi-proyecto + registro IndexedDB + tests unitarios
B1  Studio Home + SourcePicker integration + segundo fixture snapshot
B2  Catalog filtro por proyecto + oracle browser-evaluate + SCN-M10-05-001 + run real
B3  Docs + receipts + cierre
```

## Tareas

### B0
- [ ] T0.1 `projectionStore`: projects map + activeProjectId + setActive + loadFrom con id real.
- [ ] T0.2 `studio/projectRegistry.ts` (IDB solo-metadatos + fallback memoria).
- [ ] T0.3 Tests: dos loadFrom → identidades independientes; setActive espeja; record solo-metadatos; CRUD registry.

### B1
- [ ] T1.1 `views/Home.tsx` + ruta `/home` + nav en SourcePicker.
- [ ] T1.2 SourcePicker: upsertRecent tras carga (conserva favorite), título desde bundle.
- [ ] T1.3 Fixture `golden/control-plane/snapshot-second/` (id distinto + entidad diferenciada).

### B2
- [ ] T2.1 Catalog: chips de proyecto (runtime) + setActive.
- [ ] T2.2 Harness: action `browser.evaluate` + oracle `browser-evaluate` (script declarado, comparación declarativa) + tests.
- [ ] T2.3 `SCN-M10-05-001` con claims D8 + ejecución real + evidence.
- [ ] T2.4 Ajustes derivados de la ejecución (antes/after si hay defectos).

### B3
- [ ] T3.1 Docs (roadmap M10.3, README, glossary) + registry/baseline regen + commits.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-MP-1 | T0.1, T0.3, T2.3 | AC-1 |
| REQ-MP-2 | T0.2, T0.3, T2.2 | AC-2 |
| REQ-MP-3 | T1.1, T1.2, T2.3 | AC-1 |
| REQ-MP-4 | T2.1, T2.3 | AC-1 |
| REQ-MP-5 | T2.3 | AC-3 |
| REQ-MP-6 | T0.2, T2.2 | AC-2 |
