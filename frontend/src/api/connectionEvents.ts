/**
 * Bus de eventos mínimo para que `client.ts` (que no sabe nada de React)
 * pueda avisar de un fallo de red sin depender de `useBackendConnection`
 * directamente -- Dependency Inversion: la capa HTTP solo emite un evento,
 * quien esté escuchando decide qué hacer con eso.
 */
const target = new EventTarget()
const NETWORK_ERROR_EVENT = 'network-error'

/** Notifica que una petición al backend falló por red (no por un error de negocio). */
export function emitNetworkError(): void {
  target.dispatchEvent(new Event(NETWORK_ERROR_EVENT))
}

/**
 * Se suscribe a los fallos de red emitidos por `emitNetworkError`.
 *
 * @param handler - Se invoca cada vez que ocurre un fallo de red.
 * @returns Función para cancelar la suscripción.
 */
export function onNetworkError(handler: () => void): () => void {
  target.addEventListener(NETWORK_ERROR_EVENT, handler)
  return () => target.removeEventListener(NETWORK_ERROR_EVENT, handler)
}
