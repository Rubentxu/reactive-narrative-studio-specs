# Spec — m14-manga-profile (M14)

**Cycle**: `p-7c4aff45199a2069/m14-manga-profile`
**Fuentes**: `docs/19-ROADMAP.md` § M14 (Deliver: RTL; monochrome/screentone settings; manga visual/editorial profile. Exit: "same sequential source can be rendered through distinct comic vs manga presentation profiles"); `docs/11-SEQUENTIAL-ART-IR.md` §Reading direction (manga: `rtl`); `docs/08-PROFILES.md` §Format profiles (`manga`).

## Scope

Segundo `PresentationProfile` sobre el mismo motor M13: perfil **manga** (monocromo, `rtl`, screentone determinista), espejado RTL de la rejilla de panels, conmutador comic|manga en la vista `/comic`, prueba de dual-render sobre el mismo `SequentialArtIR`, autoría de `uat/UAT-M14-01.md` + scenario ejecutable.

**Fuera de scope**: webtoon/vertical (hito posterior), solver de colocación de balones (doc 11: template primero), generación de imágenes real, render PDF/impresión.

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-M14-01 | `PresentationProfile` MUST declarar `direction: 'ltr' \| 'rtl'` y `screentone: boolean`; el output del perfil comic MUST permanecer sin regresión visual (flat fills, rejilla LTR, paleta M13). |
| REQ-M14-02 | MUST existir `MANGA_PROFILE`: paleta estrictamente monocroma (grises), `direction: 'rtl'`, `screentone: true` y tipografía serif distinta del perfil comic. |
| REQ-M14-03 | Con `direction: 'rtl'` la asignación de columnas MUST espejarse (panel 0 en la columna más a la derecha de su fila; lectura derecha→izquierda, filas arriba→abajo). El camino LTR MUST permanecer idéntico a M13. |
| REQ-M14-04 | Con `screentone: true` el SVG MUST emitir un `<defs><pattern>` de puntos determinista y los slots de arte MUST rellenarse vía `url(#...)`; el perfil comic no emite patrón. |
| REQ-M14-05 | El mismo `SequentialIrDoc` renderizado por ambos perfiles MUST producir: secuencia de panels idéntica, texto narrativo (lettering) idéntico, colocación x distinta (espejo RTL) y SVG manga sin colores no-gris. |
| REQ-M14-06 | La vista `/comic` MUST exponer un conmutador comic\|manga sobre el mismo capítulo cargado y la descarga CBZ MUST nombrarse por perfil (`comic-proof.<profile>.cbz`). |

## Criterios de aceptación

- **AC-1**: Tests unitarios `comic-renderer-manga.spec.ts`: espejo RTL exacto (x del panel 0 == x comic del panel 1), secuencia de panels idéntica, paleta manga 100% gris, patrón screentone presente solo en manga, lettering idéntico entre perfiles, CBZ por perfil con páginas marcadas.
- **AC-2**: El output SVG del perfil comic no contiene `<pattern`/`<defs>` y conserva los colores M13 (`#e2e8f0`, `#fef3c7`, `#d97706`, `#111827`, `#1f2937`, `#94a3b8`) — sin regresión M13.
- **AC-3**: `SCN-M14-01-001` PASS: baseline comic (ltr, sin patrón), conmutación a manga (rtl, patrón, monocromo, espejo), CBZ manga y CBZ comic descargados y verificados por bytes con el diálogo presente.
- **AC-4**: `verify` canónico sin regresión (8 scenarios PASS); auditoría M10.2.1 (gate CI bloqueante) sin nuevos bloqueos.

## Decisión de diseño

Los colores de lettering/meta hasta M13 estaban hardcodeados en `svg.ts`; para garantizar el monocromo manga sin tocar los bytes del perfil comic, los colores se elevan al perfil (`captionStroke`, `textFill`, `captionTextFill`, `metaFill`) con los valores M13 como defaults del perfil comic.
