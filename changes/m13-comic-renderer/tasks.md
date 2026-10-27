# Tasks — m13-comic-renderer (M13)

**Cycle**: `p-7c4aff45199a2069/m13-comic-renderer` · branch `feat/m13-comic-renderer` · base `e9e4980` (v0.16.0)

## Block Plan

```
B0  Motor de render (profile + layout + SVG capas) + ZIP/CBZ + tests
B1  Vista /comic + oracle zip-entries + UAT-M13-01 + scenario + run real
B2  Docs + receipts + cierre SDDK
```

## Tareas

### B0
- [ ] T0.1 `features/comic-renderer/{types,profile,layout,svg,zip,cbz}.ts` (+ ComicInfo.xml).
- [ ] T0.2 Tests: rects sin solape, SVG capas/texto/determinismo, zip roundtrip (parser mínimo), ComicInfo.

### B1
- [ ] T1.1 `views/ComicProof.tsx` + ruta `/comic` (navegador de página, toggles de capa, descargas).
- [ ] T1.2 Harness: oracle `zip-entries` + tests.
- [ ] T1.3 `uat/UAT-M13-01.md` + `SCN-M13-01-001` + ejecución real + evidence.

### B2
- [ ] T2.1 Levels REQ-CR-* + citas + traceability regen.
- [ ] T2.2 Docs (roadmap/README/glossary) + commits + cierre SDDK.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-M13-1 | T0.1, T0.2 | AC-1 |
| REQ-M13-2 | T0.1, T0.2, T1.3 | AC-1, AC-3 |
| REQ-M13-3 | T0.1, T0.2, T1.3 | AC-1, AC-3 |
| REQ-M13-4 | T0.1, T0.2, T1.3 | AC-2 |
| REQ-M13-5 | T1.1, T1.3 | AC-3 |
| REQ-M13-6 | T1.2, T1.3 | AC-2, AC-3 |
