# Feature Specification: Interfaz Web de Carga y Explorador de Archivos

**Feature Branch**: `001-web-ui-upload-explorer`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "vamos a proponer los 2 de la ui por lo que se deben de poder cargar las imagenes a la ui y mandarlas a procesar al pipeline, el visor de archivos leer los archivos procesados, listarlos y permitir que el usuario pueda visualizarlos, de igual manera podria crear subcarpetas para organizarlos y descargar sus archivos para tenerlos facilmente en otro equipo desde el que acceda"

## Clarifications

### Session 2026-08-05

- Q: ¿La interfaz web debe tener autenticación propia (usuario/contraseña) además de la restricción de red vía Tailscale? → A: No — Tailscale/WireGuard es el único control de acceso; no se agrega autenticación propia de la aplicación.
- Q: ¿Cómo se nombra/identifica un documento procesado en la lista del explorador? → A: Nombre automático derivado del archivo de salida, igual que hace la CLI hoy — no se agrega un paso de titulado manual al subir.
- Q: ¿Qué debe incluir la descarga de un documento individual? → A: El documento completo (Markdown + recursos embebidos), empaquetado si tiene más de un archivo, incluyendo el `.docx` si fue generado. Adicionalmente, el usuario indicó que generar el `.docx` debe ser una opción que se pregunta al momento de enviar el documento a procesar (no una conversión posterior automática).
- Q: ¿Qué pasa cuando un trabajo de procesamiento falla — el usuario puede reintentar desde la interfaz o debe volver a cargar las imágenes desde cero? → A: Puede reintentar el mismo envío (mismas imágenes y orden) directamente desde la interfaz, sin volver a seleccionarlas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cargar y Procesar un Documento desde la Interfaz Web (Priority: P1)

Como usuario, quiero seleccionar las imágenes de un documento (una o varias páginas, en orden)
desde la interfaz web y enviarlas a procesar, para obtener el Markdown digitalizado sin tener
que usar la línea de comandos.

**Why this priority**: Es el punto de entrada de todo lo demás — sin poder cargar y procesar
documentos desde la UI, el explorador de archivos no tendría nada nuevo que mostrar. Es el MVP.

**Independent Test**: Con la interfaz abierta y sin usar la CLI en ningún momento, seleccionar
una o varias imágenes, confirmar el envío, y verificar que se genera un archivo Markdown
equivalente al que produciría la CLI con las mismas imágenes.

**Acceptance Scenarios**:

1. **Given** la interfaz está abierta y no hay imágenes cargadas, **When** el usuario selecciona
   una sola imagen y confirma el envío, **Then** el pipeline la procesa y el Markdown resultante
   queda disponible para el usuario.
2. **Given** la interfaz está abierta, **When** el usuario selecciona varias imágenes y las
   ordena como páginas de un mismo documento antes de confirmar, **Then** el pipeline las trata
   como un único documento multipágina y genera un solo Markdown combinado.
3. **Given** un envío fue confirmado, **When** el procesamiento está en curso, **Then** el
   usuario ve en la interfaz un indicador de que el trabajo está en progreso (no queda sin
   retroalimentación mientras el OCR/LLM corren).
4. **Given** el procesamiento fallara (ej. una imagen ilegible o un error del OCR/LLM), **When**
   esto ocurre, **Then** el usuario ve un mensaje de error claro, las imágenes originales
   permanecen intactas en disco, y puede reintentar el mismo envío (mismas imágenes y orden)
   directamente desde la interfaz sin volver a seleccionarlas.
5. **Given** el usuario intenta subir un archivo que no es jpg/png, **When** intenta enviarlo,
   **Then** la interfaz lo rechaza con un mensaje claro antes de que llegue al pipeline.
6. **Given** el usuario está por confirmar el envío a procesar, **When** revisa las opciones del
   envío, **Then** puede elegir si además del Markdown quiere que se genere una versión `.docx`
   de ese documento.

---

### User Story 2 - Explorar, Organizar y Descargar Documentos Procesados (Priority: P2)

Como usuario, quiero ver la lista de documentos que ya procesé, organizarlos en carpetas,
visualizar su contenido y descargarlos, para poder encontrar y llevarme mi trabajo anterior
fácilmente, incluso cuando accedo desde otro equipo.

**Why this priority**: Depende de que exista contenido generado por la Historia 1, pero es el
valor que se acumula con el uso continuo de la herramienta — sin esto, cada documento procesado
solo se podría encontrar buscando manualmente en el sistema de archivos.

