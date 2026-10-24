# Specification — m18-spike-prep (fundación determinista de M18: ShotPlan→Blender previz + puerto VideoProvider + spike A/B dry-run)

**Ciclo**: `p-de82af3e9774d9a0/m18-spike-prep` · **Rama**: `feat/m18-spike-prep` · **Revisión base**: `e394caa` (`git rev-parse HEAD` → `e394caab137b730c9856aa71a8e55eefaee47078`, verificada en la exploración)
**Fuentes**: `exploration-report.md` del ciclo (sondas Blender 4.5.3 H1–H5 reales; harness y trazabilidad verificados); `changes/m18-cinematic-narrative/spec.md` (CIN-001..030, origen de cada REQ); `changes/m18-cinematic-narrative/design.md:43-82` (layout de artifacts `shot/`, sandbox, boundary VideoProvider); `docs/evolutives/SPK-VIDEO-01.md` (variantes A/B, métricas, disciplina); `examples/video/shot-plan.yaml` + `examples/video/video-generation-request.yaml` (contratos de ejemplo del operador); `uat/UAT-CIN-01-shotplan.md`..`UAT-CIN-04-provider-port.md` (criterios de aceptación UAT); `verification/src/traceability/build.ts` (harvest/milestone/testRefs/UAT-status, verificado en esta sesión); `verification/src/audit/audit.ts` (niveles y derivación de estado, verificado); `verification/traceability/registry.json` @e394caa (M18 con `requirements: []` y 5 UAT-CIN `MANUAL_ONLY`); `.github/workflows/verification.yml` (CI ejecuta pytest lista explícita :33 y `pnpm verify` :55-57).
**Niveles** (convención del repo, `audit.ts:163` — default `functional` sin entrada; loader `audit.ts:43-57` exige `level` ∈ {functional, fitness} y `rationale` ≥ 10 chars): `functional` exige veredicto de escenario mapeado (solo testRefs → PARTIALLY_VERIFIED = blocking, `audit.ts:139-146`); `fitness` acepta testRefs de componente → PROVEN. Las 12 entradas REQ-CIN-n se declaran con nivel + rationale en `verification/traceability/requirement-levels.json` (hoy: 87 entradas, **cero CIN** — verificado).

## Alcance

**In scope**: (1) `specs/shot-plan.schema.json` y `specs/video-generation-request.schema.json` (draft 2020-12, cerrados); (2) paquete `tools/cinematic` (estilo `tools/narrative-cli`): validador ShotPlan, generador determinista `generated-scene.py`, driver headless con sandbox+provenance, puerto VideoProvider + FakeProvider, budget/opt-in gate, runner spike A/B dry-run, CLI click con exit codes tipados; (3) suite pytest `tools/cinematic/tests/` citando los REQ fitness; (4) escenarios canónicos `scn-cin-01-001..scn-cin-04-001` en el harness existente (sin oráculos ni drivers nuevos); (5) entradas de nivel REQ-CIN-1..12 en `requirement-levels.json`; (6) modificación acotada de CI: añadir `tools/cinematic/tests` a la lista pytest (verification.yml:33) y un step de instalación de Blender 4.5.3 LTS + export `BLENDER_BIN` antes de `pnpm verify`; (7) visibilidad de inventario: REQ-CIN-1..12 bajo M18 y UAT-CIN-01..04 EXECUTABLE (regeneración de registry en fase verify).

**Fuera de scope**: ejecución LIVE del spike SPK-VIDEO-01 (opt-in + credenciales del operador — la fundación lo deja *listo*, no lo ejecuta); UAT-CIN-05 (aprobación humana, MANUAL_ONLY — ningún escenario la cita); CIN-016/017/018/023/026/028/029/030 (prompt compiler, capas QA, promoción, continuidad de secuencia… pertenecen a fases posteriores de M18); adapter de proveedor real (CIN-013/014 live denegado por defecto); oráculos/drivers nuevos del harness; `control-plane/src`, sinks, `entityLinkPlugin`, epub, `comic-renderer`, `docs/19-ROADMAP.md` (sección M18 ya existe), `changes/m18-cinematic-narrative/` (docs del operador); edición a mano de `registry.json`/`audit/all.*` (se regeneran).

---

### REQ-CIN-1 — ShotPlan: schema cerrado + validador determinista (área CIN; owner M18 «Cinematic Narrative»; origen CIN-001, CIN-003, CIN-004, CIN-005; UAT-CIN-01)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-01-001` (la validación de contratos de entrada con rechazo tipado de inválidos es comportamiento funcional de frontera; el scenario además ejercita el CLI real).

