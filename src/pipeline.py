from pathlib import Path

from ocr.engine import OCREngine
from llm.structuring import Structuring
from output.markdown_writer import derive_output_path, write_markdown
from output.mermaid_renderer import render_diagrams
from output.docx_writer import write_docx


def run_pipeline(
    image_paths: list[str],
    output_path: str | None = None,
    export_docx: bool = False,
) -> tuple[Path, Path | None]:
    """
    Orquesta el flujo completo de un documento: preprocess -> ocr -> llm -> output.

    El Markdown se escribe a disco con la salida del LLM tal cual (bloques
    ```mermaid``` sin renderizar todavía, si los hay). Después se renderizan
    los diagramas a PNG; esa versión con las imágenes ya embebidas es la que
    se usa para generar el .docx cuando export_docx es True.

    Parameters
    ----------
    image_paths : list[str]
        Rutas de las imágenes que forman un mismo documento (páginas), en
        orden.
    output_path : str | None
        Ruta de salida explícita para el Markdown; si no se da, se deriva
        del nombre de la primera imagen.
    export_docx : bool
        Si es `True`, además del Markdown genera un `.docx` derivado del
        contenido con los diagramas ya renderizados.

    Returns
    -------
    tuple[pathlib.Path, pathlib.Path | None]
        `(ruta_markdown, ruta_docx)`, donde `ruta_docx` es `None` si
        `export_docx` es `False`.
    """
    ocr_engine = OCREngine()

    pages = []
    images = []
    for image_path in image_paths:
        ocr_result = ocr_engine.perform_ocr(image_path)
        pages.append(ocr_result[0]["rec_texts"])
        images.append(Path(image_path).read_bytes())

    markdown = Structuring().to_markdown(pages, images)

    final_output_path = output_path or derive_output_path(image_paths[0])
    
    markdown_path = write_markdown(markdown, final_output_path)
    markdown = render_diagrams(markdown, final_output_path)
    docx_path = write_docx(markdown, final_output_path) if export_docx else None
    return markdown_path, docx_path
