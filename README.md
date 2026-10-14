# Simulador del examen Salesforce Certified Platform Administrator

Web para practicar el examen **Salesforce Certified Platform Administrator**. Tiene preguntas tipo test con
corrección y explicación, simulacros con el formato real (65 preguntas, 105 minutos, aprobado con el 68 %) y
un seguimiento de lo que fallas. Funciona en el navegador, sin servidor ni cuentas, y el progreso se guarda
en el `localStorage`.

El banco tiene 333 preguntas sacadas de seis fuentes. El enunciado y las opciones están en inglés, como en
el examen, y cada pregunta trae una explicación en español.

> [!WARNING]
> Este repositorio es privado y debe seguir siéndolo. Incluye material de los cursos de Trailhead Academy,
> con licencia para uso personal, y preguntas de bancos no oficiales y de personas que ya hicieron el
> examen. El acuerdo de certificación de Salesforce prohíbe difundir el contenido del examen. No hagas
> público el repositorio ni publiques la web sin control de acceso (ver [Despliegue](#despliegue)).

## Puesta en marcha

Necesitas Node.js 24. Para usar la app basta con esto:

```sh
npm install        # solo la primera vez
npm run dev        # http://localhost:5173
```

Para la versión optimizada: `npm run build && npm run preview`, en la misma URL.

El puerto está fijado a propósito (`strictPort`). El `localStorage` depende del origen, y si Vite cambiara
de puerto parecería que se ha perdido el progreso. Desde **Ajustes** puedes exportar el progreso a un JSON
e importarlo después, por ejemplo para pasarlo a otro navegador.

Regenerar el banco desde los PDF solo funciona en macOS, porque la extracción usa PDFKit (ver
[Cómo se construye el banco](#cómo-se-construye-el-banco)).

## Qué puedes hacer

- **Práctica.** Eliges las secciones, las fuentes (todas o solo las oficiales), si quieres solo preguntas
  que no has visto y cuántas (10, 20, 40 o todas). Compruebas cada respuesta y ves al momento la
  explicación, la fuente y, si la hay, la nota de revisión.
- **Simulacro.** 65 preguntas repartidas por sección según los pesos de la guía oficial, con 105 minutos.
  Puedes marcar preguntas para revisarlas y moverte por ellas con la paleta. La corrección llega al
  entregar o al acabarse el tiempo. Si recargas o cierras la página, el simulacro se reanuda donde lo
  dejaste, con el tiempo que quede.
- **Resultados.** Nota, aprobado o suspenso, tiempo empleado, acierto por sección y la corrección pregunta
  a pregunta, con filtros para ver solo las falladas o las marcadas.
- **Repaso.** Las preguntas que has fallado alguna vez y las que has marcado, también en un simulacro. Una
  pregunta fallada sale de Repaso cuando la aciertas dos veces seguidas.
- **Historial.** Tus simulacros y el porcentaje de acierto acumulado en cada sección.
- **Ajustes.** Excluir del simulacro las preguntas dudosas u obsoletas (activado por defecto), usar solo
  fuentes oficiales y exportar, importar o borrar el progreso.

Atajos de teclado: `1`-`5` marcan opciones, `Enter` comprueba o avanza, `←`/`→` navegan y `M` marca la
pregunta.

En las preguntas de varias respuestas, la app indica cuántas hay que elegir («Elige 2») y no deja marcar
más. La corrección es de todo o nada, como en el examen.

## Formato del examen

El formato sale de la guía oficial CRT101 (SU26): 65 preguntas, 105 minutos y aprobado con el 68 %. En el
examen real 5 de las 65 no puntúan, pero no se sabe cuáles, así que el simulador las cuenta todas. Con 65
preguntas hacen falta 45 aciertos; el cálculo se hace con enteros para evitar errores de redondeo.

| Sección | Peso | Preguntas por simulacro | En el banco |
|---|---|---|---|
| Configuración y Setup | 15 % | 10 | 74 |
| Object Manager y Lightning App Builder | 15 % | 10 | 70 |
| Aplicaciones de ventas y marketing | 10 % | 7 | 30 |
| Aplicaciones de servicio y soporte | 10 % | 6 | 31 |
| Productividad y colaboración | 10 % | 6 | 16 |
| Gestión de datos y analítica | 17 % | 11 | 40 |
| Automatización | 15 % | 10 | 54 |
| Agentforce IA | 8 % | 5 | 18 |

El reparto por sección se calcula con el método de restos mayores; los empates se resuelven por el orden de
la guía. Si una sección no tiene bastantes preguntas (por ejemplo, con «solo fuentes oficiales», que no
tienen ninguna de Agentforce), el hueco se reparte por peso entre las demás.

## El banco de preguntas

| Fuente | Tipo | Preguntas | Notas |
|---|---|---|---|
| CRT101 (Trailhead Academy) | Oficial | 20 | Clave y enlaces «Learn More» sacados del PDF |
| ADX201 (Trailhead Academy) | Oficial | 44 | La clave solo se ve en las imágenes del PDF: está transcrita en `data/answers/adx201.json` |
| Trailhead, Administrator Certification Prep, módulo 1 | Oficial | 25 | 20 de los 22 escenarios (2 ya estaban en FreeCram) y 5 tarjetas de repaso convertidas en pregunta |
| FreeCram ADM-201 | No oficial | 146 | De 150; se han quitado 4 duplicadas |
| Success4Exam | No oficial | 81 | De 238: 146 son las de FreeCram y 11 repiten otras con distinta redacción |
| Debrief del examen | No oficial | 17 | Preguntas que recuerdan personas que ya hicieron el examen, con su respuesta. Solo las que no estaban ya en el banco |

`Platform Administrator Practice Test.pdf` no aporta nada: es el banco de FreeCram escaneado como imágenes.

### Revisión de las claves

Las claves de las fuentes no oficiales se han revisado una a una al redactar las explicaciones. Cada
pregunta tiene un estado de revisión:

| Estado | Preguntas | Qué significa | En la app |
|---|---|---|---|
| `ok` | 313 | La clave de la fuente es correcta | — |
| `corrected` | 8 | La clave de la fuente estaba mal y se ha cambiado | Nota «Clave corregida», con la respuesta original |
| `disputed` | 10 | Hay dudas razonables sobre la clave | Nota «Respuesta dudosa»; fuera del simulacro por defecto |
| `outdated` | 2 | Depende de funciones retiradas, como Process Builder | Nota «Pregunta desactualizada»; fuera del simulacro por defecto |

El Debrief y las tarjetas de Trailhead solo traen la pregunta y su respuesta. Para poder practicarlas, las
opciones incorrectas se han redactado aparte (en 14 del Debrief y en las 5 tarjetas), y la app lo indica al
mostrar la explicación. Algunas erratas de los enunciados se han corregido. En un escenario de Trailhead,
el PDF repite por error el enunciado del anterior, así que se ha reescrito a partir de sus opciones y
explicaciones.

## Cómo se construye el banco

Las preguntas no se escriben a mano en la app: salen de los PDF con un proceso reproducible.

```text
PDF ── extract ──▶ data/raw/<fuente>.pages.json   texto de cada página (no se versiona)
                        │
                      parse    scripts/parse/<fuente>.ts, con data/manual/ y data/answers/
                        ▼
                   data/parsed/<fuente>.json      preguntas tal como vienen (versionado)
                        │
                      bank     scripts/build-bank.ts, con data/curation/
                        ▼
                   src/data/questions.json        banco final que usa la app
```

```sh
npm run extract -- "<carpeta de los PDF>"   # PDF → data/raw (solo macOS)
npm run parse                               # data/raw → data/parsed
npm run bank                                # data/parsed + data/curation → src/data/questions.json
npm run data                                # parse + bank
npm run check                               # tipos, lint, tests y validación estricta del banco
```

### 1. Extracción

`scripts/extract.ts` recorre las fuentes de `data/sources.json` y, para cada una, ejecuta
`scripts/jxa/pdf-text.js` con `osascript`. Es un script de JavaScript for Automation que lee el PDF con
PDFKit y guarda, por página:

- `text`: el texto en el orden interno del PDF;
- `lines`: los fragmentos en orden visual, con sus coordenadas, porque algunos PDF guardan el texto
  desordenado;
- `links`: los enlaces, de donde salen los «Learn More» de CRT101.

La extracción comprueba que cada PDF tiene el número de páginas esperado. Los PDF se tratan como datos no
fiables: solo se leen, su ruta se pasa como argumento y no se ejecuta nada en su carpeta. Las rutas de
`data/sources.json` son relativas a la carpeta que se pasa al comando. El PDF de Success4Exam está un nivel
por encima (`../Platform Administrator-Practice Test 2.pdf`).

`data/raw/` está en `.gitignore`, porque es el texto completo del material con licencia.

### 2. Parsers

Hay un parser por fuente, registrado en `scripts/parse/parsers.ts`. Cada uno falla con un mensaje claro si
algo no cuadra (numeración no correlativa, opciones fuera de secuencia, una clave que no es una opción…),
en vez de generar preguntas a medias.

| Fuente | Ids | Cómo se lee |
|---|---|---|
| FreeCram | `fc-034` | Bloques `NO.N` con opciones, `Answer:` y una explicación que solo se guarda como referencia. Quita cabeceras, números de página y artefactos de cita |
| CRT101 | `crt-07` | Preguntas de repaso de las págs. 85-104, cada una repetida, y la clave en texto de las págs. 110-112, con sus enlaces |
| ADX201 | `adx-04-3` | 4 preguntas por lección × 11 lecciones, cada una repetida. La clave viene de `data/answers/adx201.json`. Las opciones combinadas («E: A and B») se convierten en preguntas de varias respuestas |
| Success4Exam | `s4e-160` | Bloques `Question N` con `Options:`, opciones `A- …` y `Correct Answer:`. Se lee en orden visual, y «Choose N answers» debe cuadrar con la clave |
| Trailhead | `th-u2-01` | Los escenarios son tablas: letra, opción en mayúsculas y «Correct.» o «Incorrect.» con la explicación. Las tarjetas de repaso se transcriben aparte (`th-u3-f02`) |
| Debrief | `dbf-058` | Transcrito a mano en `data/manual/debrief.json` |

Los ids son estables y siguen la numeración de cada fuente. El progreso se guarda por id, así que
regenerar el banco no lo pierde.

Las fuentes que no se pueden leer solas se transcriben en `data/manual/<fuente>.json` con
`scripts/parse/manual.ts`. Cada pregunta transcrita lleva citas literales del PDF, que se buscan en su texto
(sin tener en cuenta mayúsculas, puntuación ni saltos de línea): así la transcripción queda ligada a la
fuente. `authoredOptions` marca las preguntas con opciones redactadas aparte. En los escenarios de
Trailhead, el mismo fichero da la grafía normal de cada opción, que debe tener las mismas palabras que el
texto en mayúsculas.

`scripts/parse/normalize.ts` reúne la limpieza común. Deshace ligaduras, une líneas partidas y ordena las
filas visuales. También falla si quedan caracteres que delatan una mala extracción: uso privado, U+FFFD,
guiones blandos o caracteres de ancho cero.

`data/parsed/` está versionado y sirve de snapshot: un test comprueba que los parsers reproducen esos
ficheros, así que cualquier cambio de un parser se ve en el diff.

### 3. Curación

`data/curation/<fuente>.json` añade a cada pregunta lo que no sale del PDF. Por ejemplo:

```json
"s4e-218": {
  "section": "config",
  "review": "corrected",
  "correct": ["A"],
  "reviewNote": "Un año fiscal Standard ya permite elegir el mes de inicio…",
  "textFixes": [{ "field": "stem", "from": "…", "to": "…" }],
  "explanationEs": "Un año fiscal Standard sigue el calendario gregoriano…"
}
```

| Campo | Para qué sirve |
|---|---|
| `section` | Sección del examen (obligatorio): `config`, `objects`, `sales`, `service`, `productivity`, `data`, `automation` o `agentforce` |
| `review` | `ok`, `corrected`, `disputed` u `outdated` |
| `reviewNote` | Explica la corrección o la duda; la app la muestra junto a la explicación |
| `correct` | Clave corregida, si la de la fuente está mal (exige `review: "corrected"`) |
| `explanationEs` | Explicación en español |
| `textFixes` | Correcciones de texto en el enunciado (`stem`) o en una opción (`option:B`) |
| `duplicateOf` | La pregunta ya está en el banco con otro id |
| `exclude` | Motivo por el que la pregunta no entra |
| `distinctFrom` | Preguntas parecidas que se han revisado y son distintas |
| `learnMore` | Enlaces de documentación |

Criterios que se han seguido:

- **Duplicados.** Si es la misma pregunta, se marca con `duplicateOf`. Si plantea lo mismo y tiene la misma
  respuesta pero con otra redacción, se excluye con `exclude`, indicando qué pregunta se queda. Si prueba
  la misma función en un escenario distinto, se queda.
- **Explicaciones.** Son de 2 a 4 frases en español y mantienen los términos de producto en inglés.
  Explican por qué es correcta la respuesta y por qué fallan las otras opciones. Nombran las opciones por
  su contenido, nunca por su letra ni por su posición, porque las opciones se barajan.
- **Claves.** Si una clave no cuadra con la documentación de Salesforce, se corrige y se explica en
  `reviewNote`. Si hay dudas razonables, se marca como `disputed`. Las preguntas que dependen de Workflow
  Rules o Process Builder se marcan como `outdated`.

### 4. Validaciones

`scripts/bank.ts` fusiona `data/parsed` con la curación y rechaza el banco si encuentra algo de esto:

- una pregunta sin sección, o una entrada de curación sin su pregunta;
- claves repetidas o que no son opciones, o todas las opciones correctas;
- un enunciado que pide «which two/three» con otro número de respuestas correctas;
- artefactos de extracción, caracteres sospechosos o texto ajeno a la pregunta;
- un `textFix` que no aparece exactamente una vez;
- `corrected` sin una clave distinta de la de la fuente, o cualquier estado distinto de `ok` sin `reviewNote`;
- una explicación que nombra opciones por su letra o su posición;
- enlaces de `learnMore` que no son `https` de `salesforce.com`;
- un duplicado que no apunta a una pregunta del banco o que da otra respuesta. Cada respuesta del duplicado
  se compara con la opción más parecida de la pregunta de destino, ya curada, para tolerar redacciones
  distintas. Solo se acepta una clave distinta si el destino está como `corrected` o `disputed` y el
  duplicado lo explica en `reviewNote`;
- dos preguntas casi iguales (similitud de Jaccard ≥ 0,8 entre enunciado y opciones) sin declarar como
  duplicadas o distintas.

Con `--strict`, que es lo que usa `npm run check`, además exige explicación y estado de revisión explícito
en todas las preguntas. Con `--check` no escribe nada: falla si `src/data/questions.json` no está al día.
Al terminar, el script muestra los recuentos por fuente y por estado de revisión, y cuántas preguntas
tiene cada sección frente a las que necesita un simulacro.

Nunca hay que editar `src/data/questions.json` a mano: se cambia la curación (o un parser) y se ejecuta
`npm run bank`.

## Estructura del proyecto

```text
data/
  sources.json        fuentes: fichero, páginas y preguntas esperadas
  raw/                texto extraído de los PDF (no se versiona)
  parsed/             salida de los parsers (snapshot de regresión)
  manual/             transcripciones a mano: Debrief y Trailhead
  answers/            clave visual de ADX201
  curation/           sección, revisión, explicación… de cada pregunta
scripts/
  jxa/pdf-text.js     extractor con PDFKit
  extract.ts          lanza la extracción de cada fuente
  parse/              un parser por fuente, utilidades comunes y sus tests
  bank.ts             fusión y validaciones del banco (y su test)
  build-bank.ts       escribe o comprueba src/data/questions.json
  paths.ts            rutas y tipos compartidos por los scripts
src/
  data/questions.json banco generado
  domain/             lógica pura, con tests
  ui/                 pantallas y componentes de React
  App.tsx, main.tsx   arranque y navegación entre pantallas
  styles.css          estilos (con modo oscuro y diseño adaptable al móvil)
```

## Arquitectura de la app

Es una aplicación estática de React, sin backend ni router: la pantalla actual forma parte del estado. El
banco va dentro del bundle (unos 420 kB de JSON), porque la app lo usa entero desde el arranque.

### Lógica de dominio (`src/domain/`)

Son funciones puras y deterministas, con tests. Todo lo aleatorio usa un generador con semilla, así que el
mismo simulacro se puede reconstruir.

| Módulo | Qué hace |
|---|---|
| `types.ts` | Tipos compartidos con los scripts: pregunta, curación, banco |
| `exam.ts` | Formato del examen, secciones con su peso y etiquetas de las fuentes |
| `rng.ts` | Generador pseudoaleatorio con semilla (mulberry32) |
| `shuffle.ts` | Barajado Fisher-Yates y orden de las opciones; las fijadas, como «All of the above», van al final |
| `sampling.ts` | Reparto por restos mayores, filtros del pool y muestreo estratificado del simulacro |
| `grading.ts` | Corrección de todo o nada y cálculo del aprobado |
| `selection.ts` | Selección de opciones con el límite de «Elige N» |
| `session.ts` | Simulacro: crear, responder, marcar, entregar y reanudar |
| `stats.ts` | Estadísticas por pregunta y regla de entrada y salida de Repaso |
| `storage.ts` | Lectura, guardado, copia de seguridad, exportación e importación del progreso |

### Interfaz (`src/ui/`)

| Fichero | Qué hace |
|---|---|
| `state.ts` | Reducer puro con el progreso y la pantalla actual |
| `Home.tsx` | Inicio: avisos, simulacro a medias, modos y resumen del progreso |
| `Practice.tsx` | Configuración de la práctica y tanda de preguntas con corrección inmediata |
| `Exam.tsx` | Simulacro: temporizador, paleta de preguntas, marcas y entrega |
| `Results.tsx` | Nota, KPIs, acierto por sección y corrección pregunta a pregunta |
| `History.tsx` | Historial de simulacros y acierto acumulado por sección |
| `Settings.tsx` | Ajustes y gestión del progreso |
| `QuestionCard.tsx` | Enunciado, opciones, notas de revisión y explicación |
| `SectionBars.tsx` | Barras de acierto por sección con la línea del 68 % y vista de tabla |
| `common.tsx`, `format.ts` | Diálogo de confirmación, fichas de KPI y formatos de fecha, duración y porcentaje |
| `useShortcuts.ts`, `useNow.ts` | Atajos de teclado y reloj del temporizador |
| `demo.ts` | Progreso de ejemplo para `?demo=` (solo en desarrollo) |

Los textos se muestran con `white-space: pre-line`; nunca se inserta HTML.

### Progreso guardado

- Todo va en una sola clave de `localStorage` (`sf-platform-admin-quiz`) con `schemaVersion: 1`: las
  estadísticas por pregunta, las marcas, el historial de simulacros, los ajustes y el simulacro en curso.
- Las respuestas se guardan por la letra original de la opción, no por la posición en que se mostró, así
  que barajar no les afecta.
- El simulacro guarda una hora límite absoluta y el tiempo restante se recalcula a partir de ella, también
  al volver a la pestaña. Por eso sobrevive a las recargas. Si vence mientras no estás, se entrega solo.
- Si el banco cambia y una pregunta del simulacro en curso ya no existe, el simulacro se descarta con un
  aviso.
- Si los datos guardados están dañados o son de una versión desconocida, se copian a otra clave y la app
  empieza de cero en vez de fallar.

## Desarrollo

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Comprobación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en el mismo puerto |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` de la app y de los scripts |
| `npm test` / `npm run test:watch` | Tests con Vitest |
| `npm run extract -- "<carpeta>"` | Extrae el texto de los PDF |
| `npm run parse` | Ejecuta los parsers |
| `npm run bank` | Genera el banco (`-- --check` comprueba sin escribir; `-- --strict` exige explicación y revisión) |
| `npm run data` | `parse` + `bank` |
| `npm run check` | Tipos, lint, tests y comprobación estricta del banco |

### Convenciones

- Los scripts son TypeScript que Node 24 ejecuta directamente, sin tsx ni compilación. Por eso se usa
  `import type`, los imports llevan la extensión `.ts` y no hay enums ni namespaces (`verbatimModuleSyntax`
  y `erasableSyntaxOnly`).
- No hay más dependencias que React, Vite, Vitest, oxlint y TypeScript.
- El código, los comentarios y la interfaz están en español; las preguntas, en inglés.

### Tests

Hay 61 tests repartidos en 10 ficheros:

- **Dominio.** El reparto de 65 preguntas da 10/10/7/6/6/11/10/5 y el muestreo no repite preguntas y es
  determinista con la misma semilla. 44/65 suspende y 45/65 aprueba. Un simulacro vencido se entrega al
  reanudarlo, y un progreso dañado se copia y se reinicia.
- **Parsers.** Casos sintéticos de cada formato y regresión contra `data/parsed/`. La regresión solo se
  ejecuta si existe `data/raw/`, es decir, después de `npm run extract`.
- **Banco.** Pasa todas las validaciones en modo estricto, `questions.json` está al día y los ids son
  únicos y siguen su formato.
- **Reducer.** Cada respuesta comprobada o entregada se registra una sola vez en las estadísticas, el
  historial y Repaso, y al recargar se avisa si el simulacro venció, si el banco ha cambiado o si los datos
  guardados estaban dañados.

### Parámetros de desarrollo

Solo funcionan con `npm run dev`; no entran en la versión de producción.

- `?min=N` acorta el simulacro a N minutos, para probar la entrega automática.
- `?demo=practice|exam|results|history` carga un progreso de ejemplo y abre esa pantalla. **Sobrescribe el
  progreso guardado en ese navegador.**

### Añadir una fuente nueva

1. Añade la fuente a `data/sources.json` (`id`, `file`, `pages` y `questions`), su id a `SourceId` en
   `src/domain/types.ts` y su etiqueta a `SOURCE_LABELS` en `src/domain/exam.ts`. Si es oficial, añádela
   también a `OFFICIAL_SOURCES`.
2. Escribe el parser en `scripts/parse/<fuente>.ts`, o transcribe las preguntas en
   `data/manual/<fuente>.json` y usa `manualQuestions`. Regístralo en `scripts/parse/parsers.ts` y añade
   tests en `scripts/parse/parse.test.ts`.
3. Ejecuta `npm run extract` y `npm run parse`, y revisa `data/parsed/<fuente>.json`.
4. Cura las preguntas en `data/curation/<fuente>.json`: duplicados, exclusiones, secciones, revisión y
   explicaciones. `npm run bank` muestra lo que falta y avisa de las preguntas parecidas a otras.
5. Añade el formato de los ids nuevos al test de `scripts/bank.test.ts` y termina con `npm run check`.

## Despliegue

No uses GitHub Pages. En el plan gratuito solo funciona con repositorios públicos, y aunque pagues para
usarlo con uno privado, la web sigue siendo pública.

Si quieres usar la app fuera de este equipo, la opción gratuita y con control de acceso es Cloudflare Pages
con Cloudflare Access:

1. Crea el proyecto subiendo primero una página vacía, para que el banco no quede público mientras
   configuras el acceso.
2. En Cloudflare Zero Trust → Access, crea una aplicación para `<proyecto>.pages.dev` y
   `*.<proyecto>.pages.dev` que solo admita tu email. Hace falta la segunda dirección porque cada
   despliegue tiene también su propia URL.
3. Despliega la app con `npm run build` y `npx wrangler pages deploy dist`, o conecta este repositorio
   privado para que se despliegue sola con cada cambio.

El progreso se guarda por origen, así que en la versión online empezarás de cero. Para llevártelo, expórtalo
en Ajustes en una versión e impórtalo en la otra.