**Afirmación**: El repositorio SHALL disponer de `specs/shot-plan.schema.json` (JSON Schema draft 2020-12, `additionalProperties: false`) que exprese el contrato ShotPlan del operador: `id` (identidad estable de toma), `sceneRef`, `sequenceRef` (vínculo scene/sequence — CIN-003), `durationSeconds`, `fps` (entero), `subjects[]` (`id`, `representation` ∈ {capsule, sphere, cube}, `action`, `start`, `end` — blocking CIN-005), `camera` (`lensMm`, `segments[]` con `frames: [start, end]` contiguos que cubran `[1, durationSeconds×fps]`, `move` ∈ {static, tracking_backward, crane_up}, `height`/`heightFrom`+`heightTo` según move — especificación de cámara CIN-004), `styleReferences[]`, `characterReferences[]` — alineado campo a campo con `examples/video/shot-plan.yaml` (fps 24, 144 frames en 3 segmentos). El paquete `tools/cinematic` SHALL exponer un validador (jsonschema) que acepte el ejemplo canónico, rechace documentos inválidos con error tipado y exit code ≠ 0, y sea determinista: la misma entrada produce siempre la misma salida y el mismo exit code (sin clock, sin aleatoriedad, sin orden no estable). CIN-001 (ShotPlan versionado como fuente de verdad) queda satisfecho a nivel repo: el ShotPlan validado es el input obligatorio de generate/playblast/spike-dry (REQ-CIN-2/6/12).

**Criterios de aceptación**:
- **AC-1**: `specs/shot-plan.schema.json` valida `examples/video/shot-plan.yaml` (24 fps, `durationSeconds: 6`, segmentos frames [1,48]/[49,96]/[97,144], lens 50, moves tracking_backward×2 + crane_up).
- **AC-2**: `python -m tools.cinematic validate examples/video/shot-plan.yaml` → exit 0 con salida `--json` estable; el validador usa jsonschema y mapea fallos a exit codes tipados (módulo exit_codes, estilo narrative-cli).
- **AC-3**: fixture negativa `tools/cinematic/tests/fixtures/shot-plan-invalid.yaml` (campo desconocido, tipo fps erróneo o segmentos con hueco/solape) → exit ≠ 0 + mensaje tipado; pytest positivo/negativo; el scenario reutiliza la fixture (oráculo `process` exitCode ≠ 0 sobre el paso de validación de la fixture).
- **AC-4**: determinismo: validar el mismo fichero dos veces produce stdout byte-idéntico y el mismo exit code (pytest).

**Escenario (SCN-CIN-01-001, happy)**: GIVEN `examples/video/shot-plan.yaml` · WHEN `validate` · THEN exit 0 y el documento pasa el oráculo `schema` del contrato.
**Escenario (edge)**: GIVEN la fixture inválida · WHEN `validate` · THEN exit ≠ 0 con error tipado que nombra la violación.

**Qué NO prueba**: que el schema cubra funciones cinematográficas futuras (el cierre `additionalProperties: false` es el contrato del spike; extenderlo exige cambio de schema); que Blender acepte el plan (REQ-CIN-2); compilación de prompt ni QA constraints (la equivalencia «Blender/prompt/QA» de UAT-CIN-01 se acota en este ciclo a intención normalizada = validación determinista + derivación byte-idéntica de `generated-scene.py`, que es REQ-CIN-2); escenas multi-sujeto con coreografía compleja (el ejemplo canónico es 1 sujeto).

---

### REQ-CIN-2 — Generador ShotPlan→bpy determinista con ShotPlan como fuente de verdad (área CIN; origen CIN-002, CIN-006, CIN-007; UAT-CIN-02)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-02-001` (la derivación ejecutada por Blender headless real es el comportamiento funcional que UAT-CIN-02 exige; el determinismo byte-idéntico se añade por pytest).

**Afirmación**: `tools/cinematic` SHALL generar `generated-scene.py` (script bpy) a partir de un ShotPlan validado, siendo el ShotPlan la única fuente de verdad de la intención (`.blend` y derivados son derivados — CIN-002). El script SHALL: fijar `scene.render.fps` al fps del plan (con `fps_base=1.0`), `scene.frame_start=1` y `scene.frame_end=durationSeconds×fps` (144 para el ejemplo); crear geometría mínima por sujeto (CIN-007) usando el mapa `representation→primitiva` de Blender 4.5.3 verificado por sonda H3 — `capsule`→`uv_sphere`, `sphere`→`uv_sphere`, `cube`→`cube` — (decisión documentada en design.md del ciclo; `primitive_capsule_add` NO existe en 4.5.3); configurar la cámara con `lens=lensMm` y posicionarla por segmentos interpolando altura (`height` para tracking_backward/static, `heightFrom→heightTo` para crane_up) con keyframes; y envolver su cuerpo en guard `try/except` que imprime traceback y llama `sys.exit(<n>≠0)` (mitigación H2 verificada: Blender 4.5.3 sale con exit 0 ante excepción no capturada). Dos ejecuciones del generador con el mismo ShotPlan SHALL producir `generated-scene.py` **byte-idéntico** (sin paths absolutos del workspace, sin timestamps, salida ordenada, floats con formato fijo).

