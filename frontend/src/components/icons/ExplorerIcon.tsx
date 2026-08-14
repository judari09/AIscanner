import type { SVGProps } from 'react'

/**
 * Icono de la pantalla "Explorador" (US4 de 003-ui-polish-model-switch):
 * una carpeta, reemplaza el emoji 📁 usado hasta ahora en `Sidebar.tsx`.
 *
 * @param props - Props estándar de un elemento `<svg>` (ej. `className`), remitidas tal cual.
 */
export function ExplorerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l1.6 2H18.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}
