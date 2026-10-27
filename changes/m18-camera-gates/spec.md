# Specification — m18-camera-gates (física de cámara compartida: rigs, límites y encuadre honesto)

**Ciclo**: `m18-camera-gates` · **Rama**: `feat/m18-camera-gates` · **Base**: `3a87139` (main tras v0.26.0)
**Fuentes**: doctrina de previz determinista adoptada por el operador (skill seedance-blocking: solver offline con gates duros antes de tocar Blender — «cada error caro de previz es visible en aritmética»); `changes/m18-spike-prep/{spec,design}.md` (fundación v0.26.0); investigación de plataforma Higgsfield (método validado: Blender fija el movimiento, el proveedor viste el mundo).
**Niveles** (convención del repo): los tres requisitos son `fitness` — invariantes deterministas verificables por tests de componente (testRefs); no añaden escenarios canónicos (política de reducción de e2e).

## Alcance

**In scope**: (1) módulo core `cinematic/camera.py` con el modelo geométrico compartido (posición de sujeto y cámara por frame, rigs con tabla de límites) y la evaluación de gates; (2) integración de los gates en la validación semántica del ShotPlan (violaciones tipadas); (3) el generador consume el MISMO modelo (los keyframes de cámara salen de `camera.py`) y añade un target de seguimiento (`CIN_TARGET`, empty con Track To) para que el sujeto primario quede encuadrado; (4) campo opcional `rig` en `specs/shot-plan.schema.json` (default `gimbal`); (5) suite pytest nueva + fixtures; (6) regeneración de trazabilidad/audit.

**Fuera de scope**: adaptador HiggsfieldProvider (requiere credenciales del operador — propuesta aparte); compilador de prompt (CIN-016, fase posterior); ampliación del vocabulario de movimientos más allá de static/tracking_backward/crane_up; multi-sujeto con coreografía (los gates evalúan el sujeto primario `subjects[0]`); oráculos de píxeles.

---

### REQ-CIN-13 — Gates de física de cámara en la validación (área CIN; origen: disciplina de previz determinista)

**Nivel**: `fitness` — verificación por tests de componente: cada gate discrimina (plan canónico pasa; contraplano saboteado falla con violación tipada que nombra gate y frame).

**Afirmación**: La validación semántica del ShotPlan SHALL evaluar el movimiento implicado contra el sobre físico del rig, con el modelo geométrico compartido: **(a) sujeto delante de cámara** en todos los frames (una cámara fija cuyo sujeto la atraviesa pierde la toma); **(b) distancia mínima** al sujeto en todos los frames ≥ límite del rig (la velocidad angular crece con 1/d: un paso cercano gira la cámara); **(c) velocidad de cámara** dentro del rango [mín, máx] del rig, evaluada DENTRO de cada segmento (un segmento `static` está exento del mínimo: un trípode parado es legal); **(d) velocidad angular** de la dirección de vista ≤ límite del rig (whip pan), también dentro de cada segmento. Las fronteras entre segmentos son transiciones de autor (el formato no expresa rampas): un salto de altura entre segmentos es un corte declarado, no un movimiento del rig, y los límites de movimiento continuo no se evalúan en ese salto — sí la visibilidad y la distancia, que se comprueban en todos los frames. Cada incumplimiento produce `Violation{path, message}` con gate, frame y límite; la CLI `validate` los reporta con exit ≠ 0 igual que el resto de violaciones semánticas.

**Qué NO prueba**: fidelidad visual del render (los gates son geometría, no píxeles); encuadre más allá del seguimiento del sujeto primario (el generador auto-apunta con Track To, así que el off-axis no es una variable libre); suitabilidad artística (un plano que pasa los gates puede ser aburrido); límites a nivel OS o de engine.

### REQ-CIN-14 — Rigs como fuente de límites (área CIN)

**Nivel**: `fitness`.

**Afirmación**: El ShotPlan MAY declarar `rig` (enum cerrado; default `gimbal`). Cada rig fija `max_rotation_deg_per_s`, `min_subject_distance_m`, `max_speed_m_per_s`, `min_speed_m_per_s`. Un rig desconocido es error tipado (nunca fallback silencioso). La tabla vive en `camera.py` como única fuente; los gates del REQ-CIN-13 consultan el rig del plan.

**Qué NO prueba**: los 11 rigs completos de la doctrina original (este ciclo declara los que el vocabulario actual sabe expresar: gimbal, tripod, steadicam, dolly, crane); movimiento de lente (zoom/dolly-zoom).

### REQ-CIN-15 — Modelo de cámara compartido validador↔generador (área CIN)

**Nivel**: `fitness` — invariante estructural: validación y generación no pueden divergir.

**Afirmación**: Las posiciones de cámara por frame SHALL computarse en un único módulo (`camera.py`) consumido por (a) los gates y (b) el generador del script bpy (keyframes literales producidos por el mismo cálculo). El generador además SHALL colocar un empty `CIN_TARGET` en el centro del sujeto primario (keyframes inicio/fin, interpolación LINEAR) y un constraint TRACK_TO en la cámara (track −Z, up Y), de modo que el sujeto quede encuadrado durante toda la toma; la metadata declara el target en `objects`. El determinismo byte del script generado se conserva.

**Qué NO prueba**: calidad del encuadre resultante más allá del seguimiento del sujeto primario; composición con múltiples sujetos.

---

## Aritmética esperada del audit

+3 requisitos fitness con testRefs (`tools/cinematic/tests/test_camera.py` cita REQ-CIN-13/14/15) → **proven 111 · waived 0 · blocking 0**; UAT y escenarios sin cambios (15 canónicos se re-ejecutan: el ejemplo canónico pasa los gates con el tracking corregido — verifícalo con los tests antes del verify).

## Criterios de cierre

1. Batería cinematic completa verde (con Blender).
2. `pnpm verify` 15/15 PASS (los escenarios existentes no cambian de forma; SCN-CIN-02/03 re-ejecutan el generador nuevo).
3. `audit all`: 111/0/0, 0 UNMAPPED.
4. Sin live provider, sin credenciales, sin nuevos escenarios canónicos.
