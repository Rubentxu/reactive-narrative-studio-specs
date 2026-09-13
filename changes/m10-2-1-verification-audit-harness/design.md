# Design — m10-2-1-verification-audit-harness (slice H0→H6)

**Fuente**: `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/design.md` (arquitectura hexagonal, drivers, oracles, evidence bundle). Este documento añade las decisiones concretas de implementación del slice.

## Decisiones

### D1 — Stack y ubicación
`verification/` en la raíz del repo como paquete TypeScript/Node **independiente** (package.json + tsconfig propios; `pnpm-workspace.yaml` no se toca). Playwright como dependencia del paquete. Justificación: BrowserDriver exige Playwright; ecosistema pnpm/node ya presente; VAH-001 (aislamiento) se comprueba con un test de arquitectura que grepe imports de `verification/` en `control-plane/src` y `tools/`.

### D2 — Arquitectura hexagonal (del change design.md)
- **Use cases**: `RunScenario`, `AuditMilestone` (stub mínimo en este slice).
- **Ports**: `Driver`, `Oracle`, `EvidenceStore`, `EnvironmentProbe`, `Reporter`, `ScenarioRepository`.
- **Adapters**: ProcessDriver (spawn genérico), CliDriver (`narrative init/plan` vía ProcessDriver), FilesystemDriver (temp workspace, tree snapshot, hashes, before/after), GitDriver (SHA, dirty, diff), BrowserDriver (Playwright: navigate/click/fill + trace/screenshot/console).
- **Oracles**: SchemaOracle (ajv + JSON Schema), SemanticJsonOracle (canonical JSON recursivo NFC + ignored-paths declarados), FilesystemTreeOracle, FileContentOracle, GoldenOracle, BrowserOracle (no console errors, element visible), CrossLanguageOracle (orquesta dos producciones reales y compara con SemanticJson).
- Todo oracle emite `{classification, proves, doesNotProve, verdict, expectedRef, actualRef, diffRef}` (VAH-006/VAH-023).

### D3 — Scenario DSL (YAML)
Formato del ejemplo `examples/verification/scenario-m10-04.yaml`: `id, uat, requirements[], claims{proves,doesNotProve}, steps[{id, driver, action, params}], oracles[{id, type, config}], evidence[]`. El runner resuelve steps secuencialmente, captura observaciones por step, y ejecuta oracles al final sobre los artifacts referenciados.

### D4 — Evidence Bundle
`verification/evidence/<runId>/` con `run.json, environment.json, traceability.json, verdict.json, events.jsonl, git/, stdout/, stderr/, browser/, filesystem/, artifacts/, diffs/, hashes.sha256, report.md`. Inmutabilidad: el directorio se crea con runId fresco (timestamp+random) y nunca se sobrescribe (VAH-014). `hashes.sha256` lista path→sha256 de todos los archivos del bundle.

### D5 — Normalización (VAH-013)
Solo se ignoran diferencias declaradas en el oracle: `ignoredPaths` (JSONPath-ish) y `ignoredKeys` con `reason` obligatorio. Prohibido normalizador catch-all. Para UAT-M10-04: `createdAt`/timestamps y rutas absolutas del temp workspace son las únicas ignoradas justificadas.

### D6 — Ejecución UI real del wizard
- `pnpm preview` en `control-plane/` (puerto 4173) lanzado por el BrowserDriver como proceso gestionado con readiness poll.
- Playwright Chromium navega a `/create`, rellena title/projectId/audience, selecciona sink de guardado.
- **Riesgo conocido**: `showDirectoryPicker()` no es automatizable vía Playwright puro. Mitigación honesta: la app expone el mismo `create-plan.json` por el sink de descarga; el scenario intercepta el evento `download` de Playwright y obtiene el plan real emitido por la UI. La equivalencia se evalúa sobre el plan real de la UI + el workspace que ese plan produce al reproducirse con `narrative init --plan` — **ambos productores reales** (VAH-012): CLI produce el workspace; UI produce el plan; el plan UI se valida contra el workspace CLI (manifest/skeleton recipe-owned). La variante FS-Access directa queda documentada como limitación (no se simula ni se falsea).

### D7 — Corrección de producción (PR-1..PR-5)
Se aplica en `control-plane/` y `tools/` (fuera de `verification/`). Orden: primero el Harness ejecuta y documenta el FAIL baseline (before), luego PRs, luego re-run (after). Ambos bundles se conservan.

### D8 — Traceability Registry (H1)
`verification/traceability/registry.json` + inventario M0–M10.2 derivado de `docs/19-ROADMAP.md`, `uat/*.md`, `changes/*/spec.md`. Script `npm run traceability:build` genera registry + coverage matrix (`MAPPED|UNMAPPED`) y detecta IDs/referencias rotas. Estado `UNMAPPED` no bloquea en este slice (H8/H9 lo activarán), pero se reporta.

### D9 — Testing del propio Harness
Vitest en `verification/` con tests unitarios de oracles/drivers (fixtures temporales) + un test de humo del runner con scenario trivial. Los scenarios UAT reales se ejecutan con `npm run uat -- scenario <file>` como entry point canónico (VAH-015 parcial: `verify`/`uat` scripts).

## Trade-offs
- TypeScript en vez de Python para el Harness: BrowserDriver es ciudadano de primera clase en Node/Playwright; el CLI Python se ejercita como proceso externo (correcto para black-box).
- El plan UI vía evento download en vez de FS-Access: pierde fidelidad del sink principal pero permite automatización honesta; la limitación queda documentada en el scenario y en el informe (no se oculta).
- No se reutilizan los oráculos `equivalenceOracle.ts`/`equivalence_oracle.py` de producción: el Harness trae su propio SemanticJsonOracle independiente (la equivalencia de canonicalizadores de producción es precisamente uno de los hallazgos).
