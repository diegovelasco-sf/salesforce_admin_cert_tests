// Extrae el texto de cada página de un PDF con PDFKit (macOS), junto con sus enlaces,
// y lo guarda como JSON [{ page, text, lines: [{ text, x, y }], links: [{ url, text, y }] }].
// text sigue el orden interno del PDF; lines, el orden visual (de arriba abajo y de izquierda a derecha).
// Uso: osascript -l JavaScript scripts/jxa/pdf-text.js <pdf> <salida.json>
ObjC.import('Foundation')
ObjC.import('PDFKit')

function run(argv) {
  if (argv.length !== 2) throw new Error('Uso: pdf-text.js <pdf> <salida.json>')
  const [pdfPath, outPath] = argv
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(pdfPath))
  if (doc.isNil()) throw new Error('No se pudo abrir el PDF: ' + pdfPath)

  const pages = []
  for (let i = 0; i < doc.pageCount; i++) {
    const page = doc.pageAtIndex(i)
    const text = page.string
    pages.push({ page: i + 1, text: text.isNil() ? '' : text.js, lines: pageLines(page), links: pageLinks(page) })
  }

  const ok = $(JSON.stringify(pages)).writeToFileAtomicallyEncodingError(outPath, true, $.NSUTF8StringEncoding, null)
  if (!ok) throw new Error('No se pudo escribir ' + outPath)
  return pages.length + ' páginas'
}

// Líneas de texto en orden visual. y es la coordenada vertical de la base (origen abajo).
function pageLines(page) {
  const selection = page.selectionForRect(page.boundsForBox(0))
  if (selection.isNil()) return []
  const lines = []
  const byLine = selection.selectionsByLine
  for (let i = 0; i < byLine.count; i++) {
    const line = byLine.objectAtIndex(i)
    const text = line.string
    if (text.isNil() || !text.js.trim()) continue
    const bounds = line.boundsForPage(page)
    lines.push({ text: text.js, x: Math.round(bounds.origin.x * 10) / 10, y: Math.round(bounds.origin.y * 10) / 10 })
  }
  // Misma fila si la base difiere menos de 2 puntos.
  return lines.sort((a, b) => (Math.abs(a.y - b.y) < 2 ? a.x - b.x : b.y - a.y))
}

// Enlaces de la página con el texto que hay bajo cada uno; y es la coordenada vertical
// (origen abajo), para poder ordenarlos de arriba abajo.
function pageLinks(page) {
  const links = []
  const annotations = page.annotations
  for (let i = 0; i < annotations.count; i++) {
    const annotation = annotations.objectAtIndex(i)
    const url = annotation.URL
    if (url.isNil()) continue
    const bounds = annotation.bounds
    const selection = page.selectionForRect(bounds)
    links.push({
      url: url.absoluteString.js,
      text: selection.isNil() ? '' : selection.string.js,
      y: Math.round(bounds.origin.y),
    })
  }
  return links
}
