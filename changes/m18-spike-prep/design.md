# Design — m18-spike-prep (fundación determinista de M18: ShotPlan→bpy previz + puerto VideoProvider + spike A/B dry-run)

**Ciclo**: `p-de82af3e9774d9a0/m18-spike-prep` · **Rama**: `feat/m18-spike-prep` · **Base**: `e394caa`
**Entradas**: `specification.md` del ciclo (12 REQ-CIN, 41 ACs), `exploration-report.md` (sondas H1–H5 Blender 4.5.3 reales, harness verificado).
**Principio rector** (AGENTS.md §5): reutilizar los mecanismos existentes — patrón de paquete `tools/narrative-cli`, drivers process/filesystem del harness, oráculos existentes, patrón de niveles `requirement-levels.json`, patrón de escenarios `scn-m10-01-001.yaml` — sobre introducir abstracciones nuevas.

---

## 1. Decisiones de diseño (cerradas, con fundamento)

**D1 — REQ-CIN-* → M18: regla de área en `build.ts` (UNA línea), no 12 overrides.**
En `verification/src/traceability/build.ts`, dentro de `reqBelongsToMilestone` (bloque «Milestone-scoped requirement areas (M12+)», tras la línea `if (milestone === 'M17' && area === 'M17') return true;` — build.ts:430):

```ts
  // M18 cinematic narrative: REQ-CIN-* (cycle m18-spike-prep) — area rule, M9/M10-series pattern.
  if (milestone === 'M18' && area === 'CIN') return true;
```

Fundamento: `areaOfRequirement('REQ-CIN-1')` → `CIN` (build.ts:407-409: strip `REQ-`, strip `-\d+.*$`). La regla de área es el patrón de las series M9/M10/M12+ (`if (milestone === 'M9' && area === 'CLI')`, build.ts:419,428-435); los overrides individuales (patrón M16/M11, build.ts:390-401) existen para áreas que atraviesan ciclos (DOC), no para áreas propiedad de un hito. `CIN` pertenece a M18: los futuros requisitos del área se cosecharán sin volver a tocar `build.ts`. Riesgo aceptado y documentado: cualquier REQ-CIN-* futuro cae bajo M18 — deseado, M18 es el owner del área (confirmado: hoy NO existe regla CIN en build.ts; grep de `CIN` en build.ts solo da :102 (`['UAT-CIN','M18']`) y :180; sin ella los 12 REQ serían gaps `requirement-unowned` (LOW) nunca auditados — la clase silent-drop que el repo ya erradicó en 2bb2174).

**D2 — Mapa representation→primitiva: `capsule` → `uv_sphere` SIMPLE.**
Constante única en `blender_gen.py`: `REPRESENTATION_TO_PRIMITIVE = {"capsule": "uv_sphere", "sphere": "uv_sphere", "cube": "cube"}` (sonda H3: `primitive_capsule_add` NO existe en 4.5.3; primitivas disponibles: circle, cone, cube, cube_gizmo, cylinder, grid, ico_sphere, monkey, plane, torus, uv_sphere). Se descarta el compuesto cylinder+sphere: el compuesto añade un objeto extra por sujeto (metadata `objects[]` con dos ids por sujeto, keyframes duplicados) sin poder discriminatorio en ningún AC del ciclo (REQ-CIN-2 «qué NO prueba»: «compuestos multi-primitiva para capsule»). El enum del schema conserva los tres valores del operador (`examples/video/shot-plan.yaml:8`); la actualización a compuesto es una línea del mapa + cambio de metadata — deuda D-DE-1.

**D3 — Identidad de paquete y superficie CLI: 6 comandos.**
Paquete `cinematic` en `tools/cinematic/cinematic/` (espejo exacto de `narrative_cli`: imports absolutos `from cinematic.x import y`; pyproject con console script `cinematic = "cinematic.cli:main"`; pytest ini `testpaths=["tests"]`). Entrada canónica: `python -m tools.cinematic <cmd>` (exigida por REQ-CIN-1 AC-2) vía `tools/cinematic/__main__.py` con bootstrap propio (`sys.path.insert(0, <dir de tools/cinematic>)` + `from cinematic.cli import main`) — el paquete vive con identidad ÚNICA (`cinematic`), sin dual-import `tools.cinematic` vs `cinematic`. En escenarios y tests, la inyección de path es `sys.path[0:0] = ['tools/cinematic']` (patrón scn-m10-01-001.yaml:15-18) y `PYTHONPATH` de CI no necesita cambios para los imports (sí para la lista de tests, ver §6).

Comandos (deltas frente a la lista recomendada de la exploración §7.5 — `validate/generate/playblast/spike-dry` — justificados):

| Comando | Necesidad | Justificación del delta |
|---|---|---|
| `validate SHOT_PLAN [--json]` | REQ-CIN-1 (AC-2) | lista original |
| `generate --shot-plan P --out D [--force] [--json]` | REQ-CIN-2 (derivación pura, sin blender) | lista original |
| `run --shot-plan P --out D [--mode scene\|playblast] [--force] [--json]` | REQ-CIN-2/3/4/5/10: scn-cin-02 necesita la cadena completa sandbox+metadata+provenance en UN paso ejecutable | **añadido**: sin él, el escenario tendría que orquestar blender+provenance a mano fuera de la CLI, duplicando la disciplina de sandbox fuera del driver (violación de REQ-CIN-3 «la CLI propia replicará la disciplina») |
| `playblast --shot-plan P --out D [--force] [--json]` | REQ-CIN-6 («El comando playblast SHALL renderizar») | lista original; alias fino de `run --mode playblast` (misma implementación, cero lógica duplicada) |
| `generate-video --request R --out D [--live] [--allow-live-provider] [--json]` | REQ-CIN-7/8/9: scn-cin-04 necesita el camino provider ejecutable Y el camino de denegación con «exit ≠ 0 en el camino CLI» (REQ-CIN-9, literal del spec) | **añadido**: el spec exige camino CLI para la denegación live; sin comando no hay camino |
| `spike-dry --shot-plan P --out D [--json]` | REQ-CIN-12 | lista original |

**D4 — `scene-metadata.json`: schema cerrado, propiedad por propiedad.** Ver §4.2 (`specs/scene-metadata.schema.json`). Decisión clave: el script bpy escribe la metadata AL FINAL (tras guardar blend y, en modo playblast, tras renderizar), con `outputs[].sha256` calculado por el propio script con `hashlib` sobre los bytes finales — así «fallo → sin metadata parseable → veredicto de fallo» (REQ-CIN-4 AC-3) es estructural, y el hash declarado corresponde al artifact final. Los paths en metadata/provenance son workspace-relativos (REQ-CIN-3 AC-2: sin rutas absolutas del host).

