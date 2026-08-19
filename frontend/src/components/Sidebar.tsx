import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronIcon } from './icons/ChevronIcon'
import { ExplorerIcon } from './icons/ExplorerIcon'
import { SettingsIcon } from './icons/SettingsIcon'
import { UploadIcon } from './icons/UploadIcon'
import { ScreenHelpTooltip } from './ScreenHelpTooltip'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  {
    to: '/',
    end: true,
    label: 'Cargar',
    icon: <UploadIcon />,
    helpText: 'Sube una o varias imágenes de un mismo documento, en orden, para digitalizarlas a Markdown.',
  },
  {
    to: '/explorer',
    end: false,
    label: 'Explorador',
    icon: <ExplorerIcon />,
    helpText: 'Consulta, organiza y descarga los documentos que ya digitalizaste.',
  },
  {
    to: '/settings',
    end: false,
    label: 'Configuración',
    icon: <SettingsIcon />,
    helpText: 'Elige qué modelo de Ollama usa el digitalizador para tus notas.',
  },
]

interface SidebarProps {
  /** Si la barra está en modo compacto (solo iconos). Controlado por `Layout` (ver su docstring). */
  collapsed: boolean
  /** Alterna `collapsed`. */
  onToggleCollapse: () => void
}

/**
 * Navegación entre "Cargar", "Explorador" y "Configuración", con iconos SVG
 * propios (US4 de 003-ui-polish-model-switch, reemplazan los emojis de la
 * feature 001) y ayuda contextual por icono (US3, `ScreenHelpTooltip`).
 *
 * El estado de colapso (`collapsed`/`onToggleCollapse`) vive en `Layout`, no
 * aquí: el contenido principal (`.content` en `Layout.module.css`) necesita
 * reaccionar al mismo cambio para aprovechar el ancho que la barra libera al
 * colapsarse, así que ambos deben compartir una única fuente de verdad en
 * vez de que `Sidebar` la mantenga en privado. En pantallas angostas
 * (`<1024px`) la barra sigue además ocultándose tras un botón de menú, igual
 * que en la feature 001 -- ese comportamiento responsive es independiente
 * del colapso manual de escritorio.
 */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        aria-label={mobileOpen ? 'Cerrar navegación' : 'Abrir navegación'}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
        onClick={() => setMobileOpen((open) => !open)}
      >
        ☰
      </button>
      <nav
        id="sidebar-nav"
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''} ${collapsed ? styles.sidebarCollapsed : ''}`}
        aria-label="Navegación principal"
      >
        <div className={styles.brandRow}>
          {!collapsed && <span className={styles.brand}>aiscanner</span>}
          <button
            type="button"
            className={styles.collapseToggle}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-pressed={collapsed}
            onClick={onToggleCollapse}
          >
            <ChevronIcon direction={collapsed ? 'right' : 'left'} />
          </button>
        </div>
        <ul className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <ScreenHelpTooltip icon={item.icon} helpText={item.helpText}>
                  {!collapsed && <span>{item.label}</span>}
                </ScreenHelpTooltip>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
