# Adiciones al Contrato de API: Mejora Visual de la Interfaz y Selección de Modelo LLM

El contrato de `/api/jobs*`, `/api/files*` y `GET /health` no cambia (definidos en
`specs/001-web-ui-upload-explorer/contracts/api.md` y
`specs/002-react-frontend-migration/contracts/api-additions.md`). Esta feature agrega dos
endpoints nuevos bajo un router propio (`src/web/routers/models.py`), consumidos por
`SettingsPage.tsx` (US1/US2).

## `GET /api/models`

Lista los modelos de Ollama instalados localmente y cuál está activo. Cubre FR-001, FR-002,
FR-008, FR-009.

- **Response** `200 OK`:
  ```json
  {
    "models": [{"name": "qwen2.5:7b-instruct"}, {"name": "gemma3:4b"}],
    "active_model": "gemma3:4b"
  }
  ```
  Si Ollama está corriendo pero no tiene ningún modelo instalado, `"models"` es `[]` — esto es
  una respuesta `200` válida, distinta del caso de error de abajo (FR-009: lista vacía con
  explicación, no un error).

- **Response** `503 Service Unavailable` — Ollama no está corriendo o no es alcanzable. Como el
  resto de los endpoints de este backend (`HTTPException(detail=...)` de FastAPI), el cuerpo real
  anida el detalle bajo una clave `"detail"`:
  ```json
  {"detail": {"error": "No se pudo conectar con Ollama en el equipo local."}}
  ```
  Distinguible de la lista vacía anterior precisamente por el código de estado (FR-008).

## `PUT /api/config/active-model`

Cambia el modelo activo para todas las digitalizaciones futuras. Cubre FR-003, FR-004, FR-005.

- **Request body**:
  ```json
  {"model_name": "qwen2.5:7b-instruct"}
  ```

- **Response** `200 OK` — el modelo pedido está instalado y quedó activo:
  ```json
  {"active_model": "qwen2.5:7b-instruct"}
  ```
  El frontend usa esta respuesta como la confirmación visual de FR-004.

- **Response** `409 Conflict` — el `model_name` pedido no está en la lista de modelos instalados
  en este momento (por ejemplo, fue eliminado fuera de la aplicación entre que se listó y que se
  confirmó el cambio). El modelo activo anterior no se modifica (FR-005). Cuerpo real (anidado
  bajo `"detail"`, igual que el resto del backend):
  ```json
  {"detail": {"error": "El modelo 'x' ya no está disponible en Ollama.", "active_model": "gemma3:4b"}}
  ```

- **Response** `503 Service Unavailable` — no se pudo validar contra Ollama (no está accesible).
  El modelo activo anterior no se modifica:
  ```json
  {"detail": {"error": "No se pudo conectar con Ollama en el equipo local."}}
  ```
