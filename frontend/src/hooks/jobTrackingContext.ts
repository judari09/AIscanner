import { createContext } from 'react'
import type { ProcessingJob } from '../api/types'

export interface JobTrackingValue {
  job: ProcessingJob | null
  submit: (images: File[], exportDocx: boolean) => Promise<void>
  retry: () => Promise<void>
}

/**
 * Contexto compartido entre `JobTrackingProvider` (quien lo provee) y
 * `useJobTracking` (quien lo consume) -- separado en su propio módulo,
 * sin componentes, para que ninguno de los otros dos archivos mezcle un
 * componente con una exportación no-componente (regla `react-refresh` de
 * oxlint, necesaria para que el hot-reload de Vite funcione bien).
 */
export const JobTrackingContext = createContext<JobTrackingValue | null>(null)
