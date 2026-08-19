import type { ReactNode } from 'react'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'
import { ConnectionBanner } from './ConnectionBanner'
import { Sidebar } from './Sidebar'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

/**
 * Cascarón compartido por ambas páginas: sidebar de navegación + aviso de
 * conexión + contenido.
 *
 * El estado de colapso de la barra lateral se lee aquí (no dentro de
 * `Sidebar`) y se pasa hacia abajo -- el propio `Sidebar` lo necesita para
 * decidir su modo compacto, y mantener una única fuente de verdad en el
 * padre evita que `.content` y la barra queden desincronizados si en el
 * futuro el contenido necesitara volver a reaccionar a ese estado.
 */
export function Layout({ children }: LayoutProps) {
  const { collapsed, toggle } = useSidebarCollapse()

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggle} />
      <main className={styles.content}>
        <ConnectionBanner />
        {children}
      </main>
    </div>
  )
}
