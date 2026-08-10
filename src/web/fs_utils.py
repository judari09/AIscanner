from pathlib import Path


class UnsafePathError(ValueError):
    """Se lanza cuando una ruta relativa intenta salir de su directorio base."""


def resolve_safe_path(base: Path, relative: str) -> Path:
    """
    Resuelve `relative` dentro de `base`, rechazando cualquier intento de
    escapar de ese directorio (path traversal, ej. `../../etc/passwd`).

    Esto es necesario porque la interfaz web es alcanzable por red sin
    autenticacion propia (FR-016/FR-017 de la spec): el unico control de
    acceso es de red (Tailscale/WireGuard), asi que cada ruta que llega desde
    un request HTTP se trata como no confiable por defecto, sin importar que
    hoy solo la use un usuario legitimo.

    Parameters
    ----------
    base : pathlib.Path
        Directorio raiz permitido (normalmente `config.OUTPUT_DIR`).
    relative : str
        Ruta relativa recibida de un cliente (query param o body de un
        request), potencialmente vacia para referirse a `base` misma.

    Returns
    -------
    pathlib.Path
        Ruta resuelta, garantizada dentro de `base`.

    Raises
    ------
    UnsafePathError
        Si la ruta resuelta queda fuera de `base`.
    """
    base_resolved = base.resolve()
    # Path("") == Path(".") -- normaliza para que "sin ruta" apunte a la raiz.
    candidate = (base_resolved / (relative or ".")).resolve()

    if candidate != base_resolved and base_resolved not in candidate.parents:
        raise UnsafePathError(f"La ruta '{relative}' sale de '{base_resolved}'.")

    return candidate
