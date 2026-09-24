# Spec — m15-digital-publishing (M15)

**Cycle**: `p-7c4aff45199a2069/m15-digital-publishing`
**Fuentes**: `docs/19-ROADMAP.md` § M15 (original: "EPUB reflowable; fixed-layout experiment; validation adapters"; exit "artifacts open correctly in agreed reference readers" — historia Git del roadmap); `docs/14-PUBLISHING.md` (targets posteriores: EPUB reflowable/fixed-layout; reglas por target en adapters; los modelos de imagen MUST NOT ser el motor tipográfico).

## Scope

Dos objetivos EPUB 3 sobre fuentes existentes: **reflowable** (prosa desde ChapterManuscript — escenas/beats, diálogo como texto real) y **fixed-layout** (páginas pre-paginadas que incrustan el SVG por capas del comic renderer M13/M14). Validation adapter determinista del contrato de entrada de lectores (OCF: mimetype primero+exacto, container→OPF, metadatos, manifest/spine, nav; FXL: rendition meta + svg properties + viewport). Vista `/publish` con panel de validación y descarga dual. Oracle `epub-entries` en el harness. UAT-M15-01 + SCN-M15-01-001.

**Fuera de scope**: conformance epubcheck/JVM, paquetes Kindle, webtoon, preflight print (M9), DRM.

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-M15-01 | `buildEpubReflowable` MUST producir un OCF ZIP con `mimetype` primera entrada (STORED, contenido exacto `application/epub+zip`), `META-INF/container.xml` → OPF, paquete EPUB 3.0 (unique-identifier, dc:title/language/identifier, dcterms:modified), manifest con nav + capítulos XHTML (uno por escena del manuscrito, prosa y diálogo como texto XML-escaped), spine resuelto y nav `epub:type="toc"`. |
| REQ-M15-02 | `buildEpubFixedLayout` MUST producir un EPUB pre-paginado (`rendition:layout=pre-paginated`), una página XHTML por página del SequentialIrDoc incrustando el SVG por capas del comic renderer (lettering editable, sin raster), items con `properties="svg"` y viewport por página. |
| REQ-M15-03 | `validateEpub(bytes)` MUST comprobar determinísticamente el contrato de entrada de lectores y devolver findings estructurados; `ok` implica cero errores; detecta mimetype mal ubicado, container ausente, spine sin resolver, entrada vacía. |
| REQ-M15-04 | La ruta `/publish` MUST renderizar la vista de publishing proof: descarga dual del mismo capítulo con panel de validación visible (estado ok en DOM; descargas deshabilitadas si la validación falla). |
| REQ-M15-05 | El harness MUST incorporar el oracle `epub-entries` (OCF + contenido buscado por bytes) aplicable a artifacts descargados. |
| REQ-M15-06 | `uat/UAT-M15-01.md` MUST existir y ser ejecutable (`SCN-M15-01-001`). |

## Criterios de aceptación

- **AC-1**: Tests unitarios `epub.spec.ts` (13): builders + validator OK en ambas variantes; corrupciones deterministas detectadas (OCF-002 mimetype fuera de orden, OCF-005 container ausente, SPN-002 spine sin resolver, OCF-001 entrada vacía).
- **AC-2**: `SCN-M15-01-001` PASS: panel de validación OK para ambas variantes con descargas habilitadas; EPUB reflowable con 7 entradas y diálogo buscable; EPUB FXL con 14 entradas, rendition pre-paginated, lettering y viewport en las páginas.
- **AC-3**: `verify` canónico sin regresión (9 scenarios PASS); audit M10.2.1 (gate CI) sin bloqueos.
- **AC-4**: Reorganización sin regresión: zip builder movido a `src/lib/store-zip.ts` (shim en comic-renderer/zip.ts); suites comic/isolation/routes en verde.

## Decisión de diseño

El edge runtime `epub → comic-renderer` (FXL incrusta el SVG del renderer) está declarado en el allowlist del isolation oracle con su motivo (doc 14: los adapters de publishing componen la salida de presentación). El zip builder es genérico y vive en `src/lib/` para evitar edges entre features.
