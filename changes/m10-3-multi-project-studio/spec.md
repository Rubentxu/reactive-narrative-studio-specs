# Spec — m10-3-multi-project-studio (M10.3)

**Cycle**: `p-7c4aff45199a2069/m10-3-multi-project-studio`
**Fuentes**: `docs/19-ROADMAP.md` (M10.3), `uat/UAT-M10-05-multi-project-catalog.md`, `docs/33-STUDIO-HOME-WORKBENCH.md`, `docs/24-TESTING-GOLDEN-DATASET.md` (two-project-catalog).

## Scope

IndexedDB recent-project registry (solo metadatos), favorites, multi-project catalog (filtro por proyecto), local Studio Home. UAT-M10-05.

**Fuera de scope**: layout configurable de widgets (add/remove/reorder/resize), widget Pending Approvals/Blocking Findings/Resource Usage del doc 33, proyecto por directorio en headless (picker nativo), M11+.

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-MP-1 | El runtime MUST sostener ≥2 proyectos cargados simultáneamente con identidad independiente (bundle, entidades y diagnósticos propios por proyecto) y un proyecto activo seleccionable. |
| REQ-MP-2 | El registro de proyectos recientes MUST persistir en IndexedDB y contener **solo metadatos** (id, título, tipo de fuente, nombres de fichero, lastOpenedAt, favorite). Prohibido persistir proyecciones, docs o contenido narrativo. |
| REQ-MP-3 | Studio Home (`/home`) MUST mostrar Continue Working (último proyecto activo) y Recent Projects (orden por lastOpenedAt) con acciones de abrir, marcar/desmarcar favorito y eliminar del registro. |
| REQ-MP-4 | El Catalog MUST permitir filtrar por proyecto entre los proyectos cargados en runtime, cambiando el proyecto activo sin recargar la aplicación. |
| REQ-MP-5 | Borrar las preferencias (IndexedDB) MUST NOT afectar a los proyectos: el registro queda vacío y los mismos ficheros de proyecto MUST poder cargarse de nuevo. |
| REQ-MP-6 | No MUST crearse ninguna DB narrativa central: la única base local del Studio es la de preferencias, y su schema se limita al store de proyectos. |

## Criterios de aceptación

- **AC-1**: `SCN-M10-05-001` (browser real, preview+Chromium) carga dos snapshots independientes (fixtures A y B), Home lista ambos, y el Catalog alterna entre ambos por chips de proyecto; verdict PASS con evidence.
- **AC-2**: El scenario verifica vía `page.evaluate` que la DB `rns-studio` solo tiene el object store `projects` y que cada record no contiene claves de proyecciones/docs (`cp-`, `docs`, `chapters`…).
- **AC-3**: Tras `indexedDB.deleteDatabase('rns-studio')` + recarga, el registro aparece vacío y cargar de nuevo el snapshot A funciona (proyecto intacto fuera de IndexedDB).
- **AC-4**: Tests unitarios del store multi-proyecto (dos loadFrom → dos identidades + setActive) y del registro (record solo-metadatos; list/setFavorite/remove/clearAll).
- **AC-5**: Segundo fixture committed `golden/control-plane/snapshot-second/` (proyecto distinto, con una entidad diferenciada) usable por el input de snapshot.
- **AC-6**: Quality gates verdes (tsc/vitest control-plane + verification, pytest, validadores) y `verify` sin regresión (scenarios existentes siguen PASS).
