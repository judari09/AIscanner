import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProcessingJob } from '../api/types'
import styles from './CompletionToast.module.css'

/** Cuánto se mantiene visible el aviso si el usuario no lo cierra (FR-007). */
const AUTO_DISMISS_MS = 8000

interface CompletionToastProps {
  /** El trabajo actual de `useJobPolling`, o `null` si no se ha enviado ninguno. */
  job: ProcessingJob | null
}

/**
 * Aviso de finalización exitosa (US1/US2/US3 de 004-digitization-completion-notice):
 * no renderiza nada salvo cuando `job.status === 'done'` (FR-009 -- nunca
 * ante un fallo), y muestra un mensaje genérico y no técnico apuntando al
 * Explorador junto con el nombre de los archivos generados (FR-002/003/004),
 * sin exponer ninguna ruta de carpeta interna del sistema (Clarifications,
 * sesión 2026-08-14). Incluye un enlace que abre ese documento directo en el
 * Explorador (FR-008, armado con los mismos query params que lee
 * `ExplorerPage` al montar), un botón de cerrar (FR-006) y un auto-descarte
 * tras `AUTO_DISMISS_MS` si el usuario no interactúa (FR-007).
 *
 * No es un elemento modal (sin overlay ni trampa de foco), así que no
 * bloquea el resto de la pantalla de Cargar por construcción (FR-005).
 *
 * Usa `<output>` (mismo patrón que `ConnectionBanner.tsx`) para que se
 * anuncie a lectores de pantalla sin la interrupción de un `alert`.
 */
export function CompletionToast({ job }: CompletionToastProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Un job distinto (ej. una digitalización nueva completada mientras el
    // aviso anterior seguía visible) debe volver a mostrar el aviso -- si no,
    // el descarte de la anterior dejaría oculta la de esta (FR-010).
    setDismissed(false)
  }, [job?.jobId])

  useEffect(() => {
    if (!job || job.status !== 'done' || dismissed) return
    const timer = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [job, dismissed])

  if (!job || job.status !== 'done' || dismissed) return null

  const viewerLink =
    job.documentRelativePath && job.markdownFilename
      ? `/explorer?open=${encodeURIComponent(job.documentRelativePath)}&name=${encodeURIComponent(job.markdownFilename)}`
      : null

  return (
    <output className={styles.toast}>
      <button
        type="button"
        className={styles.closeButton}
        aria-label="Cerrar aviso"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
      <p className={styles.message}>Tu documento ya está disponible en el Explorador.</p>
      <p className={styles.filenames}>
        <strong>{job.markdownFilename}</strong>
        {job.docxFilename && (
          <>
            {' '}y <strong>{job.docxFilename}</strong>
          </>
        )}
      </p>
      {viewerLink && (
        <Link to={viewerLink} className={styles.link}>
          Ver documento
        </Link>
      )}
    </output>
  )
}
