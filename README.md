# aiscanner

Escáner de notas manuscritas 100% local: combina [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) para extraer el texto con un LLM multimodal corriendo en [Ollama](https://ollama.com) para corregir errores de OCR, reconstruir la estructura del documento y generar Markdown editable — incluyendo diagramas dibujados a mano, convertidos a [Mermaid](https://mermaid.js.org) y renderizados como imagen. Nada de lo que escaneas sale de tu máquina.

## Requisitos

- **Python 3.10 a 3.12** (paddlepaddle no publica wheels para 3.13+ todavía). Gestionado con [`uv`](https://docs.astral.sh/uv/).
- **[Ollama](https://ollama.com)** corriendo en `localhost:11434`, con el modelo `gemma3:4b` descargado:

  ```
  ollama pull gemma3:4b
  ```

  (es multimodal — recibe texto e imágenes a la vez — y es el que usa `Structuring` por defecto).
- **GPU NVIDIA (opcional)**: si tienes una y quieres acelerar PaddleOCR, necesitas el CUDA Toolkit y cuDNN instalados a nivel de sistema, con sus carpetas `bin` en el `PATH` (ver `pyproject.toml` para la versión exacta de `paddlepaddle-gpu` usada). Sin GPU, PaddleOCR corre en CPU sin configuración extra.
- **Node.js + npm** (opcional, solo si tus notas tienen diagramas/dibujos): se usa para renderizar los bloques Mermaid a PNG vía `npx @mermaid-js/mermaid-cli`. La primera vez descarga Chromium (~700MB) y queda cacheado. Si no está instalado, los diagramas simplemente quedan como código Mermaid en el Markdown en vez de imagen.
- **Pandoc** (opcional, solo para exportar a `.docx`): se descarga solo la primera vez que se usa `--docx`, vía `pypandoc`.

## Instalación

```
uv sync
```

Esto instala las dependencias de Python declaradas en `pyproject.toml` (incluye `paddleocr`, `paddlepaddle-gpu`, `langchain-ollama`, `pypandoc`, etc.).

## Uso

```
uv run main.py <imagen1> [imagen2 ...] [-o salida.md] [--docx]
```

- Las imágenes son las páginas de un mismo documento, en orden — se combinan en un solo Markdown coherente.
- `-o/--output`: ruta del Markdown de salida. Si no se da, se deriva del nombre de la primera imagen (ej. `notas/1.jpeg` → `notas/1.md`).
- `--docx`: además del Markdown, genera un `.docx` editable con el mismo contenido (incluyendo los diagramas ya renderizados como imagen).

Ejemplos:

```
# Una sola página
uv run main.py notas/pagina1.jpg

# Documento de varias páginas, con ruta de salida explícita
uv run main.py notas/pag1.jpg notas/pag2.jpg notas/pag3.jpg -o notas/documento.md

# También exportar a Word
uv run main.py notas/pagina1.jpg --docx
```

## Interfaz web

Además de la CLI, hay una interfaz web local para cargar documentos y explorar lo ya procesado
sin usar la terminal:

```
uv run serve.py
```

Abre `http://127.0.0.1:8000` en el navegador. Desde ahí puedes:

- **Cargar**: seleccionar las imágenes de un documento (en orden de página), elegir si generar
  también un `.docx`, y ver el estado del procesamiento en vivo (con opción de reintentar si
  falla).
- **Explorador**: ver los documentos ya procesados (por la CLI o por la propia interfaz web),
  visualizarlos, organizarlos en carpetas, y descargarlos.

**Acceso remoto**: si quieres abrir la interfaz desde otro dispositivo (ej. tu teléfono), usa
[Tailscale](https://tailscale.com) (o WireGuard) para conectar ambos equipos a una red privada
— la interfaz no tiene autenticación propia, así que **no** la expongas con un túnel público
(ngrok, Cloudflare Tunnel, etc.); el único control de acceso es que solo tus propios dispositivos
en tu red privada puedan alcanzarla. Con Tailscale activo en el equipo que corre `serve.py`,
`uv run serve.py` imprime la URL a usar desde tus otros dispositivos.

## Cómo funciona (resumen)

1. Cada imagen se preprocesa (normalización a escala de grises) y pasa por PaddleOCR, que devuelve el texto reconocido línea por línea.
2. El texto OCR de todas las páginas, junto con las imágenes originales, se envía a un LLM multimodal local (Ollama) con instrucciones estrictas de: corregir errores de OCR usando contexto, no inventar ni omitir contenido, reconstruir títulos/listas/párrafos, y representar diagramas dibujados a mano como bloques Mermaid.
3. Los bloques Mermaid se renderizan a PNG (si Node/mermaid-cli están disponibles) y se embeben en el Markdown.
4. El Markdown final se escribe a disco; si se pidió `--docx`, se convierte además a Word con Pandoc.
