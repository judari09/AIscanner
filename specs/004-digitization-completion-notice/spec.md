# Feature Specification: Aviso de Digitalización Completada

**Feature Branch**: `[004-digitization-completion-notice]`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Es necesario mejora la experiencia de usuario, en el momento de generar los videos por lo tanto ademas del estado de procesando, considero que se debe incluir en la vista de carga de archivos un mensaje emergente en el cual al finalizar el procesamiento de sus imagenes, le diga donde debe ir a mirar sus archivos y con que nombre fueron generados los ultimos archivos y asi estar mas conciente de que lo que genero"

## Clarifications

### Session 2026-08-14

- Q: ¿Cómo debe funcionar la acción de "ir directo al documento" del aviso (US2/FR-008)? → A: Enlace directo que abre el documento ya seleccionado en el explorador (requiere que el explorador acepte navegar directo a un documento específico).
- Q: ¿Qué tan específica debe ser la "ubicación" que describe el texto del aviso (FR-002/SC-001)? → A: Mensaje genérico ("disponible en el Explorador"), sin mostrar la ruta de carpeta interna -- el enlace directo ya resuelve llegar al documento sin necesitar esa ruta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver un aviso al terminar la digitalización (Priority: P1)

Como usuario, cuando termina de procesarse mi documento quiero que aparezca un mensaje visible que me diga dónde encontrar mis archivos generados y cómo se llaman, para saber de inmediato qué se creó sin tener que ir a buscarlo por mi cuenta.

**Why this priority**: Es el problema concreto que motiva la feature: hoy el usuario puede perderse el momento exacto en que termina el procesamiento y no queda claro, de forma llamativa, qué se generó ni dónde. Sin este aviso, el resto de la mejora (acceso directo, poder descartarlo) no tiene sobre qué aplicarse.

**Independent Test**: Se sube un documento a digitalizar y se espera a que termine; se puede verificar que aparece un mensaje visible indicando la ubicación y el nombre del archivo generado, sin tener que ir a otra pantalla a comprobarlo.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pantalla de carga con una digitalización en curso, **When** el procesamiento termina exitosamente, **Then** aparece un mensaje visible que indica dónde puede consultar sus archivos generados y con qué nombre se guardó el documento.
2. **Given** el usuario pidió también generar un archivo Word además del Markdown, **When** el procesamiento termina exitosamente, **Then** el mensaje muestra el nombre de ambos archivos generados, no solo el del Markdown.
3. **Given** el procesamiento de un documento falla, **When** el usuario ve el resultado, **Then** no aparece este mensaje de éxito (el aviso de error ya existente sigue funcionando igual que antes).

---

### User Story 2 - Ir directo al documento recién generado (Priority: P2)

Como usuario quiero poder ir directamente a ver mi documento recién generado desde el mismo mensaje, para no tener que navegar manualmente y buscarlo por nombre en el explorador.

**Why this priority**: Aumenta el valor del aviso de la Historia 1 (no solo informa, también ahorra la búsqueda manual), pero el mensaje ya es útil por sí solo sin esta acción adicional -- por eso es un incremento posterior, no bloqueante.

**Independent Test**: Con el mensaje de finalización visible, se puede activar la acción de "ver documento" (o equivalente) y llegar al documento recién generado sin tener que escribir o recordar su nombre ni su ubicación.

**Acceptance Scenarios**:

1. **Given** el mensaje de finalización está visible, **When** el usuario activa la acción de ir a su documento, **Then** llega directamente al explorador con ese documento específico ya abierto para consultar su contenido, sin tener que ubicarlo manualmente en la lista de archivos.

---

### User Story 3 - Descartar el aviso cuando ya no lo necesito (Priority: P3)

Como usuario quiero poder cerrar el mensaje manualmente, y que desaparezca solo si no lo cierro, para que no me estorbe mientras sigo trabajando en la pantalla de carga.

**Why this priority**: Es un refinamiento de comodidad sobre las historias anteriores -- el aviso ya cumple su función informativa sin esto, pero evita que se quede indefinidamente en pantalla estorbando al usuario.

**Independent Test**: Con el mensaje de finalización visible, se puede cerrar manualmente con una acción explícita, y por separado, se puede confirmar que desaparece solo después de un tiempo si no se interactúa con él.

**Acceptance Scenarios**:

1. **Given** el mensaje de finalización está visible, **When** el usuario activa la acción de cerrarlo, **Then** el mensaje desaparece de inmediato.
2. **Given** el mensaje de finalización está visible y el usuario no interactúa con él, **When** pasa un tiempo razonable, **Then** el mensaje desaparece por sí solo.
3. **Given** el mensaje de finalización sigue visible, **When** el usuario inicia una nueva digitalización desde la misma pantalla, **Then** puede hacerlo sin que el mensaje se lo impida.

---

### Edge Cases

