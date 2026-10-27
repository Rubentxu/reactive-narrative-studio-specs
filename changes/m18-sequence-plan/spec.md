# Specification — m18-sequence-plan (continuidad multi-plano: SequencePlan y prompt de secuencia)

**Ciclo**: `m18-sequence-plan` · **Rama**: `feat/m18-sequence-plan` · **Base**: `f587f21` (main tras v0.29.0)
**Fuentes**: overlay CIN-028 («SequencePlan SHOULD expresar screen direction, character/location continuity y temporal ordering»); doctrina multi-shot (Seedance 2.5 toma ~5 planos de 2–3 s en una pasada; los cortes se declaran en el prompt; SIEMPRE un único vídeo continuo, nunca un reel editado); `cinematic/prompt.py` (compilador de plano único v0.29.0); `cinematic/camera.py`.
**Niveles**: REQ-CIN-20 `fitness` — expresión y validación deterministas de continuidad, verificables por testRefs (sin escenarios nuevos; política de reducción de e2e). Sin credenciales, sin red, sin Blender.

## Alcance

**In scope**: (1) `specs/sequence-plan.schema.json` — contrato cerrado que EXPRESA los tres conceptos de CIN-028: `screenDirection` por plano (neutral/left_to_right/right_to_left), continuidad de personaje (personajes declarados a nivel secuencia, citados por plano) y de localización (`locationRef`), y orden temporal (el orden de la lista ES el orden temporal; la duración de cada plano procede de su ShotPlan); (2) `cinematic/sequence.py` — carga y validación: schema + reglas semánticas (cada plano referenciado existe y valida COMPLETO — schema y gates físicos; los sujetos de cada plano ⊆ personajes de la secuencia — continuidad de identidad); (3) `compile_sequence_prompt` — el prompt de 8 secciones aplicado a la secuencia: referencias numeradas en orden de primera aparición, sección de timing con bloque por plano y CORTES declarados entre planos, timestamps acumulativos sobre la duración real de cada ShotPlan, contabilidad final; (4) CLI `sequence-prompt`; (5) fixtures de secuencia + suite pytest citando el REQ; (6) niveles y regeneración.

**Fuera de scope**: reglas de eje 180° (la dirección de pantalla se EXPRESA, no se normativiza — invertirla es una decisión de autor, no un error); capa machine-assisted de QA (CIN-017 plena — exigiría ffmpeg sin riesgo identificado que lo justifique); adaptador live (credenciales del operador); consumo desde la web.

---

### REQ-CIN-20 — SequencePlan: expresión y validación de continuidad multi-plano (área CIN; origen CIN-028)

**Nivel**: `fitness` — expresión de formato y reglas deterministas de consistencia, verificables por componente: mismo conjunto → mismo prompt byte-idéntico; violaciones tipadas para continuidad rota.

**Afirmación**: El repositorio SHALL disponer de `specs/sequence-plan.schema.json` (cerrado, draft 2020-12): `id`, `locationRef` (opcional), `characters` (lista no vacía — los personajes que viven en la secuencia) y `shots` (lista no vacía y ORDENADA temporalmente) donde cada plano declara `id`, `shotPlan` (ruta a su ShotPlan, relativa al fichero de secuencia), `screenDirection` ∈ {neutral, left_to_right, right_to_left} y `characters` (subconjunto de los de la secuencia). El validador SHALL: cargar y validar CADA plano referenciado (contrato completo, incluidos los gates físicos), exigir que los sujetos de cada plano estén declarados como personajes de la secuencia (continuidad de identidad — un personaje no puede aparecer sin estar declarado), y producir violaciones tipadas con path y mensaje. `compile_sequence_prompt` SHALL compilar el prompt de 8 secciones de la secuencia: referencias `@Image N` numeradas por orden de primera aparición entre planos, sección de timing con un bloque por plano (timestamps acumulativos sobre las duraciones reales), «CUT» declarado entre planos (cortes duros — nunca un reel editado: un único vídeo continuo), y contabilidad final con el total. La salida SHALL ser determinista byte-idéntico. El comando `sequence-prompt` la imprime (exit 1 con violaciones si la secuencia o algún plano no validan).

**Criterios de aceptación**:
- **AC-1**: pytest: la secuencia de ejemplo (2 planos) valida sin violaciones y compila dos veces a bytes idénticos (sha256).
- **AC-2**: pytest: continuidad rota — un plano cuyo sujeto no está en `characters` → violación tipada; un plano referenciado inválido → violación que nombra el fallo; schema cerrado rechaza campos desconocidos.
- **AC-3**: pytest: el prompt de secuencia contiene los CORTES entre planos, timestamps acumulativos coherentes con las duraciones de los ShotPlans (p. ej. el plano 2 empieza donde termina el 1), y el total real.
- **AC-4**: CLI: exit 0 con texto; secuencia inválida → exit 1 con violaciones.

**Qué NO prueba**: calidad del vídeo multi-plano generado (alimentará el spike live); reglas de eje (expresión, no normativización); la capa machine de QA (declinada — sin riesgo identificado que justifique la dependencia ffmpeg).

---

## Aritmética esperada del audit

+1 requisito fitness bajo M18 con testRefs (`tools/cinematic/tests/test_sequence.py`) → **proven 116 · waived 0 · blocking 0**; escenarios canónicos sin cambios (16). Tras el ciclo: **CIN-028 ✅** — M18 queda SIN flecos diseñables: lo restante (adaptador live, spike live, capa machine de QA si aparece riesgo) es bloqueo del operador o depende de nuevo riesgo identificado.

## Criterios de cierre

1. Batería cinematic completa verde (72+ tests).
2. `pnpm verify` 16/16 PASS; `audit all`: 116/0/0.
3. El prompt de plano único NO cambia (refactor interno con las aserciones existentes de verde).
