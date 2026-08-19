# Research: Mejora Visual de la Interfaz y Selección de Modelo LLM

## 1. Cómo listar los modelos de Ollama instalados localmente (FR-001)

**Decision**: Usar el SDK oficial `ollama` (paquete Python), ya presente en `pyproject.toml`
como dependencia pero sin ningún uso directo hoy — probablemente arrastrado por
`langchain-ollama`. Un módulo nuevo, `src/llm/model_catalog.py`, envuelve
`ollama.Client(host=base_url).list()` y devuelve solo los nombres de modelo, sin exponer el
objeto crudo del SDK al resto de la aplicación.

**Rationale**: Evita reinventar el parseo de la respuesta de Ollama (`GET /api/tags` HTTP crudo)
cuando ya existe una dependencia declarada que lo hace, con manejo de errores de conexión ya
resuelto. Mantiene la capa `llm/` como el único lugar que sabe hablar con Ollama (Principio II),
igual que `OllamaClient` ya hace para el chat.

**Alternatives considered**: Llamar directamente `GET {base_url}/api/tags` con `httpx`/`requests`
— se descarta porque añadiría una dependencia HTTP nueva solo para reimplementar lo que el SDK ya
declarado resuelve.

## 2. Dónde y cómo persistir el modelo activo (FR-006)

**Decision**: Un archivo JSON nuevo, `settings.json`, en una carpeta de configuración local
separada de `OUTPUT_DIR` (ej. `./config/settings.json`, ruta configurable por variable de entorno
igual que `AISCANNER_OUTPUT_DIR` en `config.py`). `config.py` gana `get_active_model()` (lee el
archivo si existe, si no devuelve el modelo de fábrica) y `set_active_model(name)` (escribe el
archivo). `Structuring.__init__` pasa a usar `get_active_model()` como su modelo por defecto en
vez del literal `"gemma3:4b"`.

**Rationale**: Mantiene separados dos conceptos que la constitución distingue explícitamente:
`OUTPUT_DIR` es el "único lugar de verdad" de documentos procesados (Principio VI); el modelo
activo es una preferencia de aplicación, conceptualmente igual al "modelo por defecto,
configurable en `config.py`" que la constitución ya contemplaba desde el inicio del proyecto —
simplemente pasa de ser un valor fijo en código a uno editable desde la UI y persistido en disco.
Como este archivo vive fuera de `OUTPUT_DIR`, no hay riesgo de que el explorador de archivos
(001/002) lo confunda con un documento generado.

**Alternatives considered**: Guardar el modelo activo dentro de `OUTPUT_DIR` — se descarta porque
mezclaría configuración de aplicación con documentos de usuario, y el explorador ya asume que
todo lo que hay ahí es contenido navegable. Variables de entorno en vez de archivo — se descarta
porque no se pueden escribir desde la propia aplicación en tiempo de ejecución (RF2 exige que el
cambio se aplique sin reiniciar el proceso).

## 3. Validar el modelo antes de aplicarlo (FR-005)

**Decision**: `PUT /api/config/active-model` primero llama al catálogo de modelos (§1); si Ollama
no responde, devuelve error sin tocar el archivo de configuración; si responde pero el
`model_name` pedido no está en la lista devuelta, también devuelve error sin persistir. Solo si
el modelo está confirmado como instalado se llama a `set_active_model`.

