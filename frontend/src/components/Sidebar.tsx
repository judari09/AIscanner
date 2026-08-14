import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

/**
 * Navegación entre "Cargar" y "Explorador". Replica el comportamiento de la
 * feature 001: ancho fijo en escritorio, oculta tras un botón de menú en
 * pantallas angostas (`<1024px`) -- sin colapso manual persistente, eso
 * quedó para una feature futura (research.md §6).
 *
 * Los íconos siguen siendo emoji, igual que en la feature 001 -- su
 * reemplazo por SVG está fuera de alcance de esta migración.
 */
export function Sidebar() {
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
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}
        aria-label="Navegación principal"
      >
        <div className={styles.brand}>aiscanner</div>
        <ul className={styles.nav}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="navIcon" aria-hidden="true">
                ⬆
              </span>
              <span>Cargar</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/explorer"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="navIcon" aria-hidden="true">
                📁
              </span>
              <span>Explorador</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  )
}
