# Specification — audit-response (integridad de trazabilidad y flujos de proyecto)

**Ciclo**: `audit-response` · **Rama**: `feat/audit-response` · **Base**: `a0988bc` (main tras v0.31.0)
**Origen**: auditoría técnica externa (2026-10-27, referida a `bd78ddd`) — los 5 hallazgos accionables fueron VERIFICADOS en código antes de aceptar ninguno; este ciclo ejecuta las correcciones B1, B2 y B4 del plan de la auditoría más la carrera de carga (B3 parcial). Sin requisitos nuevos: son correcciones de integridad sobre requisitos existentes (audit se mantiene en 116/0/0 con la MISMA cobertura, ahora semánticamente correcta).

## Triage de la auditoría (verificado, no asumido)

| Hallazgo | Veredicto | Acción |
|---|---|---|
| Crítico — sink `getFileHandle(path)` con `/` | **REAL** (`FileSystemAccessSink.ts`: la API exige nombre, no ruta) | B2 |
| Crítico — colisión `REQ-CR-*` (recipes vs cómic) | **REAL y confirmada en el registro**: `REQ-CR-1` (M10.1, layout de recetas) lleva como única evidencia `comic-renderer.spec.ts`; los levels 1..6 describen features del cómic; la regla de área `CR→M10.1` fundió ambos dominios | B1 |
| Alta — carga de directorios solo raíz + re-prompt | **REAL** (`DirectoryProjectSource` itera `values()` sin recursión; discover y load piden el picker dos veces) | B2 |
| Alta — carrera en `projectionStore.loadFrom` | **REAL** (sin token: la respuesta lenta de la primera carga sustituye a la segunda) | B3 parcial |
| Alta — marcador de éxito acepta metadatos previos | **REAL como hardening**: sin verificación de hashes en el driver ni exigencia de frescura | B4 |
| Media — lógica de recetas duplicada | Parcialmente stale: la equivalencia cross-runtime YA existe (`SCN-M10-04-001`, defaults aplicados en ambos runtimes); el corpus compartido es el oracle. Sin acción | defendido |
| Media — semántica "behind" de cámara con TRACK_TO | **Diseño deliberado documentado**: el gate es una señal conservadora de autoría (un sujeto que atraviesa una cámara fija es un bloqueo); el whip-pan sí mide la rotación real del Track To. Añadido a deuda | defendido |
| Media — verificación sobredimensionada | **Stale con datos**: CI dura 4-5 min (presupuesto 15); los bundles retenidos son evidencia de certificación de release con gate propio. Sin acción | defendido |

Nota: el informe referencia `bd78ddd` (v0.27.0, 111 reqs); el estado actual es v0.31.0 con 116. La regeneración al cierre deja los artefactos de audit referenciando el SHA vigente.

---

### Corrección B1 — colisión REQ-CR-*: el cómic recobra su identidad (REQ-M13-1..6)

Los requisitos REQ-CR-1..6 definidos en `changes/m13-comic-renderer/spec.md` (renderer de cómic: panel rects, SVG por capas, plantillas de diálogo, CBZ, vista /comic, UAT ejecutable) fueron cosechados bajo M10.1 por la regla de área `CR`, colisionando con los REQ-CR-7..12 de Creation Recipes. El cómic renombra sus ids a **REQ-M13-1..6** (la regla de área `M13` ya existe; M13 no tenía requisitos). Cambian: la tabla de definición del spec m13, `scn-m13-01-001.yaml`, `comic-renderer.spec.ts`, y las 6 entradas de `requirement-levels.json` (los rationales YA describían el cómic — otra prueba de la colisión). El harvest deja de producir REQ-CR-1..6 (quedan solo los 7..12 legítimos de recipes). La evidencia del cómic (veredicto SCN-M13-01-001 + testRefs) pasa al hito M13; M10.1 conserva exactamente sus 6 requisitos de recipes con su evidencia real.

### Corrección B2 — flujos de proyecto reales (crear con subdirectorios, cargar recursivo, titular honesto)

- `FileSystemAccessSink`: escritura recursiva — la ruta de cada entrada se resuelve creando directorios padre con `getDirectoryHandle(..., {create:true})` antes del `getFileHandle` final; una entrada sin subdirectorio funciona igual.
- `DirectoryProjectSource`: enumeración **recursiva** (walk de handles de directorio recolectando File en profundidad) para discover y load, y el handle elegido se **cachea** en la instancia para reutilizarlo entre discover y load sin segundo picker (un picker cancelado lo invalida).
- `CreateWizard`: el resultado distingue el ADT — escritura real (`Project created`) frente a solo-plan (`create-plan.json downloaded`), con titular y descripción por caso; el fallback por excepción del sink ya no anuncia creación.

### Corrección B4 — marcador de éxito de Blender: frescura y hashes

`cinematic/drive.py`: (a) antes del spawn se eliminan `scene-metadata.json` y `provenance.json` previos del workspace — la metadata válida al final SOLO puede ser la de esta ejecución; (b) el marcador de éxito verifica el sha256 de cada output declarado contra su fichero (antes: solo existencia). Los tests de artifacts ya re-hasheaban aparte; ahora el driver lo exige.

### Corrección B3 parcial — carrera de carga

`projectionStore.loadFrom` usa un contador de solicitud: solo la ÚLTIMA invocación puede escribir estado (una respuesta anterior que resuelve tarde se descarta).

---

## Criterios de cierre

1. Audit all: **116 proven · 0 waived · 0 blocking** — con REQ-M13-1..6 bajo M13 y REQ-CR-7..12 bajo M10.1; cero testRefs de cómic en requisitos de recetas (verificable en registry.json).
2. verify 16/16 PASS; baterías: pytest cinematic 81/81, control-plane vitest 355+ verdes.
3. Tests nuevos: sink recursivo (handles falsos anidados), source recursivo, carrera de carga, drive.py stale/tamper.
4. Sin cambios de comportamiento en los prompts CLI ni en el generador (el refactor de drive.py mantiene los artifacts esperados).
