import type { ReactNode } from 'react'
import { ConnectionBanner } from './ConnectionBanner'
import { Sidebar } from './Sidebar'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

/** Cascarón compartido por ambas páginas: sidebar de navegación + aviso de conexión + contenido. */
export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.content}>
        <ConnectionBanner />
        {children}
      </main>
    </div>
  )
}
