import re
import subprocess
from pathlib import Path

MERMAID_BLOCK_RE = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)


def render_diagrams(markdown: str, output_path: str) -> str:
    """
    Busca bloques ```mermaid``` en el Markdown y los reemplaza por imágenes
    PNG renderizadas con mermaid-cli (vía npx), guardadas junto al archivo
    de salida. Si el render de un diagrama falla (ej. Node/npx no está
    instalado), deja ese bloque mermaid tal cual, sin interrumpir el resto
    del documento.
    """
    matches = list(MERMAID_BLOCK_RE.finditer(markdown))
    if not matches:
        return markdown

    output_dir = Path(output_path).parent
    output_stem = Path(output_path).stem

    result = markdown
    for i, match in enumerate(matches, start=1):
        diagram_source = match.group(1)
        image_name = f"{output_stem}_diagrama_{i}.png"
        image_path = output_dir / image_name

        if _render_mermaid(diagram_source, image_path):
            replacement = f"![Diagrama {i}]({image_name})"
            result = result.replace(match.group(0), replacement, 1)
        else:
            print(f"Aviso: no se pudo renderizar el diagrama {i}; se deja como bloque mermaid.")

    return result


def _render_mermaid(diagram_source: str, image_path: Path) -> bool:
    """
    Renderiza un diagrama mermaid a PNG invocando `mermaid-cli` (`mmdc`) vía
    `npx`, que se descarga solo (junto con Chromium) la primera vez que se
    usa y luego queda cacheado localmente. Requiere Node.js/npm instalados.

    Args:
        diagram_source: el código mermaid (sin las vallas ```mermaid```).
        image_path: ruta donde se debe guardar el PNG resultante; se usa la
            misma ruta con extensión .mmd como archivo temporal de entrada,
            que se borra al terminar.

    Returns:
        True si el PNG se generó correctamente, False si algo falló (mmdc
        no disponible, error de mermaid-cli, timeout, etc.) — en cuyo caso
        quien llama debe conservar el bloque mermaid original como texto.
    """
    mmd_path = image_path.with_suffix(".mmd")
    mmd_path.write_text(diagram_source, encoding="utf-8")

    try:
        subprocess.run(
            ["npx", "--yes", "@mermaid-js/mermaid-cli", "-i", str(mmd_path), "-o", str(image_path)],
            shell=True,
            capture_output=True,
            timeout=600,
            check=True,
        )
        return image_path.exists()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return False
    finally:
        mmd_path.unlink(missing_ok=True)
