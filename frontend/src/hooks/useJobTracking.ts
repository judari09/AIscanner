import { useContext } from 'react'
import { JobTrackingContext, type JobTrackingValue } from './jobTrackingContext'

/**
 * Consume el seguimiento del trabajo actual, provisto por `JobTrackingProvider`.
 *
 * @throws {Error} Si se usa fuera de un `JobTrackingProvider` (error de programación, no de usuario).
 */
export function useJobTracking(): JobTrackingValue {
  const context = useContext(JobTrackingContext)
  if (!context) {
    throw new Error('useJobTracking debe usarse dentro de un JobTrackingProvider.')
  }
  return context
}