**D5 — Modo de ejecución del script generado: variable de entorno `CINEMATIC_MODE` ∈ {`scene`, `playblast`} (default `scene`).**
El contenido de `generated-scene.py` es función pura del ShotPlan (byte-idéntico, REQ-CIN-2 AC-1); el modo es comportamiento en runtime, no contenido. Modo `scene`: construye escena + guarda `scene.blend` + metadata (outputs=[scene.blend]). Modo `playblast`: además renderiza el mp4 (outputs=[scene.blend, playblast0001-0144.mp4]). El nombre real del mp4 se computa en el script con el patrón H5 verificado: `<base><frame_start:%04d>-<frame_end:%04d>.mp4` con `base="playblast"`, y el script FALLA (guard) si tras renderizar el fichero no existe. Alternativas descartadas: argv tras `--` (parseo extra en el script generado), dos scripts (duplicación), render siempre (obligaría a render en scn-cin-02 y difuminaría el corte UAT-CIN-02/UAT-CIN-03 que fija el spec).

**D6 — Guard de éxito (H2) y marcador de éxito del driver.**
`generated-scene.py` envuelve TODO su cuerpo en `try/except → traceback.print_exc() → sys.exit(1)` (sonda probe_fail2: exit 1 medido; sin guard Blender 4.5.3 sale exit 0 — sonda H2). El driver (`drive.py`) define éxito = exit 0 **Y** `scene-metadata.json` existe, parsea y valida contra `specs/scene-metadata.schema.json` **Y** cada `outputs[].path` existe en el workspace. Nunca exit code solo (REQ-CIN-4 afirmación). Este marcador es código del driver, no oráculo nuevo del harness.

**D7 — Budget y gate live: tipos planos, cero IO.**
`budget.py`: `Budget` (dataclass congelado `maxAttempts:int, maxCredits:float`), `BudgetLedger` (contabilidad previa al intento: `can_attempt(cost)`, `record(cost)` — CIN-020: jamás se lanza un intento que exceda maxAttempts/maxCredits), `FailureReason` (str-Enum: `LIVE_NOT_ENABLED`, `BUDGET_INVALID`, `BUDGET_EXHAUSTED`, `PROVIDER_ERROR`, `INVALID_REQUEST`), `evaluate_live_gate(opt_in: bool, budget: Budget | None) -> VideoGenerationFailure | None` (denegación tipada: sin opt-in → `LIVE_NOT_ENABLED`; con opt-in y budget ausente/inválido → `BUDGET_INVALID` — REQ-CIN-9 AC-2). Fuentes de opt-in (solo en el camino CLI): flag `--allow-live-provider` o env `CINEMATIC_LIVE_OPT_IN ∈ {"1","true"}`. Por defecto DENEGADO; en el harness la allowlist de los pasos (`[PATH, HOME, BLENDER_BIN]`) EXCLUYE deliberadamente `CINEMATIC_LIVE_OPT_IN` (REQ-CIN-9 AC-4: los escenarios no contienen credenciales ni red de provider live). `spike-dry` NO consulta live jamás: hardwira el fake.

**D8 — Step de Blender en CI: ANTES de la batería pytest, no solo antes de `pnpm verify`.**
El spec pide «un step de instalación de Blender 4.5.3 LTS + export BLENDER_BIN antes de `pnpm verify`»; el diseño lo coloca inmediatamente después de «Python deps» (:29) y ANTES de «Python tests» (:31) — condición necesaria porque los pytest de REQ-CIN-2 AC-4 (guard con raise) y REQ-CIN-12 AC-1 (spike-dry con variante A real) ejecutan blender. Colocarlo antes de pytest también satisface «antes de pnpm verify» (:55). Instalación: tarball oficial de download.blender.org 4.5.3 LTS extraído en `$HOME/.local/opt/blender-4.5.3-linux-x64` (la MISMA ruta del default de resolución — así el export de `BLENDER_BIN` es explícito y el default sigue siendo válido), con `actions/cache@v4` (key `blender-4.5.3-linux-x64-v1`). Sin pin de apt (versión impredecible — exploración §7.4).

**D9 — Refinamiento del oráculo «schema» para artifacts de workspace (honestidad mecánica).**
El oráculo `schema` del harness (`oracles/index.ts:88-116`) valida SOLO artifacts del run (`readArtifactJson(ctx.run, artifactName)`); no existe acción de step que registre ficheros arbitrarios del workspace como artifacts del run (acciones filesystem: solo `temp-workspace`, runner/scenario.ts:225-228; `registerFile` solo se invoca internamente en `cli.create-project`, :239-243). Por eso los 4 escenarios validan los artifacts del workspace con **pasos assert** (`process.run` con `python3 -c`, patrón probado `recipes.plan-assert` en scn-m10-01-001.yaml:17, oráculo `process` con `exitCode: 0` + `stderrEmpty`), donde el assert ejecuta `jsonschema.validate` contra los schemas de §4 — la conformidad de schema del spec («se valida con oráculo schema») se ejercita con el MISMO validador y MISMO schema, como aserción de paso. El oráculo `file-content` del harness sí se usa legítimamente en scn-cin-01 para el determinismo del validador (compara los artifacts `process.<step>.stdout.txt` de dos ejecuciones). Esto se declara aquí como cierre mecánico del spec, no como sustitución de una verificación: la comprobación de schema es real y ejecutada en el escenario.

**D10 — Enlace UAT↔escenario con slug COMPLETO.**
`shortId = /^(UAT-M\d+(?:\.\d+)?-\d+)/.exec(uatId)?.[1] ?? uatId` (build.ts:268-273) NO casa `UAT-CIN-01-shotplan` (solo series `M\d+`) → shortId = id completo. Los YAML declaran literalmente `uat: UAT-CIN-01-shotplan`, `UAT-CIN-02-blender-headless`, `UAT-CIN-03-playblast`, `UAT-CIN-04-provider-port` (EXECUTABLE ⟺ scenarios.length>0, build.ts:277). UAT-CIN-05-approval: NINGÚN escenario la cita → permanece MANUAL_ONLY (gap MEDIUM preexistente, sin cambio — R10 de la exploración).

