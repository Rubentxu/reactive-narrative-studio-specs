# Design — m18-shot-planning-ui

**Base**: `bd78ddd`. Principio: port literal del modelo Python (misma aritmética, mismo orden de operaciones, mismos mensajes) y reutilización total de los patrones del control-plane (rutas code-based, schema importado de `specs/`, vista en `src/views`, vitest + testing-library, escenario browser del harness).

## D1 — Port TypeScript con paridad byte (`features/cinematic/camera.ts`)

Réplica 1:1 de `cinematic/camera.py`:
- Misma tabla `RIG_LIMITS` (gimbal 30/2.6/0.05–3.5, tripod 20/2.0/0–0, steadicam 24/2.4/0.1–2.5, dolly 12/3.0/0.1–2.0, crane 18/3.0/0.05–2.0), mismos offsets (4.0 m, 0.9 m).
- Misma aritmética en el MISMO orden de operaciones IEEE (lerp `a+(b-a)*t`, distancia `sqrt(dx²+dy²+dz²)`, normalización `s===0?1:s`, acos de dirección con dot acotado) — con dobles IEEE-754 ambos runtimes producen los mismos bits.
- Misma estructura de bucles → mismo orden de violaciones: primero el barrido de todos los frames (distancia, plano trasero), luego por segmento (velocidad, rotación).
- Formato de números idéntico: `toFixed(2)`/`toFixed(1)` (equivalente a `:.2f`/`:.1f` para los valores de este dominio; el oráculo de paridad del escenario detectaría cualquier discrepancia — para eso existe).
- Mensajes plantilla idénticos (incluidos ° y signos de puntuación). `unknown rig` lista los rigs ordenados igual que `sorted(RIG_LIMITS)`.

## D2 — Validación combinada (`validatePlan.ts`) y muestras (`samplePlans.ts`)

- `validatePlan(yamlText)`: parsea con el paquete `yaml` (ya en devDeps), valida contra `../../../specs/shot-plan.schema.json` importado directamente (patrón `schema/registry.ts`), y si el schema pasa ejecuta los gates. Devuelve `{ parseError?, schemaErrors[], gateViolations[] }` con `{path, message}`.
- Dos muestras incluidas como literales: el ejemplo canónico del operador y la fixture físicamente imposible (cámara fija + sujeto que atraviesa el plano). Son contenido de la UI (botones), no fixtures compartidas — cada runtime mantiene su copia y la paridad la garantiza el oráculo del escenario.

## D3 — Vista `/cinematic` (`views/Cinematic.tsx`)

- Editor `<textarea>` (YAML del plan) + tres acciones: «Load canonical example», «Load impossible shot», «Validate».
- Panel de resultados: errores de parseo/schema y violaciones de gates como lista `path — message`; estado "ready for previz" en verde cuando no hay violaciones (roles/aria y data-testid estables para el escenario).
- Visor de previz: `<input type="file" multiple accept=".json,.mp4">` — lee `scene-metadata.json` (tabla fps/fps_base/frames/lens/objects/outputs con sha256), `provenance.json` (cadena con hashes) y cualquier mp4 seleccionado en `<video controls>`. Todo con FileReader en cliente — sin fetch, sin procesos (invariantes serverless).
- Registro: ruta `/cinematic` en `router.tsx` + `routes.tsx` + enlace en Home («Cinematic shot planning»).

## D4 — Oráculo de paridad cross-runtime (`test/cinematic-cross-runtime.spec.ts`)

La paridad Python↔TypeScript vive en un spec vitest del control-plane (los specs del repo ya lanzan procesos — precedente `hardening.spec.ts` con git): para cada plan (ejemplo canónico, fixture imposible) ejecuta el modelo Python vía `python3 -c` (módulo `cinematic.camera`, salida `json.dumps` compacta con claves ordenadas y `ensure_ascii=False`) y lo compara **byte a byte** con el stdout del modelo TypeScript (`JSON.stringify` + `\n`). Ambos lados emiten en orden de evaluación y con la misma forma `[{message, path}]`. Se descartó un runner vite-node aparte (vitest 4 no lo expone como binario y el spec vitest reutiliza la toolchain existente sin dependencias nuevas).

## D5 — Escenario `scn-cin-05-001` (uat: UAT-CIN-01-shotplan; reqs: REQ-CIN-16, REQ-CIN-17)

Pasos: `ui.build` (pnpm build, patrón scn-m10-01-001) → `ui.start-preview` → `ui.navigate` → `ui.probe-initial` (heading + estado vacío) → `ui.validate-canonical` (click ejemplo, click validar, sondeo por condición → {ready: true, 0 violaciones}) → `ui.validate-physics` (→ {violationCount: 113 exacto — 58 plano trasero, 49 distancia, 6 whip —, flags por tipo, sin estado ready}) → `parity.cross-runtime` (el spec vitest de D4, oracle process exit 0) → oráculos `browser-evaluate` ×3 + process + `browser.health`. El número exacto de violaciones queda pinado en el `expected` (determinista en ambos runtimes y verificado por la paridad byte).
envAllowlist de los pasos: `[PATH, HOME]` (sin BLENDER_BIN — el escenario no ejecuta Blender; el paso de paridad necesita `python3`, que está en PATH).

## D6 — Tests vitest

- `test/cinematic-camera.spec.ts`: canónico → 0 violaciones; fixture imposible → violaciones con distancia/plano trasero/rotación y número exacto pinado; rigs (tripod no se traslada, stall, rig desconocido); posiciones por segmento (tracking detrás, static congelada, crane interpola); paridad de formato (toFixed).
- `test/cinematic-view.spec.ts`: render de la vista (testing-library), flujo validar canónico/imposible como AC-1, parseo de metadata/provenance (previz.ts) con File sintéticos.

## D7 — Deuda

- Editor estructurado por formularios (hoy YAML en textarea — suficiente y cero abstracciones nuevas).
- Visor con directory picker FSA (hoy input de ficheros, automatizable con set-input-files).
- Entrada en capability-catalog cuando exista un kind que encaje (providers sigue vacío por diseño).
