# Research: Interfaz Web de Carga y Explorador de Archivos

Decisiones técnicas que resuelven los puntos abiertos del Technical Context. No hay preguntas
de producto pendientes (esas se resolvieron en `/speckit-clarify`); esto son decisiones de
implementación con default razonable, evaluadas contra la constitución del proyecto.

## 1. Framework web y renderizado de la interfaz

**Decision**: FastAPI (ya declarado en `pyproject.toml` como `fastapi[standard]`) sirviendo una
UI renderizada del lado del servidor con `Jinja2Templates` (incluido en el extra `standard`) y
JavaScript plano para la interactividad (subida con progreso, drag-and-drop, polling de estado,
árbol de carpetas).

**Rationale**: `fastapi[standard]` ya estaba en las dependencias antes de este feature, así que
no se agrega ninguna dependencia nueva para el framework ni para las plantillas ni para el
manejo de `multipart/form-data` (subida de archivos) — todo viene incluido en ese extra. Una UI
servida por el propio backend evita introducir una segunda cadena de build (Node/Vite/React)
solo para la interfaz de administración de un solo usuario; hoy Node solo es una dependencia
opcional para `mermaid-cli`, no una dependencia dura del proyecto, y este feature no cambia eso.

**Alternatives considered**:
- **SPA con React/Vite**: más flexible para interacciones ricas, pero exige Node como
  dependencia de build obligatoria y un pipeline de compilación nuevo, para una UI que en
  esencia son dos pantallas (subir, explorar). Se descarta por complejidad injustificada frente
  al alcance real del feature.
- **Streamlit/Gradio**: más rápido de prototipar, pero acopla la UI a un runtime propio que no
  encaja con el modelo de "un servidor FastAPI + su API" que ya se insinúa en el stack existente,
  y dificulta después exponer una API limpia si se quisiera otro cliente.

## 2. Cola de trabajos de procesamiento

**Decision**: Cola en memoria dentro del propio proceso de FastAPI (`asyncio.Queue` + una única
tarea worker en background) que ejecuta los trabajos de OCR/LLM de a uno a la vez.

**Rationale**: La spec (Assumptions) ya fija que el procesamiento es secuencial, no paralelo —
el pipeline OCR/LLM local no está pensado para correr varias instancias a la vez en el mismo
hardware. Una cola en memoria de un solo proceso cumple eso sin agregar infraestructura nueva
(broker, worker separado); es coherente con el Principio VI (sin estado persistente: si el
servidor se reinicia, la cola se vacía, y eso es aceptable porque las imágenes originales
subidas siguen en disco y el trabajo se puede reintentar, ver FR-005).

**Alternatives considered**:
- **Celery + Redis**: pensado para múltiples workers y colas distribuidas; para un solo usuario
  y un solo proceso worker, es una dependencia operativa (Redis corriendo aparte) que no aporta
  nada y contradice la simplicidad exigida por la arquitectura del proyecto.
- **`BackgroundTasks` de FastAPI por request**: no garantiza por sí solo que dos requests
  concurrentes se ejecuten en orden estrictamente secuencial; requeriría igual un lock/cola
  manual encima, así que se prefiere la cola explícita desde el inicio.

## 3. Notificación de estado del trabajo al usuario

**Decision**: Polling corto desde el JavaScript del cliente a `GET /api/jobs/{id}` (cada 1-2s
mientras el estado sea `queued`/`processing`).

**Rationale**: Un solo usuario, baja frecuencia de trabajos, sin necesidad de push en tiempo
real estricto — el polling es la opción con menos piezas móviles (no requiere gestionar
reconexiones de WebSocket/SSE) y es trivial de implementar con `fetch` en JS plano, consistente
con la decisión de no traer un framework de frontend.

**Alternatives considered**:
- **Server-Sent Events (SSE)**: FastAPI lo soporta bien (`StreamingResponse`), da
  retroalimentación más inmediata, pero agrega manejo de reconexión y de cierre de conexión que
  no se justifica para trabajos que típicamente duran segundos a pocos minutos.
- **WebSockets**: mismo argumento que SSE pero con más complejidad de protocolo; se descarta por
  ahora.

## 4. Ubicación de salida y de imágenes originales subidas

**Decision**: Se introduce `src/config.py` (módulo ya previsto desde el `CLAUDE.md` original,
no creado hasta ahora) con un valor `OUTPUT_DIR` configurable (por variable de entorno, con un
default razonable como `./output` relativo al directorio desde donde se ejecuta el servidor).
Ese `OUTPUT_DIR` es la raíz que usa el explorador de archivos (FR-007, FR-015). Cada documento
procesado desde la UI se guarda en `OUTPUT_DIR/<nombre-documento>/`, con el Markdown, sus
recursos embebidos, el `.docx` si se generó, y las imágenes originales subidas en una
subcarpeta `originales/` dentro de esa misma carpeta de documento.

