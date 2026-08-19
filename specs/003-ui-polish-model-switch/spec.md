# Feature Specification: Mejora Visual de la Interfaz y Selección de Modelo LLM

**Feature Branch**: `[003-ui-polish-model-switch]`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Se necesitan mejoras visuales en la interfaz, ya se ha realizado una mejora en cuanto a la paleta de colores y unos pocos elementos visuales pero la apariencia general sigue siendo un poco pobre, por lo tanto en primer lugar los iconos de las pantallas deberían ser iconos en svg, una barra lateral colapsable, para que sean mas fácilmente reconocibles en la interfaz y no solo emojis como se ha puesto en primer lugar, por otro lado es importante que el usuario si lo desea y esta en las posibilidades de su propio equipo, pueda cambiar fácilmente de modelo local con ollama a un modelo mas potente mejorando sus digitalizaciones. US1-US3, RF1-RF3 (ver detalle abajo). Fuera de alcance: descargar nuevos modelos de Ollama desde la interfaz."

## Clarifications

### Session 2026-08-14

- Q: ¿Cuál debe ser el mecanismo exacto de ayuda contextual en dispositivos sin cursor de mouse (FR-014)? → A: Un control de ayuda visible (icono "?") junto a cada icono de pantalla que, al tocarlo, muestra el texto explicativo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cambiar el modelo LLM activo (Priority: P1)

Como usuario quiero poder cambiar de modelo LLM para mejorar el rendimiento y calidad de mis notas digitalizadas, aprovechando un equipo más potente cuando lo tengo disponible.

**Why this priority**: Es el cambio de mayor impacto funcional del conjunto: sin esto, el usuario queda atado permanentemente al modelo por defecto configurado en el código, sin importar qué tan buen hardware tenga disponible. Es la base sobre la que se apoya la Historia 2.

**Independent Test**: Con al menos dos modelos ya descargados en Ollama, el usuario entra a la pantalla de configuración, selecciona un modelo distinto al activo, y puede comprobar (lanzando una digitalización) que la corrida usa el nuevo modelo.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pantalla de configuración de modelo, **When** selecciona un modelo distinto al activo actualmente y confirma, **Then** ese modelo pasa a ser el modelo activo para todas las digitalizaciones futuras, hasta que el usuario lo cambie de nuevo.
2. **Given** el usuario ya cambió el modelo activo en una sesión anterior, **When** vuelve a abrir la aplicación, **Then** el modelo seleccionado previamente sigue activo (no se reinicia al valor por defecto de fábrica).
3. **Given** el modelo activo actual ya no está disponible en Ollama (por ejemplo, fue eliminado fuera de la aplicación), **When** el usuario abre la pantalla de configuración, **Then** la interfaz señala claramente que el modelo activo configurado no está disponible y le pide elegir uno de los modelos sí disponibles antes de digitalizar.

---

### User Story 2 - Ver los modelos de Ollama disponibles localmente (Priority: P1)

Como usuario quiero visualizar qué modelos de Ollama tengo descargados en mi equipo y poder cambiar entre ellos fácilmente para el digitalizador.

**Why this priority**: Sin visibilidad de qué modelos existen realmente en el equipo, la Historia 1 no se puede completar de forma confiable (el usuario tendría que adivinar nombres de modelo o consultarlos por fuera de la aplicación). Se implementa junto con la Historia 1 como parte del mismo flujo, pero se prueba de forma independiente.

**Independent Test**: Con Ollama corriendo y con modelos ya descargados localmente, el usuario abre la pantalla de configuración y ve la lista completa de modelos instalados, sin tener que consultar una terminal.

**Acceptance Scenarios**:

1. **Given** Ollama está corriendo localmente con uno o más modelos descargados, **When** el usuario abre la pantalla de configuración de modelo, **Then** ve la lista de esos modelos con su nombre, y cuál de ellos es el modelo activo actualmente.
2. **Given** Ollama está corriendo pero no tiene ningún modelo descargado todavía, **When** el usuario abre la pantalla de configuración, **Then** la interfaz indica que no hay modelos instalados y orienta al usuario a instalarlos por fuera de la aplicación (la descarga de modelos queda fuera de alcance de esta función).
3. **Given** Ollama no está corriendo o no es alcanzable desde la aplicación, **When** el usuario abre la pantalla de configuración, **Then** la interfaz muestra un mensaje claro de que no se pudo conectar con Ollama, en vez de una lista vacía sin explicación o un error técnico crudo.

---

### User Story 3 - Entender cada pantalla mediante ayuda contextual (Priority: P2)

Como usuario quiero poder entender rápidamente lo que puedo hacer en cada pantalla de la aplicación sin tener que ir a leer manuales complejos.

**Why this priority**: Mejora la usabilidad general y reduce fricción de aprendizaje, pero la aplicación ya es utilizable sin esto (las Historias 1 y 2 no dependen de ella). Se prioriza después porque entrega valor incremental, no bloqueante.