**Criterios de aceptación**:
- **AC-1**: pytest de determinismo: generar dos veces desde el ShotPlan canónico → bytes idénticos (`hashlib.sha256` de ambos outputs iguales).
- **AC-2**: pytest estructural del script generado: solo primitivas existentes en 4.5.3 (lista H3), fps/frames/lens esperados para el ejemplo, keyframes de cámara por segmento, guard try/except→sys.exit presente.
- **AC-3**: `SCN-CIN-02-001`: el script generado ejecutado por Blender headless real termina exit 0 Y produce `scene-metadata.json` parseable (el driver exige ambos marcadores, no solo el exit code).
- **AC-4**: pytest de guard: inyectar un fallo en la ejecución del script (fixture con raise) → exit ≠ 0 y traceback en stderr (precedente probe_fail2, exit 1 medido).

**Escenario (happy)**: GIVEN ShotPlan canónico · WHEN generate + ejecución blender headless · THEN exit 0, metadata con fps 24 / frames 1..144 / lens 50.
**Escenario (edge)**: GIVEN script con fallo inyectado · WHEN ejecución · THEN exit ≠ 0, traceback en stderr, driver reporta fallo (no PASS).

**Qué NO prueba**: fidelidad visual del render (REQ-CIN-6); coreografía sujeto-cámara más allá de interpolación lineal por segmentos (el mínimo de CIN-007); reemplazo real de Blender por otro engine (REQ-CIN-11 es estructural); compuestos multi-primitiva para `capsule` (se mapea a `uv_sphere` simple salvo decisión de design); determinismo byte de los binarios de Blender entre plataformas (fuera de control del generador).

---

### REQ-CIN-3 — Ejecución headless en sandbox (workspace efímero, env allowlist, timeout) (área CIN; origen CIN-008, CIN-025; UAT-CIN-02)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-02-001` (el sandbox se ejercita en la ejecución real; su denegación por resolución fallida de binario se añade por pytest).

**Afirmación**: El driver de ejecución SHALL lanzar Blender headless (`--background --factory-startup --python`) cumpliendo la disciplina de sandbox de ADR-CIN-004/CIN-025: (a) workspace efímero por ejecución (precedente harness `temp-workspace` en `scn-m10-01-001.yaml:13` con interpolación `{{ws.<id>.dir}}`); (b) entorno del subprocess construido SOLO desde una allowlist explícita más variables extra declaradas — el harness process driver ya garantiza esto (`verification/src/drivers/process.ts:8-17`, verificado) y la CLI propia replicará la disciplina; (c) timeout por ejecución (el scenario fija `timeoutMs ≥ 600000`); (d) el script generado y la metadata no contienen secretos ni rutas de usuario absolutas; (e) resolución del binario: env `BLENDER_BIN` → default documentado (`~/.local/opt/blender-4.5.3-linux-x64/blender`) → fallo tipado con exit ≠ 0 si ninguno existe. En este ciclo el script NO es generado por LLM (es determinista desde el ShotPlan), por lo que CIN-025 se aplica como disciplina de ejecución aislada del código generado, no como contención de código LLM arbitrario.

**Criterios de aceptación**:
- **AC-1**: `SCN-CIN-02-001` usa `filesystem.temp-workspace` y ejecuta blender con cwd dentro del workspace efímero; los artifacts quedan en ese workspace.
- **AC-2**: pytest: la CLI ejecuta blender con env mínimo declarado; el script generado no menciona `HOME`, secretos ni rutas absolutas del host (grep estructural sobre el output del generador).
- **AC-3**: pytest: con `BLENDER_BIN` apuntando a una ruta inexistente y sin default → error tipado + exit ≠ 0, sin artifacts parciales marcados como éxito.
- **AC-4**: el paso blender de `SCN-CIN-02-001` declara `timeoutMs ≥ 600000` (H4: playblast 144 frames ≈ 15–25 s local; margen ×10 holgado).

**Escenario (happy)**: GIVEN `BLENDER_BIN` resoluble · WHEN playblast/generate en workspace efímero · THEN subprocess con env allowlist, dentro de timeout, artifacts en el workspace.
**Escenario (edge)**: GIVEN binario no resoluble · WHEN ejecución · THEN fallo tipado exit ≠ 0.

**Qué NO prueba**: sandboxing a nivel OS (cgroups/seccomp/namespaces) — el contrato es env-allowlist + workspace efímero + timeout, igual que el resto del harness; bloqueo de red a nivel kernel (por construcción el camino determinista no hace llamadas de red — no se afirma contención de red del binario); ejecución de código LLM arbitrario (no existe en este ciclo).

---

### REQ-CIN-4 — scene-metadata.json emitida por el script bpy (área CIN; origen CIN-009; UAT-CIN-02)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-02-001` (oráculos `schema`/`file-content` sobre la metadata real producida por Blender).

