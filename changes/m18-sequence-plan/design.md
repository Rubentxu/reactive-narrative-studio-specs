# Design — m18-sequence-plan

**Base**: `f587f21`. Principio: la secuencia es una lista ordenada de ShotPlans ya validados; el compilador de secuencia reutiliza la maquinaria del prompt de plano único con un desplazamiento temporal acumulado. Sin reglas de eje inventadas (CIN-028 pide EXPRESAR, no normativizar).

## D1 — Contrato (`specs/sequence-plan.schema.json`)

Cerrado, draft 2020-12, required [id, characters, shots]:
- `id`: string `^[A-Za-z0-9._-]+$`; `locationRef`: string opcional (continuidad de localización).
- `characters`: array de strings minLength 1 — los personajes que viven en la secuencia.
- `shots`: array minItems 1; items cerrados required [id, shotPlan, screenDirection, characters]: `id` string, `shotPlan` string (ruta relativa al fichero de secuencia), `screenDirection` enum [neutral, left_to_right, right_to_left], `characters` array de strings.

## D2 — Carga y validación (`cinematic/sequence.py`)

- `load_sequence(path) -> dict` (yaml.safe_load; errores tipados).
- `validate_sequence(sequence, base_dir) -> list[Violation]` (reusa `Violation` de shotplan):
  - Cada `shotPlan` se resuelve contra `base_dir` (directorio del fichero de secuencia) y se valida COMPLETO con `validate_shot_plan_file` (contrato + gates físicos) — una secuencia no puede apoyarse en planos imposibles.
  - Continuidad de identidad: los `subjects[].id` de cada plano ⊆ `characters` de la secuencia; los `characters` del plano ⊆ los de la secuencia.
  - Violaciones con `$.shots[i]...` y mensaje que nombra el plano y el fallo.

## D3 — Prompt de secuencia (`compile_sequence_prompt` en prompt.py)

- Refactor interno: `_reference_lines(plan, next_image)`, `_action_timing(plan, fps, offset)` extraídos de `compile_prompt` — el prompt de plano único NO cambia (aserciones existentes de verde + determinismo).
- `compile_sequence_prompt(sequence, base_dir)`: valida primero; timeline acumulativa (duración de cada plano = `durationSeconds`); referencias `@Image N` numeradas por orden de primera aparición recorriendo los planos (personaje → aparición, estilo → aparición); sección 1 con línea de continuidad por personaje («same appearance and wardrobe across every shot»); sección 4: bloque por plano `SHOT <n> · <id> (<t0>–<t1> s) — <shotPlan>` + sus líneas de segmento con timestamps desplazados + `CUT` entre planos; END con total real y nº de personajes; secciones 5/6/8 adaptadas al plural (personajes, cortes duros declarados, un único vídeo continuo — nunca un reel editado). Determinismo idéntico al de plano único.

## D4 — CLI

`sequence-prompt --sequence S [--json]` — mismo patrón que `prompt`: valida (violaciones tipadas → stderr, exit 1), imprime el texto (o envelope `{"sequenceId", "prompt"}`), exit 0.

## D5 — Fixtures y tests

- `fixtures/shot-plan-first.yaml` (plano de barrido canónico recortado, 6 s) y `fixtures/shot-plan-second.yaml` (2 s, cámara fija, sujeto alejándose — pasa gates: dirección positiva y distancia creciente), `fixtures/sequence-two-shots.yaml` (2 planos, maya en ambos, direcciones neutral/left_to_right).
- `test_sequence.py` (REQ-CIN-20): AC-1 determinismo + 0 violaciones; AC-2 continuidad rota (sujeto no declarado; plano inválido; campo desconocido); AC-3 cortes y timestamps acumulativos (el plano 2 empieza exactamente donde acaba el 1); AC-4 CLI exit 0/1; prompt de plano único invariado (sha de las líneas de timing).

## D6 — Deuda

- Reglas de eje opcionales (alerta si dos planos contiguos en la misma localización invierten dirección — hoy expresión pura).
- Consumo desde la web y desde el adaptador live (el prompt de secuencia alimenta el spike multi-plano del operador).