**D11 — Determinismo del validador y del generador (R4).**
Salidas JSON con `json.dumps(..., sort_keys=True)` + `\n` final; errores ordenados por path; floats emitidos por el generador con formato fijo `f"{v:.6f}"`; sin clock, sin aleatoriedad, sin paths absolutos del workspace en el contenido del script; orden de structures derivado del propio documento (listas en orden del YAML, dicts serializados sort_keys). El generador es función pura `generate_scene_script(plan: dict) -> str`.

---

## 2. Componentes y ficheros

### 2.1 Crear

| Ruta | Responsabilidad | Contrato clave |
|---|---|---|
| `specs/shot-plan.schema.json` | Contrato ShotPlan (REQ-CIN-1) | §4.1 — cerrado, draft 2020-12, alineado a `examples/video/shot-plan.yaml` |
| `specs/video-generation-request.schema.json` | Contrato petición de generación (REQ-CIN-7 AC-2) | §4.1 — cerrado; `budget` requerido |
| `specs/scene-metadata.schema.json` | Contrato del artifact emitido por el script bpy (REQ-CIN-4: «schema exacto se cierra en design.md») | §4.2 |
| `specs/provenance.schema.json` | Contrato de la cadena de derivación (REQ-CIN-5) | §4.3 |
| `tools/cinematic/pyproject.toml` | Espejo de `tools/narrative-cli/pyproject.toml` | deps: `click==8.3.3, pyyaml==6.0.3, jsonschema==4.23.0` (+dev `pytest==9.1.1`); console script; pytest ini. **Sin pydantic** (no se necesita: sin modelos pydantic este ciclo — menor superficie) |
| `tools/cinematic/__main__.py` | Entrada `python -m tools.cinematic` | bootstrap sys.path + `main()` |
| `tools/cinematic/cinematic/__init__.py` | marca de paquete | — |
| `tools/cinematic/cinematic/exit_codes.py` | Exit codes tipados | §4.4 |
| `tools/cinematic/cinematic/output.py` | Emisión JSON estable | `emit(obj)` = `json.dumps(obj, sort_keys=True)` + `\n` |
| `tools/cinematic/cinematic/shotplan.py` | Carga+validación ShotPlan (core, sin bpy) | `load_shot_plan(path) -> dict` (yaml.safe_load); `validate_shot_plan(doc) -> list[Violation]` con jsonschema Draft202012Validator + reglas semánticas no expresables en schema: segmentos contiguos sin huecos/solapes cubriendo `[1, durationSeconds×fps]`, `start<=end` por segmento, campos de altura por move (`height` para static/tracking_backward; `heightFrom`+`heightTo` para crane_up — el schema también lo fija con if/then, la regla de código es red de seguridad con error tipado idéntico); `Violation = {path, message}` ordenada por path; resolución de specs dir: env `CINEMATIC_SPECS_DIR` → `Path(__file__).resolve().parents[3]/"specs"` |
| `tools/cinematic/cinematic/blender_gen.py` | Generador determinista del script bpy (core puro: no importa bpy) | `generate_scene_script(plan: dict) -> str`; constante `REPRESENTATION_TO_PRIMITIVE` (D2); embed de FPS/FPS_BASE/FRAME_START/FRAME_END/SUBJECTS/CAMERA_LENS_MM/SEGMENTS como literales con floats `%.6f`; cámara: sujeto con keyframe de location en frame_start→frame_end (interpolación LINEAR forzada en la fcurve); por segmento: `tracking_backward` → cámara detrás del sujeto (offset constante `CAMERA_BACK_OFFSET=4.0` en −Y), z=height; `static` → fija (0,−4,height); `crane_up` → z de heightFrom a heightTo entre f0 y f1; rotación de cámara constante `radians(90),0,radians(180)` (mira +Y; la fidelidad de encuadre NO es objeto de prueba — REQ-CIN-2 «qué NO prueba»); guard try/except→`traceback.print_exc()`→`sys.exit(1)` (D6); escritura de metadata AL FINAL (D4); `fps_base=1.0`; render (modo playblast): `BLENDER_WORKBENCH`, 640×360, FFMPEG/MPEG4/H264, filepath `//playblast`, verificación de existencia del mp4 con nombre H5; objeto cámara nombrado `CIN_CAMERA`; nombres de objetos = ids de sujetos |
| `tools/cinematic/cinematic/drive.py` | Driver headless (ÚNICO módulo que toca el binario de blender junto a blender_gen que lo genera) | `DEFAULT_BLENDER_PATH = Path.home()/".local/opt/blender-4.5.3-linux-x64/blender"`; `resolve_blender_bin(env=os.environ, default=DEFAULT_BLENDER_PATH) -> Path` (env `BLENDER_BIN` → default → `BlenderBinaryNotFoundError` → exit 5); `BLENDER_ENV_ALLOWLIST = ("PATH","HOME","LANG","LC_ALL","TMPDIR")` + extra `{"CINEMATIC_MODE": mode}`; `run_scene(shot_plan_path, out_dir, mode, blender_bin=None, timeout_s=600.0) -> RunReport`: valida plan → escribe `generated-scene.py` (idempotente byte-idéntico) → spawn `[bin, --background, --factory-startup, --python, script]` con cwd=out_dir, env=allowlist+extra, timeout → marcador de éxito D6 → escribe `provenance.json` (§4.3) → `RunReport{ok, childEnvKeys (solo claves, sin valores), metadata, provenance, blenderStderrTail}` |
| `tools/cinematic/cinematic/budget.py` | Budget policy + live gate (core) | D7 |
| `tools/cinematic/cinematic/providers/__init__.py` | — | — |
| `tools/cinematic/cinematic/providers/port.py` | Puerto tipado provider-neutral (core; REQ-CIN-7 AC-1) | `ProviderCapabilities{providerId, supportsMotionReference, maxDurationSeconds, aspectRatios, liveCapable}`; `VideoGenerationSuccess{providerId, model: str|None, receipt, artifactPath, artifactSha256, attempts, costCredits}`; `VideoGenerationFailure{reason: FailureReason, detail, attempts, costCredits, providerInvoked: bool}`; `VideoGenerationResult = VideoGenerationSuccess | VideoGenerationFailure`; `class VideoProvider(Protocol)`: `capabilities() -> ProviderCapabilities`, `generate(request: VideoGenerationRequest) -> VideoGenerationResult`. Cero imports de vendor (sin socket/urllib/http/bpy) |
| `tools/cinematic/cinematic/providers/request.py` | Petición tipada + validación (core) | dataclass congelado `VideoGenerationRequest` espejo del schema §4.1 (shotId, prompt, motionReference?, styleReferences, characterReferences, durationSeconds, aspectRatio, budget: Budget); `load_video_request(path) -> VideoGenerationRequest` (yaml + jsonschema; error tipado → exit 1) |
| `tools/cinematic/cinematic/providers/fake.py` | FakeProvider determinista (core; REQ-CIN-8) | ctor `(cost_per_attempt_credits: float = 10.0, failures_before_success: int = 0)`; `capabilities()` estático (liveCapable=False); `generate(request)`: `BudgetLedger(request.budget)`; bucle: `if not ledger.can_attempt(cost)` → `VideoGenerationFailure(BUDGET_EXHAUSTED, attempts=ledger.attempts, costCredits=ledger.spent)` (nunca excede — CIN-020); attempt fallido simulado → contabilizado y reintenta; éxito → escribe artifact placeholder determinista `fake-clip-<shotId>.mp4` (bytes fijos) en el directorio de trabajo, receipt determinista `fake-<shotId>-attempt-<n>`, `VideoGenerationSuccess(attempts, costCredits, artifactPath, artifactSha256)` |
| `tools/cinematic/cinematic/providers/record.py` | Registro provider-neutral del run (core) | `record_provider_run(out_dir, request, result) -> dict` — escribe `provider-result.json` (éxito o denegación, mismo sobre tipado) y `provider-provenance.json` `{version, request:{path,sha256}, providerId, model, receipt, attempts:[{n,outcome,costCredits}], result}` (campos CIN-015 del lado fake — REQ-CIN-8 AC-3) |
| `tools/cinematic/cinematic/spike.py` | Runner A/B dry-run (core; REQ-CIN-12) | `run_spike_dry(shot_plan_path, out_dir) -> dict (metrics)`: valida plan; variante A = `drive.run_scene(mode="playblast")` en `out/variant-A` (playblast puro Blender; attempts=1, cost 0); variante B = request construida desde el plan con plantilla determinista («Cinematic tracking shot derived from the approved ShotPlan <id>. Preserve subject path and camera timing.»), `motionReference` = path relativo del mp4 de A, budget {2, 40} (valores del ejemplo del operador), FakeProvider vía `BudgetLedger` en `out/variant-B`; `metrics.json` §4.5; `time.monotonic()` SOLO para `elapsed_seconds` (métrica, no derivación); sin veredicto (`"verdict": null`) |
| `tools/cinematic/cinematic/cli.py` | click group + 6 comandos (D3) | §4.4; errores tipados a stderr; envelopes `--json` a stdout (D11) |
| `tools/cinematic/tests/conftest.py` | bootstrap `sys.path` (tools/cinematic) para pytest directo | — |
| `tools/cinematic/tests/fixtures/shot-plan-invalid.yaml` | Fixture negativa reutilizable por scn-cin-01 (REQ-CIN-1 AC-3) | ShotPlan del ejemplo con TRES violaciones simultáneas: campo desconocido `notes:` (additionalProperties), `fps: "24"` (tipo), segmentos con hueco `[1,48],[50,96],[97,144]` (regla semántica) — el mensaje tipado debe nombrar las tres |
| `tools/cinematic/tests/test_shotplan.py` | REQ-CIN-1 (+AC-4 determinismo) | docstring «Requirements: REQ-CIN-1 …» (patrón test_cli_contract.py:1-13) |
| `tools/cinematic/tests/test_blender_gen.py` | REQ-CIN-2 (AC-1 byte-idéntico sha256; AC-2 estructural: primitivas de la lista H3, fps/frames/lens, keyframes por segmento, guard presente) | — |
| `tools/cinematic/tests/test_drive.py` | REQ-CIN-3 (AC-2 env mínimo + sin rutas absolutas/secrets en script; AC-3 resolución fallida → error tipado con `default=` inyectado inexistente; REQ-CIN-2 AC-4: guard — mutar el script generado insertando `raise RuntimeError("injected")` y ejecutar blender → exit ≠ 0 + traceback en stderr; REQ-CIN-10 AC-2: el driver no elimina el script y provenance lo referencia con hash) | ejecuta blender REAL (requiere BLENDER_BIN/default) |
| `tools/cinematic/tests/test_run_artifacts.py` | REQ-CIN-4 (metadata schema+fps/fps_base/frames/lens; outputs re-hash) y REQ-CIN-5 (provenance cadena completa; re-hash estable) | run_scene modo scene en tmp ws (blender real ~3-5 s) |
| `tools/cinematic/tests/test_providers.py` | REQ-CIN-7 (AC-1 estructural puerto; AC-3/AC-4 camino fake y fallo tipado) y REQ-CIN-8 (AC-1 budget: éxito con coste; agotar maxAttempts/maxCredits → fallo tipado sin excepción; AC-2 sin socket/urllib/http por AST; AC-4 attempts contabilizados) | — |
| `tools/cinematic/tests/test_budget_gate.py` | REQ-CIN-9 (AC-1: sin opt-in → denegación tipada + CLI exit 7 + cero invocaciones (espía: provider factory contador=0); AC-2: opt-in + budget inválido → `BUDGET_INVALID`) | — |
| `tools/cinematic/tests/test_structure.py` | REQ-CIN-11 (AC-1: ambos schemas §4.1 con `additionalProperties: false` + draft 2020-12 — comprueba los CUATRO schemas del ciclo; AC-2: AST scan — ningún módulo del paquete salvo `blender_gen.py` y `drive.py` referencia `bpy`/vendor SDKs; fake sin socket/urllib/http) | — |
| `tools/cinematic/tests/test_spike.py` | REQ-CIN-12 (AC-1: spike-dry produce metrics.json con los 8 campos por attempt para A y B, humanos vacíos, máquina-observables poblados; AC-2: fake-only estructural + attempts/coste vía ledger) | blender real (variante A ~15-25 s) |
| `verification/scenarios/scn-cin-01-001.yaml` | Escenario canónico UAT-CIN-01 | §4.6 |
| `verification/scenarios/scn-cin-02-001.yaml` | Escenario canónico UAT-CIN-02 | §4.6 |
| `verification/scenarios/scn-cin-03-001.yaml` | Escenario canónico UAT-CIN-03 | §4.6 |
| `verification/scenarios/scn-cin-04-001.yaml` | Escenario canónico UAT-CIN-04 | §4.6 |