**Afirmación**: El script generado SHALL escribir `scene-metadata.json` en el workspace declarando al menos: `version`, `shotId`, `fps` (entero), `fps_base`, `frame_start`, `frame_end`, `camera` (`lensMm` + moves de segmentos en orden), `objects[]` (ids creados), `outputs[]` (`{path, sha256}` de cada artifact declarado, con el nombre real computado por el script — H5: el mp4 de playblast lleva sufijo de rango `<base><frame_start:%04d>-<frame_end:%04d>.mp4`). El éxito de una ejecución SHALL definirse como exit 0 **Y** metadata parseable y consistente con lo ejecutado (H2: nunca fiarse del exit code solo). El schema exacto del documento (propiedad por propiedad) se cierra en design.md del ciclo y se valida con oráculo `schema` en scn-cin-02/03.

**Criterios de aceptación**:
- **AC-1**: `SCN-CIN-02-001`: tras el paso blender, oráculo `schema`/`file-content` valida `scene-metadata.json` con fps 24, frame_start 1, frame_end 144, lens 50 para el ejemplo canónico.
- **AC-2**: cada `outputs[].path` referido por la metadata existe en el workspace y su `sha256` coincide con el hash real del fichero (re-hash por pytest; el nombre con sufijo de rango H5 incluido).
- **AC-3**: pytest: fallo inyectado en la ejecución → sin metadata parseable → el driver reporta fallo (un run sin metadata válida no puede ser PASS).
- **AC-4**: metadata registra fps Y fps_base (R8) para que la frecuencia no sea ambigua.

**Escenario (happy)**: GIVEN script ejecutado con éxito · THEN metadata parseable con fps/frames/lens/objects/outputs correctos.
**Escenario (edge)**: GIVEN script con fallo · THEN sin metadata parseable y veredicto de fallo.

**Qué NO prueba**: contenido semántico de píxeles; el grafo de escena completo de Blender más allá de los objects que el script crea (la metadata declara lo creado, no inventaría la escena factory); ajustes de render más allá de fps/frames/resolución/engine/codec que el design declare en el schema.

---

### REQ-CIN-5 — provenance.json con hashes de la cadena derivada (área CIN; origen CIN-010, CIN-015; UAT-CIN-02)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-02-001` (provenance sobre la cadena real ShotPlan→script→metadata→outputs).

**Afirmación**: El driver SHALL emitir `provenance.json` en el workspace que permita reconstruir la cadena de derivación de la ejecución (CIN-015, acotado al camino determinista de este ciclo): entrada ShotPlan (path + sha256), script generado (path + sha256), scene-metadata.json (sha256), y los outputs declarados (path + sha256 cada uno). Cada hash SHALL coincidir con los bytes reales del fichero. Los campos de provider/model/receipt de CIN-015 quedan cubiertos en este ciclo solo para el camino fake (REQ-CIN-8); no existe provedor real.

**Criterios de aceptación**:
- **AC-1**: `SCN-CIN-02-001`: oráculo `file-content`/`schema` valida la existencia y estructura de `provenance.json`; pytest re-hashea cada entrada y verifica coincidencia byte a byte.
- **AC-2**: la provenance cubre la cadena completa (ShotPlan → generated-scene.py → scene-metadata.json → outputs) para el run.
- **AC-3**: pytest: recomputar los hashes es estable (sha256 de bytes de fichero; sin metadatos volátiles en el cálculo).

**Escenario (happy)**: GIVEN run exitoso · THEN provenance con la cadena completa y hashes verificables.
**Escenario (edge)**: GIVEN un fichero declarado manipulado tras el run · THEN el re-hash pytest/verificación lo detecta (hash ≠ registrado).

**Qué NO prueba**: firmas criptográficas ni autoría; provenance Git; receipts de proveedor real; reconstrucción de attempts/regeneración (CIN-029, fuera de alcance).

---

### REQ-CIN-6 — Playblast workbench bajo demanda con hash y metadata (área CIN; origen CIN-010; UAT-CIN-03)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-03-001` (el artifact mp4 real debe existir y quedar registrado).

**Afirmación**: El comando playblast SHALL renderizar headless la escena derivada con engine `BLENDER_WORKBENCH`, resolución 640×360, fps del ShotPlan, salida FFMPEG contenedor MPEG4 codec H264 (todos verificados por sonda H1 en 4.5.3), sobre el rango `[frame_start, frame_end]` (144 frames para el ejemplo = 6 s × 24 fps); SHALL producir el mp4 en el workspace bajo el nombre real con sufijo de rango (H5); y SHALL registrarlo con hash y metadata (entrada en `scene-metadata.json.outputs` + provenance — CIN-010 «Playblast MUST registrarse con hash y metadata»).

**Criterios de aceptación**:
- **AC-1**: `SCN-CIN-03-001`: tras el paso playblast, existe un mp4 no vacío en el workspace cuyo nombre sigue el patrón `<filepath><frame_start:%04d>-<frame_end:%04d>.mp4` (H5: `playblast0001-0012.mp4` observado con 12 frames) y coincide con el path declarado en metadata/outputs.
- **AC-2**: oráculo valida en metadata: fps 24, frames 1..144, resolución 640×360, engine WORKBENCH, FFMPEG/H264.
- **AC-3**: el sha256 del mp4 queda registrado (provenance/outputs) y coincide con el fichero real.
- **AC-4**: `timeoutMs ≥ 600000` en el paso (H4: 1.45 s/12 frames local).

