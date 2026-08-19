# Quickstart: Validación de la Interfaz Web de Carga y Explorador de Archivos

Guía manual para comprobar que el feature funciona de punta a punta. No reemplaza pruebas
automatizadas (el proyecto no tiene un framework de tests configurado — ver `CLAUDE.md`); es la
validación de referencia hasta que se decida introducir uno.

## Prerrequisitos

- Ollama corriendo en `localhost:11434` con el modelo configurado (ver README del proyecto).
- `uv sync` ejecutado con las dependencias del feature ya declaradas (`fastapi[standard]` ya
  estaba en `pyproject.toml`; no se agregan dependencias nuevas — ver `research.md`).
- Dos o tres imágenes de páginas manuscritas de prueba (jpg/png) a mano.
- (Opcional, para validar el acceso remoto) Tailscale instalado y configurado en el equipo que
  corre el servidor y en un segundo dispositivo, ambos en el mismo tailnet.

## Arrancar el servidor

```
uv run serve.py
```

Debe imprimir la URL local (ej. `http://127.0.0.1:8000`) y, si aplica, la IP de Tailscale del
equipo para el acceso remoto (ej. `http://100.x.y.z:8000`).

## Escenario 1 — Cargar y procesar un documento (Historia 1 / US1)

1. Abrir la URL local en el navegador.
2. Seleccionar 2-3 imágenes de páginas de prueba, en el orden correcto.
3. Marcar (o no) la opción de generar `.docx`.
4. Confirmar el envío.
5. **Verificar**: la interfaz muestra el estado pasando por `en cola` → `procesando` →
   `completado`, sin que el usuario tenga que refrescar la página manualmente.
6. **Verificar**: al completarse, aparece un enlace/acceso al documento resultante.
7. **Verificar** (comparación con la CLI, FR-003): correr
   `uv run main.py <mismas imágenes>` por separado y confirmar que el Markdown generado por la
   CLI y el generado por la UI son equivalentes en contenido (mismo texto reconstruido).

### Caso de error y reintento

1. Provocar un fallo controlado (ej. renombrar temporalmente el modelo de Ollama a uno
   inexistente, o subir una imagen corrupta).
2. **Verificar**: la interfaz muestra un mensaje de error claro y ofrece un botón de reintentar.
3. Corregir la causa del fallo (ej. restaurar el modelo) y pulsar reintentar.
4. **Verificar**: el trabajo se reprocesa con las mismas imágenes, sin pedir volver a
   seleccionarlas, y termina en `completado`.

### Caso de archivo inválido

1. Intentar subir un archivo `.pdf` o `.txt`.
2. **Verificar**: la interfaz lo rechaza antes de enviarlo a procesar, con un mensaje claro.

## Escenario 2 — Explorar, organizar y descargar (Historia 2 / US2)

1. Con al menos un documento ya procesado (del Escenario 1), abrir la sección de explorador.
2. **Verificar**: el documento aparece listado con el nombre derivado automáticamente.
3. Abrirlo y **verificar** que el contenido se visualiza renderizado dentro de la interfaz,
   incluyendo cualquier diagrama embebido.
4. Crear una carpeta nueva (ej. "pruebas") y mover el documento a ella.
5. **Verificar** en el sistema de archivos (fuera del navegador) que la carpeta
   `OUTPUT_DIR/pruebas/` existe de verdad y contiene la carpeta del documento — no es solo un
   estado de la interfaz.
6. Intentar crear otra carpeta con el mismo nombre "pruebas".
7. **Verificar**: la interfaz avisa del conflicto en vez de sobrescribir.
8. Descargar el documento individual.
9. **Verificar**: el archivo descargado incluye el Markdown, sus recursos embebidos, y el
   `.docx` si se generó en el Escenario 1 (empaquetado en `.zip` si son varios archivos).
10. Descargar la carpeta "pruebas" completa.
11. **Verificar**: se descarga un único `.zip` con todo su contenido.

### Caso vacío

1. Con `OUTPUT_DIR` vacío (o apuntando a una carpeta nueva), abrir el explorador.
2. **Verificar**: se muestra un estado vacío explicativo, no un error.

## Escenario 3 — Acceso remoto vía Tailscale (opcional, valida FR-016/FR-017)

1. Desde un segundo dispositivo conectado al mismo tailnet, abrir
   `http://<IP-tailscale-del-servidor>:8000`.
2. **Verificar**: la interfaz carga igual que en local.
3. Repetir la descarga de un documento (paso 8 del Escenario 2) desde este segundo dispositivo.
4. **Verificar**: el archivo queda descargado localmente en ese segundo dispositivo.
5. **Verificar** (negativo): la misma URL no es accesible desde un dispositivo fuera del
   tailnet (ej. datos móviles sin Tailscale activo) — confirma que no hay exposición pública
   (FR-016).
