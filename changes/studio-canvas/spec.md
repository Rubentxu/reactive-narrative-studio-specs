# Specification — studio-canvas (sistema visual "screening room editorial")

**Ciclo**: `studio-canvas` · **Rama**: `feat/studio-canvas` · **Base**: `a9c84a7` (main tras v0.30.0)
**Naturaleza**: mejora de presentación solicitada por el operador («mejorar los estilos de la web»). Sin requisitos nuevos (no añade capacidades al inventario — audit se mantiene en 116/0/0), sin escenarios nuevos (la guardia es la batería canónica existente, que ya conduce la app real en navegador).

## Dirección de diseño (comprometida)

**"Sala de proyección editorial"** — superficie cinematográfica oscura y cálida con disciplina de imprenta editorial:
- **Base**: carbón cálido (`#16130f`) con atmósfera por gradientes radiales y grano de película sutil (SVG feTurbulence a 5 %), nunca negro azulado.
- **Texto**: marfil papel; acento único **ámbar tungsteno** (luz de proyector) — un acento, no una paleta.
- **Tipografía** auto-alojada (offline, determinista): **Fraunces Variable** (display serif editorial) + **Archivo** (UI) + **IBM Plex Mono** (timecodes, hashes, metadatos de máquina).
- **Detalles**: hairlines editoriales en lugar de sombras pesadas, aparición de página orquestada en CSS puro (respeta `prefers-reduced-motion`), scrollbar como parte de la máquina, estados vacíos punteados, tarjetas con regla lateral ámbar.
- **Anti-genérico**: sin Inter/Roboto/sistema, sin púrpura-sobre-blanco; el look nace del contexto (estudio de producción narrativa + previz cinematográfico).

## Alcance

**In scope**: sistema de estilos completo en `src/styles.css` (variables, elementos globales, clases semánticas existentes — sin reescribir el markup de las vistas salvo dos toques: modificador de estado listo en Cinematic); fuentes auto-alojadas vía @fontsource (deps añadidas); botones de la barra superior en estilo fantasma (el ámbar se reserva para acciones primarias de página).
**Fuera de scope**: reestructuración de navegación (sidebar/rail — cambio de markup grande), modo claro, biblioteca de iconos, vistas de proyecto cargado (requieren datos reales para diseñar bien).

## Lección de contrato capturada (defecto clase nueva)

El primer intento rompió `SCN-M10-02-001`: `text-transform: uppercase` global en `h2` cambia el **innerText** que los oráculos DOM comparan case-sensitivamente (el texto visible "NO IMAGE PROVIDERS CONFIGURED" ≠ esperado). Regla: **el texto transformado por CSS deja de ser el texto que el contrato ve** — el tracking/caps vive solo en clases propias del chrome (labels del shell), nunca en h2 semánticos con contenido contractual. La guardia canónica (verify 16/16) lo detectó en el primer pase — exactamente su función.

## Criterios de cierre

1. tsc + vitest 355/355 + build limpios.
2. `pnpm verify` 16/16 PASS (tras el fix del h2).
3. Verificación visual por screenshots (before/after) en 5 vistas.
