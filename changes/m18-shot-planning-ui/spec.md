# Specification — m18-shot-planning-ui (superficie web de planificación de tomas)

**Ciclo**: `m18-shot-planning-ui` · **Rama**: `feat/m18-shot-planning-ui` · **Base**: `bd78ddd` (main tras v0.27.0)
**Fuentes**: `changes/m18-spike-prep/spec.md` y `changes/m18-camera-gates/spec.md` (motor determinista v0.26.0/v0.27.0); patrones del control-plane (rutas code-based tanstack, schemas importados de `specs/`, vistas `src/views/*`, tests vitest + testing-library, escenarios browser con click/evaluate).
**Niveles**: REQ-CIN-16 `functional` (veredicto de SCN-CIN-05-001), REQ-CIN-17 `functional` (oráculos de equivalencia del mismo escenario). Sin nuevos UAT docs: el escenario cita `UAT-CIN-01-shotplan` (la UI es otra superficie del mismo contrato de validación) — UAT-CIN-01 pasa a 2 escenarios.

## Alcance

**In scope**: (1) feature `control-plane/src/features/cinematic/` — port TypeScript del modelo geométrico y gates (`camera.ts`), validación combinada schema+gates con Ajv (`validatePlan.ts`), muestras incluidas (ejemplo canónico + plano físicamente imposible) y parseo de artefactos de previz (`previz.ts`); (2) vista `/cinematic` con editor YAML del ShotPlan, validación en cliente (errores de schema y gates físicos con path/mensaje) y visor de previz por selección de ficheros (scene-metadata.json + playblast mp4 + provenance.json, todo en cliente — invariantes serverless); (3) spec de paridad cross-runtime `control-plane/test/cinematic-cross-runtime.spec.ts` (orchestra Python y TypeScript y compara sus stdout byte a byte); (4) escenario canónico `scn-cin-05-001` — UI en navegador real + **equivalencia cross-runtime byte-idéntica** Python↔TypeScript de los veredictos; (5) tests vitest de la feature; (6) entradas de nivel REQ-CIN-16/17 y regeneración de trazabilidad/audit.

**Fuera de scope**: adaptador HiggsfieldProvider (credenciales del operador); SequencePlan (CIN-028); edición estructurada por formularios (el editor es YAML con validación en vivo — suficiente para el operador, cero abstracciones nuevas); catálogo de capacidades (ningún kind encaja; los providers van vacíos por diseño DD-4); renders en el navegador (Blender sigue siendo proceso externo).

---

### REQ-CIN-16 — Superficie web de planificación con validación física en cliente (área CIN; origen M18.1)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-05-001` (navegador real: la vista carga, valida el ejemplo canónico sin violaciones, rechaza el plano imposible listando gates tipados y mantiene la consola sana).

**Afirmación**: El control-plane SHALL exponer la ruta `/cinematic` con: editor de texto para el ShotPlan (YAML) con botones de carga de muestras; validación en cliente contra el MISMO contrato (`specs/shot-plan.schema.json` vía Ajv draft 2020-12) y los MISMOS gates físicos (port TypeScript del modelo compartido); lista de violaciones con path y mensaje idéntico al del CLI; y visor de previz que acepta ficheros locales (metadata, mp4, provenance) mostrando fps/frames/lens/objects/outputs y reproduciendo el mp4 — sin `fetch()`, sin ejecución de procesos, sin estado de servidor (invariantes serverless del repo).

**Criterios de aceptación**:
- **AC-1**: `SCN-CIN-05-001`: navigate `/cinematic` → heading "Cinematic Shot Planning"; cargar muestra canónica + validar → 0 violaciones, estado "ready"; cargar muestra imposible + validar → violaciones que incluyen "behind the camera plane" y "below the rig minimum".
- **AC-2**: vitest: la feature renderiza, las muestras validan/rechazan como en AC-1, y el parseo de metadata/provenance produce el modelo de visualización esperado.
- **AC-3**: consola del navegador sin errores en el escenario (oráculo browser.health).

**Qué NO prueba**: calidad de render (el visor reproduce el mp4 producido por el CLI); persistencia del plan (serverless por diseño); adaptador live.

### REQ-CIN-17 — Paridad cross-runtime de veredictos Python↔TypeScript (área CIN)

**Nivel**: `functional` — evidencia obligatoria: oráculos `file-content` de `SCN-CIN-05-001` (los stdout de ambos runtimes son byte-idénticos).

**Afirmación**: Para un mismo plan, el port TypeScript SHALL producir la MISMA lista de violaciones que `cinematic.camera` en Python — mismo orden, mismos paths y mensajes byte-idénticos (incluida la formateación de números a 2/1 decimales) — de modo que la web y el CLI no pueden discrepar sobre la física de una toma. La paridad se demuestra sobre el ejemplo canónico (0 violaciones) y la fixture físicamente inválida (violaciones de distancia, plano trasero y rotación), comparando el stdout JSON compacto de ambos runtimes con oráculo de contenido byte a byte.

**Qué NO prueba**: rendimiento del port; paridad del generador bpy (solo gates); ULPs de trigonometría en planes que crucen exactamente un límite de redondeo (el oráculo lo detectaría y fallaría — esa es su función).

---

## Aritmética esperada del audit

+2 requisitos functional bajo M18 con veredicto de SCN-CIN-05-001 → **proven 113 · waived 0 · blocking 0**; UAT-CIN-01-shotplan con 2 escenarios (EXECUTABLE); total de escenarios canónicos 15 → 16. Sin cambios en CI (la lista de escenarios es `uat all`; vite-node ya está disponible vía vitest).

## Criterios de cierre

1. `pnpm exec tsc --noEmit` + vitest del control-plane verdes; build de producción OK.
2. `pnpm verify` 16/16 PASS (incluye el escenario nuevo con navegador real).
3. `audit all`: 113/0/0, 0 UNMAPPED.
4. Sin credenciales, sin procesos desde el SPA, sin nuevos UAT docs.
