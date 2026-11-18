import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../services/apiClient'

const REFRESH_SETTING_KEY = 'tiempoRefresco'
const DEFAULT_INTERVAL_MS = 30_000
const CONFIGURATION_NOT_FOUND_MESSAGE = 'Configuración no encontrada.'
const MAX_INTERVAL_MS = 2_147_483_647

export function useRefreshInterval(token?: string | null) {
  const [intervalMs, setIntervalMs] = useState<number | null>(null)
  const [error, setError] = useState('')

  const loadInterval = useCallback(async () => {
    setError('')
    try {
      const payload = await apiRequest(
        `/api/configuracion/${encodeURIComponent(REFRESH_SETTING_KEY)}`,
        token,
      )
      const configuration = payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: unknown }).data
        : payload
      const value = configuration && typeof configuration === 'object' && 'valor' in configuration
        ? Number((configuration as { valor: unknown }).valor)
        : Number.NaN
      const nextIntervalMs = value * 1000
      if (!Number.isFinite(value) || value <= 0 ||
        !Number.isFinite(nextIntervalMs) || nextIntervalMs > MAX_INTERVAL_MS) {
        throw new Error('El valor de tiempoRefresco debe ser un número de segundos mayor que cero.')
      }
      setIntervalMs(nextIntervalMs)
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message.trim() === CONFIGURATION_NOT_FOUND_MESSAGE) {
        setIntervalMs(DEFAULT_INTERVAL_MS)
        setError('')
      } else {
        setIntervalMs(null)
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar tiempoRefresco.')
      }
    }
  }, [token])

  useEffect(() => {
    void Promise.resolve().then(loadInterval)
  }, [loadInterval])

  const clearError = useCallback(() => setError(''), [])

  return { intervalMs, error, clearError, reload: loadInterval }
}
