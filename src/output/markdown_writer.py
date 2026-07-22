from pathlib import Path


def derive_output_path(first_image_path: str) -> Path:
    """
    Deriva la ruta de salida a partir de la primera imagen del documento,
    cambiando su extensión a .md.
    """
    return Path(first_image_path).with_suffix(".md")


def write_markdown(markdown: str, output_path: str) -> Path:
    """
    Escribe el Markdown final a disco en UTF-8, creando el directorio
    padre si no existe. Nunca toca las imágenes originales.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(markdown, encoding="utf-8")
    return path
