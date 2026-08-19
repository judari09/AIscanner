# Feature Specification: Interfaz Web Desacoplada del Backend

**Feature Branch**: `002-react-frontend-migration`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "se debe migrar la vista actual del sistema a un front mas desacoplado del core del sitema, garantizando posible extensibilidad a futuro en aspectos visuales y mas libertad del back de añadir funcionalidades, de modo que tambien se pueda mejorar la experiencia de usuario desde la vista"

## Clarifications

### Session 2026-08-10

- Q: ¿La migración debe incluir un criterio medible de rapidez percibida (ej. navegación entre pantallas sin recarga completa)? → A: No — la mejora de experiencia de usuario queda como objetivo cualitativo, sin métrica de rendimiento en esta spec.
- Q: ¿Se exige accesibilidad (navegación por teclado, lector de pantalla) como requisito de esta migración? → A: Sí, como requisito estricto — navegación completa por teclado y etiquetas accesibles para lector de pantalla en todos los flujos principales.
- Q: ¿Qué debe pasar si el backend no está disponible mientras la interfaz ya está abierta (ej. el servidor se reinició)? → A: La interfaz debe mostrar un estado claro de "sin conexión con el servidor", distinto de un error de negocio normal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ninguna Funcionalidad Existente se Pierde en la Migración (Priority: P1)

Como usuario, quiero seguir pudiendo cargar documentos, ver su progreso, explorarlos, organizarlos
en carpetas y descargarlos exactamente igual que antes, para que la migración de la interfaz no
me haga perder capacidades que ya tenía.

**Why this priority**: Es la condición mínima para que la migración sea aceptable — un
desacople que rompe funcionalidad existente no es una mejora, es un retroceso. Sin esto no hay
base sobre la cual construir nada nuevo.

**Independent Test**: Repetir los mismos escenarios de validación ya usados en la interfaz
actual (cargar un documento con varias páginas, ver su estado hasta completarse, reintentar un
fallo, explorar lo procesado, crear una carpeta, mover un documento, descargarlo) contra la
interfaz migrada y confirmar que el resultado es el mismo.

**Acceptance Scenarios**:

1. **Given** la interfaz migrada está abierta, **When** el usuario carga imágenes y las envía a
   procesar, **Then** el comportamiento (estado en vivo, reintento ante fallo, resultado final)
   es el mismo que en la interfaz actual.
2. **Given** existen documentos ya procesados, **When** el usuario abre el explorador migrado,
   **Then** puede listarlos, visualizarlos, organizarlos en carpetas y descargarlos igual que
   antes.
3. **Given** el usuario accede desde otro dispositivo por su red privada, **When** abre la
   interfaz migrada, **Then** sigue siendo alcanzable de la misma forma que antes de migrar, sin
   quedar expuesta públicamente.
4. **Given** la interfaz está abierta, **When** el backend deja de responder (ej. se reinició),
   **Then** la interfaz muestra un estado claro de "sin conexión" en vez de quedarse congelada o
   mostrar un error de negocio confuso, y se recupera sola cuando el backend vuelve.

---

### User Story 2 - Extender la Interfaz o el Backend sin que uno Bloquee al Otro (Priority: P2)

Como responsable de mantener el proyecto, quiero poder rediseñar o agregar pantallas a la
interfaz sin tocar código del backend, y poder agregar capacidades al backend sin tener que
reescribir la interfaz existente, para poder evolucionar ambos lados a su propio ritmo — algo
que hoy no es posible porque la interfaz está mezclada con el mismo proceso que sirve la lógica
del servidor.

**Why this priority**: Es la razón de ser de la migración — sin este desacople, cada mejora
visual futura (ej. una vista de configuración, una barra lateral colapsable, edición de
documentos) seguiría acoplada al mismo código del servidor y sería cada vez más costosa de
mantener.

**Independent Test**: Agregar o modificar un elemento puramente visual (ej. cambiar un color, un
texto o el orden de un menú) sin tocar ningún archivo del backend, y confirmar que sigue
funcionando contra el mismo backend sin que este se haya modificado ni redesplegado.

**Acceptance Scenarios**:

1. **Given** la interfaz ya migrada, **When** se modifica solo su código (sin tocar el backend),
   **Then** el cambio se refleja sin requerir ningún cambio en el servidor.
2. **Given** el backend agrega una capacidad nueva sin romper el contrato de comunicación ya
   existente, **When** la interfaz sigue corriendo sin cambios, **Then** todo lo que ya
   funcionaba antes sigue funcionando igual.
3. **Given** un desarrollador quiere entender solo la lógica visual o solo la lógica del
   servidor, **When** revisa el código, **Then** puede hacerlo mirando una sola parte, sin
   necesitar entender la otra para modificar la que le interesa.

---

### Edge Cases

- ¿Qué pasa si la herramienta necesaria para preparar la nueva interfaz no está instalada en el
  equipo? El sistema debe avisar con un mensaje claro de qué falta, no fallar de forma críptica.
- ¿Qué pasa con un enlace o marcador guardado a una dirección de la interfaz actual (ej. al
  explorador con una ruta específica abierta) después de migrar? Debe seguir llevando al mismo
  lugar.
