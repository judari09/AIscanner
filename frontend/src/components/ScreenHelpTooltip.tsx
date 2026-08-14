import { useId, useState, type ReactNode } from 'react'
import { HelpIcon } from './icons/HelpIcon'
import styles from './ScreenHelpTooltip.module.css'

interface ScreenHelpTooltipProps {
  /** Icono de la pantalla que se envuelve (ej. `<UploadIcon />`). */
  icon: ReactNode
  /** Texto breve que explica qué se puede hacer en esa pantalla (RF3). */
  helpText: string
  /**
   * Contenido a mostrar entre el icono y el botón de ayuda -- normalmente
   * la etiqueta de texto de la pantalla (ej. "Cargar"), para que el "?"
   * quede al final del texto en vez de pegado al icono.
   */
  children?: ReactNode
}

/**
 * Envuelve el icono (y, opcionalmente, la etiqueta de texto) de una
 * pantalla con ayuda contextual accesible tanto con mouse como sin él (US3
 * de 003-ui-polish-model-switch, FR-013/FR-014):
 * - En escritorio, el `title` nativo del icono aparece en hover.
 * - Un botón "?" visible al final del texto muestra el mismo texto al
 *   recibir foco o un tap, sin depender de un gesto oculto (Clarifications,
 *   sesión 2026-08-14: se descartó "mantener presionado" a favor de un
 *   control visible y descubrible).
 *
 * Funciona igual con la barra lateral expandida o colapsada -- cuando no
 * hay etiqueta de texto visible (`children` vacío), el botón de ayuda
 * simplemente queda junto al icono.
 *
 * @param props - Ver {@link ScreenHelpTooltipProps}.
 */
export function ScreenHelpTooltip({ icon, helpText, children }: ScreenHelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()

  return (
    <span className={styles.wrapper}>
      <span title={helpText} aria-describedby={open ? popoverId : undefined}>
        {icon}
      </span>
      {children}
      <button
        type="button"
        className={styles.helpButton}
        aria-label={`Ayuda: ${helpText}`}
        aria-expanded={open}
        onClick={(event) => {
          // Evita que el clic también dispare el NavLink que lo envuelve en Sidebar.tsx.
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        onBlur={() => setOpen(false)}
      >
        <HelpIcon />
      </button>
      {open && (
        <output id={popoverId} className={styles.popover}>
          {helpText}
        </output>
      )}
    </span>
  )
}