### 2.2 Modificar

| Ruta | Cambio exacto |
|---|---|
| `verification/src/traceability/build.ts` | D1: una línea en `reqBelongsToMilestone` (tras :430) |
| `verification/traceability/requirement-levels.json` | 12 entradas nuevas REQ-CIN-1..12 (§5 — 9 functional + 3 fitness, rationale ≥ 10 chars; el loader falla duro en malformación, audit.ts:43-57) |
| `.github/workflows/verification.yml` | (a) :33 añadir `tools/cinematic/tests` a la lista pytest; (b) step `actions/cache@v4` + «Install Blender 4.5.3 LTS» tras «Python deps» y antes de «Python tests» con `echo "BLENDER_BIN=..." >> $GITHUB_ENV` (D8) |
| `verification/traceability/registry.json`, `verification/audit/all.*` | SOLO regenerados por el pipeline (`traceability build` + `audit all`) en la fase verify — prohibido editar a mano |

### 2.3 NO tocar

`control-plane/src`, sinks, `entityLinkPlugin`, epub, `comic-renderer`, `docs/19-ROADMAP.md` (sección M18 ya existe), `changes/m18-cinematic-narrative/` (docs del operador), `uat/*.md` (status derivado, no editado), `verification/src/oracles/**` (no se crean oráculos nuevos — D9), drivers del harness (`process.ts`/`filesystem.ts` intactos: la disciplina de sandbox vive en la CLI según REQ-CIN-3).

