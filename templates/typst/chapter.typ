// Canonical Typst chapter component; not standalone-renderable. Include via `#include "chapter.typ"` from book.typ.
// Chapter-level layout: num, title, body.
// Designed for use within book.typ as a component; not standalone-renderable.

#let chapter(num: none, title: "", body) = {
  if num != none {
    set text(font: "Source Sans 3", size: 10pt, weight: "regular", fill: gray)
    align(center)[Chapter {num}]
    v(0.5em)
  }

  set text(font: "Source Serif 4", size: 16pt, weight: "bold")
  align(center)[{title}]

  v(1.5em)

  set text(font: "Source Serif 4", size: 11pt, leading: 1.6)
  body
}

// Scene break helper — thin decorative rule
#let scene-break() = {
  v(1em)
  align(center)[───]
  v(1em)
}

// Epigraph / pullquote helper
#let epigraph attribution: none = {
  it => {
    set text(size: 10.5pt, style: "italic", font: "Source Serif 4")
    align(center, it)
    if attribution != none {
      par(justify: false, {
        set text(size: 9pt, style: "normal", weight: "light")
        align(right)[— {attribution}]
      })
    }
  }
}

// Inline stage direction helper
#let stage-dir(content) = {
  set text(size: 9pt, font: "Courier New", style: "italic", fill: gray)
  [({content})]
  set text(size: 11pt, font: "Source Serif 4", style: "normal", fill: black)
}
