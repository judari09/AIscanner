import { emitNetworkError } from './connectionEvents'
import type {
  DirectoryListing,
  DocumentEntry,
  DocumentView,
  FolderEntry,
  ModelsResponse,
  ProcessingJob,
} from './types'

/**
 * Se lanza cuando el `fetch` en sí falla (backend caído, sin red) -- distinto
 * de una respuesta HTTP de error de negocio. `useBackendConnection` (T007)
 * depende de poder distinguir estos dos casos (FR-012).
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('No se pudo contactar al backend')
    this.cause = cause
  }
}

/** Se lanza cuando el backend respondió, pero con un código de error (4xx/5xx). */
export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(`El backend respondió con error ${status}`)
    // Se asignan explícitamente en el cuerpo (no como parameter properties)
    // porque tsconfig.app.json tiene `erasableSyntaxOnly: true`, que
    // prohíbe azúcar sintáctica de TS que genera código en tiempo de
    // ejecución (las parameter properties hacen exactamente eso).
    this.status = status
    this.detail = detail
  }
}

/**
 * Único punto del frontend que llama `fetch` contra el backend (Principio
 * III, SRP/DIP) -- ningún componente ni hook debe hacer `fetch` directo,
 * siempre a través de las funciones exportadas aquí.
 *
 * @param path - Ruta relativa a la API, ej. `/api/jobs`.
 * @param init - Opciones estándar de `fetch`.
 * @returns El cuerpo de la respuesta ya parseado como JSON.
 * @throws {NetworkError} Si la petición no pudo completarse (backend caído).
 * @throws {ApiError} Si el backend respondió con un código de error.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (cause) {
    emitNetworkError()
    throw new NetworkError(cause)
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new ApiError(response.status, detail)
  }
  return response.json() as Promise<T>
}

/** Convierte la respuesta cruda (snake_case) de un trabajo al tipo del frontend. */
function toProcessingJob(raw: {
  job_id: string
  status: ProcessingJob['status']
  error_message: string | null
  result_document_path: string | null
}): ProcessingJob {
  return {
    jobId: raw.job_id,
    status: raw.status,
    errorMessage: raw.error_message,
    resultDocumentPath: raw.result_document_path,
  }
}

/** Convierte la respuesta cruda (snake_case) de un documento al tipo del frontend. */
function toDocumentEntry(raw: {
  name: string
  path: string
  has_docx: boolean
  modified_at: string
}): DocumentEntry {
  return { name: raw.name, path: raw.path, hasDocx: raw.has_docx, modifiedAt: raw.modified_at }
}

/**
 * Sube las imágenes de un documento y lo encola para procesar.
 *
 * @param images - Archivos de imagen, en el orden de páginas elegido por el usuario.
 * @param exportDocx - Si además debe generarse un `.docx`.
 * @returns El trabajo recién creado, en estado `queued`.
 */
export async function createJob(images: File[], exportDocx: boolean): Promise<ProcessingJob> {
  const formData = new FormData()
  images.forEach((image) => formData.append('images', image))
  formData.append('export_docx', String(exportDocx))
  const raw = await request<Parameters<typeof toProcessingJob>[0]>('/api/jobs', {
    method: 'POST',
    body: formData,
  })
  return toProcessingJob(raw)
}

/** Consulta el estado actual de un trabajo. */
export async function getJob(jobId: string): Promise<ProcessingJob> {
  const raw = await request<Parameters<typeof toProcessingJob>[0]>(`/api/jobs/${jobId}`)
  return toProcessingJob(raw)
}

/** Reintenta un trabajo fallido, con las mismas imágenes/orden (FR-005 de la feature 001). */
export async function retryJob(jobId: string): Promise<ProcessingJob> {
  const raw = await request<Parameters<typeof toProcessingJob>[0]>(`/api/jobs/${jobId}/retry`, {
    method: 'POST',
  })
  return toProcessingJob(raw)
}

/** Lista carpetas y documentos bajo `path` (raíz si se omite). */
export async function listFiles(path = ''): Promise<DirectoryListing> {
  const raw = await request<{
    path: string
    folders: FolderEntry[]
    documents: Parameters<typeof toDocumentEntry>[0][]
  }>(`/api/files?path=${encodeURIComponent(path)}`)
  return { path: raw.path, folders: raw.folders, documents: raw.documents.map(toDocumentEntry) }
}

/** Obtiene el Markdown renderizable de un documento (imágenes ya resueltas a `/api/files/raw`). */
export function viewFile(path: string): Promise<DocumentView> {
  return request<DocumentView>(`/api/files/view?path=${encodeURIComponent(path)}`)
}

/** Crea una carpeta de organización. */
export function createFolder(path: string): Promise<{ path: string }> {
  return request('/api/files/folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

/** Mueve un documento o carpeta a una nueva ubicación. */
export function moveFile(source: string, destination: string): Promise<{ path: string }> {
  return request('/api/files/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, destination }),
  })
}

/** URL de descarga de un documento individual (para usar directo en un enlace, no vía `fetch`). */
export function downloadFileUrl(path: string): string {
  return `/api/files/download?path=${encodeURIComponent(path)}`
}

/** URL de descarga de una carpeta completa (para usar directo en un enlace, no vía `fetch`). */
export function downloadFolderUrl(path: string): string {
  return `/api/files/download-folder?path=${encodeURIComponent(path)}`
}

/**
 * Pregunta si el backend está vivo (`contracts/api-additions.md`). No
 * lanza `ApiError` en ningún caso documentado -- si el proceso no responde
 * en absoluto, eso ya llega como `NetworkError`.
 */
export async function checkHealth(): Promise<boolean> {
  await request('/health')
  return true
}

/**
 * Lista los modelos de Ollama instalados localmente y cuál está activo
 * (US2, `contracts/api-additions.md`). Lanza `ApiError` con status `503` si
 * no se pudo conectar con Ollama (FR-008); una lista vacía en `models` es
 * una respuesta `200` válida (FR-009), no un error.
 */
export async function getModels(): Promise<ModelsResponse> {
  const raw = await request<{ models: { name: string }[]; active_model: string }>('/api/models')
  return { models: raw.models, activeModel: raw.active_model }
}

/**
 * Cambia el modelo activo para todas las digitalizaciones futuras (US1).
 *
 * @param modelName - Nombre del modelo, tal como aparece en `getModels()`.
 * @returns El modelo que quedó activo tras el cambio.
 * @throws {ApiError} Con status `409` si `modelName` ya no está instalado, o
 *   `503` si no se pudo validar contra Ollama -- en ambos casos el modelo
 *   activo anterior no cambió (FR-005).
 */
export async function setActiveModel(modelName: string): Promise<{ activeModel: string }> {
  const raw = await request<{ active_model: string }>('/api/config/active-model', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name: modelName }),
  })
  return { activeModel: raw.active_model }
}