**Escenario (happy)**: GIVEN ShotPlan canónico · WHEN playblast · THEN mp4 existe, con nombre real declarado, hash registrado y parámetros esperados.
**Escenario (edge)**: GIVEN ShotPlan inválido · WHEN playblast · THEN fallo tipado exit ≠ 0 sin mp4 declarado como éxito.

**Qué NO prueba**: calidad visual del render (sin oráculo de píxeles en este ciclo); fidelidad WORKBENCH vs EEVEE/Cycles; **determinismo byte del mp4 entre ejecuciones/máquinas** (el encoder FFMPEG puede variar por build/plataforma — el hash se registra como identidad de provenance, no como igualdad entre runs); duración exacta en runners lentos de CI (solo el margen de timeout).

---

### REQ-CIN-7 — Puerto VideoProvider tipado y provider-neutral (área CIN; origen CIN-011, CIN-012, CIN-019; UAT-CIN-04)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-04-001` (capabilities→generate sobre el camino del provider con resultado tipado).

**Afirmación**: El core SHALL depender de un puerto `VideoProvider` tipado (protocol/ABC en `cinematic/providers/port.py`), no de ningún vendor (CIN-011), con: `capabilities()` que declara las capacidades del provider ANTES de generar (CIN-012); `generate(request)` que devuelve un **resultado tipado** donde el fallo es un valor del tipo (CIN-019: provider failure sin corromper estado, sin excepción cruzando el puerto); y sin tipos de SDK de vendor en el puerto ni en sus resultados. Las peticiones de generación SHALL conformar `specs/video-generation-request.schema.json` (draft 2020-12, cerrado): `shotId`, `prompt`, `motionReference`, referencias, `durationSeconds`, `aspectRatio`, `budget {maxAttempts, maxCredits}` — alineado con `examples/video/video-generation-request.yaml`.

**Criterios de aceptación**:
- **AC-1**: pytest estructural: el puerto declara `capabilities()` y `generate(request)` tipados; el tipo de resultado modela éxito y fallo (union tipada/resultado), y ni `port.py` ni los módulos core importan SDKs de vendor.
- **AC-2**: `specs/video-generation-request.schema.json` valida el ejemplo del operador y rechaza (pytest) peticiones sin `budget` o con campos desconocidos.
- **AC-3**: `SCN-CIN-04-001`: el FakeProvider responde `capabilities()` y luego `generate()` con resultado tipado, por el mismo camino que usaría un adapter real.
- **AC-4**: pytest: una ruta de fallo de provider produce resultado tipado de fallo (no excepción no capturada) y no deja estado parcial corrupto.

**Escenario (happy)**: GIVEN fake provider · WHEN capabilities→generate(request válida) · THEN resultado tipado de éxito con artifact fake y coste contabilizado.
**Escenario (edge)**: GIVEN provider que falla (fake en modo fallo) · WHEN generate · THEN resultado tipado de fallo; ninguna excepción cruza el puerto.

**Qué NO prueba**: ningún adapter real de vendor (CIN-013/014: live denegado por defecto — REQ-CIN-9); el ciclo completo poll/fetchArtifact contra un proveedor real (el diseño puede tipar las firmas, pero nada live las ejercita este ciclo); MCP/Bridge (CIN-026, fuera de alcance); compilación de prompt (CIN-016).

---

### REQ-CIN-8 — FakeProvider determinista sin red, con budget y coste contabilizado (área CIN; origen CIN-020, CIN-021; UAT-CIN-04)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-04-001` (+ pytest de presupuesto/reintento/coste).

**Afirmación**: El repositorio SHALL incluir un FakeProvider determinista que satisface el mismo contrato del puerto SIN acceso a red: respeta el budget de la request — reintentos acotados y contabilizados (CIN-020: nunca más de `maxAttempts`; nunca más de `maxCredits`) — y captura coste/créditos en el resultado cuando la información existe (CIN-021; el fake reporta su coste configurado por attempt). Sus resultados SHALL tener la misma forma tipada que los de cualquier adapter futuro (mismo contrato — lado fake de UAT-CIN-04).

**Criterios de aceptación**:
- **AC-1**: pytest: generate dentro de budget → éxito con campos de coste; agotar `maxAttempts` o exceder `maxCredits` → resultado tipado de fallo (sin excepción).
- **AC-2**: pytest estructural: el fake no usa socket/urllib/http (imports y llamadas); salidas deterministas (misma request → mismo resultado).
- **AC-3**: `SCN-CIN-04-001`: capabilities→generate del fake por el camino del driver, con provenance/registro de attempt y coste.
- **AC-4**: pytest: cada attempt queda contabilizado (número de attempts observables en el resultado/métricas — disciplina SPK-VIDEO-01 «registrar todos los attempts»).

