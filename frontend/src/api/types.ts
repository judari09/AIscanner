/**
 * Tipos que reflejan 1:1 el contrato de API ya existente del backend
 * (specs/001-web-ui-upload-explorer/contracts/api.md +
 * specs/002-react-frontend-migration/contracts/api-additions.md). Ningún
 * campo se inventa aquí -- ver data-model.md de esta feature.
 */

/** Estados posibles de un trabajo de procesamiento, en su orden natural de transición. */
export type JobStatus = 'queued' | 'processing' | 'done' | 'failed'

/** Un envío de imágenes al pipeline, tal como lo devuelve `/api/jobs*`. */
export interface ProcessingJob {
  jobId: string
  status: JobStatus
  errorMessage: string | null
  resultDocumentPath: string | null
}

/** Una carpeta de organización, tal como la devuelve `GET /api/files`. */
export interface FolderEntry {
  name: string
  path: string
}

/** Un documento procesado, tal como lo devuelve `GET /api/files`. */
export interface DocumentEntry {
  name: string
  path: string
  hasDocx: boolean
  /** ISO-8601. */
  modifiedAt: string
}

/** Respuesta de `GET /api/files`. */
export interface DirectoryListing {
  path: string
  folders: FolderEntry[]
  documents: DocumentEntry[]
}

/** Respuesta de `GET /api/files/view`. */
export interface DocumentView {
  markdown: string
}
