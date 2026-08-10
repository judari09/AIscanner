from __future__ import annotations

import re
import shutil
import zipfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from web.fs_utils import resolve_safe_path

# El `from __future__ import annotations` de arriba es necesario porque el
# metodo `list()` de la clase mas abajo sombrea el builtin `list` dentro del
# namespace de la clase; sin evaluacion diferida de anotaciones, la firma de
# `_document_files` (que usa `list[Path]`) fallaria al definirse.

_DIAGRAM_RE_TEMPLATE = r"^{stem}_diagrama_\d+\.png$"

# Mismo patrón que usa src/output/mermaid_renderer.py para encontrar bloques
# ```mermaid``` en el Markdown -- se reutiliza aquí para saber cuántos hay y
# en qué orden, y así poder mapear cada uno a su PNG ya renderizado
# (`<stem>_diagrama_<i>.png`) si existe.
_MERMAID_BLOCK_RE = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)


class NameConflictError(ValueError):
    """Ya existe algo con ese nombre en el destino (FR-014)."""


class InvalidMoveError(ValueError):
    """El destino es subruta del origen, o el origen no existe."""


@dataclass
class FolderEntry:
    """Una `Carpeta de Organización` tal como se reporta en `GET /api/files`."""

    name: str
    path: str


@dataclass
class DocumentEntry:
    """Un `Documento Procesado` tal como se reporta en `GET /api/files`."""

    name: str
    path: str
    has_docx: bool
    modified_at: str


