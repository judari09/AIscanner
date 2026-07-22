import argparse

from pipeline import run_pipeline


def build_parser() -> argparse.ArgumentParser:
    """
    Construye el parser de argumentos del CLI: una o más imágenes de entrada,
    la ruta de salida opcional del Markdown, y el flag opcional --docx.
    """
    parser = argparse.ArgumentParser(
        prog="aiscanner",
        description="Digitaliza notas manuscritas (una o más imágenes) a Markdown.",
    )
    parser.add_argument(
        "images",
        nargs="+",
        help="Rutas de las imágenes del documento, en orden (páginas de un mismo documento).",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Ruta del Markdown de salida. Si no se da, se deriva del nombre de la primera imagen.",
    )
    parser.add_argument(
        "--docx",
        action="store_true",
        help="Además del Markdown, genera un .docx editable derivado del mismo contenido.",
    )
    return parser


def main():
    """
    Punto de entrada del CLI: parsea los argumentos, corre el pipeline
    completo sobre las imágenes dadas, e imprime las rutas de los archivos
    generados (Markdown y, si se pidió --docx, también el Word).
    """
    parser = build_parser()
    args = parser.parse_args()

    markdown_path, docx_path = run_pipeline(args.images, args.output, export_docx=args.docx)
    print(f"Documento generado en: {markdown_path}")
    if docx_path:
        print(f"Word generado en: {docx_path}")


if __name__ == "__main__":
    main()
