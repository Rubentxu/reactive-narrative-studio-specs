# Specification — m18-prompt-approval (compilador de prompt desde el ShotPlan + registro de aprobación explícita)

**Ciclo**: `m18-prompt-approval` · **Rama**: `feat/m18-prompt-approval` · **Base**: `6c77445` (main tras v0.28.0)
**Fuentes**: overlay CIN-016/017/018/030; doctrina del prompt de 8 secciones (`docs/seedance-blocking/references/SEEDANCE_PROMPT.md` — anatomía, deslinde de referencias, vídeo-lock, minería de números duros del spec, contabilidad de estado, reglas de contención); `cinematic/camera.py` (el modelo geométrico ES la fuente de los números); motor v0.26.0–v0.28.0.
**Niveles**: REQ-CIN-18 y REQ-CIN-19 `fitness` — derivaciones deterministas y comportamiento de componente, verificables por testRefs (política de reducción de e2e; no añaden escenarios canónicos). Sin credenciales, sin red, sin Blender nuevo.

## Alcance

**In scope**: (1) `cinematic/prompt.py` — compilador determinista ShotPlan→prompt de 8 secciones (números duros minados del modelo geométrico compartido; deslinde de referencias; vídeo-lock; contabilidad de estado por segmento; reglas de contención) + comando CLI `prompt` (texto a stdout; `--json` con envelope); (2) `specs/shot-approval.schema.json` + `cinematic/approval.py` — registro de aprobación explícita por toma (decisión, rationale, decidido por, instantes, y las comprobaciones deterministas capturadas automáticamente) + comando CLI `approve` que EXIGE plan válido antes de registrar (promoción a registro aprobado solo para tomas válidas); (3) suite pytest nueva citando los REQ; (4) niveles y regeneración de trazabilidad/audit.

**Fuera de scope**: adaptador live del proveedor (credenciales del operador); SequencePlan/continuidad multi-plano (CIN-028 — exige diseño propio de semántica de continuidad, no es un fleco); capa machine-assisted de QA (sin inventar comprobaciones sin riesgo identificado — el registro declara las deterministas y deja la máquina pendiente); consumo del prompt desde la web (el CLI es la herramienta del operador; la web lo muestra cuando el flujo live exista).

---

### REQ-CIN-18 — Compilador de prompt timecoded desde el ShotPlan (área CIN; origen CIN-016)

**Nivel**: `fitness` — derivación determinista de texto verificable por componente: mismo plan → mismo prompt byte-idéntico; las secciones y locks presentes; los números de cámara coherentes con el modelo geométrico.

**Afirmación**: El paquete `cinematic` SHALL compilar, a partir de un ShotPlan validado y SIN ninguna otra fuente, un prompt de vídeo con la anatomía de 8 secciones: (1) definiciones de referencias con deslinde — `@Video` como única autoridad de cámara/cortes/timing, cada referencia de personaje/estilo del plan como `@Image N` con su deslinde, y la decodificación del proxy (la primitiva bloqueada ES el sujeto); (2) bloque técnico (duración, fps, lente, sin look CGI, sin texto legible); (3) vídeo-lock; (4) timing de acción por segmento de cámara con números duros del modelo compartido (posición/altura de cámara, distancia al sujeto) y contabilidad de estado final; (5) reglas numeradas de contención (un sujeto, sin duplicados, lo no bloqueado queda fuera de cuadro); (6) tareas de actuación mínimas con negocio continuo; (7) audio (cama ambiental, sin diálogo — el plan no lo especifica); (8) cláusula de mantenimiento de los locks. La salida SHALL ser determinista byte-idéntico para el mismo plan. El comando `prompt` la imprime en stdout (el pegado al proveedor es su destino; `--json` envuelve {shotId, prompt}).

**Criterios de aceptación**:
- **AC-1**: pytest: compilar dos veces el ejemplo canónico produce bytes idénticos (sha256).
- **AC-2**: pytest: las 8 secciones presentes en orden; el vídeo-lock verbatim; cada segmento de cámara aparece con sus frames→timestamps y al menos un número geométrico (offset/altura) coherente con `camera_position`/`subject_center`; contabilidad de estado al cierre de la sección 4.
- **AC-3**: pytest: las referencias del plan aparecen como `@Image N` con deslinde; sin referencias, la sección lo declara.
- **AC-4**: CLI: exit 0 y texto en stdout; plan inválido → exit 1 con violaciones tipadas.

**Qué NO prueba**: calidad del vídeo generado (el prompt alimenta el spike live del operador); la capa de estilo (el plan no la lleva); prompts multi-plano (CIN-028).

### REQ-CIN-19 — Registro de aprobación explícita por toma (área CIN; origen CIN-018, CIN-030; capa determinista de CIN-017)

**Nivel**: `fitness` — comportamiento de componente: el registro exige decisión+rationale+autor explícitos, captura las comprobaciones deterministas automáticamente y rechaza planes inválidos sin registrar nada.

**Afirmación**: El repositorio SHALL definir `specs/shot-approval.schema.json` (cerrado, draft 2020-12): `shotPlan` {path, sha256}, `decision` ∈ {approved, rejected}, `rationale` (minLength 1), `decidedBy` (minLength 1), `decidedAt` (RFC 3339), y `deterministicChecks` {schemaValid, gatesPassed} — capturados por el sistema, no declarados por el humano. El comando `approve` SHALL: validar el plan primero (un plan inválido NO produce registro y sale con exit 1 — solo una toma validada puede promocionarse a registro), exigir `--decision`, `--rationale` y `--decided-by` explícitos, computar el sha256 del plan, capturar las comprobaciones deterministas, y escribir el registro en `--out` (JSON validado contra su schema). `--decided-at` opcional para reproducibilidad; por defecto el instante UTC actual. Exit 0 al registrar.

**Criterios de aceptación**:
- **AC-1**: pytest: aprobar el ejemplo canónico escribe un registro que valida contra su schema, con sha256 real del plan y deterministicChecks veraces.
- **AC-2**: pytest: sin `--rationale` o sin `--decided-by` → error tipado exit ≠ 0 y NINGÚN fichero escrito (la aprobación es explícita o no existe).
- **AC-3**: pytest: plan físicamente inválido → exit 1, sin registro, con las violaciones en stderr (solo tomas validadas se promocionan).
- **AC-4**: pytest: `--decided-at` fija el instante (reproducible); decision `rejected` también produce registro válido.

**Qué NO prueba**: flujo humano de revisión en la web; capas machine-assisted de QA; relación del registro con proyectos del control-plane (la integración llega con M18.5 completo).

---

## Aritmética esperada del audit

+2 requisitos fitness bajo M18 con testRefs (`tools/cinematic/tests/test_prompt.py`, `test_approval.py`) → **proven 115 · waived 0 · blocking 0**; escenarios canónicos sin cambios (16). Tras el ciclo: CIN-016 ✅, CIN-018 ✅ (registro explícito), CIN-030 ✅ (promoción = registro), CIN-017 🔶 (determinista capturada en el registro; machine-assisted pendiente), CIN-028 ❌ (fuera, con rationale).

## Criterios de cierre

1. Batería cinematic completa verde (con Blender — los tests nuevos no lo necesitan).
2. `pnpm verify` 16/16 PASS (sin cambios de escenario; el generador no cambia).
3. `audit all`: 115/0/0, 0 UNMAPPED.
4. Sin credenciales, sin red, sin Blender nuevo; salida del compilador determinista.