class FileExplorerService:
    """
    Lista, visualiza y organiza lo que ya vive bajo `OUTPUT_DIR` -- sin
    indice propio: cada llamada refleja el estado real del sistema de
    archivos en ese instante (Principio VI, FR-014/FR-015 de la spec).

    A propósito, esta clase no recibe una interfaz de almacenamiento
    intercambiable: el Principio VI ya fija "solo sistema de archivos, para
    siempre" como decisión de arquitectura permanente, así que abstraer el
    storage aquí violaría YAGNI en vez de servir a Open/Closed (ver
    data-model.md, sección de componentes de aplicación).

    Un `Documento Procesado` puede tener dos formas en disco, y esta clase
    trata ambas de forma transparente para quien la usa:

    - **Con carpeta propia** (lo que produce la Historia 1 vía la web):
      `<carpeta>/<carpeta>.md`, más `originales/`, diagramas y `.docx`
      sueltos dentro de esa misma carpeta.
    - **Suelto** (lo que puede haber generado la CLI directo en `OUTPUT_DIR`,
      o algo copiado ahí a mano): un `.md` sin carpeta propia, con sus
      archivos relacionados (`.docx`, `_diagrama_N.png`) como hermanos en el
      mismo directorio.
    """

    def __init__(self, root: Path):
        """
        Parameters
        ----------
        root : pathlib.Path
            Raíz del explorador -- en producción, `config.OUTPUT_DIR`.
        """
        self._root = root

    def list(self, relative_path: str = "") -> dict:
        """
        Lista carpetas y documentos bajo `relative_path`. Ver `contracts/api.md`.

        Parameters
        ----------
        relative_path : str
            Ruta relativa a `root`; vacía para listar la raíz.

        Returns
        -------
        dict
            `{"path", "folders", "documents"}`, ya en la forma serializable
            del contrato de la API.

        Raises
        ------
        FileNotFoundError
            Si `relative_path` no existe o no es una carpeta.
        """
        target = resolve_safe_path(self._root, relative_path)
        if not target.is_dir():
            raise FileNotFoundError(relative_path)

        folders: list[FolderEntry] = []
        documents: list[DocumentEntry] = []

        for entry in sorted(target.iterdir(), key=lambda p: p.name):
            if entry.is_dir():
                own_markdown = entry / f"{entry.name}.md"
                if own_markdown.exists():
                    documents.append(self._describe_document(entry, own_markdown))
                else:
                    folders.append(FolderEntry(name=entry.name, path=self._relative(entry)))
            elif entry.is_file() and entry.suffix.lower() == ".md":
                documents.append(self._describe_document(entry, entry))

        return {
            "path": relative_path,
            "folders": [asdict(f) for f in folders],
            "documents": [asdict(d) for d in documents],
        }

    def view(self, relative_path: str) -> dict:
        """
        Devuelve el Markdown de un documento con sus imágenes embebidas ya
        resueltas a `/api/files/raw?path=...` (para que el navegador pueda
        cargarlas sin necesitar lógica propia de resolución de rutas).

        Parameters
        ----------
        relative_path : str
            Ruta al documento (carpeta o archivo `.md` suelto), tal como la
            devolvió `list()`.

        Returns
        -------
        dict
            `{"markdown": str}`.

        Raises
        ------
        FileNotFoundError
            Si no hay un documento en esa ruta.
        """
        anchor = resolve_safe_path(self._root, relative_path)
        markdown_path = anchor / f"{anchor.name}.md" if anchor.is_dir() else anchor
        if not markdown_path.is_file():
            raise FileNotFoundError(relative_path)

        markdown_dir_relative = self._relative(markdown_path.parent)
        markdown = markdown_path.read_text(encoding="utf-8")
        markdown = self._substitute_rendered_diagrams(markdown, markdown_path)

        def _resolve_image(match: re.Match) -> str:
            """Reescribe un enlace `![alt](archivo)` hacia `/api/files/raw?path=...`."""
            alt, filename = match.group(1), match.group(2)
            if filename.startswith(("http://", "https://", "/")):
                return match.group(0)
            asset_path = f"{markdown_dir_relative}/{filename}".strip("/")
            return f"![{alt}](/api/files/raw?path={asset_path})"

        markdown = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", _resolve_image, markdown)
        return {"markdown": markdown}

    @staticmethod
    def _substitute_rendered_diagrams(markdown: str, markdown_path: Path) -> str:
        """
        Reemplaza cada bloque ```mermaid``` por su imagen ya renderizada, si
        existe.

        `pipeline.py` escribe el `.md` a disco *antes* de renderizar los
        diagramas -- a propósito, para que herramientas con soporte nativo
        de Mermaid (GitHub, Obsidian, VS Code) lo sigan renderizando al
        abrir el archivo directamente. El PNG de cada diagrama sí se genera
        en la misma carpeta (`mermaid_renderer.py` lo escribe igual, se pida
        o no `.docx`) — aquí simplemente se aprovecha ese PNG ya existente
        para la vista previa del explorador, sin traer una librería de
        renderizado de Mermaid al navegador (research.md §1: sin CDN
        externo). Si el PNG no existe (el diagrama no se pudo renderizar en
        su momento, ej. sin Node instalado), el bloque se deja tal cual para
        que al menos se muestre como código.
        """
        stem = markdown_path.stem

        def _replace(match: re.Match) -> str:
            index = _replace.counter
            _replace.counter += 1
            image_path = markdown_path.parent / f"{stem}_diagrama_{index}.png"
            if not image_path.exists():
                return match.group(0)
            return f"![Diagrama {index}]({image_path.name})"

        _replace.counter = 1
        return _MERMAID_BLOCK_RE.sub(_replace, markdown)

    def raw_file_path(self, relative_path: str) -> Path:
        """Resuelve la ruta absoluta de un archivo individual (para servirlo tal cual, ej. un diagrama PNG)."""
        target = resolve_safe_path(self._root, relative_path)
        if not target.is_file():
            raise FileNotFoundError(relative_path)
        return target

    def create_folder(self, relative_path: str) -> str:
        """
        Crea una carpeta de organización.

        Parameters
        ----------
        relative_path : str
            Ruta relativa (padre + nombre nuevo) de la carpeta a crear.

        Returns
        -------
        str
            La misma `relative_path`, normalizada.

        Raises
        ------
        NameConflictError
            Si ya existe una carpeta o archivo con ese nombre (FR-014).
        """
        target = resolve_safe_path(self._root, relative_path)
        if target.exists():
            raise NameConflictError(f"Ya existe algo en '{relative_path}'.")
        target.mkdir(parents=True)
        return self._relative(target)

    def move(self, source: str, destination: str) -> str:
        """
        Mueve un documento o carpeta a una nueva ubicación.

        Parameters
        ----------
        source : str
            Ruta relativa de lo que se mueve.
        destination : str
            Ruta relativa completa de destino (incluye el nombre final).

        Returns
        -------
        str
            `destination`, normalizada.

        Raises
        ------
        FileNotFoundError
            Si `source` no existe.
        NameConflictError
            Si ya existe algo en `destination` (FR-014).
        InvalidMoveError
            Si `destination` es la propia ruta de `source` o una subruta de
            ella (edge case: mover una carpeta dentro de sí misma).
        """
        source_path = resolve_safe_path(self._root, source)
        destination_path = resolve_safe_path(self._root, destination)

        if not source_path.exists():
            raise FileNotFoundError(source)
        if destination_path.exists():
            raise NameConflictError(f"Ya existe algo en '{destination}'.")
        if destination_path == source_path or source_path in destination_path.parents:
            raise InvalidMoveError("No se puede mover una carpeta dentro de sí misma.")

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source_path), str(destination_path))
        return self._relative(destination_path)

    def package_document(self, relative_path: str) -> Path:
        """
        Prepara la descarga de un documento individual (FR-011): si tiene un
        solo archivo, se devuelve tal cual; si tiene más de uno (recursos
        embebidos, `.docx`, originales), se empaqueta en un `.zip` temporal
        dentro de la propia carpeta del documento.

        Returns
        -------
        pathlib.Path
            Ruta a servir como descarga (el archivo único o el `.zip`).

        Raises
        ------
        FileNotFoundError
            Si no hay un documento en esa ruta.
        """
        anchor = resolve_safe_path(self._root, relative_path)
        files = self._document_files(anchor)
        if not files:
            raise FileNotFoundError(relative_path)
        if len(files) == 1:
            return files[0]

        base_dir = anchor if anchor.is_dir() else anchor.parent
        zip_path = base_dir / f"{base_dir.name if anchor.is_dir() else anchor.stem}.zip"
        self._zip_files(zip_path, {f: f.relative_to(base_dir) for f in files})
        return zip_path

    def package_folder(self, relative_path: str) -> Path:
        """
        Empaqueta una carpeta completa como `.zip` (FR-012).

        Returns
        -------
        pathlib.Path
            Ruta al `.zip` generado (en un directorio temporal del sistema).

        Raises
        ------
        FileNotFoundError
            Si `relative_path` no existe o no es una carpeta.
        """
        target = resolve_safe_path(self._root, relative_path)
        if not target.is_dir():
            raise FileNotFoundError(relative_path)

        files = {f: f.relative_to(target) for f in target.rglob("*") if f.is_file()}
        zip_path = target.parent / f"{target.name}.zip"
        self._zip_files(zip_path, files)
        return zip_path

    def _describe_document(self, entry: Path, markdown_path: Path) -> DocumentEntry:
        """Construye el `DocumentEntry` de un documento ya localizado (carpeta o `.md` suelto)."""
        stem = entry.name if entry.is_dir() else entry.stem
        docx_path = (entry if entry.is_dir() else entry.parent) / f"{stem}.docx"
        return DocumentEntry(
            name=stem,
            path=self._relative(entry),
            has_docx=docx_path.exists(),
            # tz=utc + .astimezone() adjunta la zona horaria local -- un
            # timestamp sin zona es ambiguo para un cliente que podria estar
            # en otra zona (ej. accediendo remoto vía Tailscale desde otro
            # pais).
            modified_at=datetime.fromtimestamp(markdown_path.stat().st_mtime, tz=timezone.utc)
            .astimezone()
            .isoformat(),
        )

    def _document_files(self, anchor: Path) -> list[Path]:
        """
        Todos los archivos que pertenecen a un documento: si `anchor` es una
        carpeta, todo lo que hay debajo (incluye `originales/`); si es un
        `.md` suelto, ese archivo más sus hermanos relacionados por nombre
        (`.docx`, `_diagrama_N.png`).
        """
        if anchor.is_dir():
            return sorted(f for f in anchor.rglob("*") if f.is_file())

        stem = anchor.stem
        diagram_re = re.compile(_DIAGRAM_RE_TEMPLATE.format(stem=re.escape(stem)))
        related = [
            f
            for f in anchor.parent.iterdir()
            if f.is_file() and (f.name == f"{stem}.docx" or diagram_re.match(f.name))
        ]
        return sorted([anchor, *related])

    @staticmethod
    def _zip_files(zip_path: Path, files: dict[Path, Path]) -> None:
        """Escribe `files` (ruta absoluta -> nombre de archivo dentro del zip) en `zip_path`."""
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for absolute_path, arcname in files.items():
                archive.write(absolute_path, arcname=str(arcname))

    def _relative(self, path: Path) -> str:
        """Ruta relativa a `root`, con separadores `/` (consistente entre plataformas para la API)."""
        return path.relative_to(self._root).as_posix()
