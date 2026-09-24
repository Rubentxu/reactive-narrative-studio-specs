# Spec — m12-sequential-art-core (M12)

**Cycle**: `p-7c4aff45199a2069/m12-sequential-art-core`
**Fuentes**: `uat/UAT-M12-01.md`; `docs/19-ROADMAP.md` § M12 (panel storyboard page + sequential graph lens); `docs/11-SEQUENTIAL-ART-IR.md`; `specs/sequential-ir.schema.json`; `docs/09-NARRATIVE-IR.md` (escenas); `specs/visual-ir.schema.json` (Shot → shotRef).

## Scope

Núcleo de arte secuencial: adaptador determinista de capítulo (beats) a SequentialArtIR con orden de lectura válido y diálogo como texto editable; página de storyboard en el CP con lente de grafo secuencial; UAT-M12-01 ejecutable.

**Fuera de scope**: generación de imágenes (Visual IR/M13), lettering renderizado, colocación de balones por optimización (template only, doc 11), extracción NLP de prosa libre, renderer cómic (M13), manga/webtoon reales (solo contrato de dirección).

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-SA-1 | El adaptador MUST producir documentos SequentialArtIR válidos contra `specs/sequential-ir.schema.json` (ajv) a partir de un `ChapterManuscript` (beats por escena). |
| REQ-SA-2 | Para un capítulo con suficientes beats, el adaptador MUST producir **8–10 páginas** con orden de lectura estrictamente secuencial (page N antes que N+1; panels en orden dentro de página). |
| REQ-SA-3 | **Todo diálogo MUST permanecer como texto editable** (`speech[].text` en el IR; texto renderizado en el DOM), nunca incrustado en imágenes: la página de storyboard MUST NOT contener elementos `<img>`. |
| REQ-SA-4 | Las fronteras de escena MUST marcarse con `gutterAfter: 'scene-break'`; la dirección de lectura (`ltr`/`rtl`/`vertical`) MUST reflejarse en la página. |
| REQ-SA-5 | Los `shotRef` MUST ser deterministas y estables (`shot-<n>` en orden de lectura) como contrato con el Visual IR (generación posterior). |
| REQ-SA-6 | La página `/storyboard` MUST renderizar el storyboard (páginas/panels, badges de orden, scene-breaks, dirección) y la **lente de grafo secuencial** (nodos por panel en orden de lectura, agrupados por página, con importancia visualizada). |
| REQ-SA-7 | UAT-M12-01 MUST ser ejecutable: scenario real que verifique 8–10 páginas, orden válido, diálogo como texto y ausencia de `<img>`. |

## Criterios de aceptación

- **AC-1**: Golden test: el adaptador sobre el capítulo de muestra committed produce exactamente el golden JSON esperado y pasa validación ajv del schema.
- **AC-2**: `SCN-M12-01-001` PASS (build+preview+browser): 8–10 páginas, `data-reading-order` estrictamente creciente, textos de diálogo presentes en el DOM, 0 `<img>`, dirección visible.
- **AC-3**: Tests unitarios: paginación 8–10, scene-breaks en fronteras de escena, dirección rtl/vertical, shotRefs deterministas, capítulos pequeños (menos páginas, sin fallo).
- **AC-4**: La lente de grafo muestra todos los panels con su orden y agrupación por página (probe en el scenario: número de nodos = número de panels).
- **AC-5**: Quality gates verdes y `verify` sin regresión (5 scenarios previos PASS).