- Si se generan varios archivos en una misma digitalización (Markdown + Word), el mensaje debe mostrar los nombres de todos, no solo uno.
- Si el usuario navega fuera de la pantalla de carga antes de que el procesamiento termine, el aviso es específico de esa pantalla (Assumptions) y puede no llegar a mostrarse si el usuario ya no está ahí cuando el trabajo concluye.
- Si el usuario termina una digitalización, ve el aviso, y luego inicia otra desde la misma pantalla antes de que la anterior desaparezca, el aviso nuevo (al terminar la segunda digitalización) reemplaza al anterior en vez de acumularse.
- Si el procesamiento anterior falló y el usuario lo reintenta con éxito, el aviso de finalización exitosa debe aparecer igual que en un primer intento exitoso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al completarse exitosamente una digitalización, el sistema DEBE mostrar en la pantalla de carga un mensaje visible de finalización, distinto del estado de "procesando" ya existente.
- **FR-002**: El mensaje DEBE indicar, en términos generales y no técnicos (ej. "disponible en el Explorador"), dónde puede el usuario consultar sus archivos generados, sin mostrar rutas de carpeta internas del sistema (Clarifications, sesión 2026-08-14).
- **FR-003**: El mensaje DEBE mostrar el nombre del archivo Markdown generado.
- **FR-004**: Si la digitalización también generó un archivo Word, el mensaje DEBE mostrar también el nombre de ese archivo.
- **FR-005**: El mensaje NO DEBE impedir que el usuario siga usando la pantalla de carga mientras está visible (ej. iniciar una nueva digitalización).
- **FR-006**: El usuario DEBE poder cerrar el mensaje manualmente en cualquier momento.
- **FR-007**: Si el usuario no cierra el mensaje manualmente, el sistema DEBE hacerlo desaparecer por sí solo después de un tiempo razonable.
- **FR-008**: El mensaje DEBE incluir una acción que lleve directamente al documento recién generado ya abierto para su consulta, sin que el usuario tenga que ubicarlo manualmente en la lista de archivos del explorador (Clarifications, sesión 2026-08-14).
- **FR-009**: Si la digitalización falla, el sistema NO DEBE mostrar este mensaje de finalización exitosa; el manejo de errores existente permanece sin cambios.
- **FR-010**: Si se completa una nueva digitalización mientras el mensaje de una anterior sigue visible en la misma pantalla, el sistema DEBE mostrar el mensaje correspondiente a la más reciente en vez de acumular varios mensajes a la vez.

### Key Entities

- **Aviso de finalización**: representa el resultado de una digitalización recién completada con éxito, que se muestra transitoriamente en la pantalla de carga; contiene la referencia a dónde consultar los archivos generados y el/los nombre(s) de archivo producidos (Markdown y, si aplica, Word). No se conserva entre sesiones ni se guarda como historial -- vive solo mientras la pantalla de carga está abierta (ver Assumptions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al terminar una digitalización exitosa, el 100% de los usuarios que siguen en la pantalla de carga ven un mensaje con el nombre del archivo y una referencia clara de dónde consultarlo, en menos de 2 segundos desde que el proceso concluye.
- **SC-002**: Los usuarios pueden llegar a consultar su documento recién generado con una sola acción desde el mensaje, sin necesidad de recordar su nombre ni navegar manualmente por carpetas.
- **SC-003**: En una prueba de usabilidad, al menos el 90% de los usuarios nuevos puede indicar correctamente el nombre de su documento y saber que puede consultarlo en el Explorador, inmediatamente después de completarse el proceso, sin ayuda externa.
- **SC-004**: El mensaje de finalización no impide ni retrasa que un usuario inicie una nueva digitalización desde la misma pantalla.

## Assumptions

- El aviso es específico de la pantalla de carga de archivos, tal como lo pidió el usuario ("incluir en la vista de carga de archivos"); no se contempla mostrarlo desde otras pantallas (ej. el explorador) ni conservar un historial de avisos pasados.
- Un tiempo razonable de desaparición automática, si el usuario no interactúa, es del orden de varios segundos (suficiente para leer nombre y ubicación sin sentirse apurado) -- el valor exacto es un detalle de implementación, no una decisión de producto que deba fijarse aquí.
- "Dónde debe ir a mirar sus archivos" se resuelve señalando el explorador de documentos ya existente en la aplicación (Historia 2 de la feature 001), reutilizando el concepto de ubicación que el usuario ya conoce de esa pantalla.
- Como el explorador (feature 001/002) hoy solo abre un documento cuando el usuario lo selecciona manualmente en la lista, satisfacer FR-008 implica una extensión acotada de esa pantalla para que pueda abrir directamente el documento indicado por el aviso (Clarifications, sesión 2026-08-14) -- sigue siendo una mejora de experiencia de usuario, no un cambio en qué genera el pipeline ni en su formato de salida.
- Solo se hace seguimiento de una digitalización a la vez por pantalla de carga (comportamiento ya existente); por eso "reemplazar en vez de acumular" (FR-010) es un caso límite y no un requisito de manejar una cola de avisos.
- Esta mejora es puramente de experiencia de usuario en el frontend: no cambia qué archivos genera el pipeline, ni su ubicación, ni su nomenclatura -- solo comunica mejor lo que ya se genera hoy.
