import type { SVGProps } from 'react'

/**
 * Icono de la pantalla "Configuración" (US4 de 003-ui-polish-model-switch):
 * un engranaje, reemplaza el emoji temporal ⚙ agregado junto con la ruta
 * `/settings` en US2 (T009).
 *
 * @param props - Props estándar de un elemento `<svg>` (ej. `className`), remitidas tal cual.
 */
export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.6 6.6l1.4 1.4M16 16l1.4 1.4M6.6 17.4 8 16M16 8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
