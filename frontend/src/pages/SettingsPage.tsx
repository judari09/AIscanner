import { useEffect, useState } from 'react'
import { ApiError, getModels, setActiveModel } from '../api/client'
import type { AvailableModel } from '../api/types'
import styles from './SettingsPage.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; models: AvailableModel[]; activeModel: string }

/**
 * Traduce un fallo de `getModels()`/`setActiveModel()` a un mensaje para el
 * usuario. Un `NetworkError` o un `ApiError` con status `503` significan lo
 * mismo aquí: no se pudo hablar con Ollama (FR-008); cualquier otro status
 * de `ApiError` usa `genericMessage`.
 */
function connectionErrorMessage(error: unknown, genericMessage: string): string {
  if (error instanceof ApiError && error.status !== 503) return genericMessage
  return 'No se pudo conectar con Ollama en el equipo local.'
}

/**
 * Pantalla de Configuración: muestra los modelos de Ollama instalados
 * localmente, cuál está activo, y permite cambiarlo (US1/US2 de
 * 003-ui-polish-model-switch).
 */
export function SettingsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [selected, setSelected] = useState<string | null>(null)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getModels()
      .then(({ models, activeModel }) => {
        if (cancelled) return
        setState({ status: 'ready', models, activeModel })
        setSelected(activeModel)
      })
      .catch((error) => {
        if (cancelled) return
        setState({ status: 'error', message: connectionErrorMessage(error, 'No se pudo cargar la lista de modelos.') })
      })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Confirma el cambio al modelo seleccionado (FR-003/FR-004). Si falla
   * (409: ya no está instalado; 503: Ollama inalcanzable), el modelo activo
   * mostrado no se toca -- se queda con el que ya estaba (FR-005).
   */
  async function handleConfirm() {
    if (state.status !== 'ready' || !selected || selected === state.activeModel) return
    setSaving(true)
    setChangeError(null)
    setConfirmation(null)
    try {
      const { activeModel } = await setActiveModel(selected)
      setState({ ...state, activeModel })
      setConfirmation(`Modelo activo actualizado a "${activeModel}".`)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 503)) {
        // El backend anida el detalle bajo "detail" (convención de FastAPI
        // ya usada en el resto de este backend, ver contracts/api-additions.md).
        const body = error.detail as { detail?: { error?: string } }
        setChangeError(body.detail?.error ?? 'No se pudo cambiar el modelo activo.')
      } else {
        setChangeError('No se pudo cambiar el modelo activo.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 'var(--type-display-lg-size)', fontWeight: 'var(--type-display-lg-weight)' }}>
        Configuración
      </h1>
      <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-on-surface-variant)' }}>
        Elige qué modelo de Ollama usa el digitalizador para corregir y estructurar tus notas.
      </p>

      <div className={styles.card}>
        {state.status === 'loading' && <p>Cargando modelos…</p>}

        {state.status === 'error' && (
          <div className={styles.errorMessage} role="alert">
            {state.message}
          </div>
        )}

        {state.status === 'ready' && state.models.length === 0 && (
          <p>
            No hay modelos instalados en Ollama. Instala uno fuera de la aplicación (por ejemplo{' '}
            <code>ollama pull qwen2.5:7b-instruct</code>) y vuelve a abrir esta pantalla.
          </p>
        )}

        {state.status === 'ready' && state.models.length > 0 && (
          <>
            {!state.models.some((model) => model.name === state.activeModel) && (
              <div className={styles.warningMessage} role="alert">
                El modelo activo configurado ("{state.activeModel}") ya no está disponible en
                Ollama. Elige uno de los modelos instalados a continuación.
              </div>
            )}

            <fieldset className={styles.modelList}>
              <legend className={styles.legend}>Modelos instalados</legend>
              {state.models.map((model) => (
                <label key={model.name} className={styles.modelListItem}>
                  <span className={styles.modelOption}>
                    <input
                      type="radio"
                      name="active-model"
                      value={model.name}
                      checked={selected === model.name}
                      onChange={() => setSelected(model.name)}
                    />
                    {model.name}
                  </span>
                  {model.name === state.activeModel && <span className={styles.activeBadge}>Activo</span>}
                </label>
              ))}
            </fieldset>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving || !selected || selected === state.activeModel}
              onClick={handleConfirm}
            >
              {saving ? 'Aplicando…' : 'Usar este modelo'}
            </button>

            {changeError && (
              <div className={styles.errorMessage} role="alert">
                {changeError}
              </div>
            )}
            {confirmation && (
              <output className={styles.confirmation}>{confirmation}</output>
            )}
          </>
        )}
      </div>
    </>
  )
}
