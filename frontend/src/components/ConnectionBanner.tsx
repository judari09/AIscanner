import { useBackendConnection } from '../hooks/useBackendConnection'
import styles from './ConnectionBanner.module.css'

/**
 * Aviso de "sin conexión con el servidor" (FR-012). No renderiza nada
 * mientras el backend responde con normalidad -- solo aparece cuando
 * `useBackendConnection` detecta un fallo de red, y desaparece solo cuando
 * el backend vuelve (sin que el usuario recargue la página).
 *
 * Se usa `<output>` (en vez de un `<div role="status">`) porque tiene el
 * rol `status` implícito en el propio elemento semántico -- se anuncia a
 * lectores de pantalla sin la interrupción que tendría un `alert`, y sin
 * necesitar el atributo ARIA redundante.
 */
export function ConnectionBanner() {
  const status = useBackendConnection()

  if (status === 'connected') return null

  return <output className={styles.banner}>Sin conexión con el servidor. Reintentando automáticamente…</output>
}
