# Design — m15-digital-publishing (M15)

**Cycle**: `p-7c4aff45199a2069/m15-digital-publishing` · branch `feat/m15-digital-publishing` · base `19caf2e`

## Módulos
- `control-plane/src/lib/store-zip.ts` ← zip.ts movido desde comic-renderer (genérico, STORE-mode, timestamps deterministas); `comic-renderer/zip.ts` re-exporta (shim back-compat).
- `features/epub/types.ts` — EpubMetadata, EpubVariant, ValidationFinding, ValidationResult.
- `features/epub/xhtml.ts` — chapterXhtml (una por escena: `<section epub:type="chapter">`, prosa `<p>`, diálogo `<p class="dialogue"><em>Speaker</em>: “text”</p>`), navXhtml (epub:type="toc"), svgPageXhtml (shell XHTML + viewport + SVG inline).
- `features/epub/opf.ts` — containerXml fijo + buildOpf (EPUB 3.0, dc metadata escapada, dcterms:modified, rendition meta por variante, manifest con properties nav/svg, spine).
- `features/epub/epub.ts` — buildEpubReflowable / buildEpubFixedLayout: entradas ordenadas con mimetype PRIMERO (contenido exacto), luego META-INF/container.xml, OEBPS/content.opf, nav, capítulos/páginas → buildZip store-mode.
- `features/epub/validate.ts` — validateEpub: readZipEntries → findings (OCF-001..007, PKG-001..007, NAV-001, SPN-001..002, FXL-001..003); ok = sin errores.
- `views/PublishingProof.tsx` + ruta `/publish`: validación en useMemo, botones deshabilitados si !ok, panel data-testid="validation-*" con data-ok.

## Harness
- `OracleType` += 'epub-entries'; ORACLES registry += epubEntriesOracle (mimetype first+exact, container, OPF, fxl opcional, minEntries/namesInclude/entryContains/forbiddenNames); loader ORACLE_TYPES += 'epub-entries'.

## Isolation
- Allowlist: `epub/epub.ts → comic-renderer` (REQ-M15-02, doc 14).

## Verificación
- Unit: epub.spec.ts (13 tests) + suites afectadas (comic 20, isolation, routes).
- UAT: SCN-M15-01-001 (4 oracles).
