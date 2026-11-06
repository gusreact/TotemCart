import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { apiRequest, unwrapRows } from '../../services/apiClient'
import { formatDuration, getMaxPreparationMinutes, getRemainingPreparationSeconds } from './orderTimer'

type PedidoEstado = {
  id: number
  descripcion_es: string
  descripcion_en: string
}

type CheckoutOrderIngredient = {
  materia_prima_id: number
  nombre_es: string | null
  nombre_en: string | null
  quantity_per_product: string | number
  requerido?: boolean
}

type CheckoutOrderItem = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: string | number
  ingredients: CheckoutOrderIngredient[]
}

type CheckoutSale = {
  id: number
  external_reference: string
  pedido_codigo: string | null
  pedido_estado_id: number
  pedido_estado: PedidoEstado
  preference_id: string | null
  total: string | number
  currency: string
  payment_status: string
  payment_id: string | null
  payer_identification_number: string | null
  created_at: string | null
  paid_at: string | null
  preparation_at?: string | null
  items: CheckoutOrderItem[]
}

type CheckoutSaleStatusOut = {
  id: number
  pedido_estado_id: number
  preparation_at: string | null
  pedido_estado: PedidoEstado
}

type ProductPreparation = {
  id: number
  receta_id?: number | null
  tiempo_preparacion?: number | string | null
}

type RecipeIngredient = {
  id: number
  requerido?: boolean
}

type RecipeIngredients = {
  receta_id: number
  materias_primas: RecipeIngredient[]
}

type OrdersTab = 'active' | 'ready' | 'delivered' | 'cancelled'

const tabs: { id: OrdersTab; label: string; states: number[]; empty: string }[] = [
  { id: 'active', label: 'Activos', states: [1, 2], empty: 'No hay pedidos activos.' },
  { id: 'ready', label: 'Listo para Retirar', states: [3], empty: 'No hay pedidos listos para retirar.' },
  { id: 'delivered', label: 'Entregados', states: [4], empty: 'No hay pedidos entregados.' },
  { id: 'cancelled', label: 'Cancelados', states: [5], empty: 'No hay pedidos cancelados.' },
]