**Escenario (happy)**: GIVEN request con budget {maxAttempts: 2, maxCredits: 40} · WHEN generate · THEN éxito con coste ≤ 40 y attempts ≤ 2.
**Escenario (edge)**: GIVEN fake configurado para fallar N veces · WHEN generate con maxAttempts < N · THEN fallo tipado tras maxAttempts, coste acumulado contabilizado.

**Qué NO prueba**: equivalencia conductual con un adapter real (no existe adapter real este ciclo — UAT-CIN-04 se cubre del lado fake + contrato estructural del puerto, REQ-CIN-7); realismo de costes; calidad semántica del «vídeo» fake.

---

### REQ-CIN-9 — Budget policy + live opt-in gate DENEGADO por defecto (área CIN; origen CIN-013, CIN-014; UAT-CIN-04)

**Nivel**: `functional` — evidencia obligatoria: veredicto PASS de `SCN-CIN-04-001` (la denegación live sin opt-in es la mitad del escenario provider; pytest añade las combinaciones).

**Afirmación**: Toda generación live automatizada SHALL pasar por una política de budget (CIN-013) y un gate de opt-in explícito: por defecto la generación live está **DENEGADA** (CIN-014: CI/UAT normal MUST NOT llamar a provider facturable); el opt-in solo se activa mediante flag/env explícito que el operador establece; la denegación SHALL producir un resultado tipado (y exit ≠ 0 en el camino CLI) SIN invocar ningún provider ni gastar nada. Los escenarios canónicos de este ciclo no invocan nunca un provider live.

**Criterios de aceptación**:
- **AC-1**: pytest: petición live sin opt-in → resultado tipado de denegación + exit ≠ 0 en CLI; cero invocaciones al provider (espía/contador).
- **AC-2**: pytest: opt-in presente pero budget ausente/inválido → denegación tipada (CIN-013).
- **AC-3**: `SCN-CIN-04-001`: el camino de denegación live se ejecuta en el escenario canónico (sin opt-in en el entorno del harness) con oráculo sobre el resultado tipado.
- **AC-4**: estructural: scn-cin-01..04 no contienen ningún paso que requiera credenciales o red de provider live.

**Escenario (happy, del gate)**: GIVEN entorno sin opt-in · WHEN solicitud live · THEN denegación tipada, sin llamada, sin gasto.
**Escenario (edge)**: GIVEN opt-in ON y budget inválido · THEN denegación tipada por budget; GIVEN opt-in ON y budget válido · THEN el camino live queda habilitado **solo** para ejecución del operador (no probado en CI).

**Qué NO prueba**: el camino live real (credenciales, API de vendor, facturación — exclusivamente del operador en el spike live); almacenamiento/gestión de secretos; el contenido del adapter real.

---

### REQ-CIN-10 — Script bpy generado conservado como evidence (área CIN; origen CIN-024)

**Nivel**: `fitness` — evidencia obligatoria: testRefs de componente + artifacts del escenario. Justificación: CIN-024 es una propiedad de conservación (el run no destruye su evidencia), verificable por aserción estructural de pytest sobre el driver y por presencia del fichero en los artifacts de SCN-CIN-02-001; no necesita escenario propio (el mismo SCN-CIN-02-001 lo ejercita de paso).

**Afirmación**: El `generated-scene.py` producido SHALL conservarse como evidence tras la ejecución (no se descarta al terminar el run) y SHALL quedar referenciado por la provenance (REQ-CIN-5) con su hash.

**Criterios de aceptación**:
- **AC-1**: los artifacts de SCN-CIN-02-001 incluyen `generated-scene.py` tras el run (oráculo filesystem-tree/file-content).
- **AC-2**: pytest: el driver no elimina el script y la provenance lo referencia con hash.

**Qué NO prueba**: política de archivo a largo plazo más allá del workspace del run (retención del harness existe como flujo aparte); protección anti-manipulación más allá del hash registrado.

---

### REQ-CIN-11 — Pureza estructural: schemas cerrados y core sin tipos de vendor/engine (área CIN; origen CIN-027 análogo, CIN-011)

**Nivel**: `fitness` — evidencia obligatoria: testRefs de componente. Justificación: son invariantes estructurales (forma de schemas y grafo de imports) del mismo tipo que REQ-VAH-STORE-IMMUTABILITY/REQ-VAH-FITNESS-SEPARATION, declarados fitness en el repo; un escenario no añade poder discriminatorio sobre una propiedad estática.

**Afirmación**: Los schemas de este ciclo (`shot-plan.schema.json`, `video-generation-request.schema.json`) SHALL ser cerrados (`additionalProperties: false`, `$schema` draft 2020-12) y los módulos core del dominio (`shotplan.py`, `providers/port.py`, `budget.py`, `spike.py`) SHALL NO importar `bpy` ni SDKs de vendor — la interacción con Blender queda confinada a la capa generador/driver (`blender_gen.py`, `drive.py`), de modo que el dominio depende de ShotPlan + puerto y el engine de previz resulta sustituible por diseño (análogo a CIN-027; CIN-011 para providers).

