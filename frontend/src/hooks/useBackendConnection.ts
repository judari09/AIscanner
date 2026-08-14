import { useEffect, useState } from 'react'
import { checkHealth } from '../api/client'
import { onNetworkError } from '../api/connectionEvents'

/** Estado de conexión con el backend, puramente de sesión (no se persiste, ver data-model.md). */
export type ConnectionStatus = 'connected' | 'disconnected'

const HEALTH_CHECK_INTERVAL_MS = 3000

/**
 * Expone si el backend parece alcanzable en este momento (FR-012).
 *
 * Arranca siempre en `"connected"` (data-model.md: no hay forma de saber de
 * antemano si el backend está arriba antes de intentar algo). Pasa a
 * `"disconnected"` en cuanto cualquier llamada de `client.ts` falla por red
 * (ver `connectionEvents.ts`), y vuelve solo a `"connected"` cuando
 * `GET /health` responde de nuevo -- sin que el usuario tenga que recargar
 * la página.
 *
 * @returns El estado de conexión actual.
 */
export function useBackendConnection(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connected')

  useEffect(() => onNetworkError(() => setStatus('disconnected')), [])

  useEffect(() => {
    if (status !== 'disconnected') return

    const interval = setInterval(() => {
      checkHealth()
        .then(() => setStatus('connected'))
        .catch(() => {
          // Sigue caído; se reintenta en el próximo intervalo. No hace
          // falta re-emitir el evento de red: ya estamos en "disconnected".
        })
    }, HEALTH_CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [status])

  return status
}