export function OrdersManager({ token, isAdministrator = false }: { token?: string | null; isAdministrator?: boolean }) {
  const [sales, setSales] = useState<CheckoutSale[]>([])
  const [states, setStates] = useState<PedidoEstado[]>([])
  const [preparationTimes, setPreparationTimes] = useState<Map<number, number>>(new Map())
  const [requiredIngredientIdsByProduct, setRequiredIngredientIdsByProduct] = useState<Map<number, Set<number>>>(new Map())
  const [activeTab, setActiveTab] = useState<OrdersTab>('active')
  const [selectedSale, setSelectedSale] = useState<CheckoutSale | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const ordersRequestInProgress = useRef(false)

  const loadOrders = useCallback(async (showLoading = true) => {
    if (ordersRequestInProgress.current) return
    ordersRequestInProgress.current = true
    setRefreshing(true)
    if (showLoading) setLoading(true)
    setError('')
    try {
      const [salesPayload, statesPayload, productsPayload, recipeIngredientsPayload] = await Promise.all([
        apiRequest('/api/payments/sales', token),
        apiRequest('/api/pedido-estados', token),
        apiRequest('/api/productos', token),
        apiRequest('/api/receta-ingredientes', token),
      ])
      const products = unwrapRows(productsPayload) as ProductPreparation[]
      const recipeIngredients = unwrapRows(recipeIngredientsPayload) as RecipeIngredients[]
      const recipeIngredientsById = new Map(recipeIngredients.map((recipe) => [recipe.receta_id, recipe.materias_primas]))
      const requiredIdsByProduct = new Map<number, Set<number>>()
      products.forEach((product) => {
        if (product.receta_id === null || product.receta_id === undefined) return
        const materials = recipeIngredientsById.get(product.receta_id)
        if (materials) {
          requiredIdsByProduct.set(product.id, new Set(
            materials.filter((material) => material.requerido !== false).map((material) => material.id),
          ))
        }
      })
      const productTimes = products
        .reduce((times, product) => {
          const minutes = Number(product.tiempo_preparacion)
          if (product.tiempo_preparacion !== null && product.tiempo_preparacion !== undefined &&
            product.tiempo_preparacion !== '' && Number.isFinite(minutes) && minutes > 0) {
            times.set(product.id, minutes)
          }
          return times
        }, new Map<number, number>())
      setSales(unwrapRows(salesPayload) as unknown as CheckoutSale[])
      setStates(unwrapRows(statesPayload) as unknown as PedidoEstado[])
      setPreparationTimes(productTimes)
      setRequiredIngredientIdsByProduct(requiredIdsByProduct)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pedidos.')
    } finally {
      ordersRequestInProgress.current = false
      setRefreshing(false)
      if (showLoading) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void Promise.resolve().then(() => loadOrders())
  }, [loadOrders])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadOrders(false)
    }, 30_000)
    return () => window.clearInterval(intervalId)
  }, [loadOrders])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const visibleTabs = isAdministrator ? tabs : tabs.filter((tab) => tab.id !== 'cancelled')
  const activeTabConfig = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0]
  const visibleSales = sales.filter((sale) => activeTabConfig.states.includes(sale.pedido_estado_id))

  const updateSaleState = (orderId: number, updatedStatus: CheckoutSaleStatusOut) => {
    setSales((currentSales) => currentSales.map((sale) => {
      if (sale.id !== orderId) return sale
      return {
        ...sale,
        pedido_estado_id: updatedStatus.pedido_estado_id,
        pedido_estado: updatedStatus.pedido_estado,
        preparation_at: updatedStatus.preparation_at,
      }
    }))
  }

  return (
    <div className="orders-manager">
      <div className="section-heading">
        <div><p className="eyebrow">Administración</p><h1>Pedidos</h1></div>
        <button className="icon-action" type="button" onClick={() => void loadOrders()} disabled={refreshing} aria-label="Actualizar pedidos" title="Actualizar">↻</button>
      </div>

      <div className="orders-tabs" role="tablist" aria-label="Filtrar pedidos">
        {visibleTabs.map((tab) => {
          const count = sales.filter((sale) => tab.states.includes(sale.pedido_estado_id)).length
          return (
            <button
              type="button"
              key={tab.id}
              role="tab"
              id={`orders-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="orders-panel"
              className={`orders-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}<span>{count}</span>
            </button>
          )
        })}
      </div>

      <section id="orders-panel" className="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${activeTab}`}>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {loading ? <p className="catalog-state">Cargando pedidos...</p> : visibleSales.length === 0 ? (
          <p className="catalog-state">{activeTabConfig.empty}</p>
        ) : (
          <div className="orders-grid">
            {visibleSales.map((sale) => (
              <OrderCard
                key={`${sale.id}-${sale.pedido_estado_id}`}
                sale={sale}
                states={states}
                preparationTimes={preparationTimes}
                hideUntimedItems={activeTab === 'active'}
                requiredIngredientIdsByProduct={requiredIngredientIdsByProduct}
                now={now}
                onCodeClick={() => setSelectedSale(sale)}
                onStateUpdated={updateSaleState}
                canCancelOrders={isAdministrator}
                confirmStatusChange={isAdministrator}
                token={token}
              />
            ))}
          </div>
        )}
      </section>

      {selectedSale ? <SaleDetailsDialog sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
    </div>
  )
}