**Criterios de aceptación**:
- **AC-1**: pytest estructural: ambos schemas con `additionalProperties: false` y `$schema` draft 2020-12.
- **AC-2**: pytest estructural (grep/AST): los módulos core listados no contienen imports de `bpy` ni de SDKs de vendor; solo `blender_gen.py`/`drive.py` tocan el límite de Blender.

**Qué NO prueba**: una segunda implementación de engine real (la sustituibilidad se demuestra solo estructuralmente este ciclo); carga de plugins en runtime; que el fake provider cubra todas las capacidades futuras de un vendor.

---

### REQ-CIN-12 — Runner spike A/B en dry-run con métricas SPK-VIDEO-01 (área CIN; origen CIN-022 (precondición respetada), SPK-VIDEO-01)

**Nivel**: `fitness` — evidencia obligatoria: testRefs de componente. Justificación: el runner dry-run es orquestación de piezas ya verificadas (fake provider + generador + playblast) con salida de métricas; su contrato (campos de métricas, ausencia de live, contabilidad de attempts) es verificable por pytest. No requiere escenario canónico; el spike live (que sí produce el veredicto A/B) es del operador.

**Afirmación**: El comando `spike-dry` SHALL ejecutar las variantes A (playblast puro Blender) y B (generación vía FakeProvider) en modo dry-run usando exclusivamente el fake (sin red, sin live — el gate de REQ-CIN-9 aplica), y SHALL registrar en `metrics.json` cada attempt con los campos de métrica de SPK-VIDEO-01: `attempts`, `cost_credits`, `elapsed_seconds`, `camera_adherence`, `spatial_continuity`, `subject_consistency`, `visual_quality`, `human_acceptability_1_5` — con los campos semánticos/humanos **vacíos** (pendientes del operador; el dry-run no los inventa). El runner SHALL registrar todos los attempts sin asumir ahorro (disciplina SPK-VIDEO-01) y SHALL NOT emitir veredicto PASS/FAIL del spike (ese juicio es humano, sobre la ejecución live, con la regla «B mejora ≥ 2 dimensiones sin coste desproporcionado»). CIN-022 queda respetada: el runner **prepara** SPK-VIDEO-01, no lo sustituye ni inicia M18 más allá del spike.

**Criterios de aceptación**:
- **AC-1**: pytest: `spike-dry` con fake produce `metrics.json` con los 8 campos por attempt para A y B; campos humanos vacíos; campos máquina-observables poblados (elapsed, attempts, cost).
- **AC-2**: pytest: el runner solo usa el FakeProvider (estructural: no importa/construye providers live) y contabiliza attempts/coste vía budget (REQ-CIN-8).

**Qué NO prueba**: la ejecución LIVE del spike (opt-in + credenciales del operador — el objetivo mismo de SPK-VIDEO-01); valores de métricas semánticas/humanas; el veredicto A/B y la afirmación de ahorro (CIN-023: prohibido afirmar porcentajes sin evidence propia).

---

## Trazabilidad del ciclo y aritmética del audit (honestidad del objetivo)

