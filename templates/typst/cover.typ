// Canonical Typst cover component; not standalone-renderable. Include via `#include "cover.typ"` at the top of the root Typst document.
// Cover page layout with cover_dimensions reference.
// Apply via: #include "cover.typ" at the top of the root Typst document.

#let cover(
  title: "Untitled",
  subtitle: "",
  author: "",
  series: "",
  cover_dimensions: (width: 152mm, height: 229mm),
) = {
  // Full-bleed cover background (if an asset:sha256 reference is available)
  // place(image(cover_asset_ref, width: 100%), scope: "existing")

  v(3cm)

  align(center)[
    #set text(font: "Source Sans 3", size: 28pt, weight: "bold")
    {title}
  ]

  if subtitle != "" {
    v(0.8em)
    align(center)[
      #set text(font: "Source Serif 4", size: 14pt, style: "italic")
      {subtitle}
    ]
  }

  v(2cm)

  if author != "" {
    align(center)[
      #set text(font: "Source Sans 3", size: 12pt, weight: "regular")
      {author}
    ]
  }

  if series != "" {
    v(0.5em)
    align(center)[
      #set text(font: "Source Sans 3", size: 9pt, weight: "light", fill: gray)
      {series}
    ]
  }

  v(1fr)

  align(center, bottom)[
    #set text(font: "Source Sans 3", size: 8pt, weight: "light", fill: gray)
    [Cover dimensions: {cover_dimensions.width} × {cover_dimensions.height}]
  ]
}
