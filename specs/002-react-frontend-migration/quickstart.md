# Quickstart: Validación de la Interfaz Web Desacoplada del Backend

Guía manual de validación. Reutiliza los mismos escenarios de
`specs/001-web-ui-upload-explorer/quickstart.md` para confirmar cero regresiones (US1), y agrega
los nuevos de accesibilidad y resiliencia ante backend caído (Clarifications de esta spec).

## Prerrequisitos

- Node.js + npm instalados (nuevos, obligatorios a partir de esta feature — antes eran
  opcionales, solo para `mermaid-cli`).
- Todo lo ya requerido por la feature 001 (Ollama corriendo, `uv sync`).

## Preparar y arrancar

```
cd frontend && npm install && npm run build
cd ..
uv run serve.py
```

Abrir `http://127.0.0.1:8000`.

(Para desarrollo activo del frontend con recarga en caliente: `npm run dev` dentro de
`frontend/`, con el backend corriendo aparte vía `uv run serve.py` — Vite hace de proxy hacia la
API, ver `research.md` §4.)

## Escenario 1 — Cero regresiones (US1)

Repetir **exactamente** los Escenarios 1 y 2 de `specs/001-web-ui-upload-explorer/quickstart.md`
(cargar, ver progreso, reintentar, explorar, organizar, descargar) contra la interfaz migrada, y
confirmar que el resultado es el mismo en cada paso.

## Escenario 2 — Accesibilidad (FR-010/FR-011)

1. Sin usar el mouse, navegar con `Tab`/`Shift+Tab`/`Enter`/`Espacio` desde que se abre la
   interfaz: seleccionar imágenes, marcar la casilla de `.docx`, enviar a procesar.
2. **Verificar**: cada control interactivo recibe foco visible, en un orden lógico.
3. Repetir la navegación completa por teclado en el explorador: abrir un documento, cerrarlo,
   crear una carpeta, mover un documento.
4. Con un lector de pantalla activado (ej. Narrator en Windows, VoiceOver en Mac), navegar ambas
   pantallas y **verificar** que cada botón/campo anuncia un nombre y función reconocibles (no
   "botón" a secas ni un ícono sin descripción).

## Escenario 3 — Backend sin conexión (FR-012)

1. Con la interfaz abierta y funcionando, detener el proceso de `serve.py`.
2. **Verificar**: la interfaz muestra un estado claro de "sin conexión con el servidor" (no un
   error de negocio genérico, no una pantalla congelada sin explicación).
3. Volver a arrancar `uv run serve.py`.
4. **Verificar**: la interfaz detecta la reconexión sola y vuelve a su estado normal, sin
   necesitar que el usuario recargue la página manualmente.

## Escenario 4 — Direcciones existentes se mantienen

1. Con la interfaz migrada corriendo, abrir directamente `http://127.0.0.1:8000/explorer` (sin
   pasar primero por `/`).
2. **Verificar**: carga el explorador correctamente (confirma que la ruta de captura general del
   backend sirve `index.html` y el enrutado del lado del cliente resuelve `/explorer`, ver
   `research.md` §4) — no un error 404.
