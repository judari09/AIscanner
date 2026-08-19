import { useId, useState, type SyntheticEvent } from 'react'
import { ApiError } from '../api/client'
import { CompletionToast } from '../components/CompletionToast'
import { useJobPolling } from '../hooks/useJobPolling'
import styles from './UploadPage.module.css'

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png'])

const STATUS_LABEL: Record<string, string> = {
  queued: 'En cola',
  processing: 'Procesando',
  done: 'Completado',
  failed: 'Fallido',
}

const STATUS_CHIP_CLASS: Record<string, string> = {
  queued: styles.chipQueued,
  processing: styles.chipProcessing,
  done: styles.chipDone,
  failed: styles.chipFailed,
}

/**
 * Página de carga (Historia 1): seleccionar imágenes de un documento, elegir
 * si generar `.docx`, enviarlas a procesar y seguir el estado del trabajo
 * hasta que termine o falle, con opción de reintentar.
 */
export function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [exportDocx, setExportDocx] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { job, submit, retry } = useJobPolling()
  const fileInputId = useId()

  /**
   * Agrega los archivos válidos (jpg/png) a la selección actual y guarda los
   * nombres de los rechazados para mostrarlos (FR-006 de la feature 001) --
   * la validación real y definitiva la hace igual el backend, esto es solo
   * feedback inmediato antes de enviar nada por red.
   */
  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(fileList)) {
      if (ACCEPTED_TYPES.has(file.type)) accepted.push(file)
      else rejected.push(file.name)
    }
    setSelectedFiles((prev) => [...prev, ...accepted])
    setRejectedFiles(rejected)
  }

  /** Quita una imagen de la selección por su posición. */
  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /** Envía el formulario: sube las imágenes y arranca el seguimiento del trabajo. */
  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setRejectedFiles([])
    try {
      await submit(selectedFiles, exportDocx)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const detail = error.detail as { error?: string; rejected_files?: string[] }
        setRejectedFiles(detail.rejected_files ?? [detail.error ?? 'Archivo inválido'])
      }
      // Un fallo de red ya lo muestra ConnectionBanner globalmente.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 'var(--type-display-lg-weight)' }}>
        Cargar documento
      </h1>
      <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-on-surface-variant)' }}>
        Selecciona las imágenes de un mismo documento, en orden de página, y envíalas a procesar.
      </p>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragActive(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <p>Arrastra tus imágenes aquí o</p>
            <label htmlFor={fileInputId} className={`${styles.btn} ${styles.btnSecondary}`}>
              Elegir imágenes
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {rejectedFiles.length > 0 && (
            <div className={styles.errorMessage} role="alert">
              Solo se aceptan imágenes jpg/png. Archivos rechazados: {rejectedFiles.join(', ')}
            </div>
          )}

          <ol className={styles.pageList}>
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className={styles.pageListItem}>
                <span>
                  {index + 1}. {file.name}
                </span>
                <button type="button" className={`${styles.btn} ${styles.btnTertiary}`} onClick={() => removeFile(index)}>
                  Quitar
                </button>
              </li>
            ))}
          </ol>

          <label className={styles.docxToggle}>
            <input type="checkbox" checked={exportDocx} onChange={(event) => setExportDocx(event.target.checked)} />
            <span>Generar también un archivo .docx</span>
          </label>

          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={selectedFiles.length === 0 || submitting}>
            <span aria-hidden="true">⬆</span> Enviar a procesar
          </button>
        </form>
      </div>

      {job && (
        <div className={styles.jobStatus}>
          <h2 style={{ fontSize: 'var(--type-headline-sm-size)' }}>Estado del trabajo</h2>
          <p>
            <span className={`${styles.chip} ${STATUS_CHIP_CLASS[job.status]}`}>{STATUS_LABEL[job.status]}</span>
          </p>
          {job.status === 'failed' && (
            <>
              <div className={styles.errorMessage} role="alert">
                {job.errorMessage || 'Ocurrió un error al procesar el documento.'}
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => retry()}>
                Reintentar
              </button>
            </>
          )}
        </div>
      )}
      <CompletionToast job={job} />
    </>
  )
}