**Independent Test**: Con archivos de salida ya existentes en la carpeta configurada (generados
previamente por la CLI o por la Historia 1), abrir el explorador, verificar que aparecen
listados, abrir uno para visualizarlo, crear una carpeta nueva, mover un archivo a esa carpeta,
y descargar un archivo a un equipo distinto al que corre el pipeline.

**Acceptance Scenarios**:

1. **Given** existen documentos procesados en la carpeta de salida, **When** el usuario abre el
   explorador de archivos, **Then** ve una lista/árbol que refleja exactamente lo que existe en
   disco (archivos y carpetas).
2. **Given** el usuario está viendo la lista, **When** selecciona un documento procesado,
   **Then** puede visualizar su contenido renderizado (incluyendo diagramas/imágenes embebidas)
   dentro de la misma interfaz.
3. **Given** el usuario quiere organizar sus documentos, **When** crea una carpeta nueva y mueve
   un documento a ella, **Then** el archivo cambia de ubicación física en disco y esa
   organización persiste porque es la carpeta real, no un estado de la aplicación.
4. **Given** el usuario está accediendo a la interfaz de forma remota desde otro dispositivo,
   **When** selecciona un documento, **Then** puede descargar una copia local a ese dispositivo.
5. **Given** aún no se ha procesado ningún documento, **When** el usuario abre el explorador,
   **Then** ve un estado vacío explicativo en vez de un error.
6. **Given** el usuario intenta crear una carpeta o mover un archivo con un nombre que ya existe
   en el destino, **When** confirma la acción, **Then** la interfaz le avisa del conflicto y le
   pide confirmar o elegir otro nombre, sin sobrescribir nada silenciosamente.

---

### Edge Cases

- ¿Qué pasa si el usuario cierra la pestaña del navegador mientras un documento se está
  procesando? El trabajo en curso no debe perderse silenciosamente ni bloquear futuros envíos.
- ¿Qué pasa si se confirman dos envíos de procesamiento al mismo tiempo? El sistema debe
  encolarlos y procesarlos en orden, no correrlos en paralelo sin control (el pipeline OCR/LLM
  local no está pensado para concurrencia simultánea).
- ¿Qué pasa si el usuario intenta mover una carpeta dentro de sí misma o de una de sus propias
  subcarpetas?
- ¿Qué pasa si la carpeta de salida configurada no existe o no tiene permisos de escritura al
  abrir el explorador o al intentar organizar archivos?
- ¿Qué pasa si se sube una cantidad muy grande de páginas en un solo documento?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al usuario seleccionar y cargar una o más imágenes
  (jpg/png) a través de la interfaz web.
- **FR-002**: El sistema DEBE permitir al usuario indicar que un conjunto de imágenes cargadas
  pertenece a un mismo documento y definir su orden de páginas, antes de enviarlas a procesar.
- **FR-003**: El sistema DEBE enviar las imágenes cargadas al mismo núcleo de pipeline que usa
  la CLI, produciendo un Markdown equivalente al que generaría la CLI con las mismas entradas.
- **FR-004**: El sistema DEBE mostrar al usuario el estado de un trabajo de procesamiento en
  curso (en cola, procesando, completado, fallido).
- **FR-005**: El sistema DEBE mostrar un mensaje de error claro y accionable si el procesamiento
  falla, sin modificar ni eliminar las imágenes originales cargadas, y DEBE permitir reintentar
  el mismo envío (mismas imágenes y orden) directamente desde la interfaz sin volver a
  seleccionarlas.
- **FR-006**: El sistema DEBE rechazar, antes de enviarlo al pipeline, cualquier archivo cargado
  que no sea una imagen jpg/png, con un mensaje claro al usuario.
- **FR-007**: El sistema DEBE listar todos los documentos procesados y carpetas existentes en la
  ubicación de salida configurada.
- **FR-008**: El sistema DEBE permitir al usuario abrir un documento procesado y visualizar su
  contenido renderizado (incluyendo imágenes/diagramas embebidos) dentro de la interfaz.
- **FR-009**: El sistema DEBE permitir al usuario crear nuevas carpetas dentro de la ubicación de
  salida para organizar sus documentos procesados.
- **FR-010**: El sistema DEBE permitir al usuario mover un documento procesado a una carpeta que
  haya creado.
