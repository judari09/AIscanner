import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createFolder, downloadFileUrl, downloadFolderUrl, listFiles, moveFile } from '../api/client'
import type { DirectoryListing, DocumentEntry, FolderEntry } from '../api/types'
import { DocumentViewer } from '../components/DocumentViewer'
import styles from './ExplorerPage.module.css'

/**
 * Página del explorador (Historia 2, feature 001): navega carpetas, lista
 * documentos, permite crear carpetas, mover documentos/carpetas, descargar,
 * y visualizar el contenido de un documento.
 *
 * El movimiento de archivos ofrece dos caminos: arrastrar-y-soltar (cómodo
 * con mouse, igual que en la feature 001) y un botón "Mover…" explícito por
 * ítem (necesario porque el drag-and-drop puro no es operable por teclado,
 * y FR-010 de esta feature exige que todo flujo lo sea).
 *
 * También acepta llegar con un documento a abrir de inmediato vía los query
 * params `open`/`name` de la URL (ej. `/explorer?open=mi-doc&name=mi-doc.md`),
 * que es como `CompletionToast` (004-digitization-completion-notice, FR-008)
 * enlaza directo a un documento recién generado sin que el usuario tenga que
 * ubicarlo manualmente en la lista.
 */
export function ExplorerPage() {
  const [searchParams] = useSearchParams()
  const [currentPath, setCurrentPath] = useState('')
  const [listing, setListing] = useState<DirectoryListing | null>(null)
  const [viewerPath, setViewerPath] = useState<string | null>(() => searchParams.get('open'))
  const [viewerName, setViewerName] = useState(() => searchParams.get('name') ?? '')
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  const reload = useCallback((path: string) => {
    listFiles(path)
      .then(setListing)
      .catch(() => setListing({ path, folders: [], documents: [] }))
  }, [])

  useEffect(() => reload(currentPath), [currentPath, reload])

  /** Pide el nombre de una carpeta nueva y la crea en `currentPath` (FR-014 de la feature 001). */
  async function handleCreateFolder() {
    const name = window.prompt('Nombre de la nueva carpeta:')
    if (!name) return
    const path = currentPath ? `${currentPath}/${name}` : name
    try {
      await createFolder(path)
      reload(currentPath)
    } catch {
      window.alert('Ya existe una carpeta o archivo con ese nombre aquí.')
    }
  }

  /**
   * Mueve `source` a `destination`; si hay conflicto de nombre (409), pide
   * un nombre alternativo y reintenta -- mismo flujo que ya usaba
   * `explorer.js` en la feature 001.
   */
  async function handleMove(source: string, destination: string): Promise<void> {
    try {
      await moveFile(source, destination)
      reload(currentPath)
    } catch {
      const newName = window.prompt('Ya existe algo con ese nombre en el destino. Elige otro nombre:')
      if (!newName) return
      const parent = destination.split('/').slice(0, -1).join('/')
      await handleMove(source, parent ? `${parent}/${newName}` : newName)
    }
  }

  /** Pide la carpeta destino con un diálogo nativo y dispara `handleMove` (accesible por diseño: es un diálogo del navegador). */
  function promptMove(sourcePath: string) {
    const destination = window.prompt('Ruta de destino (relativa a la raíz del explorador):', currentPath)
    if (destination === null) return
    const name = sourcePath.split('/').pop()
    void handleMove(sourcePath, destination ? `${destination}/${name}` : String(name))
  }

  const segments = currentPath ? currentPath.split('/') : []
  const isEmpty = listing !== null && listing.folders.length === 0 && listing.documents.length === 0

  return (
    <>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 'var(--type-display-lg-weight)' }}>
        Explorador
      </h1>

      <div className={styles.toolbar}>
        <nav className={styles.pathBar} aria-label="Ruta actual">
          <button type="button" className={styles.pathSegment} onClick={() => setCurrentPath('')}>
            🏠 Raíz
          </button>
          {segments.map((segment, index) => {
            const target = segments.slice(0, index + 1).join('/')
            return (
              <span key={target}>
                {' / '}
                <button type="button" className={styles.pathSegment} onClick={() => setCurrentPath(target)}>
                  {segment}
                </button>
              </span>
            )
          })}
        </nav>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCreateFolder}>
          + Nueva carpeta
        </button>
      </div>

      {isEmpty && (
        <div className={styles.emptyState}>
          <p style={{ fontSize: 'var(--type-headline-sm-size)' }}>Todavía no hay documentos procesados aquí</p>
          <p>
            Carga uno desde la página de <a href="/">Cargar</a>.
          </p>
        </div>
      )}

      {listing && !isEmpty && (
        <ul className={styles.grid}>
          {listing.folders.map((folder) => (
            <FolderCard
              key={folder.path}
              folder={folder}
              isDropTarget={dragOverPath === folder.path}
              onOpen={() => setCurrentPath(folder.path)}
              onDownload={() => {
                window.location.href = downloadFolderUrl(folder.path)
              }}
              onMove={() => promptMove(folder.path)}
              onDragOver={() => setDragOverPath(folder.path)}
              onDragLeave={() => setDragOverPath(null)}
              onDrop={(sourcePath) => {
                setDragOverPath(null)
                const name = sourcePath.split('/').pop()
                void handleMove(sourcePath, `${folder.path}/${name}`)
              }}
            />
          ))}
          {listing.documents.map((doc) => (
            <DocumentCard
              key={doc.path}
              doc={doc}
              onOpen={() => {
                setViewerPath(doc.path)
                setViewerName(doc.name)
              }}
              onDownload={() => {
                window.location.href = downloadFileUrl(doc.path)
              }}
              onMove={() => promptMove(doc.path)}
            />
          ))}
        </ul>
      )}

      <DocumentViewer path={viewerPath} name={viewerName} onClose={() => setViewerPath(null)} />
    </>
  )
}

