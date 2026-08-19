# Contrato de API: Interfaz Web de Carga y Explorador de Archivos

Todos los endpoints son servidos por el mismo proceso FastAPI (`src/web/app.py`), alcanzable
solo desde la red privada del usuario (FR-016). No hay autenticación propia (FR-017) — el
control de acceso es de red, no de aplicación.

## Trabajos de procesamiento (Historia 1)

### `POST /api/jobs`

Sube una o más imágenes como páginas de un mismo documento y las encola para procesar.

- **Request**: `multipart/form-data`
  - `images`: uno o más archivos (jpg/png), en el orden de páginas deseado (FR-002).
  - `export_docx`: `"true"` / `"false"` (FR-013).
- **Responses**:
  - `202 Accepted` → `{"job_id": "<uuid>", "status": "queued"}`
  - `400 Bad Request` → un archivo no es jpg/png (FR-006): `{"error": "...", "rejected_files": [...]}`

### `GET /api/jobs/{job_id}`

Consulta el estado de un trabajo (para el polling descrito en `research.md`).

- **Response** `200 OK`:
  ```json
  {
    "job_id": "<uuid>",
    "status": "queued | processing | done | failed",
    "error_message": "string | null",
    "result_document_path": "string | null"
  }
  ```
- `404 Not Found` si el `job_id` no existe (se perdió porque el servidor se reinició, ver
  Principio VI en `research.md` §2).

### `POST /api/jobs/{job_id}/retry`

Reintenta un trabajo en estado `failed` con las mismas imágenes y orden (FR-005).

- **Responses**:
  - `202 Accepted` → mismo cuerpo que `GET /api/jobs/{job_id}` con `status: "queued"`.
  - `409 Conflict` si el trabajo no está en `failed`.
  - `404 Not Found` si el `job_id` no existe.

## Explorador de archivos (Historia 2)

Todas las rutas (`path`) son relativas a `OUTPUT_DIR` y se validan contra path traversal
(`..`) antes de tocar el sistema de archivos.

### `GET /api/files?path=<ruta relativa, opcional>`

Lista el contenido de una carpeta (FR-007). Sin `path`, lista la raíz de `OUTPUT_DIR`.

- **Response** `200 OK`:
  ```json
  {
    "path": "string",
    "folders": [{"name": "string", "path": "string"}],
    "documents": [
      {
        "name": "string",
        "path": "string",
        "has_docx": true,
        "modified_at": "ISO-8601"
      }
    ]
  }
  ```
- `404 Not Found` si `path` no existe.

### `GET /api/files/view?path=<ruta al documento>`

Devuelve el contenido renderizable de un `ProcessedDocument` para visualizarlo dentro de la
interfaz (FR-008): el Markdown ya con los enlaces a sus imágenes embebidas reescritos hacia
`GET /api/files/raw` (así el cliente no necesita lógica propia de resolución de rutas relativas).

- **Response** `200 OK`: `{"markdown": "string"}`
- `404 Not Found` si no existe un documento en esa ruta.

### `GET /api/files/raw?path=<ruta a un archivo>`

*(Agregado durante la implementación — no estaba en el diseño original de Fase 1.)* Sirve un
archivo individual tal cual, con el `Content-Type` que le corresponda. Es lo que consumen los
enlaces de imagen que `GET /api/files/view` reescribe; no está pensado para descarga de usuario
(para eso están `download`/`download-folder`).

- **Response** `200 OK`, el archivo tal cual.
- `404 Not Found` si `path` no existe o no es un archivo.

### `POST /api/files/folder`

Crea una `OrganizationFolder` (FR-009).

- **Request**: `{"path": "string"}` (ruta relativa del padre + nombre nuevo).
- **Responses**:
  - `201 Created` → `{"path": "string"}`
  - `409 Conflict` si ya existe algo con ese nombre (FR-013).

### `POST /api/files/move`

Mueve un documento o carpeta (FR-010).

- **Request**: `{"source": "string", "destination": "string"}`
- **Responses**:
  - `200 OK` → `{"path": "string"}` (nueva ruta)
  - `409 Conflict` si el destino ya existe, o si `destination` es subruta de `source`
    (edge case: mover una carpeta dentro de sí misma).
  - `404 Not Found` si `source` no existe.

### `GET /api/files/download?path=<ruta>`

Descarga un `ProcessedDocument` individual (FR-011): Markdown + recursos embebidos + `.docx` si
existe. Si el documento tiene más de un archivo, se entrega como `.zip`; si es un único archivo,
se entrega tal cual.

- **Response** `200 OK`, `Content-Disposition: attachment` (`application/zip` o el tipo del
  archivo único).
- `404 Not Found` si `path` no existe.

### `GET /api/files/download-folder?path=<ruta>`

Descarga una `OrganizationFolder` completa como un único `.zip` (FR-012).

- **Response** `200 OK`, `Content-Disposition: attachment`, `application/zip`.
- `404 Not Found` si `path` no existe o no es una carpeta.