---

## 3. Contratos exactos

### 4.1 — Schemas de entrada (cerrados, draft 2020-12)

**`specs/shot-plan.schema.json`** — `$schema: https://json-schema.org/draft/2020-12/schema`, `type: object`, `additionalProperties: false`, `required: [id, sceneRef, sequenceRef, durationSeconds, fps, subjects, camera]`:
- `id`: string `^[A-Za-z0-9._-]+$` (identidad estable de toma — CIN-001)
- `sceneRef`, `sequenceRef`: string minLength 1 (vínculo scene/sequence — CIN-003)
- `durationSeconds`: number exclusiveMinimum 0
- `fps`: integer minimum 1
- `subjects`: array minItems 1, items: `additionalProperties: false`, `required: [id, representation, action, start, end]` (blocking — CIN-005); `id` string minLength 1; `representation` enum `[capsule, sphere, cube]`; `action` string minLength 1; `start`/`end` arrays de 3 numbers
- `camera`: object `additionalProperties: false`, `required: [lensMm, segments]`; `lensMm` number exclusiveMinimum 0; `segments` array minItems 1, items: `additionalProperties: false`, `required: [frames, move]`; `frames` array 2 integers minimum 1 (el orden [start, end] y la cobertura se exigen por regla semántica de `shotplan.py`); `move` enum `[static, tracking_backward, crane_up]`; if `move` = `static|tracking_backward` → require `height` (number); if `move` = `crane_up` → require `heightFrom`, `heightTo` (numbers)
- `styleReferences`, `characterReferences`: arrays de string (opcionales)

Valida `examples/video/shot-plan.yaml` tal cual (AC-1: 24 fps, 6 s, segmentos [1,48]/[49,96]/[97,144], lens 50, tracking_backward×2 + crane_up).

**`specs/video-generation-request.schema.json`** — mismo marco, `required: [shotId, prompt, durationSeconds, aspectRatio, budget]`:
- `shotId`, `prompt`: string minLength 1 · `motionReference`: string (opcional) · `styleReferences`/`characterReferences`: arrays de string
- `durationSeconds`: number exclusiveMinimum 0 · `aspectRatio`: string `^[0-9]+:[0-9]+$`
- `budget`: object `additionalProperties: false`, `required: [maxAttempts, maxCredits]`; `maxAttempts` integer minimum 1; `maxCredits` number exclusiveMinimum 0

Rechaza (pytest, REQ-CIN-7 AC-2): sin `budget`, con campo desconocido.

### 4.2 — `specs/scene-metadata.schema.json` (cerrado; emitido por el script bpy)

`type: object`, `additionalProperties: false`, `required: [version, shotId, mode, fps, fps_base, frame_start, frame_end, camera, objects, render, outputs]`:
- `version`: const `1` · `shotId`: string minLength 1 · `mode`: enum `[scene, playblast]`
- `fps`: integer minimum 1 · `fps_base`: const `1.0` (R8 — frecuencia no ambigua)
- `frame_start`: integer minimum 1 · `frame_end`: integer minimum 1
- `camera`: `additionalProperties: false`, `required: [lensMm, segments]`; `lensMm` number; `segments` array de items `additionalProperties: false` `required: [frames, move]` con `frames` [integer, integer], `move` enum (mismos 3), `height`/`heightFrom`/`heightTo` numbers opcionales — espejo de los segmentos del plan, en orden
- `objects`: array minItems 1 de strings (ids creados: sujetos + `CIN_CAMERA`)
- `render`: `additionalProperties: false`, `required: [engine, resolution, container, codec]`; `engine`: const `BLENDER_WORKBENCH`; `resolution`: object `additionalProperties: false` `required: [width, height]` con consts `640`/`360`; `container`: const `FFMPEG`; `codec`: const `H264` (REQ-CIN-6 AC-2 — el envelope canónico del spike, fijado por este design conforme a REQ-CIN-4 «qué NO prueba»)
- `outputs`: array minItems 1, items `additionalProperties: false`, `required: [path, sha256]`; `path`: string `^[A-Za-z0-9._/-]+$` (workspace-relativo); `sha256`: string `^[0-9a-f]{64}$`

Para el ejemplo canónico en modo scene: `{"version":1,"shotId":"SC12-SH03","mode":"scene","fps":24,"fps_base":1.0,"frame_start":1,"frame_end":144,...,"outputs":[{"path":"scene.blend","sha256":"<64hex>"}]}`; en playblast: outputs `[scene.blend, playblast0001-0144.mp4]` (nombre H5 computado por el script).

### 4.3 — `specs/provenance.schema.json` (cerrado; emitido por el driver)

`required: [version, shotPlan, generatedScript, sceneMetadata, outputs]`, `additionalProperties: false`; `$defs.artifact` = `{path: string (relative-or-given), sha256: ^[0-9a-f]{64}$}`; `shotPlan`/`generatedScript`/`sceneMetadata` = `$defs.artifact`; `outputs` = array de `$defs.artifact`. Sin timestamps ni metadatos volátiles (REQ-CIN-5 AC-3). Paths: inputs tal como se dieron a la CLI; artifacts del workspace en relativo. Cubre la cadena completa ShotPlan → generated-scene.py → scene-metadata.json → outputs (REQ-CIN-5 AC-2) y referencia el script conservado (REQ-CIN-10 AC-2). `sceneMetadata.path` = `scene-metadata.json` — orden de escritura: blend → (mp4) → metadata → provenance.