**Independent Test**: En cualquier pantalla de la aplicación, el usuario coloca el cursor sobre el icono representativo de esa pantalla (en la barra lateral) y ve aparecer una breve explicación de qué puede hacer ahí, sin navegar a ninguna otra parte.

**Acceptance Scenarios**:

1. **Given** el usuario tiene el cursor sobre un icono de pantalla en la barra lateral, **When** lo mantiene ahí un instante, **Then** aparece un texto breve explicando qué función cumple esa pantalla.
2. **Given** la barra lateral está colapsada (mostrando solo iconos, sin las etiquetas de texto), **When** el usuario pasa el cursor sobre un icono, **Then** igual aparece el texto explicativo de esa pantalla.
3. **Given** el usuario usa la aplicación desde una pantalla táctil sin cursor de mouse, **When** toca el control de ayuda ("?") junto al icono de una pantalla, **Then** aparece el mismo texto explicativo que se mostraría con el hover en escritorio.

---

### User Story 4 - Reconocer visualmente las pantallas y navegar con una barra lateral colapsable (Priority: P2)

Como usuario quiero que las pantallas de la aplicación se distingan mediante iconografía clara en vez de emojis, y quiero poder colapsar la barra lateral para ganar espacio de trabajo cuando lo necesite.

**Why this priority**: Es la mejora puramente visual/de reconocimiento (reemplazo de emojis por iconos SVG consistentes, barra lateral colapsable). Mejora la percepción de calidad y la usabilidad en pantallas pequeñas, pero no bloquea ninguna funcionalidad existente ni nueva.

**Independent Test**: El usuario abre la aplicación, identifica cada pantalla por su icono (sin depender de leer la etiqueta de texto), colapsa la barra lateral a un modo solo-iconos, y confirma que sigue pudiendo navegar entre pantallas en ese modo.

**Acceptance Scenarios**:

1. **Given** el usuario está en cualquier pantalla de la aplicación, **When** observa la barra lateral, **Then** cada pantalla se representa con un icono ilustrativo (no un emoji) coherente en estilo con el resto de la interfaz.
2. **Given** la barra lateral está expandida (iconos + etiquetas de texto), **When** el usuario acciona el control de colapsar, **Then** la barra lateral pasa a un modo compacto que muestra solo los iconos, liberando espacio horizontal para el contenido principal.
3. **Given** la barra lateral está colapsada, **When** el usuario acciona el control de expandir, **Then** vuelve a mostrarse con iconos y etiquetas de texto como antes.
4. **Given** el usuario colapsó la barra lateral y cierra la aplicación, **When** vuelve a abrirla más tarde, **Then** la barra lateral recuerda el último estado (colapsada o expandida) que el usuario dejó.

---

### Edge Cases

- ¿Qué pasa si el usuario cambia el modelo activo justo mientras hay una digitalización en curso? La digitalización en curso debe completarse con el modelo que estaba activo cuando se inició; el modelo nuevo solo aplica a digitalizaciones que empiecen después del cambio.
- ¿Qué pasa si dos pestañas/ventanas de la misma aplicación están abiertas y una cambia el modelo activo? La otra pestaña debe reflejar el modelo activo actualizado la próxima vez que consulte la configuración (por ejemplo, al abrir la pantalla de configuración o al iniciar una digitalización), no necesariamente en tiempo real.
- ¿Qué pasa si el usuario intenta iniciar una digitalización sin haber configurado nunca un modelo? Se usa el modelo por defecto de la aplicación (comportamiento actual) sin bloquear al usuario.
- ¿Qué pasa si la lista de modelos de Ollama es muy larga? La lista debe seguir siendo navegable (por ejemplo, con scroll) sin romper el diseño de la pantalla de configuración.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La interfaz DEBE mostrar la lista de modelos de Ollama disponibles localmente en el equipo del usuario, obtenida en el momento de abrir la pantalla de configuración (no una lista fija embebida en el código).
- **FR-002**: La interfaz DEBE indicar visualmente, dentro de esa lista, cuál es el modelo actualmente activo para las digitalizaciones.
- **FR-003**: El usuario DEBE poder seleccionar cualquier modelo de la lista de disponibles y confirmar el cambio como nuevo modelo activo.
- **FR-004**: Tras confirmar un cambio de modelo, la interfaz DEBE mostrar una confirmación visual explícita de que la configuración se aplicó correctamente.
- **FR-005**: Si el cambio de modelo no se puede aplicar (por ejemplo, pérdida de conexión con Ollama durante la confirmación), la interfaz DEBE informar al usuario del fallo y mantener sin cambios el modelo activo anterior.
- **FR-006**: El modelo activo seleccionado DEBE persistir entre cierres y reaperturas de la aplicación, aplicándose como modelo por defecto a toda digitalización que se inicie después del cambio, hasta que el usuario lo vuelva a cambiar.
- **FR-007**: Todas las digitalizaciones que se inicien DEBEN usar el modelo activo configurado en ese momento; el sistema no debe requerir que el usuario elija un modelo en cada digitalización individual.
- **FR-008**: Si Ollama no está accesible al consultar la lista de modelos, la interfaz DEBE mostrar un mensaje de error entendible para el usuario, distinguible de una lista vacía por no tener modelos instalados.
- **FR-009**: Si no hay ningún modelo instalado en Ollama, la interfaz DEBE indicarlo y orientar al usuario a instalar modelos por fuera de la aplicación; la aplicación NO DEBE ofrecer una función de descarga/instalación de modelos.
- **FR-010**: Cada pantalla principal de la aplicación DEBE representarse en la barra de navegación con un icono ilustrativo en formato vectorial (SVG), reemplazando el uso de emojis como iconografía de navegación.
- **FR-011**: La barra lateral de navegación DEBE poder colapsarse a un modo compacto (solo iconos) y expandirse de nuevo a su modo completo (iconos + etiquetas), mediante una acción explícita del usuario.
- **FR-012**: El estado de colapso/expansión de la barra lateral DEBE recordarse entre sesiones de uso de la aplicación.
- **FR-013**: Al mantener el cursor sobre el icono de una pantalla en la barra lateral (en cualquiera de sus dos modos, expandido o colapsado), la interfaz DEBE mostrar un texto breve que explique qué función cumple esa pantalla.
- **FR-014**: La ayuda contextual de FR-013 DEBE ser accesible también en dispositivos sin cursor de mouse mediante un control de ayuda visible ("?") junto a cada icono de pantalla, que al tocarse muestra el mismo texto explicativo.
- **FR-015**: La aplicación NO DEBE ofrecer ninguna función para descargar, instalar o eliminar modelos de Ollama; la gestión de modelos fuera de la selección del activo permanece fuera de la aplicación.

