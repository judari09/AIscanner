from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from pipeline import run_pipeline


@dataclass
class PipelineResult:
    """
    Resultado de correr el pipeline sobre un documento.

    Parameters
    ----------
    markdown_path : pathlib.Path
        Ruta del Markdown generado.
    docx_path : pathlib.Path | None
        Ruta del `.docx` generado, o `None` si no se pidio (`export_docx=False`).
    """

    markdown_path: Path
    docx_path: Path | None


class PipelineRunner(Protocol):
    """
    Abstraccion sobre "algo que puede correr el pipeline OCR/LLM".

    La capa web depende de esta interfaz, no de `pipeline.run_pipeline`
    directamente (Principio III de la constitucion, Dependency Inversion):
    asi, `JobQueue` puede recibir cualquier implementacion intercambiable
    (por ejemplo un doble de prueba) sin conocer el core del pipeline.
    """

    def run(self, image_paths: list[Path], output_dir: Path, export_docx: bool) -> PipelineResult:
        """
        Procesa las paginas de un documento y escribe su salida en `output_dir`.

        Parameters
        ----------
        image_paths : list[pathlib.Path]
            Imagenes del documento, en orden de pagina.
        output_dir : pathlib.Path
            Carpeta del documento (ej. `OUTPUT_DIR/<nombre-documento>/`) donde
            debe quedar el Markdown resultante.
        export_docx : bool
            Si ademas debe generarse un `.docx`.

        Returns
        -------
        PipelineResult
            Rutas de los archivos generados.
        """
        ...


class CorePipelineRunner:
    """
    Adaptador delgado sobre `pipeline.run_pipeline` -- la unica implementacion
    real de `PipelineRunner` en este feature. No reimplementa OCR/LLM/output;
    solo traduce entre la forma que necesita la capa web (una carpeta de
    salida) y la firma que ya expone el core (Principio II: nucleo
    desacoplado de la interfaz).
    """

    def run(self, image_paths: list[Path], output_dir: Path, export_docx: bool) -> PipelineResult:
        """Ver `PipelineRunner.run`."""
        output_path = output_dir / f"{output_dir.name}.md"
        markdown_path, docx_path = run_pipeline(
            image_paths=[str(path) for path in image_paths],
            output_path=str(output_path),
            export_docx=export_docx,
        )
        return PipelineResult(markdown_path=markdown_path, docx_path=docx_path)
