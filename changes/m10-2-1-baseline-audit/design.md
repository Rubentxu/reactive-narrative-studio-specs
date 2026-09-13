# Design — m10-2-1-baseline-audit (H7 + H8)

## D1 — Oracle `browser-content` (H7)

Nuevo tipo de oracle. Drivers capturan, oracles deciden:

- BrowserDriver captura DOM por step navegado: `browser.<stepId>.dom.json` con `{url, title, h1s, links[], bodyText}` (bodyText capado a ~20 KB, normalizado a espacios).
- `browser-content` evalúa el artifact contra expectativas declarativas:
  `{ artifact, urlContains?, titleContains?, h1Contains?, linksContain?[], textContains?[], noRawTextContains?[] }`.
- Clasificación `functional`; claims: prueba lo declarado del DOM renderizado, no la semántica interna de la app.

## D2 — Waivers (H8, del change design.md)

- `verification/traceability/waivers.json`: array de `{id, requirement, reason, scope, owner, evidence[]}`.
- Un oracle puede declarar `config.waiver: "WVR-..."`. Runner: si el oracle falla y existe waiver válido para ese id (campos completos) → el resultado del oracle se marca `waived: true` y el verdict global pasa a `PASS_WITH_WAIVER` (nunca PASS); si el waiver es inválido → FAIL con mensaje.
- El report markdown lista los waivers aplicados y los oracles waived.
- CLI: `PASS`/`PASS_WITH_WAIVER` → exit 0 con aviso; `FAIL` → exit 1.

## D3 — Baseline M0–M10.2 (H8)

Registry extendido:
- harvest de REQ ids también en `control-plane/test/**` y `tools/**/tests/**` → `testRefs` por requisito;
- load de `waivers.json` → `waivedRequirements`;
- estados de requisito: `MAPPED` (scenario | test) / `UNMAPPED`;
- por UAT: `EXECUTABLE` (scenario) / `MANUAL_ONLY` / `WAIVED` (waiver que cubre su requisito).

`baseline-m0-m10-2.md`:
- cabecera con git sha + cobertura;
- por milestone: UATs con estado, requisitos con refs, UNMAPPED listados;
- sección **Gaps / backlog**: UATs sin scenario ejecutable (con severidad propuesta: HIGH para milestones CLOSED sin cobertura ejecutable, MEDIUM el resto), requisitos UNMAPPED con waiver aplicable o propuesta de backlog;
- regenerable (`npm run traceability:build`).

## D4 — Scenario `SCN-M10-02-001` (H7)

Steps: build CP → preview → navigate `/capabilities` → 6 kind routes → click primer `a.capability-name` de skills → detail. Cada navigate/click captura DOM + console. Oracles:
1. `overview.content` (browser-content): h1 "Capability Catalog", links a los 6 kind routes.
2. `kinds.content` — 6 oracles (uno por kind) verificando h1 + presencia de entradas (providers: empty-state declarado).
3. `detail.content`: h1 del entity + url `/capabilities/skills/...`.
4. `raw-crossref.absence`: `noRawTextContains: ["[["]` sobre los DOM capturados.
5. `browser.health`: 0 console/page errors.

Claims: `doesNotProve`: mutación del projection store (cubierto por test de componente), render positivo de cross-links (sin contenido real con `[[...]]` — gap con waiver), calidad del contenido.
