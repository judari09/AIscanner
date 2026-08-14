import * as Dialog from '@radix-ui/react-dialog'
import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { viewFile } from '../api/client'
import styles from './DocumentViewer.module.css'

interface DocumentViewerProps {
  /** Ruta del documento a mostrar, o `null` si el visor debe estar cerrado. */
  path: string | null
  name: string
  onClose: () => void
}

/**
 * Modal de visualización de un documento procesado (Historia 2, feature
 * 001, FR-008). Usa `Dialog` de Radix UI en vez de una implementación
 * propia: maneja la trampa de foco, el cierre con `Escape`, y el anuncio a
 * lectores de pantalla de fábrica (research.md §2, FR-010/FR-011) -- algo
 * que la versión anterior (un `<div hidden>` a mano) no garantizaba.
 */
export function DocumentViewer({ path, name, onClose }: DocumentViewerProps) {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    if (!path) return
    let cancelled = false
    viewFile(path).then((view) => {
      if (!cancelled) setHtml(marked.parse(view.markdown, { async: false }))
    })
    return () => {
      cancelled = true
    }
  }, [path])

  return (
    <Dialog.Root open={path !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}>
          <Dialog.Content className={styles.panel} aria-describedby={undefined}>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeButton}>
                Cerrar ✕
              </button>
            </Dialog.Close>
            <Dialog.Title style={{ fontSize: 'var(--type-headline-sm-size)' }}>{name}</Dialog.Title>
            {/* eslint-disable-next-line react/no-danger -- HTML generado por `marked` a partir de contenido del propio backend, no de un tercero. */}
            <div className={styles.markdownBody} dangerouslySetInnerHTML={{ __html: html }} />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
