// Renderiza páginas de un PDF a PNG con PDFKit (macOS), para transcribir a mano lo que el texto no trae
// (capturas en el enunciado, opciones que son imagen).
// Uso: osascript -l JavaScript scripts/jxa/pdf-render.js <pdf> <carpeta de salida> <páginas> [ancho]
//   páginas: lista separada por comas, con base 1 ("25,26,40")
//   ancho:   píxeles de ancho de cada PNG (1400 por defecto)
// Escribe <carpeta>/p<NN>.png; la carpeta debe existir.
ObjC.import('Foundation')
ObjC.import('PDFKit')
ObjC.import('AppKit')

function run(argv) {
  if (argv.length < 3 || argv.length > 4) throw new Error('Uso: pdf-render.js <pdf> <carpeta> <páginas> [ancho]')
  const [pdfPath, outDir, list] = argv
  const width = Number(argv[3] ?? 1400)
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(pdfPath))
  if (doc.isNil()) throw new Error('No se pudo abrir el PDF: ' + pdfPath)

  const written = []
  for (const token of list.split(',')) {
    const n = Number(token)
    if (!Number.isInteger(n) || n < 1 || n > doc.pageCount) throw new Error('Página fuera de rango: ' + token)
    const page = doc.pageAtIndex(n - 1)
    const bounds = page.boundsForBox(0)
    const height = Math.round((width * bounds.size.height) / bounds.size.width)
    // thumbnailOfSize:forBox: con kPDFDisplayBoxMediaBox (0)
    const image = page.thumbnailOfSizeForBox($.NSMakeSize(width, height), 0)
    const bitmap = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation)
    const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
    const out = outDir.replace(/\/$/, '') + '/p' + String(n).padStart(2, '0') + '.png'
    if (!png.writeToFileAtomically(out, true)) throw new Error('No se pudo escribir ' + out)
    written.push(out)
  }
  return written.join('\n')
}
