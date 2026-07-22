from llm.client import OllamaClient
from llm.prompts import SYSTEM_PROMPT, build_user_message


def _strip_outer_code_fence(markdown: str) -> str:
    """
    Quita un bloque de código que envuelva TODO el documento (ej. el modelo
    respondiendo ```markdown ... ```), algo que le pedimos que no haga pero
    que los LLM hacen de todos modos con frecuencia. No toca bloques internos
    (como los ```mermaid``` de diagramas), solo la primera y última línea.
    """
    lines = markdown.strip().splitlines()
    if not lines or not lines[-1].strip() == "```":
        return markdown

    first_line = lines[0].strip()
    if first_line == "```" or (first_line.startswith("```") and first_line[3:] != "mermaid"):
        return "\n".join(lines[1:-1]).strip()

    return markdown


class Structuring:
    """Corrige y estructura el resultado OCR en Markdown, usando un LLM multimodal."""

    def __init__(self, client: OllamaClient | None = None):
        """
        Args:
            client: cliente de Ollama a usar; si no se da, se crea uno con
                `gemma3:4b` (modelo multimodal, necesario porque `to_markdown`
                también recibe las imágenes de cada página).
        """
        self.client = client or OllamaClient(model_name="gemma3:4b")

    def to_markdown(self, pages: list[list[str]], images: list[bytes] | None = None) -> str:
        """
        Corrige errores de OCR y estructura el resultado en Markdown, usando
        también las imágenes originales para mejorar la fidelidad y detectar
        diagramas dibujados a mano.

        Args:
            pages: una lista de páginas, cada página es la lista de líneas de
                texto reconocidas por PaddleOCR para esa página, en orden de
                lectura (ej. [page["rec_texts"] for page in ocr_result]).
            images: los bytes crudos de cada imagen de página, en el mismo
                orden que `pages`.
        """
        user_message = build_user_message(pages)
        response = self.client.chat(SYSTEM_PROMPT, user_message, images=images)
        return _strip_outer_code_fence(response)
