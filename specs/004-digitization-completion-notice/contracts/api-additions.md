# Adiciones al Contrato de API: Aviso de Digitalización Completada

El contrato de `/api/jobs*` está definido en
`specs/001-web-ui-upload-explorer/contracts/api.md` y no pierde ningún campo con esta feature —
solo gana tres campos nuevos en la representación de un job (`_job_to_dict`, en
`src/web/routers/jobs.py`), presentes en las tres respuestas que ya devuelven esa forma:
`POST /api/jobs` (`202`), `GET /api/jobs/{job_id}` (`200`) y `POST /api/jobs/{job_id}/retry`
(`202`).

## Forma extendida de un job

```json
{
  "job_id": "<uuid>",
  "status": "queued | processing | done | failed",
  "error_message": "string | null",
  "result_document_path": "string | null",
  "document_relative_path": "string | null",
  "markdown_filename": "string | null",
  "docx_filename": "string | null"
}
```

- `result_document_path`: **sin cambios** — ruta absoluta del sistema de archivos del servidor,
  mantenida solo por compatibilidad con clientes existentes (001/002). El frontend de esta feature
  deja de usarla para mostrar texto al usuario (research.md §5).
- `document_relative_path`: **nuevo** — `null` salvo cuando `status` es `"done"`. Ruta relativa a
  `OUTPUT_DIR`, en el mismo formato (separador `/`) que ya usan `GET /api/files`,
  `GET /api/files/view` y `GET /api/files/raw`. Es el valor que `CompletionToast` usa para armar
  `/explorer?open=<document_relative_path>&name=<markdown_filename>` (FR-008).
- `markdown_filename`: **nuevo** — `null` salvo cuando `status` es `"done"`. Nombre del archivo
  Markdown generado (ej. `"mi-documento.md"`), sin ninguna parte de la ruta (FR-003).
- `docx_filename`: **nuevo** — nombre del archivo Word generado (ej. `"mi-documento.docx"`) si la
  digitalización lo pidió y se generó con éxito; `null` en cualquier otro caso, incluido cuando
  `status` no es `"done"` (FR-004).

## Sin cambios de contrato en otros endpoints

`GET /api/files*` no cambia — `document_relative_path` ya usa exactamente el mismo formato de
ruta que esos endpoints esperan, así que `ExplorerPage` los reutiliza tal cual (research.md §3),
sin necesitar un endpoint nuevo para "abrir directo".
