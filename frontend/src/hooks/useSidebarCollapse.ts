import { useEffect, useState } from 'react'

const STORAGE_KEY = 'aiscanner:sidebar-collapsed'

/** Lee el valor persistido, o `false` si no hay ninguno guardado todavía (o `localStorage` no está disponible). */
function readStoredValue(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Persiste si la barra lateral está colapsada (solo iconos) o expandida
 * (iconos + etiquetas) en `localStorage` -- por dispositivo/navegador, no en
 * el backend (research.md §5 de 003-ui-polish-model-switch: es una
 * preferencia puramente visual, sin relación con qué modelo digitaliza los
 * documentos, a diferencia del modelo activo).
 *
 * @returns El estado actual (`collapsed`) y una función para alternarlo (`toggle`).
 */
export function useSidebarCollapse(): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState(readStoredValue)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // Sin almacenamiento disponible (ej. modo privado estricto) -- la
      // preferencia simplemente no sobrevive a un reload, sin romper nada.
    }
  }, [collapsed])

  return { collapsed, toggle: () => setCollapsed((value) => !value) }
}