### Key Entities

- **Modelo LLM disponible**: representa un modelo de Ollama instalado localmente; se identifica por su nombre/etiqueta tal como lo reporta Ollama. No incluye metadatos que la aplicación deba inventar o completar por su cuenta.
- **Configuración de modelo activo**: el nombre del modelo actualmente seleccionado como activo para las digitalizaciones; es un valor único, persistente entre sesiones, independiente de cualquier documento o historial de digitalización.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede encontrar la pantalla de configuración de modelo, ver los modelos disponibles y cambiar el modelo activo en menos de 30 segundos, sin ayuda externa.
- **SC-002**: El 100% de las digitalizaciones iniciadas después de un cambio de modelo confirmado usan el nuevo modelo activo (verificable comparando el modelo reportado en la digitalización contra la configuración vigente).
- **SC-003**: Tras cada cambio de modelo exitoso, el usuario recibe una confirmación visual en menos de 2 segundos desde que confirma la selección.
- **SC-004**: En una prueba de reconocimiento con usuarios nuevos, al menos el 90% identifica correctamente el propósito de cada pantalla principal usando solo su icono y/o el texto de ayuda contextual, sin haber usado la aplicación antes.
- **SC-005**: El estado de la barra lateral (colapsada/expandida) elegido por el usuario se mantiene correctamente en el 100% de las reaperturas de la aplicación durante una misma instalación.

## Assumptions

- La conexión entre la interfaz y Ollama para listar modelos y para digitalizar es siempre local (localhost), consistente con el Principio I de la constitución del proyecto (ejecución 100% local); no se contempla listar modelos de un Ollama remoto.
- El cambio de modelo activo es una configuración de la aplicación (similar al modelo por defecto ya configurable hoy), no un registro de historial de digitalizaciones; por lo tanto, guardar y recordar el modelo activo entre sesiones no entra en conflicto con el principio de "sin estado persistente entre ejecuciones" del pipeline, que se refiere a no guardar historial de documentos procesados.
- Las pantallas principales de la aplicación (por ejemplo: cargar/digitalizar documentos, explorar archivos generados, configuración de modelo) son las que reciben icono propio e icono de ayuda contextual; no se espera iconografía nueva para elementos secundarios dentro de cada pantalla.
- "Modelo más potente" es una decisión que el usuario toma por su cuenta según el hardware disponible; la aplicación no valida ni recomienda automáticamente si un modelo es demasiado pesado para el equipo del usuario.
- El listado de modelos disponibles se limita a los modelos ya descargados/instalados en la instalación local de Ollama del usuario; no se contempla mostrar un catálogo de modelos descargables desde internet (eso queda fuera de alcance según lo indicado explícitamente).
- La ayuda contextual (RF3) se limita a explicar el propósito de cada pantalla desde la barra lateral; no sustituye documentación más extensa que pueda existir por fuera de la aplicación.
