import re

from config import get_active_model
from llm.client import OllamaClient
from llm.prompts import SYSTEM_PROMPT, build_user_message

# Línea que es (solo) una valla de bloque de código, con o sin lenguaje
# despues de las vallas (ej. "```" o "```mermaid"). Alinea "solo vallas" con
# la convención de Markdown: una valla de cierre nunca lleva lenguaje.
_FENCE_LINE_RE = re.compile(r"^```(\S*)\s*$")

# Señal de que una línea todavía parece código/mermaid (flechas, corchetes de
# nodo, llaves, parentesis, o una palabra clave típica de mermaid) en vez de
# prosa del documento -- se usa para decidir dónde cerrar una valla que el
# LLM dejó abierta, sin esperar a otra valla explícita.
_CODE_LIKE_LINE_RE = re.compile(
    r"-->|---|[\[{(]|^\s*(flowchart|graph|subgraph|end|classDef|click)\b",
    re.IGNORECASE,
)


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


def _close_unclosed_code_fences(markdown: str) -> str:
    """
    Cierra cualquier bloque de código (mermaid u otro) que el LLM haya
    abierto y nunca cerrado.

    Es un problema real observado en producción: el modelo a veces abre
    ```mermaid (a veces incluso envuelto en un ```markdown que tampoco
    cierra) y nunca escribe la valla de cierre. El efecto no es solo que ese
    diagrama no se renderice -- un bloque de código sin cerrar hace que
    CUALQUIER renderizador de Markdown (el visor del Explorador, GitHub,
    Pandoc para el .docx) trate todo lo que sigue como texto de código,
    rompiendo la visualización del resto del documento, no solo la del
    diagrama.

    Estrategia: se recorre el documento línea por línea llevando la cuenta
    de si estamos dentro de una valla abierta. Una línea de valla CON
    lenguaje (ej. ```mermaid) siempre abre -- nunca se interpreta como
    cierre de la anterior, ni siquiera si ya había una abierta: si eso pasa,
    es que el LLM abandonó la valla previa sin cerrarla, así que se sintetiza
    su cierre justo antes de tratar la nueva línea como una apertura nueva.
    Solo una valla SIN lenguaje (``` a secas) cuenta como cierre de una ya
    abierta. Si el documento termina todavía dentro de una valla, se cierra
    al final. Si en cambio aparece una línea en blanco seguida de contenido
    que ya no parece código (prosa normal, sin flechas/corchetes de
    mermaid), se asume que el LLM olvidó la valla justo ahí y se cierra en
    ese punto, para no atrapar el resto del documento dentro del bloque. Un
    último repaso quita los pares abrir+cerrar que quedaron vacíos (el caso
    ```markdown seguido inmediatamente de otra apertura, sin contenido
    real en medio).

    Parameters
    ----------
    markdown : str
        El Markdown ya procesado por `_strip_outer_code_fence`.

    Returns
    -------
    str
        El mismo Markdown, con toda valla de apertura ya emparejada con su
        cierre, y sin pares abrir+cerrar vacíos.
    """
    lines = markdown.splitlines()
    fixed: list[str] = []
    fence_open = False

    for index, line in enumerate(lines):
        stripped = line.strip()
        fence_match = _FENCE_LINE_RE.match(stripped)

        if fence_match:
            has_language = fence_match.group(1) != ""
            if fence_open and has_language:
                # Otra apertura mientras ya había una valla abierta: el LLM
                # abandonó la anterior sin cerrarla. Se sintetiza ese cierre
                # antes de tratar esta línea como una apertura nueva.
                fixed.append("```")
            elif fence_open:
                # Valla sin lenguaje mientras había una abierta: cierre real.
                fence_open = False
                fixed.append(line)
                continue
            fixed.append(line)
            fence_open = True
            continue

        if fence_open and stripped == "":
            next_content = next(
                (candidate.strip() for candidate in lines[index + 1 :] if candidate.strip()),
                "",
            )
            if next_content and not _CODE_LIKE_LINE_RE.search(next_content):
                fixed.append("```")
                fence_open = False

        fixed.append(line)

    if fence_open:
        fixed.append("```")

    return _remove_empty_fence_pairs(fixed)


def _remove_empty_fence_pairs(lines: list[str]) -> str:
    """
    Quita pares de vallas que quedaron sin ningún contenido real en medio
    (ej. un ```markdown al que `_close_unclosed_code_fences` le sintetizó un
    cierre inmediato porque el LLM abrió otra valla justo después, sin
    escribir nada dentro de la primera).

    Parameters
    ----------
    lines : list[str]
        Líneas del Markdown, ya con todas las vallas emparejadas.

    Returns
    -------
    str
        El Markdown resultante, unido con saltos de línea simples.
    """
    cleaned: list[str] = []
    index = 0
    while index < len(lines):
        current_is_fence = _FENCE_LINE_RE.match(lines[index].strip())
        next_is_bare_close = (
            index + 1 < len(lines) and lines[index + 1].strip() == "```"
        )
        if current_is_fence and next_is_bare_close:
            index += 2
            continue
        cleaned.append(lines[index])
        index += 1
    return "\n".join(cleaned)


class Structuring:
    """Corrige y estructura el resultado OCR en Markdown, usando un LLM multimodal."""

    def __init__(self, client: OllamaClient | None = None):
        """
        Parameters
        ----------
        client : OllamaClient | None
            Cliente de Ollama a usar; si no se da, se crea uno con el modelo
            activo configurado (`config.get_active_model()`,
            003-ui-polish-model-switch) -- debe ser un modelo multimodal,
            porque `to_markdown` también recibe las imágenes de cada página.
            Tanto la CLI como la cola de trabajos de la web comparten ese
            mismo valor, sin reimplementación paralela (Principio II de la
            constitución).
        """
        self.client = client or OllamaClient(model_name=get_active_model())

    def to_markdown(self, pages: list[list[str]], images: list[bytes] | None = None) -> str:
        """
        Corrige errores de OCR y estructura el resultado en Markdown, usando
        también las imágenes originales para mejorar la fidelidad y detectar
        diagramas dibujados a mano.

        Parameters
        ----------
        pages : list[list[str]]
            Una lista de páginas, cada página es la lista de líneas de texto
            reconocidas por PaddleOCR para esa página, en orden de lectura
            (ej. `[page["rec_texts"] for page in ocr_result]`).
        images : list[bytes] | None
            Los bytes crudos de cada imagen de página, en el mismo orden que
            `pages`.

        Returns
        -------
        str
            El Markdown resultante, ya sin el bloque de código que a veces
            envuelve la respuesta completa del modelo, y con cualquier valla
            de código que el modelo haya dejado sin cerrar ya cerrada.
        """
        user_message = build_user_message(pages)
        response = self.client.chat(SYSTEM_PROMPT, user_message, images=images)
        markdown = _strip_outer_code_fence(response)
        return _close_unclosed_code_fences(markdown)
