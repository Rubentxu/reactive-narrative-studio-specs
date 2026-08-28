// Canonical Typst book-root template; entry point: `typst compile book.typ`. Include cover.typ + chapter.typ from here.
// Book-level layout for Typst print output.
// Sets page geometry, text defaults, heading styles, and root-level includes.

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
  numbering: "I",
  header: context {
    if counter(page).get().first() > 1 {
      locate(where => {
        let el = query.heading.where(level: 1).first()
        el.location().page() != here().page()
      })
      [《__PLACEHOLDER__》]
    }
  },
  footer: context {
    let total = counter(page).final().first()
    let current = counter(page).get().first()
    if total > 1 {
      align(center)[{current} / {total}]
    }
  }
)

#set text(
  lang: "en",
  font: "Source Serif 4",
  size: 11pt,
  leading: 1.5,
  hyphens: (enable: true, right-breakpoints: 0.3)
)

#set par(
  first-line-indent: 1.5em,
  justify: true,
  spacing: 1.2em
)

#show heading.where(level: 1): it => {
  v(1.5em)
  set text(size: 18pt, weight: "bold", font: "Source Sans 3")
  it
  v(0.6em)
}

#show heading.where(level: 2): it => {
  v(1.2em)
  set text(size: 14pt, weight: "semibold", font: "Source Sans 3")
  it
  v(0.4em)
}

#show heading.where(level: 3): it => {
  v(0.8em)
  set text(size: 12pt, weight: "medium", font: "Source Sans 3")
  it
}

#show heading.where(level: 4): it => {
  v(0.6em)
  set text(size: 11pt, weight: "semibold", font: "Source Sans 3")
  it
}

#show emph: it => {
  set text(style: "italic")
  it
}

#show strong: it => {
  set text(weight: "bold")
  it
}

#let book-body(body) = {
  body
}

// Root-level include for manifest (future round-5 integration point)
// #include "manifest.typ"
