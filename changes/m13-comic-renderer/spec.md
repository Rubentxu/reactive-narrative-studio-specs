# Spec — m13-comic-renderer (M13)

**Cycle**: `p-7c4aff45199a2069/m13-comic-renderer`
**Fuentes**: `docs/19-ROADMAP.md` § M13 (definición original en historia Git: panel templates, layered image composition, lettering layer, balloons/captions, CBZ proof; exit: "produce comic proof with editable text not baked by the image model"); `docs/11-SEQUENTIAL-ART-IR.md`; `specs/sequential-ir.schema.json` (entrada, M12).

## Scope

Renderer de cómic sobre SequentialArtIR: plantillas de panel, composición por capas (arte-placeholder + lettering), balones/captions template-based, export **CBZ** con páginas vectoriales + `ComicInfo.xml`. Autoría de `uat/UAT-M13-01.md` y scenario ejecutable.

**Fuera de scope**: generación de imágenes reales (Visual IR pipeline / M4), colocación optimizada de balones (doc 11: template primero), render PDF/impresión, perfil manga (M14 — pero el renderer ya recibe `PresentationProfile`).

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-CR-1 | El renderer MUST calcular rects de panel deterministas desde el layout grid de cada página (filas×columnas, márgenes y gutters del perfil), sin solapes entre panels. |
| REQ-CR-2 | El render de página MUST ser un SVG con **capas explícitas**: `art-layer` (slots placeholder etiquetados con shotRef, sin texto) y `lettering-layer` (balones/captions como `<text>` editable, sin contenido gráfico). |
| REQ-CR-3 | Balones y captions MUST colocarse con plantilla determinista (sin solaparse entre sí dentro del panel), y TODO el diálogo MUST existir como nodos de texto (nunca rasterizado ni dentro de imágenes). |
| REQ-CR-4 | El export CBZ MUST contener una página SVG por página del IR + `ComicInfo.xml` (serie, título, count), generado sin dependencias nuevas (ZIP store-mode) y sin fetch. |
| REQ-CR-5 | La página `/comic` MUST mostrar la previsualización por capas con toggles de capa (art/lettering) que prueben la separación, y MUST exponer la descarga del proof. |
| REQ-CR-6 | `uat/UAT-M13-01.md` MUST existir y ser ejecutable (`SCN-M13-01-001`): previsualización por capas + CBZ descargado con páginas SVG verificables (texto de diálogo presente por bytes) y `ComicInfo.xml`. |

## Criterios de aceptación

- **AC-1**: Tests unitarios: rects sin solape y dentro de página; SVG con ambas capas; texto de diálogo presente; balones sin colisión mutua; determinismo (dos renders → mismo string).
- **AC-2**: CBZ generado para el documento de 10 páginas: 10 SVGs + ComicInfo.xml; un parser ZIP mínimo del harness lee las entradas y encuentra los textos de diálogo en los bytes de las páginas (store-mode).
- **AC-3**: `SCN-M13-01-001` PASS: previsualización con capas separadas (probe: art-layer sin texto, lettering-layer con los diálogos), toggle de capa funcional, CBZ descargado y verificado.
- **AC-4**: Quality gates verdes; `verify` sin regresión (6 scenarios previos PASS).
