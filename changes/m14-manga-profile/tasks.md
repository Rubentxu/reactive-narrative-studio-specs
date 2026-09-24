# Tasks — m14-manga-profile (M14)

**Cycle**: `p-7c4aff45199a2069/m14-manga-profile` · branch `feat/m14-manga-profile` · base `2ae2b8d`

## Block Plan

```
B0  Perfil manga (types + RTL + screentone + colores elevados) + tests unitarios
B1  Vista /comic switcher + UAT-M14-01 + scenario + run real + audit
B2  Docs + receipts + cierre SDDK + release v0.18.0
```

## Tareas

### B0
- [x] REQ-M14-01/02: `PresentationProfile.direction|screentone` + `MANGA_PROFILE` + colores elevados (`captionStroke/textFill/captionTextFill/metaFill`) — `048f8cb`
- [x] REQ-M14-03: espejo RTL en `computePanelRects` — `048f8cb`
- [x] REQ-M14-04: patrón screentone + `data-profile`/`data-direction` — `048f8cb`
- [x] REQ-M14-05: `comic-renderer-manga.spec.ts` (20 tests) — `e8546e2`

### B1
- [x] REQ-M14-06: switcher comic|manga + CBZ por perfil — `048f8cb`
- [x] `uat/UAT-M14-01.md` + `scn-m14-01-001.yaml` + M14 en traceability — `1419585`
- [x] Run real: SCN-M14-01-001 PASS (5/5 oracles); canonical `verify` 8/8 PASS; audit M10.2.1 PASS_WITH_WAIVER (0 bloqueos); audit M14 PASS

### B2
- [x] Docs (roadmap M14 entregado, glossary) + receipts + release v0.18.0 + archive