### 4.4 — CLI: exit codes y envelopes

`cinematic/exit_codes.py` (tipado, espejo ampliado de `narrative_cli/exit_codes.py`):

| Code | Constante | Condición documentada |
|---|---|---|
| 0 | `EXIT_SUCCESS` | operación completada |
| 1 | `EXIT_VALIDATION_ERROR` | ShotPlan/video-request inválido (schema o regla semántica); uso incorrecto de args |
| 2 | `EXIT_CONFLICT` | `--out` existe y no está vacío, sin `--force` |
| 3 | `EXIT_INPUT_MISSING` | fichero de entrada o directorio de salida inexistente |
| 4 | `EXIT_INTERNAL_ERROR` | error no esperado |
| 5 | `EXIT_BLENDER_UNRESOLVED` | `BLENDER_BIN` no resoluble y default inexistente (REQ-CIN-3 AC-3) |
| 6 | `EXIT_RUN_FAILED` | blender ejecutado pero marcador de éxito inválido (exit≠0, metadata ausente/inválida, output faltante) |
| 7 | `EXIT_LIVE_DENIED` | denegación del gate live (REQ-CIN-9 AC-1) |

Envelopes `--json` (deterministas, D11): `validate` → `{"valid": bool, "shotPlanId": str|null, "errors": [{path, message}]}`; `generate` → `{"status": "written", "shotPlanId", "script": "generated-scene.py", "sha256"}`; `run`/`playblast` → `{"status": "success", "shotPlanId", "mode", "artifacts": [nombres relativos ordenados]}`; `generate-video` éxito → `{"status": "success", "providerId", "model", "receipt", "attempts", "costCredits", "artifact": {path, sha256}}`, denegación → `{"status": "denied", "reason", "detail", "providerInvoked": false}`; `spike-dry` → el propio `metrics.json`. Mensajes de error a stderr, siempre.

### 4.5 — `metrics.json` del spike-dry (campos SPK-VIDEO-01, literal)

```json
{
  "version": 1,
  "spike": "SPK-VIDEO-01",
  "mode": "dry-run",
  "variants": {
    "A": {"name": "playblast_blender", "attempts": 1, "cost_credits": 0.0, "elapsed_seconds": 18.4,
          "camera_adherence": null, "spatial_continuity": null, "subject_consistency": null,
          "visual_quality": null, "human_acceptability_1_5": null,
          "artifact": {"path": "variant-A/playblast0001-0144.mp4", "sha256": "..."}},
    "B": {"name": "provider_fake", "attempts": 1, "cost_credits": 10.0, "elapsed_seconds": 0.003,
          "camera_adherence": null, "spatial_continuity": null, "subject_consistency": null,
          "visual_quality": null, "human_acceptability_1_5": null,
          "provider": "fake", "receipt": "fake-SC12-SH03-attempt-1",
          "artifact": {"path": "variant-B/fake-clip-SC12-SH03.mp4", "sha256": "..."}}
  },
  "attemptsLog": [{"variant": "A", "attempt": 1, "outcome": "success", "cost_credits": 0.0},
                  {"variant": "B", "attempt": 1, "outcome": "success", "cost_credits": 10.0}],
  "verdict": null,
  "verdictRule": "B mejora >= 2 dimensiones sin coste desproporcionado — juicio humano sobre el spike LIVE (operador)"
}
```

Los 8 campos métricos por variante, exactos: `attempts, cost_credits, elapsed_seconds, camera_adherence, spatial_continuity, subject_consistency, visual_quality, human_acceptability_1_5`. Semánticos/humanos `null` (vacíos — el dry-run no los inventa); máquina-observables poblados; veredicto ausente por diseño (CIN-022/023).

### 4.6 — Escenarios canónicos (testids y oráculos exactos)

Formato espejo de `scn-m10-01-001.yaml`. Todos los pasos `process` usan el patrón argv probado: `python3 -c "import sys; sys.path[0:0] = ['tools/cinematic']; sys.argv = ['cinematic', ...]; from cinematic.cli import main; main()"` con `cwd: .` y `envAllowlist: [PATH, HOME, BLENDER_BIN]` (los pasos assert: `[PATH, HOME]` — sin BLENDER_BIN ni opt-in env: D7).

**`scn-cin-01-001.yaml`** — `id: SCN-CIN-01-001` · `uat: UAT-CIN-01-shotplan` · `requirements: [REQ-CIN-1]`
- steps: `validate.positive` (example → exit 0) · `validate.positive.repeat` (idéntico) · `validate.negative` (fixture `tools/cinematic/tests/fixtures/shot-plan-invalid.yaml` → exit 1). timeoutMs 120000.
- oracles: `validate.accepts-canonical` (process: step validate.positive, exitCode 0) · `validate.deterministic` (file-content: expectedArtifact `process.validate.positive.stdout.txt` vs actualArtifact `process.validate.positive.repeat.stdout.txt`) · `validate.rejects-invalid` (process: step validate.negative, exitCode 1)
- claims.proves: aceptación del contrato canónico, rechazo tipado de inválidos, salida byte-estable (CLI real). claims.doesNotProve: aceptación por Blender (scn-cin-02), compilación de prompt/QA.

**`scn-cin-02-001.yaml`** — `id: SCN-CIN-02-001` · `uat: UAT-CIN-02-blender-headless` · `requirements: [REQ-CIN-2, REQ-CIN-3, REQ-CIN-4, REQ-CIN-5, REQ-CIN-10]`
- steps: `ws.prepare` (filesystem.temp-workspace, prefix `cin02`) · `cinematic.run-scene` (run `--shot-plan examples/video/shot-plan.yaml --out {{ws.prepare.dir}} --mode scene --json`, timeoutMs **600000**, envAllowlist `[PATH, HOME, BLENDER_BIN]`) · `artifacts.assert` (timeoutMs 60000): jsonschema.validate(metadata, specs/scene-metadata.schema.json) + fps 24/fps_base 1.0/frame_start 1/frame_end 144/lens 50/shotId + re-hash de cada output + jsonschema.validate(provenance, specs/provenance.schema.json) + cadena completa + re-hash del shotPlan de entrada + existencia de `generated-scene.py` (REQ-CIN-10) + el script no contiene `/home/` (REQ-CIN-3 AC-2)
- oracles: `run.scene-succeeds` (process: cinematic.run-scene, exitCode 0) · `artifacts.metadata-provenance-script` (process: artifacts.assert, exitCode 0, stderrEmpty true)
- claims.doesNotProve: fidelidad de render (scn-cin-03), provider path (scn-cin-04).

