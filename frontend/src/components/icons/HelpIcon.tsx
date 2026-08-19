import type { SVGProps } from 'react'

/**
 * Icono "?" de ayuda contextual (US3 de 003-ui-polish-model-switch).
 *
 * Se usa dentro de `ScreenHelpTooltip` como el control visible que muestra
 * la explicación de una pantalla también por tap/foco, no solo por hover
 * (Clarifications, sesión 2026-08-14) -- por eso el propio SVG es
 * `aria-hidden`, el texto accesible lo aporta el botón que lo envuelve.
 *
 * @param props - Props estándar de un elemento `<svg>` (ej. `className`), remitidas tal cual.
 */
export function HelpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.3 9.2a2.7 2.7 0 1 1 3.7 2.5c-.75.32-1.2.95-1.2 1.75v.35"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  )
}
