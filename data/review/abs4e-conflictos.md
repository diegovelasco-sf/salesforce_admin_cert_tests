# Success4Exam App Builder 2026: claves distintas de las del banco

De las 188 preguntas del Practice Test, 187 repiten una del banco y se han unificado con ella; 1 es nueva. En 27 Success4Exam da otra respuesta. Se ha revisado cada una y se mantiene la que se considera correcta:

- En 26 se mantiene la del banco. La pregunta muestra, al corregirla, qué responde Success4Exam y por qué no se acepta (`conflictNote` en `data/curation/abs4e.json`). Q98 (ab-v2335-180) pasa además a dudosa.
- En Q53 (ab-v2335-104) acierta Success4Exam: la clave del banco se ha corregido (`corrected`).
- En Q38 (ab-v2335-308) las opciones de la V23.35 estaban ilegibles y se muestran con el texto de Success4Exam.

| Success4Exam | Banco | Estado | Respuesta del banco | Respuesta de Success4Exam |
|---|---|---|---|---|
| Q14 | ab-v2335-038 | ok | A hyperlink to the parent Account of the parent Opportunity. | A Rich Text area field that uses HTML to bold certain characters. |
| Q27 | ab-v2335-081 | disputed | Sharing Hierarchy | Sharing |
| Q38 | ab-v2335-308 | ok | AND(ISPICKVAL(StageName, "Negotiation/Review"), CloseDate - 7 < TODAY()) | AND(ISPICKVAL(StageName, "Negotiation/Review"), CloseDate - TODAY() <= 7) |
| Q55 | ab-v2335-026 | ok | Establish upper bound on existing picklists in Picklist Settings. | Set up Global Values in Picklist Value Sets. |
| Q63 | ab-v2335-280 | ok | Validate the inbound change set. | Validate the outbound change set. |
| Q68 | ab-v2335-094 | ok | Recent items · Filter list/List view · Rich text | Recent items · Rich text · Report details |
| Q69 | ab-v2335-048 | ok | Cannot add fields to page layouts. | Cannot create formula fields. |
| Q78 | ab-v2335-016 | ok | Navigation Menu · In-App Notification | In-App Notification · Record Detail |
| Q90 | ab-v2335-072 | ok | Currency · Date · Percent | Checkbox · Currency · Percent |
| Q95 | ab-v2335-217 | ok | Read-Only access on Case and Issue__c | Read-Only access on Issue_c and Case Issue_c |
| Q98 | ab-v2335-180 | disputed | Highlights panel | Activities |
| Q105 | ab-v2335-077 | ok | Sandbox cloning | Partial copy sandboxes |
| Q107 | ab-v2335-220 | ok | IMAGE( IF(ISPICKVAL(Priority, "Low" ), "/img/samples/flag_green.gif", IF(ISPICKVAL(Priority, "Medium" ), "/img/samples/flag_yellow.gif", IF(ISPICKVAL(Priority, "High" ), "/img/samples/flag_red.gif", "/s.gif" ))), "Priority Flag" ) · IMAGE( CASE( Priority, "Low", "/img/samples/flag_green.gif", "Medium", "/img/samples/flag_yellow.gif", "High", "/img/samples/flag_red.gif", "/s.gif" ), "Priority Flag" ) | IMAGE( CASE( Priority, "Low", "/img/samples/flag_green.gif", "Medium", "/img/samples/flag_yellow.gif, "High", "img/samples/flag_red.gif", "/s.gif"), "Priority Flag") · CASE( Priority, "Low", "/img/samples/flag_green.gif", "Medium", "/img/samples/flag_yellow.gif", "High", "/img/samples/flag_red.gif", "/s.gif") |
| Q122 | ab-v2335-179 | ok | AppExchange package | Data Export Service |
| Q125 | ab-v2335-197 | disputed | Remove the delete button from the Delivery page layout. · Remove the Delete permission from the Shipper profile. | Remove the delete button from the Delivery page layout. · Use a permission set to remove the Delete permission. |
| Q136 | ab-v2335-252 | ok | Custom tabs are hidden for all users. | Custom tabs are default off for all users. |
| Q149 | ab-v2335-239 | ok | Flow | Roll-up summary |
| Q150 | ab-v2335-051 | ok | Choose an unmanaged package from AppExchange that closely meets the requirements of the project and allows programmatic development. | Use Salesforce flow to build the survey declaratively to meet the criteria and send it to the customer as an email. |
| Q155 | ab-v2335-091 | ok | Set organization-wide default to Private. · Disable Grant Access Using Hierarchies. · Create a criteria-based Sharing Rule for the HR Department. | Remove Review Read permission from non-HR Department user Profiles. · Set organization-wide default to Private. · Create a criteria-based Sharing Rule for the HR Department. |
| Q160 | ab-v2335-107 | ok | Create a custom action on Account | Customize a Global Quick Action |
| Q163 | ab-v2335-273 | disputed | Guided Action Flows on the record page | Add Path to the top of the Case layout |
| Q165 | ab-v2335-284 | ok | CASESAFEID (ID) | TEXT (14) |
| Q167 | ab-v2335-065 | ok | Flow | Roll-up Summary |
| Q171 | ab-v2335-064 | ok | Flow Builder · Escalation rules | Escalation rules · Scheduled Apex |
| Q175 | ab-v2335-158 | ok | Component visibility filter | Form factor checkboxes |
| Q177 | ab-v2335-078 | ok | Use a private sharing model granting record access using hierarchy; manage field access with field-level security. | Use a private sharing model granting record access using hierarchy; manage field access with record types and field-level security. |
| Q53 | ab-v2335-104 | corrected | It is not possible to change the data type of a formula field to any data type. · It is not possible to change the data type of field referenced by Apex code. | (la misma: se ha corregido el banco) |

## Motivos

**Q14 · ab-v2335-038.** Un formula field no puede devolver Rich Text: sus tipos de retorno son Checkbox, Currency, Date, Date/Time, Number, Percent, Text y Time, así que no puede poner negritas con HTML. Sí puede recorrer Opportunity Product → Opportunity → Account y crear un enlace con HYPERLINK(), que es la respuesta del banco.

**Q27 · ab-v2335-081.** En Lightning, el botón Sharing Hierarchy muestra qué usuarios tienen acceso al registro y el motivo de cada uno, que es justo lo que pide la pregunta; el botón Sharing sirve sobre todo para compartir el registro a mano. Como Success4Exam y los resolvedores a ciegas eligen Sharing, la pregunta sigue marcada como dudosa.

**Q38 · ab-v2335-308.** Las dos fórmulas usan ISPICKVAL, como exige un picklist, pero «a menos de una semana» es estrictamente menos de 7 días. CloseDate - 7 < TODAY() equivale a CloseDate - TODAY() < 7; la de Success4Exam, con <= 7, también da verdadero cuando falta justo una semana.

**Q55 · ab-v2335-026.** Picklist Settings tiene la opción «Establish upper bound on existing picklists», que limita los valores inactivos que puede acumular cada picklist y obliga a borrar los que sobran: eso es lo que alivia el problema. Un global value set sirve para compartir los mismos valores entre varios campos, pero no elimina los inactivos que ya existen.

**Q63 · ab-v2335-280.** Un change set solo se valida en la org que lo recibe: se valida el inbound change set en producción y, si pasa, se despliega después con un quick deploy, sin necesitar al desarrollador. Un outbound change set no tiene opción de validar; solo se sube.

**Q68 · ab-v2335-094.** Recent Items, Filter List y Rich Text son componentes estándar de Lightning App Builder. «Report details» no existe como componente: el estándar para informes es Report Chart. En Success4Exam la opción de Filter List aparece corrupta («custom fields for the Galactic Vendors's location: Filter list»), y por eso marca Report details en su lugar.

**Q69 · ab-v2335-048.** Schema Builder sí crea formula fields y lookups, y muestra las relaciones existentes. Su limitación es que un campo creado allí no se añade a ningún page layout: hay que añadirlo después en el editor de layouts.

**Q78 · ab-v2335-016.** En la app móvil, el manager recibe la solicitud de aprobación como notificación in-app y la tiene en el elemento Approval Requests del menú de navegación, desde donde la aprueba o la rechaza. La página de detalle del registro no es un canal por el que llegue la solicitud.

**Q90 · ab-v2335-072.** Un roll-up summary resume campos Number, Currency y Percent (SUM, MIN, MAX) y Date o Date/Time (MIN, MAX). Un Checkbox no se puede agregar: solo sirve como criterio de filtro de un COUNT. Time no es un tipo admitido.

**Q95 · ab-v2335-217.** El acceso a un registro de un objeto de unión depende del acceso a sus dos registros master: sin poder leer el Case relacionado no se ve el Case_Issue__c, aunque se tenga acceso a Issue__c. Por eso hace falta Read en Case y en Issue__c; la respuesta de Success4Exam deja fuera Case.

**Q98 · ab-v2335-180.** Ver la nota de revisión: la acción sale en el Highlights panel salvo que Lightning la trate como acción de actividad, que es lo que supone Success4Exam.

**Q105 · ab-v2335-077.** Sandbox cloning crea sandboxes a partir de otro sandbox, así que los 20 parten de la misma configuración y de los mismos datos. Un Partial Copy se crea desde producción con una plantilla y una muestra de datos, así que no garantiza una base idéntica para todos.

**Q107 · ab-v2335-220.** Para que se vea una bandera hay que devolver una imagen: IMAGE() recibe la URL de la imagen y el texto alternativo. Las dos fórmulas con IMAGE() (con IF anidados y con CASE) cumplen el requisito; un CASE sin IMAGE() solo devuelve la ruta como texto. Además, la versión con IMAGE() de Success4Exam tiene comillas sin cerrar.

**Q122 · ab-v2335-179.** Data Export Service solo se programa como mucho cada semana (o cada mes, según la edición), no a diario. Para una copia de seguridad automática diaria hace falta una solución de AppExchange o Backup and Restore de Salesforce.

**Q125 · ab-v2335-197.** Un permission set solo concede permisos: no puede quitar el Delete que ya da el perfil, así que la opción de Success4Exam no sirve tal como está redactada. Ver también la nota de revisión, que explica por qué la pregunta sigue como dudosa.

**Q136 · ab-v2335-252.** Un custom tab desplegado con un change set sin profiles ni permission sets no lleva ajustes de visibilidad, así que queda oculto (Tab Hidden) para todos hasta que se configure. Default On y Default Off son valores que solo existen dentro de un profile o un permission set.

**Q149 · ab-v2335-239.** Case se relaciona con Account por lookup, así que no admite un roll-up summary nativo, y menos aún para sumar también los casos de la cuenta padre. Un Flow puede contar los casos abiertos y guardar el resultado en la cuenta.

**Q150 · ab-v2335-051.** El requisito combina poco tiempo con personalización completa. Un paquete unmanaged de AppExchange llega ya construido y todo su código y su metadata se pueden editar, así que cumple las dos cosas. Construir la encuesta en Flow desde cero no cumple el plazo.

**Q155 · ab-v2335-091.** Si se quita Read en Review a los perfiles que no son de RR. HH., los empleados ya no podrían crear ni ver sus propias reviews. Lo correcto es OWD Private (cada uno ve las suyas), desactivar Grant Access Using Hierarchies (para que no las vean sus managers) y una sharing rule por criterios para RR. HH.

**Q160 · ab-v2335-107.** Una global action no tiene el contexto del registro desde el que se lanza, así que no puede rellenar campos con los valores de la cuenta padre. Una acción específica de Account de tipo Create a Record sí puede predefinir esos campos a partir del registro padre.

**Q163 · ab-v2335-273.** Un Guided Action Flow (un screen flow en Actions & Recommendations) puede pedir y registrar las preguntas de verificación paso a paso; Path solo muestra etapas y consejos. Como Success4Exam y los resolvedores a ciegas eligen Path, la pregunta sigue marcada como dudosa.

**Q165 · ab-v2335-284.** El ID de 18 caracteres, que Excel no confunde, se obtiene con CASESAFEID(Id). En Success4Exam las opciones están corruptas («CAREBAFFIELD (14)» es CASESAFEID mal leído) y su clave, TEXT(14), solo devolvería el número 14 como texto.

**Q167 · ab-v2335-065.** Work Order se relaciona con Asset por lookup, así que no se puede crear un roll-up summary. Un record-triggered Flow sobre Work Order detecta que se cierra una orden de mantenimiento y actualiza la fecha en el Asset, sin código.

**Q171 · ab-v2335-064.** Las escalation rules respetan las business hours y pueden enviar la notificación. Flow Builder cubre lo mismo sin código, con un record-triggered flow y un scheduled path. Scheduled Apex también podría, pero exige código, y en App Builder se prefiere la solución declarativa.

**Q175 · ab-v2335-158.** Con una sola página, el componente se limita a los usuarios de la app móvil con un component visibility filter por Form Factor. La elección de form factor de Lightning App Builder es de la página entera (al activarla) o la declara el componente personalizado; no se configura para un componente estándar concreto.

**Q177 · ab-v2335-078.** Los record types no controlan el acceso a campos: para ocultar los comentarios del ejecutivo se usa field-level security. El acceso al registro lo da el sharing model Private con Grant Access Using Hierarchies, que deja ver la evaluación al rep, a su manager y a los ejecutivos.

**Q53 · ab-v2335-104.** La V23.35 marcaba la limitación del formula field y el paso de Text Area (Long) a Text. Success4Exam marca la del formula field y la de los campos referenciados en Apex, y es la que coincide con la ayuda de Salesforce («Notes on Changing Custom Field Types»): un campo referenciado en Apex no puede cambiar de tipo, mientras que Text Area (Long) a Text sí se permite (el texto que no cabe se trunca). Se corrige la clave.