**`scn-cin-03-001.yaml`** — `id: SCN-CIN-03-001` · `uat: UAT-CIN-03-playblast` · `requirements: [REQ-CIN-6]`
- steps: `ws.prepare` (prefix `cin03`) · `cinematic.playblast` (comando `playblast`, timeoutMs **600000**) · `playblast.assert`: metadata render == WORKBENCH/640×360/FFMPEG/H264, fps 24, frames 1..144, `playblast0001-0144.mp4` en outputs, fichero existe no vacío, sha256 coincide, provenance lo cubre
- oracles: `playblast.succeeds` (process exitCode 0) · `playblast.artifact-registered` (process: playblast.assert, exitCode 0, stderrEmpty true)

**`scn-cin-04-001.yaml`** — `id: SCN-CIN-04-001` · `uat: UAT-CIN-04-provider-port` · `requirements: [REQ-CIN-7, REQ-CIN-8, REQ-CIN-9]`
- steps: `ws.prepare` (prefix `cin04`) · `provider.fake-generate` (`generate-video --request examples/video/video-generation-request.yaml --out {{ws.prepare.dir}} --json`, exit 0 esperado; capabilities→generate vía fake, provider-result.json + provider-provenance.json en ws) · `provider.live-denied` (`generate-video ... --live --json` SIN opt-in en la allowlist → exit **7**) · `provider.assert`: provider-result.json con campos tipados (attempts ≤ 2, costCredits ≤ 40, artifact sha256 re-hash), provenance con attempts/coste, denial.json con `reason: LIVE_NOT_ENABLED` y `providerInvoked: false`
- oracles: `fake.generate-succeeds` (process exitCode 0) · `live.denied-without-opt-in` (process: provider.live-denied, exitCode 7) · `provider.typed-results` (process: provider.assert, exitCode 0, stderrEmpty true)
- claims.doesNotProve: adapter real/live (CIN-013/014: solo operador), ciclo poll/fetchArtifact real, MCP/Bridge.

### 4.7 — testids ↔ REQ (testRefs de los fitness y citación funcional)

Cada fichero de test lleva docstring «Requirements:» con los ids literales (patrón `test_cli_contract.py:1-13`; el scan de testRefs cubre `tools/**/tests?/*.py`, build.ts:246-249):

| testid (fichero) | Cita | Nivel |
|---|---|---|
| test_shotplan.py | REQ-CIN-1 | functional (apoyo; el veredicto lo da SCN-CIN-01-001) |
| test_blender_gen.py | REQ-CIN-2 | functional (apoyo) |
| test_drive.py | REQ-CIN-2, REQ-CIN-3, REQ-CIN-10 | functional + fitness |
| test_run_artifacts.py | REQ-CIN-4, REQ-CIN-5 | functional (apoyo) |
| test_providers.py | REQ-CIN-7, REQ-CIN-8 | functional (apoyo) |
| test_budget_gate.py | REQ-CIN-9 | functional (apoyo) |
| test_structure.py | REQ-CIN-11 | **fitness** (única evidencia) |
| test_spike.py | REQ-CIN-12 | **fitness** (única evidencia) |

REQ-CIN-10 (fitness) tiene además artifacts de scn-cin-02-001 — pero su nivel fitness se satisface con testRefs (audit.ts:137-139).

---

## 5. Entradas exactas para `requirement-levels.json`

Formato del fichero: objeto `{reqId: {level, rationale}}` (87 entradas hoy, cero CIN — verificado). Añadir exactamente:

```json
{
"REQ-CIN-1":  {"level": "functional", "rationale": "La validacion del contrato ShotPlan es comportamiento de frontera: SCN-CIN-01-001 ejercita el CLI real con aceptacion, rechazo tipado y determinismo."},
"REQ-CIN-2":  {"level": "functional", "rationale": "La derivacion ShotPlan a bpy la ejecuta Blender 4.5.3 headless real en SCN-CIN-02-001; el determinismo byte-identico se anade por pytest."},
"REQ-CIN-3":  {"level": "functional", "rationale": "El sandbox (workspace efimero, env allowlist, timeout) se ejercita en la ejecucion real de SCN-CIN-02-001; la denegacion por binario no resuelto, por pytest."},
"REQ-CIN-4":  {"level": "functional", "rationale": "scene-metadata.json emitida por Blender real se valida contra su schema cerrado y se re-hashea en SCN-CIN-02-001."},
"REQ-CIN-5":  {"level": "functional", "rationale": "provenance.json cubre la cadena real ShotPlan-script-metadata-outputs y sus hashes se verifican byte a byte en SCN-CIN-02-001."},
"REQ-CIN-6":  {"level": "functional", "rationale": "El playblast produce el mp4 real con nombre de rango H5, hasheado y registrado; SCN-CIN-03-001 lo demuestra con Blender headless."},
"REQ-CIN-7":  {"level": "functional", "rationale": "El puerto VideoProvider con capabilities-generate y fallo tipado se ejercita por el camino CLI del driver en SCN-CIN-04-001."},
"REQ-CIN-8":  {"level": "functional", "rationale": "El FakeProvider con budget, coste y attempts contabilizados se ejercita en SCN-CIN-04-001 y por pytest de presupuesto."},
"REQ-CIN-9":  {"level": "functional", "rationale": "La denegacion live sin opt-in, con cero invocaciones al provider, es parte del camino CLI ejecutado en SCN-CIN-04-001."},
"REQ-CIN-10": {"level": "fitness", "rationale": "Propiedad de conservacion del script como evidence: asercion estructural de pytest y artifacts de SCN-CIN-02-001; no requiere escenario propio."},
"REQ-CIN-11": {"level": "fitness", "rationale": "Invariante estructural (schemas cerrados, core sin bpy ni vendor SDKs) del mismo tipo que REQ-VAH-STORE-IMMUTABILITY; verificable por testRefs."},
"REQ-CIN-12": {"level": "fitness", "rationale": "El runner dry-run es orquestacion de piezas ya verificadas con contrato de metricas verificable por pytest; el veredicto A/B live es del operador."}
}
```

(Acentos omitidos en rationale para máxima robustez ASCII del JSON; ≥ 10 chars ✔.)

---

## 6. Estrategia de tests (quirúrgica por fase, canónica al cierre)

