# Design — m18-camera-gates

**Base**: `3a87139`. Principio: extraer el modelo geométrico a un módulo puro y consumirlo desde los dos lados (validación y generación). Sin nuevas abstracciones: una tabla de rigs, funciones de posición, un evaluador de gates.

## D1 — Geometría compartida (`cinematic/camera.py`)

- `RIG_LIMITS`: gimbal `{rot≤30°/s, dist≥2.6, speed 0.05–3.5}` (default; el techo incluye la componente vertical de las subidas, por eso 3.5 y no 3.0 — el ejemplo canónico pico a 3.05 m/s), tripod `{rot≤20, dist≥2.0, speed 0–0}` (solo static pasa: todo movimiento falla el techo), steadicam `{rot≤24, dist≥2.4, speed 0.1–2.5}`, dolly `{rot≤12, dist≥3.0, speed 0.1–2.0}`, crane `{rot≤18, dist≥3.0, speed 0.05–2.0}`. Unknown → error tipado.
- `CAMERA_BACK_OFFSET_M = 4.0`, `AIM_HEIGHT_OFFSET_M = 0.9` (centro del proxy humano 1.8 m).
- `subject_center(plan, frame)` — interpolación lineal start→end sobre [1, frame_end] + offset de apuntado en z (sujeto primario `subjects[0]`).
- `camera_position(plan, frame)` — por segmento: `tracking_backward` → detrás del sujeto en −Y (x=sujeto, y=sujeto−offset, z=height); `static` → congelada en la pose del primer frame del segmento; `crane_up` → como tracking con z interpolando heightFrom→heightTo dentro del segmento.
- `evaluate_camera_gates(plan) -> list[Violation]` — **todos los frames**: sujeto delante del plano de cámara y distancia ≥ mínimo del rig. **Dentro de cada segmento**: velocidad de cámara (Δpos×fps) dentro del rango del rig (static exento del mínimo) y velocidad angular de la dirección de vista (ángulo entre direcciones consecutivas ×fps) ≤ techo. Las fronteras entre segmentos no evalúan movimiento continuo: el formato no expresa rampas y un salto de altura es un corte de autor declarado (D4).
- Sin gate de FOV/off-axis: el generador auto-apunta al sujeto con Track To, el encuadre no es una variable libre del modelo (documentado en «qué NO prueba»).

## D2 — Integración

- `shotplan.py`: `validate_shot_plan` añade `camera_violations(plan)` tras las reglas semánticas existentes. Resolución del rig: `plan.get("rig", "gimbal")`.
- `blender_gen.py`: los keyframes de cámara (f0/f1 por segmento) salen de `camera_position`; añade empty `CIN_TARGET` (keyframes de `subject_center` en frame_start/frame_end, LINEAR) y constraint TRACK_TO en la cámara; elimina la rotación fija (el constraint gobierna). Metadata: `objects` = sujetos + `CIN_CAMERA` + `CIN_TARGET`. El script generado sigue siendo función pura del plan (mismos literales → determinismo intacto).
- `specs/shot-plan.schema.json`: propiedad opcional `rig` (enum de 5), descripción estándar.

## D3 — Tests

- `test_camera.py` (cita REQ-CIN-13/14/15): tabla de rigs (unknown=error), interpolación de sujeto, posiciones por segmento (static congelada / tracking sigue / crane interpola), gates verdes con el ejemplo canónico, y discriminación: static + sujeto atravesando la cámara (behind/whip/distancia), sujeto veloz (speed ceiling), rig tripod + tracking (techo 0).
- Fixture `shot-plan-physics-invalid.yaml`: static + caminar completo del sujeto → validate exit 1 nombrando gates.
- Updates: `test_run_artifacts.py` (objects incluye CIN_TARGET), `test_blender_gen.py` (presencia de CIN_TARGET/TRACK_TO; determinismo intacto).

## D4 — Deuda

- Rigs adicionales (robo_arm, fpv_drone…) cuando el vocabulario de movimientos los exprese.
- Rampas de altura entre segmentos: hoy las fronteras son cortes declarados y el movimiento continuo no se evalúa ahí; cuando el formato gane `heightFrom` en tracking (rampa explícita), la exención de frontera desaparece.
- Composición multi-sujeto (gates por sujeto secundario + coreografía) — fases posteriores de M18.
- Aim offset configurable por plan (hoy centro fijo del sujeto primario).
- Techo de gimbal 3.5 m/s (la doctrina original usa 3.0 para carrera plana; aquí debe admitir la subida del ejemplo canónico — revisar si se añaden rampas).
