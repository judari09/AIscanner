import type { SVGProps } from 'react'

interface ChevronIconProps extends SVGProps<SVGSVGElement> {
  /** Hacia dónde apunta la flecha. @default 'left' */
  direction?: 'left' | 'right'
}

/**
 * Flecha direccional para el control de colapsar/expandir la barra lateral
 * (US4 de 003-ui-polish-model-switch, FR-011).
 *
 * @param direction - `'left'` (por defecto) o `'right'`; el resto de props se remite al `<svg>`.
 */
export function ChevronIcon({ direction = 'left', ...props }: ChevronIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      {...props}
      style={{ ...props.style, transform: direction === 'right' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M15 5 9 12l6 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
