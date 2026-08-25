import type { ReactNode } from 'react'
import { JobTrackingContext } from '../hooks/jobTrackingContext'
import { useJobPolling } from '../hooks/useJobPolling'

interface JobTrackingProviderProps {
  children: ReactNode
}

/**
 * Provee el seguimiento del trabajo actual por encima de las rutas (montado
 * una sola vez en `App.tsx`), para que sobreviva a la navegación entre
 * pantallas.
 *
 * Antes, `useJobPolling` se llamaba directamente dentro de `UploadPage`, así
 * que React destruía su estado al desmontarla -- si el usuario navegaba a
 * otra pantalla y volvía a Cargar, el trabajo ya terminado se había
 * "olvidado" y el aviso de finalización (`CompletionToast`) nunca volvía a
 * aparecer, aunque el documento sí se hubiera generado. Subir el estado a
 * este Context resuelve exactamente eso, sin cambiar `useJobPolling` en sí.
 *
 * A propósito, esto NO sobrevive a una recarga completa de la página (F5):
 * es un Context de React, vive solo en memoria de esta sesión de la SPA,
 * consistente con que el propio trabajo (`ProcessingJob`) tampoco persiste
 * entre reinicios del servidor (Principio VI de la constitución).
 *
 * @param props - Ver {@link JobTrackingProviderProps}.
 */
export function JobTrackingProvider({ children }: JobTrackingProviderProps) {
  const value = useJobPolling()
  return <JobTrackingContext.Provider value={value}>{children}</JobTrackingContext.Provider>
}
