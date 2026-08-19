# Pipeline: OCR + LLM + salida

[`pipeline.run_pipeline`](../reference/pipeline.md) es la única función que orquesta el flujo
completo. La CLI y la cola de trabajos de la web la llaman exactamente igual — ver
[Visión general](overview.md#dos-interfaces-un-solo-núcleo).

## 1. Preprocesamiento (`ocr/preprocess.py`)

[`preprocess_image`](../reference/ocr.md) convierte la imagen a escala de grises (y de vuelta a
BGR, que es lo que espera PaddleOCR) para normalizar el color antes del reconocimiento. Se evita
deliberadamente cualquier binarizado/threshold agresivo: se probó y empeoraba la detección de
texto en vez de ayudarla, porque los modelos de PaddleOCR están entrenados sobre fotos de
documentos "normales", no sobre imágenes binarizadas e invertidas.

## 2. OCR (`ocr/engine.py`)

[`OCREngine`](../reference/ocr.md) envuelve `PaddleOCR` con el modelo de idioma `es` (script
latino, cubre español + inglés mezclados) y sin los modelos auxiliares de orientación/desenrollado
de documento, que no aportan para fotos de notas ya razonablemente derechas. Devuelve, por línea
reconocida, el texto y su confianza (`rec_texts`/`rec_scores`).

## 3. Estructuración con LLM (`llm/`)

[`Structuring.to_markdown`](../reference/llm.md) envía a un LLM multimodal local (vía
[`OllamaClient`](../reference/llm.md)) el texto OCR de todas las páginas **junto con las imágenes
originales**, con un [prompt de sistema](../reference/llm.md) que exige:

- Corregir errores de OCR usando contexto (confusiones de caracteres, palabras cortadas/unidas,
  términos técnicos mal reconocidos), sin traducir nada.
- Nunca inventar, omitir ni reformular contenido — cada línea del original debe aparecer en la
  salida, en el mismo orden; una palabra irrecuperable se marca `[?palabra]` en vez de adivinarse.
- Reconstruir títulos, listas y párrafos a partir de las pistas del texto reconocido.
- Representar diagramas dibujados a mano (cajas, flechas, mapas conceptuales) como bloques
  ` ```mermaid ` usando la imagen de la página, no el OCR de texto.
- Responder únicamente con el Markdown resultante, sin envolver todo el documento en un bloque de
  código.

El modelo usado es el **modelo activo configurado** (`config.get_active_model()`), que el usuario
puede cambiar desde la interfaz web sin reiniciar nada — ver
[Selección de modelo](../features/003-ui-polish-model-switch.md). Debe ser multimodal, porque
`to_markdown` siempre adjunta las imágenes de página.

## 4. Salida (`output/`)

- [`write_markdown`](../reference/output.md) escribe el Markdown a disco en UTF-8, tal cual salió
  del LLM (con los bloques `mermaid` sin renderizar todavía).
- [`render_diagrams`](../reference/output.md) busca esos bloques, los renderiza a PNG con
  `mermaid-cli` (vía `npx`) y reemplaza cada bloque por su imagen. Si el render falla (ej. Node no
  disponible), el bloque mermaid se deja tal cual como texto, sin interrumpir el resto del
  documento.
- [`write_docx`](../reference/output.md) — solo si se pidió `--docx` — convierte el Markdown ya
  con los diagramas embebidos a un `.docx` editable, vía Pandoc (`pypandoc`).

Las imágenes originales nunca se modifican ni se sobrescriben (Principio VI de la constitución).