| Fase | Perfil (anexo AGENTS.md §2) | Comandos exactos | Blender |
|---|---|---|---|
| Implementación por módulo | T0/T1 quirúrgico | `python3 -m pytest tools/cinematic/tests/test_shotplan.py -q` · `…test_blender_gen.py -q` · `…test_providers.py -q` · `…test_budget_gate.py -q` · `…test_structure.py -q` | No |
| Driver y artifacts | T1 (blender focalizado) | `BLENDER_BIN=~/.local/opt/blender-4.5.3-linux-x64/blender python3 -m pytest tools/cinematic/tests/test_drive.py tools/cinematic/tests/test_run_artifacts.py -q` · `…test_spike.py -q` | Sí (~10-30 s) |
| Cierre del paquete | T2 componente | `python3 -m pytest tools/cinematic/tests -q` (con BLENDER_BIN) + batería de vecinos si se tocan contratos compartidos: `PYTHONPATH=tools:tools/narrative-cli pytest tools/narrative_recipes/tests tools/narrative-cli/tests -q` | Sí |
| Tras el cambio en `build.ts` | T2 harness | `cd verification && pnpm exec tsc --noEmit && pnpm test` | No |
| Validación canónica (cierre del ciclo, fase verify) | T3/T4 canónico | `cd verification && pnpm verify` (= `uat all`: corre SCN-CIN-01-001..04-001 + los 11 escenarios existentes; produce veredictos PASS que el audit consume) · `pnpm exec node src/index.ts traceability build` · `pnpm exec node src/index.ts audit all` (esperado: **proven 108 · waived 1 · blocking 0**, 0 UNMAPPED, REQ-CIN-1..12 bajo M18 MAPPED, UAT-CIN-01..04 EXECUTABLE, UAT-CIN-05 MANUAL_ONLY) | Sí (scn-cin-02/03) |
| CI (push) | T4 en remoto | verification.yml con pytest ampliada + Blender step + `pnpm verify` + audit gate M10.2.1 sin cambios | Sí |

Reglas: no se lanza la batería completa en cada iteración (§4 del anexo); los tests que requieren blender NO se marcan skip ante binario ausente (fallar, nunca silenciar — la clase silent-drop del commit 2bb2174); la evidencia de T4 reutiliza la de la fase canónica solo si la revisión y el entorno coinciden.

---

## 7. Deuda registrada (severidad / prioridad)

| ID | Deuda | Severidad | Prioridad | Motivo / plan |
|---|---|---|---|---|
| DE-1 | `capsule` → `uv_sphere` (sin compuesto cylinder+sphere) | Baja | Media (antes de fases de render real de M18) | Previz mínimo suficiente para el spike; el mapa es una constante; compuesto cuando un AC exija silueta de cápsula |
| DE-2 | `scene-metadata.schema.json` fija consts del envelope canónico (WORKBENCH/640×360/FFMPEG/H264) | Baja | Baja | Es el contrato del spike; evolución de engine/resolución exige cambio de schema con su rationale |
| DE-3 | Sandbox = env-allowlist + workspace efímero + timeout, NO contención a nivel OS (cgroups/seccomp) ni bloqueo de red del binario | **Media** (limitación conocida, heredada de la disciplina ADR-CIN-004 del harness) | Media (antes de ejecutar código LLM-generado — CIN-025 pleno) | Este ciclo el script es determinista y sin red; el driver NO debe describirse nunca como sandbox OS; contención plena cuando M18 genere scripts por LLM |
| DE-4 | Ruta default de Blender acoplada a la máquina del operador (`~/.local/opt/...`) | Baja | Baja | `BLENDER_BIN` es el contrato; CI instala en la misma ruta (D8); documentado en resolve_blender_bin |
| DE-5 | mp4 no byte-determinista entre builds/plataformas (encoder FFMPEG) | Baja | Baja | Aceptado por spec (REQ-CIN-6 «qué NO prueba»): el hash es identidad de provenance, no igualdad entre runs |
| DE-6 | Coste runtime de la suite con blender (~30-45 s: guard + artifacts + spike) | Baja | Baja | Aislado en 3 ficheros de test; el resto de la suite es pura |
| DE-7 | UAT-CIN-05 MANUAL_ONLY (gap MEDIUM preexistente en el audit) | Media | Fuera del ciclo | Ningún escenario la cita (R10); se resuelve con M18.5 (QA/aprobación humana) |
| DE-8 | Divergencia jsonschema 4.23.0 (pin pyproject) vs 4.25.1 (CI/sistema) | Baja | Baja | Mitigado: solo draft 2020-12 estándar, sin features divergentes (R7); el validador usa Draft202012Validator explícito |
| DE-9 | `__main__.py` con bootstrap de sys.path (para `python -m tools.cinematic`) | Baja | Baja | 4 líneas; evita dual-identity `cinematic`/`tools.cinematic`; revisable si el paquete se instala como wheel en el futuro |

Ninguna deuda bloquea el cierre del ciclo; DE-3 es la única con implicación de seguridad y queda explícitamente acotada en los claims de los escenarios (doesNotProve).

---

## 8. Aritmética esperada al cierre (honestidad del objetivo)

- Harvest: `build.ts` recolecta REQ-CIN-1..12 desde `changes/m18-spike-prep/spec.md` (regex `REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*`, harvest de `changes/**/*.md`, build.ts:193-217) y D1 los asigna a M18.
- Escenarios↔REQ (build.ts:215-227): scn-cin-01→[REQ-CIN-1]; scn-cin-02→[REQ-CIN-2,3,4,5,10]; scn-cin-03→[REQ-CIN-6]; scn-cin-04→[REQ-CIN-7,8,9]. Los 9 functional reciben veredicto PASS; los 3 fitness reciben testRefs (§4.7).
- UAT (build.ts:268-277): 4 slugs completos citados → EXECUTABLE (de 10 a 14 executable); UAT-CIN-05 MANUAL_ONLY.
- Audit all tras verify: base 96 proven · 1 waived · 0 blocking @e394caa → **108 proven · 1 waived · 0 blocking**, overall PASS, 0 UNMAPPED.
- El spike live NO se ejecuta en el ciclo: ningún escenario/test construye un provider live (opt-in ausente por allowlist y por default denegado — CIN-014). La fundación queda lista para opt-in + credenciales del operador (SPK-VIDEO-01).

## 9. Riesgos de la exploración → cobertura en este diseño

R1→D6; R2→D2; R3→D8; R4→D11; R5→D4/D5 (nombre H5 computado por el script + guard si falta); R6→§5; R7→DE-8; R8→§4.2 (`fps_base` const 1.0); R9→timeoutMs 600000 en scn-cin-02/03; R10→D10/DE-7.
