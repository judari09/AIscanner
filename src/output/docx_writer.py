from pathlib import Path

import pypandoc


def write_docx(markdown: str, output_path: str) -> Path:
    """
    Convierte el Markdown final a un .docx editable usando Pandoc. Las
    imágenes referenciadas en el Markdown (ej. diagramas ya renderizados
    por mermaid_renderer) se embeben automáticamente en el documento.
    """
    path = Path(output_path).with_suffix(".docx")
    path.parent.mkdir(parents=True, exist_ok=True)

    pypandoc.convert_text(
        markdown,
        to="docx",
        format="md",
        outputfile=str(path),
        extra_args=[f"--resource-path={path.parent}"],
    )
    return path