interface FolderCardProps {
  folder: FolderEntry
  isDropTarget: boolean
  onOpen: () => void
  onDownload: () => void
  onMove: () => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (sourcePath: string) => void
}

/** Tarjeta de una carpeta de organización: abrir, mover o descargar como `.zip` completo. */
function FolderCard({ folder, isDropTarget, onOpen, onDownload, onMove, onDragOver, onDragLeave, onDrop }: FolderCardProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- el drag-and-drop es solo una comodidad extra para mouse; el botón "Mover…" de abajo ya cubre el mismo flujo por teclado (FR-010).
    <li
      className={`${styles.item} ${isDropTarget ? styles.dropTarget : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(event.dataTransfer.getData('text/plain'))
      }}
    >
      <button type="button" className={styles.itemOpenButton} onClick={onOpen} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', folder.path)}>
        <span className={`${styles.icon} ${styles.iconFolder}`} aria-hidden="true">
          📁
        </span>
        <span className={styles.name}>{folder.name}</span>
      </button>
      <div className={styles.itemActions}>
        <button type="button" className={`${styles.btn} ${styles.btnTertiary}`} onClick={onMove}>
          Mover…
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnTertiary}`} onClick={onDownload}>
          Descargar carpeta
        </button>
      </div>
    </li>
  )
}

interface DocumentCardProps {
  doc: DocumentEntry
  onOpen: () => void
  onDownload: () => void
  onMove: () => void
}

/** Tarjeta de un documento procesado: abrir en el visor, mover o descargar. */
function DocumentCard({ doc, onOpen, onDownload, onMove }: DocumentCardProps) {
  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.itemOpenButton}
        onClick={onOpen}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', doc.path)}
      >
        <span className={`${styles.icon} ${styles.iconDocument}`} aria-hidden="true">
          📄
        </span>
        <span className={styles.name}>{doc.name}</span>
        <span className={styles.meta}>Modificado: {new Date(doc.modifiedAt).toLocaleString()}</span>
        {doc.hasDocx && <span className={styles.chipDocx}>DOCX</span>}
      </button>
      <div className={styles.itemActions}>
        <button type="button" className={`${styles.btn} ${styles.btnTertiary}`} onClick={onMove}>
          Mover…
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnTertiary}`} onClick={onDownload}>
          Descargar
        </button>
      </div>
    </li>
  )
}
