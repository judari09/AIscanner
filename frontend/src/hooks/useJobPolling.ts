import { useCallback, useEffect, useRef, useState } from 'react'
import { createJob, getJob, retryJob } from '../api/client'
import type { ProcessingJob } from '../api/types'

const POLL_INTERVAL_MS = 1500

/**
 * Migra la lógica de `upload.js` de la feature 001: envía un trabajo,
 * sondea su estado cada `POLL_INTERVAL_MS` mientras esté `queued`/
 * `processing`, y expone una función de reintento (FR-005 de la feature
 * 001, `spec.md` Historia 1 de esta feature).
 *
 * @returns El trabajo actual (o `null` si no se ha enviado ninguno), y las
 * funciones `submit`/`retry` para controlarlo.
 */
export function useJobPolling() {
  const [job, setJob] = useState<ProcessingJob | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Consulta el estado del trabajo y se reprograma a sí mismo mientras siga en curso. */
  const poll = useCallback((jobId: string) => {
    getJob(jobId)
      .then((updated) => {
        setJob(updated)
        if (updated.status === 'queued' || updated.status === 'processing') {
          timerRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS)
        }
      })
      .catch(() => {
        // Un fallo de red aquí ya lo captura useBackendConnection a nivel
        // global (ConnectionBanner); no hace falta duplicar el manejo.
      })
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  /** Sube las imágenes y arranca el polling de su estado. */
  const submit = useCallback(
    async (images: File[], exportDocx: boolean) => {
      const created = await createJob(images, exportDocx)
      setJob(created)
      poll(created.jobId)
    },
    [poll],
  )

  /** Reintenta el trabajo actual (si existe) y retoma el polling. */
  const retry = useCallback(async () => {
    if (!job) return
    const retried = await retryJob(job.jobId)
    setJob(retried)
    poll(retried.jobId)
  }, [job, poll])

  return { job, submit, retry }
}
