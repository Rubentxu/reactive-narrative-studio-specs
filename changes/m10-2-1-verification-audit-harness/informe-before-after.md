# Informe Before/After — H6 Audit de M10.1 (UAT-M10-04 real)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-verification-audit-harness`
**Scenario**: `SCN-M10-04-001` (`verification/scenarios/scn-m10-04-001.yaml`)
**Oracle central**: cross-language sobre los planes reales de CLI y UI (VAH-012/VAH-021)

## Ejecución BEFORE (baseline del false-green)

- **RunId**: `run-2026-09-13T13-55-09-740Z-d38ea65e` — commit `bb0f8b6` (dirty)
- **Verdict**: **FAIL** — evidence: `evidence/before-run-fail-wizard-unreachable/`
- **Steps**: workspace.prepare ✅ · cli.create ✅ · ui.build ✅ · ui.start-preview ✅ · ui.navigate ✅ · ui.fill ❌ (timeout esperando `#title`)
- **Causa raíz expuesta**: el rootRoute TanStack renderizaba `SourcePicker` sin `<Outlet/>`; ninguna ruta hija — incluida `/create` — se montaba jamás. El wizard era inalcanzable en la app construida. El test de rutas (`routes-router.spec.ts`) solo comprobaba strings, no navegación real.
- **Defectos hermanos confirmados en el mismo audit**:
  1. `CreateWizard` descartaba el resultado del render y emitía planes con `manifest: {}`, `skeleton: []` y SHAs vacíos; `require()` rompía en browser ESM.
  2. `FileSystemAccessSink` escribía plantillas sin renderizar y hasheaba esas mismas plantillas (hash auto-consistente, sin valor de verificación).
  3. `import.meta.glob('/recipes/...')` no resuelve fuera del root de Vite en build (ni en dev): el wizard nunca tuvo skeleton cargado. Mismo defecto que m10.2 corrigió con manifiesto precomputado.
  4. `equivalenceOracle.ts` canonicalizaba con sort solo top-level (Python: recursivo).
  5. Los tests "roundtrip" de ambos lados afirmaban equivalencia cross-language sin ejecutar el runtime contrario.

## Correcciones aplicadas (fuera del Harness, VAH-001)

PR-1..PR-6 en commit `42ce944` (+ fix de recipe-assets). Detalle en `spec.md` (PR-1..PR-6) y mensaje del commit. Producción: router root layout con Outlet; wizard con render real vía TemplateEngine, manifest = narrative.yaml renderizado parseado (paridad Python), plan con `content` + SHAs reales vía `RecipePlanEmitter`; sink escribe lo renderizado; canonicalizador TS recursivo; fixtures compartidos; assets de receta precomputados en build (`scripts/generate-recipe-assets.mjs`); pattern HTML válido en modo `v`.

## Ejecución AFTER

- **RunId**: `run-2026-09-13T14-18-34-226Z-01437b8f` — commit `42ce944` (dirty)
- **Verdict**: **PASS** — evidence: `evidence/after-run-pass/`
- **Oracles**:
  - `plan.recipe-owned-equivalence` (cross-language): ✅ equivalencia semántica CLI/Python ↔ UI/TypeScript en campos recipe-owned.
  - `skeleton.tree-replay` (filesystem-tree): ✅ 13 ficheros iguales entre workspace CLI y workspace reproducido desde el plan UI (`.narrative/create-plan.json` ignorado con razón declarada).
  - `skeleton.narrative-content` (file-content): ✅ `narrative.yaml` byte-igual.
  - `browser.health`: ✅ 0 page errors, 0 console errors.
- **Gates de calidad**: control-plane tsc=0 + vitest 25 files/198 tests ✅ · verification tsc=0 + vitest 25 tests ✅ · pytest 44 ✅ · validate-recipes ✅ · validate-profiles ✅

## Conclusión

El false-green de Creation Recipes queda **expuesto y cerrado**: UAT-M10-04 ejecuta UI y CLI reales y su verdict se deriva de oracles sobre evidence, no de tests que se comparan consigo mismos. El plan UI ya es consumible por `narrative init --plan` (replay produce el mismo skeleton byte a byte). Limitación documentada (no simulada): el sink File System Access con diálogo nativo no es automatizable en headless; el scenario ejercita la ruta de descarga con fallback automático.