**Rationale**: Es la única forma de cumplir FR-005 ("mantener sin cambios el modelo activo
anterior" si el cambio no se puede aplicar) sin duplicar esa validación en el frontend, que no
tiene forma confiable de saber si la lista que vio hace unos segundos sigue vigente (edge case de
spec.md: el usuario pudo haber desinstalado el modelo fuera de la aplicación mientras la pantalla
seguía abierta).

**Alternatives considered**: Confiar en que el frontend solo deja seleccionar modelos ya listados
— se descarta porque no cubre el caso de que el modelo se vuelva inválido *entre* que se listó y
que se confirmó el cambio.

## 4. Iconografía SVG sin dependencia externa (FR-010)

**Decision**: Componentes React propios en `frontend/src/components/icons/`, cada uno un único
`<svg>` inline (trazos simples, coherentes con la paleta ya definida en `tokens.css`), sin
instalar una librería de iconos (`lucide-react`, `react-icons`, etc.).

**Rationale**: El set de iconos necesario es pequeño y fijo (3 pantallas + un chevron de
colapso + un icono de ayuda), así que una librería completa sería una dependencia nueva empaquetada
en el build para cubrir 5 símbolos. Consistente con la misma lógica que ya usó 002 para preferir
HTML/SVG semántico propio antes que traer una dependencia por conveniencia (research.md §2 de esa
feature).

**Alternatives considered**: Una librería de iconos SVG (`lucide-react`) — se descarta por ser
una dependencia nueva desproporcionada al alcance; un *sprite sheet* SVG servido como archivo
estático — se descarta porque con solo 5 iconos no compensa la complejidad adicional frente a
componentes React directos, que además permiten pasar `aria-hidden`/props de forma más natural.

## 5. Barra lateral colapsable con estado persistente (FR-011/FR-012)

**Decision**: Un hook `useSidebarCollapse` en `frontend/src/hooks/` que lee/escribe una clave de
`localStorage` (ej. `aiscanner:sidebar-collapsed`) y expone el estado + una función para
alternarlo. `Sidebar.tsx` consume ese hook para decidir su clase CSS (modo compacto vs. completo).

**Rationale**: Mismo patrón que 002 ya dejó anotado como aceptable para preferencias de UI
puramente visuales sin relación con documentos (research.md §6 de esa feature, que dejó esta
decisión pendiente explícitamente para "la futura feature de sidebar colapsable" — esta es esa
feature). `localStorage` es por navegador/dispositivo, lo cual es razonable: dos dispositivos
distintos accediendo a la misma instalación (ej. vía Tailscale desde el escritorio y desde una
tablet) pueden tener preferencias de espacio en pantalla distintas sin necesidad de sincronizarlas.

**Alternatives considered**: Persistir el estado en el backend (como el modelo activo) — se
descarta porque el colapso es una preferencia puramente visual por dispositivo/pantalla, no una
configuración funcional que deba compartirse entre todos los accesos a la misma instalación (a
diferencia del modelo activo, que sí determina qué corre el pipeline).

## 6. Ayuda contextual accesible sin mouse (FR-013/FR-014, Clarifications)

**Decision**: `ScreenHelpTooltip` envuelve cada icono de pantalla en la barra lateral con: (a) un
`title`/`aria-describedby` nativo que el navegador ya muestra en hover de escritorio, y (b) un
control visible adicional, un botón pequeño con icono "?" (`HelpIcon`), que al recibir foco/tap
muestra el mismo texto en un popover simple. Esto aplica igual en modo expandido y colapsado de
la barra lateral (US3, escenario 2).

**Rationale**: La sesión de clarificación del spec (2026-08-14) resolvió explícitamente que el
mecanismo para dispositivos sin mouse es un control de ayuda visible, no un gesto oculto como
mantener presionado — un botón "?" es descubrible por sí mismo y funciona igual con teclado
(foco) que con touch (tap), sin necesitar detección de tipo de dispositivo.

**Alternatives considered**: Detectar `touch` vía media query y solo entonces mostrar el botón
"?" — se descarta porque complica el componente sin necesidad: mostrar siempre el control de
ayuda no estorba en escritorio (es un botón pequeño junto al icono) y evita bifurcar el
comportamiento por tipo de dispositivo.

## 7. Impacto en la CLI

**Decision**: Ninguno directo — `cli.py` sigue llamando `run_pipeline` sin parámetros de modelo;
como `Structuring` ahora lee `config.get_active_model()` como su default, la CLI hereda
automáticamente el modelo activo elegido desde la web, sin que `cli.py` ni `pipeline.py` necesiten
cambiar una sola línea.

**Rationale**: Es la consecuencia directa de que el núcleo del pipeline sea el mismo para CLI y
web (Principio II) — cambiar el punto donde `Structuring` obtiene su modelo por defecto basta
para que ambas interfaces compartan el cambio.
