import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CatalogManager } from '../features/catalog/CatalogManager'
import { sections, type AdminSection, type Row } from '../features/catalog/catalogModel'
import { apiRequest, unwrapRows, valueOf } from '../services/apiClient'
import { UserManager } from './UserManager'

type AdminWorkspaceProps = {
  token?: string | null
  username: string
  nombre: string
  onLogout: () => void
}

export function AdminWorkspace({ token, username, nombre, onLogout }: AdminWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('categorias')
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)
  const [lowStockMaterials, setLowStockMaterials] = useState<Row[]>([])
  const [inventoryError, setInventoryError] = useState('')
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    const loadMaterials = async () => {
      try {
        const payload = await apiRequest('/api/materias-primas', token)
        if (!active) return
        setLowStockMaterials(getLowStockMaterials(unwrapRows(payload)))
        setInventoryError('')
      } catch (err) {
        if (active) setInventoryError(err instanceof Error ? err.message : 'No se pudo verificar el stock de materias primas.')
      }
    }
    void loadMaterials()
    return () => { active = false }
  }, [token])

  const updateMaterials = useCallback((rows: Row[]) => {
    setLowStockMaterials(getLowStockMaterials(rows))
    setInventoryError('')
  }, [])

  return (
    <main className="admin-workspace">
      <header className="admin-topbar">
        <a className="admin-brand" href="#admin" aria-label="TotemCart administración">
          <span className="brand-mark">T</span>
          <span>TotemCart <small>ADMIN</small></span>
        </a>
        <div className="admin-account">
          {lowStockMaterials.length > 0 ? (
            <button
              type="button"
              className="low-stock-alert-button"
              onClick={() => setLowStockDialogOpen(true)}
              aria-label={`Ver ${lowStockMaterials.length} materias primas con stock bajo`}
              aria-haspopup="dialog"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          ) : null}
          {inventoryError ? <span className="inventory-check-error" role="alert">No se pudo verificar el stock: {inventoryError}</span> : null}
          <div className="account-copy"><strong>{nombre}</strong><span>{username}</span></div>
          <button type="button" className="logout-button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>
      {lowStockDialogOpen && lowStockMaterials.length > 0 ? (
        <LowStockDialog materials={lowStockMaterials} onClose={() => setLowStockDialogOpen(false)} />
      ) : null}

      <div className={`admin-layout${navigationCollapsed ? ' navigation-collapsed' : ''}`}>
        <nav className="admin-navigation" aria-label="Secciones de administración">
          <button
            type="button"
            className="navigation-toggle"
            onClick={() => setNavigationCollapsed((collapsed) => !collapsed)}
            aria-label={navigationCollapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!navigationCollapsed}
            title={navigationCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {navigationCollapsed ? <path d="m9 5 7 7-7 7" /> : <path d="m15 5-7 7 7 7" />}
            </svg>
            <span className="navigation-toggle-label">Menú</span>
          </button>
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={`admin-nav-item${activeSection === section.id ? ' is-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
              aria-label={section.label}
              title={section.label}
            >
              <NavIcon section={section.id} />
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </nav>

        <section className="admin-content" aria-live="polite">
          {activeSection === 'usuarios' ? (
            <>
              <div className="section-heading">
                <div><p className="eyebrow">Administración</p><h1>Usuarios</h1></div>
                <p className="section-description">Accesos y perfiles del equipo.</p>
              </div>
              <UserManager token={token} />
            </>
          ) : (
            <CatalogManager
              key={activeSection}
              section={activeSection}
              token={token}
              onMaterialsChange={activeSection === 'materias-primas' ? updateMaterials : undefined}
            />
          )}
        </section>
      </div>
    </main>
  )
}

function getLowStockMaterials(rows: Row[]) {
  return rows.filter((row) => {
    if (row.stock === null || row.stock === undefined || row.stock === '' ||
      row.stock_min === null || row.stock_min === undefined || row.stock_min === '') return false
    const stock = Number(row.stock)
    const minimumStock = Number(row.stock_min)
    return Number.isFinite(stock) && Number.isFinite(minimumStock) && minimumStock > stock
  })
}

function LowStockDialog({ materials, onClose }: { materials: Row[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      className="low-stock-dialog"
      aria-labelledby="low-stock-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <header className="low-stock-dialog-header">
        <div><p className="eyebrow">Inventario</p><h2 id="low-stock-dialog-title">Materias primas con stock bajo</h2></div>
        <button type="button" className="low-stock-dialog-close" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <ul className="low-stock-list">
        {materials.map((material) => (
          <li key={String(material.id)}>
            <strong>{valueOf({ value: material.nombre_es ?? material.nombre ?? material.nombre_en }, 'value')}</strong>
            {material.nombre_es && material.nombre_en ? <span>{String(material.nombre_en)}</span> : null}
            <span>
              Stock: {valueOf(material, 'stock')} / Mínimo: {valueOf(material, 'stock_min')}
              {material.unidad_medida ? ` ${String(material.unidad_medida)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </dialog>
  )
}

function NavIcon({ section }: { section: AdminSection }) {
  const paths: Record<AdminSection, ReactNode> = {
    categorias: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    productos: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    recetas: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 6v12a2 2 0 0 1 2-2h14M8 7h8M8 10h8" /></>,
    'materias-primas': <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" /></>,
    'unidades-medida': <><path d="M4 20h16M6 17V7M10 17v-4M14 17V7M18 17v-4" /><path d="M4 7h16" /></>,
    usuarios: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4" /></>,
  }

  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[section]}</svg>
}