function OrderCard({
  sale,
  states,
  preparationTimes,
  hideUntimedItems,
  requiredIngredientIdsByProduct,
  now,
  onCodeClick,
  onStateUpdated,
  canCancelOrders,
  confirmStatusChange,
  token,
}: {
  sale: CheckoutSale
  states: PedidoEstado[]
  preparationTimes: Map<number, number>
  hideUntimedItems: boolean
  requiredIngredientIdsByProduct: Map<number, Set<number>>
  now: number | null
  onCodeClick: () => void
  onStateUpdated: (orderId: number, updatedStatus: CheckoutSaleStatusOut) => void
  canCancelOrders: boolean
  confirmStatusChange: boolean
  token?: string | null
}) {
  const [selectedStateId, setSelectedStateId] = useState(String(sale.pedido_estado_id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [expandedRequiredItemIds, setExpandedRequiredItemIds] = useState<number[]>([])

  const maxPreparationMinutes = getMaxPreparationMinutes(sale.items, preparationTimes)
  const hasPreparationTime = maxPreparationMinutes > 0
  const remainingSeconds = now === null
    ? null
    : getRemainingPreparationSeconds(sale.preparation_at, maxPreparationMinutes, now)
  const hasTimer = sale.pedido_estado_id === 2 && remainingSeconds !== null
  const selectedStateLabel = states.find((state) => state.id === Number(selectedStateId))?.descripcion_es ?? `Estado ${selectedStateId}`
  const availableStates = states.filter((state) => (
    (hasPreparationTime || ![1, 2].includes(state.id) || state.id === sale.pedido_estado_id) &&
    (canCancelOrders || state.id !== 5 || state.id === sale.pedido_estado_id)
  ))

  const submitState = async () => {
    const nextStateId = Number(selectedStateId)
    if (!Number.isInteger(nextStateId) || nextStateId === sale.pedido_estado_id) return
    setSaving(true)
    setError('')
    try {
      const payload = await apiRequest(`/api/payments/sales/${sale.id}/estado`, token, {
        method: 'PATCH',
        body: JSON.stringify({ pedido_estado_id: nextStateId }),
      })
      const updatedStatus = payload as CheckoutSaleStatusOut
      onStateUpdated(sale.id, updatedStatus)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado del pedido.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateClick = () => {
    if (confirmStatusChange) {
      setConfirmationOpen(true)
      return
    }
    void submitState()
  }

  return (
    <article className="order-card">
      <header className="order-card-header">
        <button type="button" className="order-code-button" onClick={onCodeClick}>
          {sale.pedido_codigo ?? `Pedido #${sale.id}`}
        </button>
        {hasTimer ? <time className={`order-timer${remainingSeconds === 0 ? ' is-finished' : ''}`} aria-label="Tiempo restante de preparación">{formatDuration(remainingSeconds)}</time> : null}
      </header>

      <div className="order-state-line">
        <span className="order-state-label">Estado</span>
        <strong>{sale.pedido_estado?.descripcion_es ?? `Estado ${sale.pedido_estado_id}`}</strong>
      </div>

      <ul className="order-item-list">
        {sale.items
          .filter((item) => !hideUntimedItems || preparationTimes.has(item.product_id))
          .map((item) => (
          <li key={item.id}>
            <div className="order-product-heading">
              <strong>{item.product_name}</strong>
              <span>× {item.quantity}</span>
            </div>
            {item.ingredients.length > 0 ? (
              <OrderItemIngredients
                item={item}
                requiredIngredientIds={requiredIngredientIdsByProduct.get(item.product_id)}
                expanded={expandedRequiredItemIds.includes(item.id)}
                onToggleRequired={() => setExpandedRequiredItemIds((current) => current.includes(item.id)
                  ? current.filter((id) => id !== item.id)
                  : [...current, item.id])}
              />
            ) : null}
          </li>
          ))}
      </ul>

      <div className="order-state-actions">
        <label>
          <span className="sr-only">Nuevo estado del pedido</span>
          <select value={selectedStateId} onChange={(event) => setSelectedStateId(event.target.value)} disabled={saving}>
            {availableStates.map((state) => <option key={state.id} value={state.id}>{state.descripcion_es}</option>)}
          </select>
        </label>
        <button type="button" onClick={handleUpdateClick} disabled={saving || states.length === 0 || Number(selectedStateId) === sale.pedido_estado_id}>
          {saving ? 'Guardando...' : 'Actualizar'}
        </button>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {confirmationOpen ? (
        <ConfirmationDialog
          message={`¿Confirmas cambiar el estado de ${sale.pedido_codigo ?? `Pedido #${sale.id}`} a "${selectedStateLabel}"?`}
          confirmLabel="Confirmar"
          onConfirm={() => {
            setConfirmationOpen(false)
            void submitState()
          }}
          onCancel={() => setConfirmationOpen(false)}
        />
      ) : null}
    </article>
  )
}

function OrderItemIngredients({
  item,
  requiredIngredientIds,
  expanded,
  onToggleRequired,
}: {
  item: CheckoutOrderItem
  requiredIngredientIds?: Set<number>
  expanded: boolean
  onToggleRequired: () => void
}) {
  const isRequired = (ingredient: CheckoutOrderIngredient) => requiredIngredientIds
    ? requiredIngredientIds.has(ingredient.materia_prima_id)
    : ingredient.requerido !== false
  const optionalIngredients = item.ingredients.filter((ingredient) => !isRequired(ingredient))
  const requiredIngredients = item.ingredients.filter(isRequired)

  return (
    <div className="order-ingredients">
      {optionalIngredients.length > 0 ? (
        <ul className="order-ingredient-list">
          {optionalIngredients.map((ingredient) => (
            <li key={ingredient.materia_prima_id}>
              {ingredient.nombre_es ?? ingredient.nombre_en ?? `Materia prima ${ingredient.materia_prima_id}`}
            </li>
          ))}
        </ul>
      ) : null}
      {requiredIngredients.length > 0 ? (
        <>
          <button
            type="button"
            className="order-required-toggle"
            onClick={onToggleRequired}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} ${requiredIngredients.length} materias primas requeridas de ${item.product_name}`}
            title={expanded ? 'Ocultar materias primas requeridas' : 'Mostrar materias primas requeridas'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
            <span>{requiredIngredients.length}</span>
          </button>
          {expanded ? (
            <ul className="order-ingredient-list order-required-list">
              {requiredIngredients.map((ingredient) => (
                <li key={ingredient.materia_prima_id}>
                  {ingredient.nombre_es ?? ingredient.nombre_en ?? `Materia prima ${ingredient.materia_prima_id}`}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function SaleDetailsDialog({ sale, onClose }: { sale: CheckoutSale; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const total = new Intl.NumberFormat('es-AR', { style: 'currency', currency: sale.currency || 'ARS' }).format(Number(sale.total))

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="sale-details-dialog"
      aria-labelledby="sale-details-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <header className="sale-details-header">
        <div>
          <p className="eyebrow">Información del pago</p>
          <h2 id="sale-details-title">{sale.pedido_codigo ?? `Pedido #${sale.id}`}</h2>
        </div>
        <button type="button" className="low-stock-dialog-close" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <dl className="sale-payment-details">
        <div><dt>Payment ID</dt><dd>{sale.payment_id ?? '—'}</dd></div>
        <div><dt>Total</dt><dd>{total}</dd></div>
        <div><dt>Estado del pago</dt><dd>{sale.payment_status}</dd></div>
        <div><dt>Referencia externa</dt><dd>{sale.external_reference}</dd></div>
        <div><dt>Preference ID</dt><dd>{sale.preference_id ?? '—'}</dd></div>
        <div><dt>Identificación del pagador</dt><dd>{sale.payer_identification_number ?? '—'}</dd></div>
        <div><dt>Creado</dt><dd>{formatDate(sale.created_at)}</dd></div>
        <div><dt>Pagado</dt><dd>{formatDate(sale.paid_at)}</dd></div>
      </dl>
      <footer className="sale-details-footer">
        <button type="button" className="secondary-button" onClick={onClose}>Cerrar</button>
      </footer>
    </dialog>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
