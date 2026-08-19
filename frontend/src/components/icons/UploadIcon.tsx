import type { SVGProps } from 'react'

/**
 * Icono de la pantalla "Cargar" (US4 de 003-ui-polish-model-switch):
 * una flecha saliendo de una bandeja, reemplaza el emoji ⬆ usado hasta
 * ahora en `Sidebar.tsx`.
 *
 * @param props - Props estándar de un elemento `<svg>` (ej. `className`), remitidas tal cual.
 */
export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 15V4M12 4 8 8M12 4l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
