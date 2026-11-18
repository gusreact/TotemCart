import { useEffect, useState } from 'react'
import { apiRequest, unwrapRows } from '../../services/apiClient'
import { ErrorDialog } from '../../components/ErrorDialog'
import { useRefreshInterval } from '../../hooks/useRefreshInterval'
import type { Language } from '../storefront/language'
import { formatDuration, getMaxPreparationMinutes, getRemainingPreparationSeconds } from './orderTimer'

type CheckoutSaleByCode = {
  pedido_estado_id: number
  pedido_estado: {
    descripcion_es?: string | null
    descripcion_en?: string | null
  } | null
  preparation_at: string | null
  items: { product_id: number; quantity: number }[]
}

type ProductPreparation = {
  id: number
  tiempo_preparacion?: number | string | null
}

const messages = {
  es: {
    title: 'Estado del pedido',
    loading: 'Consultando pedido…',
    status: 'Estado',
    preparationTime: 'Tiempo de preparación',
    statusError: 'No se pudo consultar el estado del pedido.',
    timerError: 'No se pudo cargar el tiempo estimado de preparación.',
  },
  en: {
    title: 'Order status',
    loading: 'Checking order…',
    status: 'Status',
    preparationTime: 'Preparation time',
    statusError: 'Could not load the order status.',
    timerError: 'Could not load the estimated preparation time.',
  },
}

export function CheckoutOrderStatus({ pedidoCodigo, language }: {
  pedidoCodigo: string
  language: Language
}) {
  const [sale, setSale] = useState<CheckoutSaleByCode | null>(null)
  const [preparationTimes, setPreparationTimes] = useState<Map<number, number>>(new Map())
  const [now, setNow] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const { intervalMs, error: refreshIntervalError, clearError, reload } = useRefreshInterval()
  const text = messages[language]

  useEffect(() => {
    let active = true
    let refreshing = false

    const refreshStatus = async () => {
      if (refreshing) return
      refreshing = true
      try {
        const payload = await apiRequest(
          `/api/payments/sales/by-code/${encodeURIComponent(pedidoCodigo)}`,
          null,
        )
        if (active) {
          setSale(payload as CheckoutSaleByCode)
          setFetchError('')
        }
      } catch (error) {
        if (active) {
          setFetchError(error instanceof Error ? error.message : text.statusError)
        }
      } finally {
        refreshing = false
        if (active) setLoading(false)
      }
    }

    void refreshStatus()
    const statusInterval = intervalMs === null
      ? undefined
      : window.setInterval(() => void refreshStatus(), intervalMs)

    return () => {
      active = false
      if (statusInterval !== undefined) window.clearInterval(statusInterval)
    }
  }, [pedidoCodigo, intervalMs, text.statusError])

  useEffect(() => {
    let active = true
    const loadPreparationTimes = async () => {
      try {
        const payload = await apiRequest('/api/productos', null)
        const times = unwrapRows(payload).reduce((result, row) => {
          const product = row as ProductPreparation
          const minutes = Number(product.tiempo_preparacion)
          if (product.tiempo_preparacion !== null && product.tiempo_preparacion !== undefined &&
            product.tiempo_preparacion !== '' && Number.isFinite(minutes) && minutes > 0) {
            result.set(product.id, minutes)
          }
          return result
        }, new Map<number, number>())
        if (active) setPreparationTimes(times)
      } catch (error) {
        if (active) setFetchError(error instanceof Error ? error.message : text.timerError)
      }
    }

    void loadPreparationTimes()
    return () => {
      active = false
    }
  }, [text.timerError])

  useEffect(() => {
    const timerInterval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timerInterval)
  }, [])

  const orderStatus = sale?.pedido_estado?.[language === 'es' ? 'descripcion_es' : 'descripcion_en']
    ?? (sale ? `Estado ${sale.pedido_estado_id}` : '')
  const maxPreparationMinutes = sale ? getMaxPreparationMinutes(sale.items, preparationTimes) : 0
  const remainingSeconds = sale?.pedido_estado_id === 2 && now !== null
    ? getRemainingPreparationSeconds(sale.preparation_at, maxPreparationMinutes, now)
    : null

  return (
    <>
      {fetchError || refreshIntervalError ? (
        <ErrorDialog
          message={[fetchError, refreshIntervalError].filter(Boolean).join('\n\n')}
          onClose={() => {
            setFetchError('')
            clearError()
          }}
          onRetry={refreshIntervalError ? () => void reload() : undefined}
          retryLabel={refreshIntervalError ? (language === 'es' ? 'Reintentar' : 'Retry') : undefined}
          closeLabel={language === 'es' ? 'Cerrar aviso' : 'Dismiss alert'}
        />
      ) : null}
      <aside className="checkout-order-status" aria-live="polite">
        <h2>{text.title}</h2>
        {loading && !sale ? <p>{text.loading}</p> : null}
        {sale ? (
          <div className="checkout-order-status-line">
            <span>{text.status}</span>
            <strong>{orderStatus}</strong>
          </div>
        ) : null}
        {sale?.pedido_estado_id === 2 && remainingSeconds !== null ? (
          <div className="checkout-preparation-timer">
            <span>{text.preparationTime}</span>
            <time className={`order-timer${remainingSeconds === 0 ? ' is-finished' : ''}`} aria-label={text.preparationTime}>
              {formatDuration(remainingSeconds)}
            </time>
          </div>
        ) : null}
      </aside>
    </>
  )
}