- **Harvest de REQ**: `build.ts` (regex `REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*`, harvest de `changes/**/*.md`) recolectará REQ-CIN-1..12 desde ESTE documento cuando viva en `changes/m18-spike-prep/spec.md`. Verificado en esta sesión: el regex casa `REQ-CIN-1`; `isPluralArtifact` no lo excluye (3 segmentos).
- **Hallazgo de esta sesión que refina la exploración — asignación a M18**: `reqBelongsToMilestone` (`build.ts:410-435`) NO tiene hoy regla área `CIN`→M18 ni overrides REQ-CIN-* (`REQ_MILESTONE_OVERRIDES` :390-401 solo DOC/M11; el bloque M12+ casa áreas `M12/M13/M14/M15/M17`, no `CIN`; grep de `CIN` en build.ts = solo las líneas 102/180 de routing de UAT). Sin mecanismo, los REQ-CIN-* se cosecharían pero quedarían como gaps `requirement-unowned` (LOW) — **nunca auditados** (el audit itera `milestones[].requirements`), exactamente la clase silent-drop que el repo ya erradicó para UAT (commit 2bb2174). **Criterio de aceptación del ciclo**: REQ-CIN-1..12 deben aparecer bajo M18 con status MAPPED — el design elegirá mecanismo (12 overrides individuales, patrón M16/M11, o regla de área `if (milestone === 'M18' && area === 'CIN')` en el bloque M12+, patrón M9/M10-series; una línea en `build.ts` es la opción recomendada) y la fase verify lo demostrará con `traceability build` + `audit all`.
- **Hallazgo de esta sesión — slug completo de UAT en escenarios**: el enlace UAT↔escenario usa `shortId = /^UAT-M\d+(?:\.\d+)?-\d+/.exec(uatId)?.[1] ?? uatId` (`build.ts:268-273`): para `UAT-CIN-01-shotplan` el regex NO casa (solo series `M\d+`), por lo que shortId = el id COMPLETO con sufijo. Los escenarios `scn-cin-0N-*.yaml` deben contener literalmente `UAT-CIN-01-shotplan`, `UAT-CIN-02-blender-headless`, `UAT-CIN-03-playblast`, `UAT-CIN-04-provider-port` (p. ej. en el campo `uat:`) para que los UAT pasen a `EXECUTABLE` (`build.ts:277`: EXECUTABLE ⟺ scenarios.length > 0). La exploración escribía «uat UAT-CIN-01» — el slug corto NO bastaría. UAT-CIN-05 (approval) no es citada por ningún escenario → permanece MANUAL_ONLY (gap MEDIUM existente hoy, sin cambio).
- **Niveles**: 9 entradas `functional` (REQ-CIN-1..9) + 3 `fitness` (REQ-CIN-10..12) con rationale ≥ 10 chars en `requirement-levels.json` (`audit.ts:43-57` valida y falla duro en malformación). Sin entrada, los fitness serían `functional` por defecto y sus testRefs producirían PARTIALLY_VERIFIED = blocking (`audit.ts:139-146,163`).
- **testRefs de los fitness**: el scan de tests cubre `tools/**/tests?/*.py` (`build.ts:246-249`, verificado) → los ficheros de `tools/cinematic/tests/` deben citar literalmente `REQ-CIN-10`, `REQ-CIN-11`, `REQ-CIN-12` (docstrings) para recibir testRefs (patrón observado REQ-CLI-001..007 ↔ `tools/narrative-cli/tests/test_cli_contract.py`).
- **Escenarios ↔ REQ**: `requirements: [...]` del YAML de cada scenario alimenta el enlace req↔scenario (`build.ts:215-227`): scn-cin-01→[REQ-CIN-1]; scn-cin-02→[REQ-CIN-2,3,4,5,10]; scn-cin-03→[REQ-CIN-6]; scn-cin-04→[REQ-CIN-7,8,9]. (REQ-CIN-10 puede citarse también en scn-cin-02 porque su AC-1 se demuestra en sus artifacts; su nivel fitness no exige veredicto.)
- **Aritmética esperada del audit all tras la fase verify** (base verificada hoy @e394caa: registry coverage 96/96/0, audit 96/0/0, waived 1): +12 requisitos bajo M18 (9 functional con veredicto de escenario, 3 fitness con testRefs) → **proven 108 · waived 1 · blocking 0**, 0 UNMAPPED, overall PASS. UATs totales 28 → 33 registros de UAT en M18 sumando los 5 CIN (4 EXECUTABLE + 1 MANUAL_ONLY); `executable` pasa de 10 a 14.
- **CI** (`.github/workflows/verification.yml`): :33 añade `tools/cinematic/tests` a la lista pytest; step nuevo previo a :55 instala Blender 4.5.3 LTS (tarball cacheable) y exporta `BLENDER_BIN`; `pnpm verify` (:55-57) ejecutará los 4 scn-cin-* en GitHub Actions. El audit gate bloqueante de CI sigue siendo `audit milestone M10.2.1` (:60-62) — el audit all de M18 es gate de la fase verify del ciclo, no de CI.
- **Compatibilidad jsonschema** (R7): CI instala sin pin (4.25.1 en sistema hoy); los schemas se limitan a draft 2020-12 estándar sin features que diverjan entre 4.23 (pin de narrative-cli) y 4.25.

## Criterios de aceptación del ciclo (resumen para el gate)

1. REQ-CIN-1..9 verdes a nivel `functional`: SCN-CIN-01-001..SCN-CIN-04-001 con veredicto PASS citando sus REQ, `uat:` con los slugs completos UAT-CIN-0N-<suffix>.
2. REQ-CIN-10..12 verdes a nivel `fitness`: pytest en `tools/cinematic/tests/` citando los ids literalmente (testRefs ≥ 1 cada uno).
3. `audit all` regenerado sobre la revisión consolidada: overall **PASS**, `proven 108 · waived 1 · blocking 0`, 0 UNMAPPED, REQ-CIN-1..12 bajo M18 MAPPED; UAT-CIN-01..04 EXECUTABLE, UAT-CIN-05 MANUAL_ONLY.
4. El spike live NO se ejecuta en el ciclo: ningún escenario ni test invoca provider live (CIN-014); la fundación queda lista para opt-in + credenciales del operador.
5. `generated-scene.py`, `scene-metadata.json` (con outputs reales H5) y `provenance.json` con hashes verificables en los artifacts de scn-cin-02/03.
6. CI en verde con la lista pytest ampliada y el step de Blender; sin cambios fuera del alcance declarado.