- **FR-011**: El sistema DEBE permitir al usuario descargar un documento procesado individual a
  su dispositivo actual, incluyendo su Markdown, los recursos embebidos (ej. diagramas) y, si
  fue generado, su `.docx`; si el documento consta de más de un archivo, DEBE entregarse
  empaquetado (ej. comprimido) en una sola descarga.
- **FR-012**: El sistema DEBE permitir al usuario descargar todos los documentos de una carpeta
  como un solo paquete.
- **FR-013**: El sistema DEBE preguntar al usuario, al momento de confirmar el envío a procesar
  (Historia 1), si desea que además se genere una versión `.docx` del documento resultante.
- **FR-014**: El sistema DEBE avisar al usuario y pedir confirmación ante un conflicto de nombre
  al crear una carpeta o mover un archivo, en vez de sobrescribir silenciosamente.
- **FR-015**: La lista de documentos y carpetas que muestra el sistema DEBE reflejar en todo
  momento el estado real del sistema de archivos — el sistema NO DEBE mantener un índice o base
  de datos separado que pueda desincronizarse de lo que existe en disco.
- **FR-016**: La interfaz web y su acceso remoto DEBEN permanecer alcanzables únicamente desde
  los dispositivos del propio usuario dentro de su red privada configurada, nunca expuestos
  públicamente en internet.
- **FR-017**: El sistema NO DEBE requerir autenticación propia (usuario/contraseña); el control
  de acceso se apoya exclusivamente en la restricción de red del FR-016 (Tailscale/WireGuard).

### Key Entities

- **Documento Procesado**: resultado de una corrida completa del pipeline (OCR + LLM). Se
  identifica por su nombre/ruta en la carpeta de salida — nombre derivado automáticamente del
  origen (igual que hace la CLI hoy), sin paso de titulado manual al subir —, contiene el
  Markdown y los recursos embebidos (ej. diagramas renderizados), y su fecha de
  creación/modificación es la que reporta el propio sistema de archivos.
- **Carpeta de Organización**: carpeta real dentro de la ubicación de salida, creada por el
  usuario, que puede contener documentos procesados y otras subcarpetas.
- **Trabajo de Procesamiento**: representa un envío de imágenes al pipeline; tiene un estado
  (en cola, procesando, completado, fallido), incluye la elección del usuario de generar o no un
  `.docx` para ese envío, y al completarse queda asociado al Documento Procesado que generó.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede cargar un documento de varias páginas y arrancar su procesamiento
  desde la interfaz web, sin usar una terminal, en menos de 1 minuto de interacción.
- **SC-002**: El 100% de los documentos y carpetas que muestra el explorador corresponden
  exactamente a lo que existe en la ubicación de salida en ese momento (sin entradas fantasma ni
  faltantes).
- **SC-003**: Un usuario que accede desde otro dispositivo por la red privada remota puede
  encontrar un documento procesado anteriormente y descargarlo a ese dispositivo en menos de 2
  minutos desde que abre la interfaz.
- **SC-004**: Un usuario puede crear una carpeta y mover un documento a ella en 3 interacciones
  o menos (clics/taps).
- **SC-005**: El 95% de los fallos de procesamiento muestran un mensaje de error claro en
  pantalla, en vez de fallar en silencio o mostrar un error genérico.

## Assumptions

- Cada envío de procesamiento agrupa las imágenes seleccionadas en ese momento como páginas de
  un único documento, igual que hoy hace la CLI al recibir varias rutas de imagen en una sola
  invocación.
- Eliminar documentos o carpetas no está incluido en este alcance; si el usuario necesita borrar
  algo, puede hacerlo directamente en el sistema de archivos como lo haría hoy sin la UI.
- Editar el contenido de un documento ya procesado desde la interfaz no está incluido en este
  alcance — la interfaz solo visualiza; la edición sigue siendo posible abriendo el Markdown con
  cualquier editor de texto, como ya ocurre hoy.
- Renombrar un documento procesado desde la interfaz no está incluido en este alcance; si el
  usuario quiere cambiar el nombre autogenerado, puede renombrar el archivo directamente en el
  sistema de archivos, igual que hoy.
- El procesamiento de documentos se ejecuta de a uno a la vez (encolado); no se asume capacidad
  de correr múltiples trabajos de OCR/LLM en paralelo en el mismo equipo.
- La descarga de una carpeta completa se entrega como un único archivo comprimido.
