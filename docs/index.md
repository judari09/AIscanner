# aiscanner

![aiscanner: digitaliza notas manuscritas con OCR + IA local](assets/banner.svg)

**Escáner de notas manuscritas 100% local.** Combina [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
para extraer el texto con un LLM multimodal corriendo en [Ollama](https://ollama.com) para
corregir errores de OCR, reconstruir la estructura del documento y generar Markdown editable —
incluyendo diagramas dibujados a mano, convertidos a [Mermaid](https://mermaid.js.org) y
renderizados como imagen. Nada de lo que escaneas sale de tu máquina.

<div class="grid cards" markdown>

- :material-rocket-launch:{ .lg .middle } **Primeros pasos**

    ---

    Requisitos, instalación y cómo correr la CLI o la interfaz web.

    [:octicons-arrow-right-24: Guía de inicio](getting-started.md)

- :material-sitemap:{ .lg .middle } **Arquitectura**

    ---

    Cómo fluye un documento desde la imagen hasta el Markdown final, y cómo
    está dividido el código entre CLI, backend web y frontend.

    [:octicons-arrow-right-24: Visión general](architecture/overview.md)

- :material-book-open-page-variant:{ .lg .middle } **Referencia de API**

    ---

    Documentación generada automáticamente a partir de los docstrings
    (numpydoc) de cada módulo Python del proyecto.

    [:octicons-arrow-right-24: Ver referencia](reference/cli.md)

- :material-history:{ .lg .middle } **Historial de features**

    ---

    Las especificaciones (spec-kit) de cada feature construida: qué se
    pidió, qué se decidió y por qué.

    [:octicons-arrow-right-24: Ver historial](features/001-web-ui-upload-explorer.md)

</div>

## Principios del proyecto

- **100% local y privado**: OCR y LLM corren en la máquina del usuario; ningún documento ni texto
  extraído sale hacia un servicio externo.
- **Núcleo desacoplado de la interfaz**: la CLI y la interfaz web comparten el mismo pipeline
  (`preprocess → OCR → LLM → output`); ninguna reimplementa el flujo por su cuenta.
- **Sin estado persistente entre ejecuciones**: cada corrida es `imagen(es) → Markdown`, sin base
  de datos ni historial de documentos procesados — solo el sistema de archivos.

Esta documentación se genera con [MkDocs](https://www.mkdocs.org/) +
[Material](https://squidfunk.github.io/mkdocs-material/) a partir del propio código fuente
(docstrings) y de las especificaciones versionadas del proyecto, para que se mantenga
sincronizada con lo que el código realmente hace.
