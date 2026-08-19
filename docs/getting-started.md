# Guía de inicio

## Requisitos

- **Python 3.10 a 3.12** (paddlepaddle no publica wheels para 3.13+ todavía). Gestionado con
  [`uv`](https://docs.astral.sh/uv/).
- **[Ollama](https://ollama.com)** corriendo en `localhost:11434`, con al menos un modelo
  multimodal descargado (recibe texto e imágenes a la vez):

  ```sh
  ollama pull gemma3:4b
  ```

  Es el modelo de fábrica si nunca elegiste otro desde la interfaz web (ver
  [Selección de modelo](features/003-ui-polish-model-switch.md)).
- **GPU NVIDIA (opcional)**: si tienes una y quieres acelerar PaddleOCR, necesitas el CUDA
  Toolkit y cuDNN instalados a nivel de sistema, con sus carpetas `bin` en el `PATH` (ver
  `pyproject.toml` para la versión exacta de `paddlepaddle-gpu` usada). Sin GPU, PaddleOCR corre
  en CPU sin configuración extra.
- **Node.js + npm**: obligatorio para compilar la interfaz web (`frontend/`, React + Vite).
  Además, si tus notas tienen diagramas/dibujos, se usa para renderizarlos a PNG vía
  `npx @mermaid-js/mermaid-cli` (la primera vez descarga Chromium, ~700MB, y queda cacheado) — si
  esto último no está disponible, los diagramas simplemente quedan como código Mermaid en el
  Markdown en vez de imagen, pero Node en sí ya no es opcional si vas a usar la interfaz web.
- **Pandoc** (opcional, solo para exportar a `.docx`): se descarga solo la primera vez que se usa
  `--docx`, vía `pypandoc`.

## Instalación

```sh
uv sync
```

Esto instala las dependencias de Python declaradas en `pyproject.toml` (incluye `paddleocr`,
`paddlepaddle-gpu`, `langchain-ollama`, `pypandoc`, etc.).

## Uso por línea de comandos

```sh
uv run main.py <imagen1> [imagen2 ...] [-o salida.md] [--docx]
```

- Las imágenes son las páginas de un mismo documento, en orden — se combinan en un solo Markdown
  coherente.
- `-o/--output`: ruta del Markdown de salida. Si no se da, se deriva del nombre de la primera
  imagen (ej. `notas/1.jpeg` → `notas/1.md`).
- `--docx`: además del Markdown, genera un `.docx` editable con el mismo contenido (incluyendo
  los diagramas ya renderizados como imagen).

Ejemplos:

```sh
# Una sola página
uv run main.py notas/pagina1.jpg

# Documento de varias páginas, con ruta de salida explícita
uv run main.py notas/pag1.jpg notas/pag2.jpg notas/pag3.jpg -o notas/documento.md

# También exportar a Word
uv run main.py notas/pagina1.jpg --docx
```

La CLI es un punto de entrada delgado sobre [`pipeline.run_pipeline`](reference/pipeline.md) — ver
[Arquitectura del pipeline](architecture/pipeline.md) para el detalle de cada paso.

## Interfaz web

Además de la CLI, hay una interfaz web local (React + Vite, independiente del backend) para
cargar documentos y explorar lo ya procesado sin usar la terminal:

```sh
cd frontend && npm install && npm run build
cd ..
uv run serve.py
```

El primer paso (`npm install && npm run build`) solo hace falta una vez, o cada vez que cambie el
código de `frontend/`. Para desarrollo activo del frontend con recarga en caliente, corre
`npm run dev` dentro de `frontend/` con el backend ya corriendo aparte — Vite hace de proxy hacia
la API.

Abre `http://127.0.0.1:8000` en el navegador. Desde ahí puedes:

- **Cargar**: seleccionar las imágenes de un documento (en orden de página), elegir si generar
  también un `.docx`, y ver el estado del procesamiento en vivo (con opción de reintentar si
  falla y un aviso al terminar con el nombre de los archivos generados).
- **Explorador**: ver los documentos ya procesados (por la CLI o por la propia interfaz web),
  visualizarlos, organizarlos en carpetas, y descargarlos.
- **Configuración**: ver qué modelos de Ollama tienes instalados localmente y elegir cuál usa el
  digitalizador.

Ver [Frontend web](architecture/frontend.md) para el detalle de cada pantalla y componente.

### Acceso remoto

Si quieres abrir la interfaz desde otro dispositivo (ej. tu teléfono), usa
[Tailscale](https://tailscale.com) (o WireGuard) para conectar ambos equipos a una red privada.
La interfaz **no tiene autenticación propia**, así que **no** la expongas con un túnel público
(ngrok, Cloudflare Tunnel, etc.) — el único control de acceso es que solo tus propios dispositivos
en tu red privada puedan alcanzarla. Con Tailscale activo en el equipo que corre `serve.py`,
`uv run serve.py` imprime la URL a usar desde tus otros dispositivos.

## Servir esta documentación

Esta documentación (MkDocs) también corre 100% local:

```sh
uv run mkdocs serve
```

Abre `http://127.0.0.1:8001` (o el puerto que imprima la consola). `uv run mkdocs build` genera
el sitio estático en `site/` para publicarlo donde quieras.
