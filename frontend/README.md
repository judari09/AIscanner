# aiscanner — frontend

Interfaz web de aiscanner (React + Vite + TypeScript), independiente del backend Python. Ver
`specs/002-react-frontend-migration/` en la raíz del repo para la especificación completa.

## Límite de responsabilidades (Historia 2 de la spec)

Este proyecto **solo** conoce al backend a través de su contrato de API HTTP, documentado en:

- `specs/001-web-ui-upload-explorer/contracts/api.md` — `/api/jobs*`, `/api/files*`
- `specs/002-react-frontend-migration/contracts/api-additions.md` — `GET /health`

Todo acceso HTTP al backend pasa por un único módulo, `src/api/client.ts` — ningún componente,
página o hook debe llamar `fetch` directamente. Esto es lo que permite que este frontend se
rediseñe o extienda sin tocar código Python, y que el backend agregue capacidades (como ya pasó
con `GET /health`) sin que este proyecto necesite reescribirse.

Este frontend **no** conoce, y no debe llegar a conocer:

- Nada de `src/pipeline.py`, `src/ocr/`, `src/llm/`, `src/output/` (el núcleo de digitalización).
- Cómo `src/web/jobs/queue.py` encola o procesa un trabajo internamente.
- Cómo `src/web/explorer/service.py` resuelve rutas en el sistema de archivos.

Si una tarea futura te pide agregar algo aquí que requeriría saber alguna de esas cosas, es una
señal de que en realidad hace falta un endpoint nuevo en el backend, no un atajo desde el
frontend.

## Desarrollo

```
npm install
npm run dev
```

El servidor de Vite corre en su propio puerto y reenvía las peticiones a `/api` hacia el backend
FastAPI en `http://127.0.0.1:8000` (`vite.config.ts`) — hace falta tenerlo corriendo aparte
(`uv run serve.py` desde la raíz del repo) para que el frontend tenga con quién hablar.

## Producción

```
npm run build
```

Genera `dist/`, que `src/web/app.py` sirve como estático desde el mismo proceso que la API —
`uv run serve.py` desde la raíz sigue siendo el único comando para levantar todo.
