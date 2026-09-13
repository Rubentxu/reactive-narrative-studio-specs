# Design — m10-3-multi-project-studio (M10.3)

## D1 — Store multi-proyecto (`projectionStore.ts`)

```ts
interface LoadedProject {
  projectId: string;
  bundle: ProjectionBundle;
  catalogEntities: CatalogEntity[];
  diagnostics: AjvError[];
  sourceLabel: string;
}
interface ProjectionState {
  // compat: espejo del proyecto ACTIVO (las vistas existentes no cambian)
  status, bundle, catalogEntities, diagnostics, sourceLabel,
  // multi-proyecto
  projects: Record<string, LoadedProject>;
  activeProjectId: string | null;
  loadFrom(source, projectId): Promise<{ projectId: string }>;  // devuelve el id resuelto
  setActive(projectId): void;
  reset(): void;
}
```

- `loadFrom`: carga, resuelve el id real (`bundle.project` → `{id,title}` con fallback al label), guarda en `projects[realId]`, activa y espeja.
- `setActive`: espeja los campos del proyecto elegido (sin recargar fuente).
- `reset`: limpia todo (se usa en tests).

## D2 — Registro IndexedDB (`studio/projectRegistry.ts`)

- DB `rns-studio`, versión 1, object store `projects` (keyPath `projectId`).
- `ProjectRecord = { projectId, title, sourceKind: 'snapshot'|'directory', fileNames: string[], lastOpenedAt: string, favorite: boolean }`.
- API async: `listProjects()`, `upsertRecent(record)`, `setFavorite(id, fav)`, `removeProject(id)`, `clearAll()`, `isAvailable()`.
- Implementación nativa (promesas sobre IDBRequest); fallback en memoria cuando `indexedDB` no existe (tests node) — misma API.
- **Solo metadatos**: un test enumera `Object.keys(record)` contra la lista permitida.

## D3 — Studio Home (`views/Home.tsx`, ruta `/home`)

- Continue Working: último `lastOpenedAt` del registro; botón "Open" que reabre el snapshot desde los `fileNames`… **no**: el browser no puede re-seleccionar ficheros por path (seguridad). Honesto: "Open" navega al SourcePicker con el proyecto resaltado; la carga real de ficheros requiere re-selección (input file) — se documenta como limitación y el UAT lo refleja.
- Recent Projects: lista ordenada, estrella favorito (persistida en registry), eliminar del registro.
- Loaded badge: proyectos cargados en runtime (store) se marcan.
- Enlace "Add project" → SourcePicker (raíz).

## D4 — Catalog filtro por proyecto (`views/Catalog.tsx`)

- Chips de proyectos presentes en `projects` (runtime) + indicador del activo; click → `setActive(id)`.
- El contenido del catálogo (entidades) se filtra al proyecto activo (comportamiento actual) — el filtro es explícito y visible.
- Si solo hay un proyecto, los chips no se muestran (no ruido).

## D5 — SourcePicker → registro

- `handleFileInput`: `const {projectId} = await loadFrom(snap, 'snapshot')`; `upsertRecent({projectId, title, sourceKind:'snapshot', fileNames, lastOpenedAt: now, favorite: existing?.favorite ?? false})` conservando el favorito previo.
- `handleDirectoryPick`: idem con `sourceKind:'directory'`.
- Nav: enlace "Studio Home" en el SourcePicker.

## D6 — Segundo fixture `golden/control-plane/snapshot-second/`

Copia de `snapshot-valid` con: `projectId: 'demo-snapshot-b'`, título distinto, un capítulo/carácter renombrado para que el filtro sea observable. Mismos esquemas; manifest con projections/docs.

## D7 — Scenario `SCN-M10-05-001`

Steps: build → preview → navigate `/` → set input files A → assert loaded → navigate `/home` → set files B (input del SourcePicker) → Home muestra A y B → navegar `/catalog` → click chip B → assert activo B → `page.evaluate` schema de IDB (solo store `projects`, records sin claves narrativas) → `deleteDatabase` + reload → Home vacío → re-cargar A desde el input → assert loaded. Oracles: browser-content (Home con ambos ids, chips, badge) + nuevo oracle `indexeddb-content` (page.evaluate script declarado) — o extender browser-content con `evaluateScript`? Un oracle específico `browser-evaluate` que corre un script declarado en el scenario y compara el JSON resultante contra expectativas declaradas (semantic-json sobre resultado). Mantiene drivers/oracles: el step captura `browser.<step>.eval.json`, el oracle compara.

## D8 — Claims del scenario

`proves`: dos identidades runtime independientes, Home multi-proyecto, filtro por proyecto, preferencias solo-metadatos, borrar IndexedDB no borra proyectos (los ficheros siguen cargando).
`doesNotProve`: sink por directorio (picker nativo), persistencia de layout de widgets, reapertura automática sin re-selección de ficheros.