- ¿Qué pasa si, más adelante, el backend cambia su forma de responder de manera incompatible con
  lo que la interfaz espera? Debe notarse de forma clara durante el desarrollo, no en silencio.
- ¿Qué pasa si el backend deja de responder mientras la interfaz ya está abierta (ej. el usuario
  reinició `serve.py`)? La interfaz debe mostrar un estado claro de "sin conexión con el
  servidor", distinto de un error de negocio normal (como un archivo inválido o un fallo de
  procesamiento), y debe recuperarse sola en cuanto el backend vuelva a responder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir cargar uno o más documentos y ver el progreso de su
  procesamiento (incluyendo reintento ante fallo) con el mismo comportamiento que tiene hoy la
  interfaz de carga.
- **FR-002**: El sistema DEBE permitir listar, visualizar, organizar en carpetas y descargar los
  documentos ya procesados con el mismo comportamiento que tiene hoy el explorador.
- **FR-003**: La interfaz DEBE comunicarse con el backend únicamente a través de su API HTTP ya
  definida, sin depender de detalles internos de implementación del servidor.
- **FR-004**: DEBE ser posible modificar o agregar una pantalla, componente o estilo visual sin
  necesitar cambiar código del backend.
- **FR-005**: DEBE ser posible agregar una capacidad nueva al backend (mientras no rompa el
  contrato de comunicación ya existente) sin que eso obligue a modificar la interfaz ya
  construida.
- **FR-006**: El sistema DEBE seguir siendo alcanzable únicamente desde la red privada del
  usuario, sin exposición pública — sin regresión respecto al comportamiento ya establecido.
- **FR-007**: El sistema NO DEBE requerir autenticación propia — sin regresión respecto a la
  decisión ya establecida.
- **FR-008**: La herramienta de línea de comandos DEBE seguir funcionando de forma completamente
  independiente de la interfaz web, sin ninguna dependencia nueva hacia ella.
- **FR-009**: El sistema DEBE mostrar un mensaje de error claro si falta algún requisito para
  preparar o ejecutar la nueva interfaz, en vez de fallar sin explicación.
- **FR-010**: Los flujos principales (cargar y procesar un documento; explorar, organizar y
  descargar documentos ya procesados) DEBEN poder completarse usando exclusivamente el teclado,
  sin necesitar un mouse/puntero.
- **FR-011**: Todo control interactivo de la interfaz (botones, campos, enlaces, ítems de
  navegación) DEBE exponer una etiqueta accesible que un lector de pantalla pueda anunciar.
- **FR-012**: La interfaz DEBE mostrar un estado claro de "sin conexión con el servidor" cuando
  una petición falla porque el backend no responde, distinguible de un error de negocio normal
  (ej. archivo inválido, fallo de procesamiento), y DEBE recuperarse automáticamente cuando el
  backend vuelva a estar disponible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las funcionalidades ya existentes (carga y procesamiento, explorador,
  organización, descarga) siguen funcionando después de la migración, verificado contra los
  mismos escenarios de validación usados antes de migrar.
- **SC-002**: Se puede modificar o agregar un elemento visual a la interfaz sin tocar ni volver a
  desplegar el backend.
- **SC-003**: Se puede agregar una capacidad nueva al backend sin necesitar modificar la interfaz
  ya construida, siempre que no rompa el contrato de comunicación existente.
- **SC-004**: Una persona que solo necesita cambiar la apariencia de la interfaz puede hacerlo
  revisando únicamente el código de la interfaz, sin tener que leer el código del servidor.
- **SC-005**: Un usuario puede completar el flujo de carga y el de exploración/organización de
  principio a fin usando exclusivamente el teclado, sin necesitar el mouse.
- **SC-006**: El 100% de los controles interactivos de la interfaz son anunciados correctamente
  por un lector de pantalla (nombre y función reconocibles, no solo un ícono sin descripción).

## Assumptions

- Es un reemplazo completo de la interfaz actual, no una convivencia permanente de dos
  interfaces distintas — una vez migrada una pantalla, la versión anterior de esa pantalla se
  retira.
- Las direcciones que ya usa la interfaz hoy (la de carga y la del explorador) se mantienen
  iguales tras la migración, para no romper accesos ya guardados.
- Esta migración es la base sobre la que se construirán mejoras visuales futuras ya conversadas
  (una vista de configuración, una barra lateral colapsable, edición de documentos existentes),
  pero esas mejoras concretas no son parte de esta migración — se especifican por separado.
- El contrato de comunicación entre la interfaz y el backend ya definido (endpoints existentes)
  se mantiene sin cambios como parte de esta migración; solo cambia cómo la interfaz se organiza
  y se construye internamente.
- La restricción de acceso únicamente por red privada y la ausencia de autenticación propia
  siguen siendo las decisiones vigentes del proyecto — esta migración no las reabre.
- La mejora de experiencia de usuario es un objetivo cualitativo de esta migración, no uno con
  métrica de rendimiento propia — se puede revisar más adelante si hace falta, pero no es un
  criterio de aceptación de esta spec.
