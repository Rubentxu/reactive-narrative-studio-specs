# Design — m18-prompt-approval

**Base**: `6c77445`. Principio: el prompt es una derivación pura del plan a través del modelo geométrico compartido (los números que el validador gatea son los que el prompt declara); la aprobación es un registro firmable por un humano con las comprobaciones deterministas capturadas por el sistema.

## D1 — Compilador (`cinematic/prompt.py`)

- `compile_prompt(plan: dict) -> str` — función pura; sin relojes, sin aleatoriedad, sin rutas del host. `sort_keys`/orden fijo de secciones.
- Sección 4 (timing): un bloque por segmento de cámara: `t0–t1 s (frames f0–f1): <move en lenguaje de rodaje>, cámara a X.XX m del sujeto, altura Y.YY m` — números de `camera_position`/`subject_center` en el primer frame del segmento (offset real = distancia cámara→centro del sujeto; altura = z de cámara); el sujeto descrito con su acción y desplazamiento start→end. Cierre: `END <duration> s: figures <N> · <subject> <action> · nothing else.`
- Referencias: `characterReferences[i]` → `@Image <n> — appearance of <subject.id> ONLY. Not its motion, not its framing, not the environment.`; `styleReferences[j]` → `@Image <n> — style and grade ONLY. Not the subject, not the timing.`; sin referencias → línea explícita «No reference images are attached; the previz video defines everything structural.» Proxy: `<representation> proxy IS <subject.id>` con el recorrido start→end.
- Vídeo-lock verbatim de la doctrina. Reglas: exactamente los sujetos del plan, sin duplicados, lo no presente en el previz fuera de cuadro. Actuación: acción del sujeto + «steady, continuous business; no freezing». Audio: cama ambiental, sin diálogo ni música (el plan no los especifica). Hold final.
- Formato: números a 2 decimales (`%.2f`), timestamps a 1 decimal; texto ASCII+° seguro; `\n` final.

## D2 — CLI

- `prompt --shot-plan P [--json]`: valida primero (plan inválido → violaciones tipadas a stderr, exit 1); sin `--json` imprime el prompt (stdout); con `--json` emite `{"prompt": ..., "shotId": ...}` (sort_keys). Exit 0.
- `approve --shot-plan P --out FILE --decision {approved,rejected} --rationale TEXT --decided-by NAME [--decided-at RFC3339]`: valida el plan (inválido → stderr + exit 1, sin fichero); args explícitos obligatorios (click required); sha256 del fichero del plan; deterministicChecks = {schemaValid: true, gatesPassed: true} (si llega aquí, ambos pasaron); `decidedAt` = `--decided-at` o UTC actual (`datetime.now(timezone.utc).isoformat()`); escribe JSON `sort_keys, indent=2` validado contra `specs/shot-approval.schema.json`; exit 0. `--out` existente no vacío → exit 2 (conflicto, patrón del paquete).

## D3 — Schema de aprobación (`specs/shot-approval.schema.json`)

Cerrado, draft 2020-12: `version` const 1; `shotPlan` {path string, sha256 64hex}; `decision` enum [approved, rejected]; `rationale`/`decidedBy` minLength 1; `decidedAt` string date-time; `deterministicChecks` {schemaValid bool, gatesPassed bool} con ambos const true (el comando no escribe registros que no hayan pasado). Sin timestamps volátiles más allá de `decidedAt` (es el dato del registro, no metadato).

## D4 — Tests

- `test_prompt.py` (REQ-CIN-18): determinismo sha256; 8 secciones en orden; vídeo-lock verbatim; números de la sección 4 coherentes con `camera_position` (p. ej. «4.00 m», «0.45 m» para el ejemplo); referencias `@Image 1/2` con deslinde; CLI exit 0/1 (subprocess).
- `test_approval.py` (REQ-CIN-19): registro válido contra schema con sha real; sin rationale/decided-by → click usage error → exit 1 y sin fichero; plan inválido → exit 1 sin fichero; `--decided-at` reproducible; rejected también válido; conflicto `--out` → exit 2.

## D5 — Deuda

- Capa machine-assisted de QA (CIN-017 completa) — cuando haya comprobaciones con riesgo identificado (p. ej. detección de fotogramas negros en el mp4).
- SequencePlan (CIN-028) — diseño propio de continuidad; el compilador de prompt multi-plano depende de él.
- Superficie web del prompt (copiar al portapapeles) — cuando el flujo live exista.
