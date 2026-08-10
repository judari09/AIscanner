import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

import uvicorn

from web.app import create_app

app = create_app()


def _local_tailscale_ip() -> str | None:
    """
    Intenta adivinar la IP de Tailscale de este equipo (rango `100.x.x.x`),
    para poder imprimirla al arrancar y que el usuario sepa qué URL usar
    desde otro dispositivo de su tailnet (FR-016). Es una heurística best
    effort: si Tailscale no está instalado o no hay ninguna interfaz en ese
    rango, simplemente no se muestra esa línea -- no es un error.
    """
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if ip.startswith("100."):
                return ip
    except OSError:
        pass
    return None


def main() -> None:
    """
    Punto de entrada delgado de la interfaz web: solo arranca `uvicorn`
    sobre la app construida en `src/web/app.py` (Principio II -- la misma
    idea de `main.py`/`cli.py` para la CLI, un segundo entry point delgado
    para la segunda interfaz).
    """
    host, port = "0.0.0.0", 8000
    print(f"aiscanner (web) escuchando en http://127.0.0.1:{port}")
    tailscale_ip = _local_tailscale_ip()
    if tailscale_ip:
        print(f"Acceso remoto vía Tailscale: http://{tailscale_ip}:{port}")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