**Rationale**: La CLI hoy deriva la ruta de salida de la ubicación de la imagen de entrada,
porque asume que el usuario ya tiene sus imágenes organizadas en disco. Una imagen subida desde
el navegador no tiene ese "lugar de origen" en el servidor — hay que decidir dónde vive.
Conservar los originales junto al resultado (en vez de borrarlos tras procesar) respeta el
espíritu de "las imágenes originales nunca se modifican ni se sobrescriben" del Principio II
aplicado a este nuevo canal de entrada, y le da al usuario una copia de respaldo de sus
manuscritos sin necesitar una base de datos para rastrearla (sigue siendo solo el sistema de
archivos, Principio VI).

**Alternatives considered**:
- **Borrar las imágenes subidas tras procesar**: más simple, pero pierde la única copia del
  manuscrito original si el usuario no guardó una copia por su cuenta antes de subirla — riesgo
  inaceptable para un escáner de documentos.
- **Carpeta de "uploads" separada de por vida, sin relación con el documento resultante**:
  complica la Historia 2 (habría que cruzar dos ubicaciones para saber qué original corresponde
  a qué documento procesado) sin necesidad, dado que no hay base de datos que haga ese cruce.

## 5. Empaquetado de descargas multi-archivo

**Decision**: `zipfile` de la librería estándar de Python para empaquetar la descarga de un
documento con más de un archivo (FR-011) y la descarga de una carpeta completa (FR-012).

**Rationale**: No agrega ninguna dependencia nueva; suficiente para el volumen de archivos de
un escáner de documentos personal.

**Alternatives considered**: librerías de compresión de terceros (ej. `py7zr`) — no aportan
nada sobre `zipfile` para este caso de uso y agregan una dependencia sin necesidad.

## 6. Punto de entrada del servidor web

**Decision**: Nuevo archivo `serve.py` en la raíz del repo, delgado (siguiendo el mismo patrón
que `main.py` para la CLI), que arranca `uvicorn` sobre la app de `src/web/app.py`. Comando:
`uv run serve.py`.

**Nota de implementación**: originalmente se planeó llamarlo `web.py`, pero eso colisiona con el
paquete `src/web/` una vez que `src/` está en `sys.path` — Python resuelve `import web.app` hacia
el propio archivo de la raíz en vez del paquete (un módulo regular siempre gana sobre un paquete
namespace, sin importar el orden en `sys.path`). Se detectó al intentar levantar el servidor por
primera vez y se corrigió renombrando el entry point a `serve.py`, sin tocar el nombre del
paquete `src/web/` (usado en muchos más lugares del diseño).

**Rationale**: Mantiene el Principio II (núcleo desacoplado de la interfaz) al mismo nivel que
ya existe entre `main.py`/`cli.py` y `pipeline.py` — un segundo punto de entrada delgado para la
segunda interfaz, sin mezclar el parseo de argumentos de la CLI con el arranque del servidor.

**Alternatives considered**: agregar un subcomando `serve` al `cli.py` existente — se descarta
porque mezclaría dos modelos de argumentos (posicionales de imágenes vs. flags de servidor) en
el mismo parser, y porque la CLI y la UI web son interfaces independientes por diseño
(Principio II), no una interfaz con modos.

## 7. Nota a futuro: empaquetado con Docker para distribución a otros usuarios

**No es parte de este feature.** Durante el diseño se planteó si el uso de `multipart/form-data`
para subir imágenes (§ contracts/api.md) podría dar problemas si más adelante la aplicación se
empaqueta con Docker para que **otros usuarios** (no solo el autor original) la instalen en su
propia red local. Se descartó como preocupación real: cada instalación Docker seguiría siendo de
un solo usuario en su propio equipo, exactamente el mismo modelo de hoy — no una instancia
compartida multiusuario. Por eso ninguna decisión de este plan cambia:

- Sin autenticación propia (FR-016/FR-017) sigue siendo válido — cada instancia sirve a un solo
  usuario, el control de acceso sigue siendo de red (Tailscale/WireGuard), ahora configurado por
  cada quien para su propia instancia.
- `OUTPUT_DIR` en disco y la `JobQueue` en memoria (single-process) siguen siendo correctos — no
  hay estado que compartir entre instancias de distintas personas.
- `multipart/form-data` sigue siendo la elección correcta para subir imágenes por red — Docker no
  cambia ese análisis (ver conversación de diseño); base64 seguiría sin aportar nada.

Lo que sí habrá que resolver cuando ese feature de empaquetado se especifique (candidato a su
propio `/speckit-specify` futuro, no de este plan):

1. **Alcance de Ollama desde el contenedor**: `localhost:11434` dentro de un contenedor no ve el
   Ollama del host salvo que se use `--network=host`, `host.docker.internal`, o se dockerice
   Ollama también (tiene imagen oficial).
2. **GPU passthrough opcional**: para quien quiera acelerar PaddleOCR con `paddlepaddle-gpu`,
   necesitaría `nvidia-container-toolkit`; CPU-only debe seguir siendo el default sin
   configuración extra, como hoy.
3. **Volumen persistente para `OUTPUT_DIR`**: para que los documentos procesados sobrevivan a que
   el contenedor se reinicie o se actualice.
