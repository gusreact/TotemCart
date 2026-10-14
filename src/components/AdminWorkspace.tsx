import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'
import { UserManager } from './UserManager'

type CatalogSection = 'categorias' | 'productos' | 'recetas' | 'receta-ingredientes' | 'materias-primas' | 'usuarios'
type Row = Record<string, unknown>
type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file'
type Field = {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: { value: string; label: string }[]
  accept?: string
}
type PendingAction = {
  kind: 'create' | 'update' | 'delete'
  path: string
  method: 'POST' | 'PUT' | 'DELETE'
  body?: FormData | string
  rowId?: unknown
  label: string
}
type RecipeMaterial = {
  id: number
  nombre: string
  unidad_medida: string
  cantidad: string | number
}
type RecipeWithMaterials = {
  receta_id: number
  receta_nombre: string
  materias_primas: RecipeMaterial[]
}
type RecipeMaterialDraft = Omit<RecipeMaterial, 'cantidad'> & { cantidad: string }

const sections: { id: CatalogSection; label: string; endpoint?: string }[] = [
  { id: 'categorias', label: 'Categorías', endpoint: '/api/categorias' },
  { id: 'productos', label: 'Productos', endpoint: '/api/productos' },
  { id: 'recetas', label: 'Recetas', endpoint: '/api/recetas' },
  { id: 'receta-ingredientes', label: 'Recetas Ingredientes', endpoint: '/api/receta-ingredientes' },
  { id: 'materias-primas', label: 'Materia Prima', endpoint: '/api/materias-primas' },
  { id: 'usuarios', label: 'Usuarios' },
]

const fieldDefinitions: Record<Exclude<CatalogSection, 'usuarios'>, Field[]> = {
  categorias: [
    { name: 'nombre_es', label: 'Nombre en español', kind: 'text', required: true },
    { name: 'nombre_en', label: 'Nombre en inglés', kind: 'text', required: true },
    { name: 'orden', label: 'Orden', kind: 'number', required: true },
    { name: 'file', label: 'Imagen', kind: 'file', required: true, accept: 'image/*' },
  ],
  productos: [
    { name: 'categoria_id', label: 'Categoría', kind: 'select', required: true },
    { name: 'receta_id', label: 'Receta', kind: 'select' },
    { name: 'nombre_es', label: 'Nombre en español', kind: 'text', required: true },
    { name: 'nombre_en', label: 'Nombre en inglés', kind: 'text', required: true },
    { name: 'precio', label: 'Precio', kind: 'number', required: true },
    { name: 'disponible', label: 'Disponible', kind: 'checkbox' },
    { name: 'file', label: 'Imagen del producto', kind: 'file', required: true, accept: 'image/*' },
  ],
  recetas: [
    { name: 'nombre', label: 'Nombre', kind: 'text', required: true },
    { name: 'instrucciones', label: 'Instrucciones', kind: 'textarea' },
  ],
  'receta-ingredientes': [
    { name: 'receta_id', label: 'Receta', kind: 'select', required: true },
    { name: 'materia_prima_id', label: 'Materia prima', kind: 'select', required: true },
    { name: 'cantidad', label: 'Cantidad', kind: 'number', required: true },
  ],
  'materias-primas': [
    { name: 'nombre', label: 'Nombre', kind: 'text', required: true },
    { name: 'unidad_medida', label: 'Unidad de medida', kind: 'text', required: true },
    { name: 'stock', label: 'Stock', kind: 'number', required: true },
  ],
}

const displayFields: Record<Exclude<CatalogSection, 'usuarios'>, { name: string; label: string }[]> = {
  categorias: [
    { name: 'nombre_es', label: 'Categoría' },
    { name: 'nombre_en', label: 'Nombre en inglés' },
    { name: 'orden', label: 'Orden' },
  ],
  productos: [
    { name: 'nombre_es', label: 'Producto' },
    { name: 'categoria_nombre_es', label: 'Categoría' },
    { name: 'precio', label: 'Precio' },
    { name: 'disponible', label: 'Disponible' },
  ],
  recetas: [
    { name: 'nombre', label: 'Receta' },
    { name: 'instrucciones', label: 'Instrucciones' },
  ],
  'receta-ingredientes': [
    { name: 'nombre_es', label: 'Producto' },
    { name: 'categoria_nombre_es', label: 'Categoría' },
    { name: 'precio', label: 'Precio' },
    { name: 'disponible', label: 'Disponible' },
  ],
  'materias-primas': [
    { name: 'nombre', label: 'Materia prima' },
    { name: 'unidad_medida', label: 'Unidad de medida' },
    { name: 'stock', label: 'Stock' },
  ],
}

const apiBase = import.meta.env.VITE_RENDER_API_DOMAIN

async function apiRequest(path: string, token: string | null | undefined, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  console.log(`API request to ${path} returned:`, payload)
  if (!response.ok) throw new Error(payload?.detail || payload?.message || 'No se pudo completar la solicitud.')
  return payload
}

function unwrapRows(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[]
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data
    if (Array.isArray(data)) return data as Row[]
  }
  return []
}

function valueOf(row: Row, key: string) {
  const value = row[key]
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function AdminWorkspace({ token, username, nombre, onLogout }: {
  token?: string | null
  username: string
  nombre: string
  onLogout: () => void
}) {
  const [activeSection, setActiveSection] = useState<CatalogSection>('categorias')

  return (
    <main className="admin-workspace">
      <header className="admin-topbar">
        <a className="admin-brand" href="#admin" aria-label="TotemCart administración">
          <span className="brand-mark">T</span>
          <span>TotemCart <small>ADMIN</small></span>
        </a>
        <div className="admin-account">
          <div className="account-copy"><strong>{nombre}</strong><span>{username}</span></div>
          <button type="button" className="logout-button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-navigation" aria-label="Secciones de administración">
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={`admin-nav-item${activeSection === section.id ? ' is-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
            >
              <span>{section.label}</span>
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
          ) : activeSection === 'receta-ingredientes' ? (
            <RecipeIngredientsManager token={token} />
          ) : (
            <CatalogManager key={activeSection} section={activeSection} token={token} />
          )}
        </section>
      </div>
    </main>
  )
}

function RecipeIngredientsManager({ token }: { token?: string | null }) {
  const [rows, setRows] = useState<RecipeWithMaterials[]>([])
  const [recipes, setRecipes] = useState<Row[]>([])
  const [availableMaterials, setAvailableMaterials] = useState<Row[]>([])
  const [recipeId, setRecipeId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [draftMaterials, setDraftMaterials] = useState<RecipeMaterialDraft[]>([])
  const [editing, setEditing] = useState<RecipeWithMaterials | null>(null)
  const [pendingAction, setPendingAction] = useState<{ kind: 'create' | 'update'; payload: string; label: string } | { kind: 'delete'; recipe: RecipeWithMaterials } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [groupedPayload, recipePayload, materialPayload] = await Promise.all([
        apiRequest('/api/receta-ingredientes', token),
        apiRequest('/api/recetas', token),
        apiRequest('/api/materias-primas', token),
      ])
      setRows(unwrapRows(groupedPayload) as unknown as RecipeWithMaterials[])
      setRecipes(unwrapRows(recipePayload))
      setAvailableMaterials(unwrapRows(materialPayload))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las recetas e ingredientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [groupedPayload, recipePayload, materialPayload] = await Promise.all([
          apiRequest('/api/receta-ingredientes', token),
          apiRequest('/api/recetas', token),
          apiRequest('/api/materias-primas', token),
        ])
        if (!active) return
        setRows(unwrapRows(groupedPayload) as unknown as RecipeWithMaterials[])
        setRecipes(unwrapRows(recipePayload))
        setAvailableMaterials(unwrapRows(materialPayload))
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar las recetas e ingredientes.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [token])

  const resetForm = () => {
    setRecipeId('')
    setMaterialId('')
    setQuantity('1')
    setDraftMaterials([])
    setEditing(null)
    setError('')
    setNotice('')
  }

  const addMaterial = () => {
    const selected = availableMaterials.find((item) => String(item.id) === materialId)
    const parsedQuantity = Number(quantity)
    if (!selected || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Selecciona una materia prima e indica una cantidad mayor que cero.')
      return
    }
    if (draftMaterials.some((item) => item.id === Number(selected.id))) {
      setError('Esa materia prima ya está en la receta.')
      return
    }
    setDraftMaterials((current) => [...current, {
      id: Number(selected.id),
      nombre: String(selected.nombre ?? selected.id),
      unidad_medida: String(selected.unidad_medida ?? ''),
      cantidad: String(parsedQuantity),
    }])
    setMaterialId('')
    setQuantity('1')
    setError('')
  }

  const beginEdit = (recipe: RecipeWithMaterials) => {
    setEditing(recipe)
    setRecipeId(String(recipe.receta_id))
    setDraftMaterials(recipe.materias_primas.map((material) => ({
      ...material,
      cantidad: String(material.cantidad),
    })))
    setMaterialId('')
    setQuantity('1')
    setError('')
    setNotice('')
    document.querySelector('.recipe-material-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!recipeId || draftMaterials.length === 0) {
      setError('Selecciona una receta y agrega al menos una materia prima.')
      return
    }
    if (!editing && rows.some((recipe) => recipe.receta_id === Number(recipeId) && recipe.materias_primas.length > 0)) {
      setError('Esta receta ya tiene materias primas asociadas. Actualízala desde el listado.')
      return
    }
    const selectedRecipe = recipes.find((recipe) => String(recipe.id) === recipeId)
    setPendingAction({
      kind: editing ? 'update' : 'create',
      label: String(selectedRecipe?.nombre ?? editing?.receta_nombre ?? 'receta'),
      payload: JSON.stringify([{
        receta_id: Number(recipeId),
        materias_primas: draftMaterials.map((material) => ({
          id: material.id,
          cantidad: Number(material.cantidad),
        })),
      }]),
    })
  }

  const confirmAction = async () => {
    if (!pendingAction) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (pendingAction.kind === 'delete') {
        await apiRequest(`/api/receta-ingredientes/${pendingAction.recipe.receta_id}`, token, { method: 'DELETE' })
        setNotice('Ingredientes eliminados de la receta.')
      } else {
        await apiRequest('/api/receta-ingredientes', token, {
          method: pendingAction.kind === 'create' ? 'POST' : 'PUT',
          body: pendingAction.payload,
        })
        setNotice(pendingAction.kind === 'create' ? 'Ingredientes agregados a la receta.' : 'Ingredientes de la receta actualizados.')
        resetForm()
      }
      setPendingAction(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.')
      setPendingAction(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {pendingAction ? (
        <ConfirmationDialog
          message={pendingAction.kind === 'delete'
            ? `¿Eliminar los ingredientes de la receta "${pendingAction.recipe.receta_nombre}"? Esta acción no se puede deshacer.`
            : pendingAction.kind === 'update'
              ? `¿Confirmas los cambios de ingredientes para "${pendingAction.label}"?`
              : `¿Confirmas agregar ingredientes a "${pendingAction.label}"?`}
          confirmLabel={pendingAction.kind === 'delete' ? 'Eliminar' : pendingAction.kind === 'update' ? 'Guardar cambios' : 'Agregar'}
          destructive={pendingAction.kind === 'delete'}
          busy={saving}
          onConfirm={() => void confirmAction()}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}

      <div className="section-heading">
        <div><h1>Recetas Ingredientes</h1></div>
        <p className="section-description">Administra las materias primas asociadas a cada receta.</p>
      </div>

      <div className="recipe-material-layout">
        <section className="catalog-list" aria-label="Recetas con materias primas">
          <div className="catalog-list-heading">
            <div><h2>Recetas: {rows.length}</h2></div>
            <button className="icon-action" type="button" onClick={() => void refresh()} aria-label="Actualizar listado" title="Actualizar">↻</button>
          </div>
          {error && !pendingAction ? <p className="error-message">{error}</p> : null}
          {loading ? <p className="catalog-state">Cargando recetas...</p> : rows.length === 0 ? <p className="catalog-state">Todavía no hay materias primas asociadas a recetas.</p> : (
            <div className="recipe-material-list">
              {rows.map((recipe) => (
                <article className="recipe-material-row" key={recipe.receta_id}>
                  <div className="recipe-material-row-main">
                    <h3>{recipe.receta_nombre}</h3>
                    {recipe.materias_primas.length ? (
                      <ul>{recipe.materias_primas.map((material) => (
                        <li key={`${recipe.receta_id}-${material.id}`}>
                          <span>{material.nombre}</span>
                          <span>{valueOf({ cantidad: material.cantidad }, 'cantidad')} {material.unidad_medida}</span>
                        </li>
                      ))}</ul>
                    ) : <p className="empty-state">Sin materias primas asociadas.</p>}
                  </div>
                  <div className="recipe-material-actions">
                    <button type="button" className="text-action" onClick={() => beginEdit(recipe)}>Editar</button>
                    <button type="button" className="text-action delete-action" disabled={recipe.materias_primas.length === 0} onClick={() => setPendingAction({ kind: 'delete', recipe })}>Eliminar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="catalog-form recipe-material-form" aria-label={editing ? 'Editar materias primas de receta' : 'Agregar materias primas a receta'}>
          <div className="catalog-form-heading">
            <h2>{editing ? 'Editar ingredientes' : 'Agregar ingredientes'}</h2>
          </div>
          <form className="resource-form" onSubmit={handleSubmit}>
            <label>
              <span>Receta</span>
              <select required value={recipeId} disabled={Boolean(editing)} onChange={(event) => setRecipeId(event.target.value)}>
                <option value="">Selecciona una receta</option>
                {recipes.map((recipe) => {
                  const hasMaterials = rows.some((row) => row.receta_id === Number(recipe.id) && row.materias_primas.length > 0)
                  return (
                    <option key={String(recipe.id)} value={String(recipe.id)} disabled={hasMaterials && !editing}>
                      {String(recipe.nombre ?? recipe.id)}{hasMaterials && !editing ? ' (ya tiene materias primas)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>

            <div className="recipe-material-add-row">
              <label>
                <span>Materia prima</span>
                <select value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
                  <option value="">Selecciona una materia prima</option>
                  {availableMaterials.map((material) => <option key={String(material.id)} value={String(material.id)}>{String(material.nombre ?? material.id)} ({String(material.unidad_medida ?? '')})</option>)}
                </select>
              </label>
              <label>
                <span>Cantidad</span>
                <input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </label>
              <button type="button" className="add-material-button" onClick={addMaterial} aria-label="Agregar materia prima a la receta" title="Agregar materia prima">+</button>
            </div>

            <div className="recipe-material-draft">
              <h3>Materias primas seleccionadas <span>{draftMaterials.length}</span></h3>
              {draftMaterials.length === 0 ? <p className="empty-state">Agrega una o más materias primas.</p> : (
                <ul>{draftMaterials.map((material) => (
                  <li key={material.id}>
                    <div><strong>{material.nombre}</strong><small>{material.cantidad} {material.unidad_medida}</small></div>
                    <button type="button" className="remove-material-button" onClick={() => setDraftMaterials((current) => current.filter((item) => item.id !== material.id))} aria-label={`Quitar ${material.nombre}`} title={`Quitar ${material.nombre}`}>×</button>
                  </li>
                ))}</ul>
              )}
            </div>

            {error && !pendingAction ? <p className="error-message">{error}</p> : null}
            {notice ? <p className="success-message">{notice}</p> : null}
            <div className="resource-form-actions">
              <button type="submit" disabled={saving}>{editing ? 'Actualizar receta' : 'Crear receta ingredientes'}</button>
              {editing ? <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </form>
        </section>
      </div>
    </>
  )
}

function CatalogManager({ section, token }: { section: Exclude<CatalogSection, 'usuarios'>; token?: string | null }) {
  const [rows, setRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<Row[]>([])
  const [recipes, setRecipes] = useState<Row[]>([])
  const [ingredients, setIngredients] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})
  const [imagePreview, setImagePreview] = useState('')
  const [isReplacementPreview, setIsReplacementPreview] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const previewObjectUrl = useRef<string | null>(null)
  const endpoint = sections.find((item) => item.id === section)?.endpoint ?? ''
  const listEndpoint = section === 'receta-ingredientes' ? '/api/productos/con-ingredientes' : endpoint
  const title = sections.find((item) => item.id === section)?.label ?? ''

  useEffect(() => () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
  }, [])

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await apiRequest(listEndpoint, token)
      setRows(unwrapRows(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [payload, categoryPayload, recipePayload, ingredientPayload] = await Promise.all([
          apiRequest(listEndpoint, token),
          apiRequest('/api/categorias', token).catch(() => null),
          apiRequest('/api/recetas', token).catch(() => null),
          apiRequest('/api/materias-primas', token).catch(() => null),
        ])
        if (!active) return
        setRows(unwrapRows(payload))
        setCategories(unwrapRows(categoryPayload))
        setRecipes(unwrapRows(recipePayload))
        setIngredients(unwrapRows(ingredientPayload))
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [listEndpoint, token])

  const fields = fieldDefinitions[section].map((field) => {
    if (field.name === 'categoria_id') {
      return { ...field, options: categories.map((row) => ({ value: String(row.id), label: String(row.nombre_es ?? row.nombre_en ?? row.id) })) }
    }
    if (field.name === 'receta_id') {
      return {
        ...field,
        options: [
          ...(section === 'productos' ? [{ value: '', label: 'Sin receta' }] : []),
          ...recipes.map((row) => ({ value: String(row.id), label: String(row.nombre ?? row.id) })),
        ],
      }
    }
    if (field.name === 'materia_prima_id') {
      return { ...field, options: ingredients.map((row) => ({ value: String(row.id), label: String(row.nombre ?? row.id) })) }
    }
    return field
  })

  const resetForm = () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
    previewObjectUrl.current = null
    setImagePreview('')
    setIsReplacementPreview(false)
    setEditing(null)
    setDraft({ disponible: true })
    setError('')
    setNotice('')
  }

  const beginEdit = (row: Row) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
    previewObjectUrl.current = null
    setEditing(row)
    setImagePreview(section === 'categorias' && typeof row.imagen_url === 'string' ? row.imagen_url : '')
    setIsReplacementPreview(false)
    setDraft(Object.fromEntries(fields.filter((field) => field.kind !== 'file').map((field) => [
      field.name,
      field.kind === 'checkbox' ? Boolean(row[field.name]) : String(row[field.name] ?? ''),
    ])))
    setError('')
    setNotice('')
    document.querySelector('.catalog-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const isMultipart = section === 'categorias' || section === 'productos'
      let body: FormData | string
      if (isMultipart) {
        const formData = new FormData()
        for (const field of fields) {
          const input = event.currentTarget.elements.namedItem(field.name)
          if (field.kind === 'file') {
            const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
            if (field.required && !editing && !file) {
              throw new Error(`Selecciona un archivo para "${field.label}".`)
            }
            if (file) formData.append(field.name, file)
            continue
          }
          if (field.kind === 'checkbox') {
            formData.append(field.name, String(Boolean(draft[field.name])))
            continue
          }
          const value = String(draft[field.name] ?? '')
          if (value !== '') formData.append(field.name, value)
        }
        body = formData
      } else {
        const payload: Record<string, unknown> = {}
        for (const field of fields) {
          const value = draft[field.name]
          if (field.kind === 'checkbox') payload[field.name] = Boolean(value)
          else if (typeof value === 'string' && value !== '') {
            payload[field.name] = field.kind === 'number' || field.name.endsWith('_id') ? Number(value) : value
          }
        }
        body = JSON.stringify(payload)
      }
      const path = editing ? `${endpoint}/${editing.id}` : endpoint
      setPendingAction({
        kind: editing ? 'update' : 'create',
        path,
        method: editing ? 'PUT' : 'POST',
        body,
        rowId: editing?.id,
        label: String(draft.nombre_es ?? draft.nombre ?? draft.nombre_en ?? title.toLowerCase()),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro.')
    }
  }

  const handleDelete = (row: Row) => {
    setError('')
    setNotice('')
    setPendingAction({
      kind: 'delete',
      path: `${endpoint}/${row.id}`,
      method: 'DELETE',
      rowId: row.id,
      label: String(row.nombre_es ?? row.nombre ?? row.nombre_en ?? title.toLowerCase()),
    })
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(pendingAction.path, token, {
        method: pendingAction.method,
        ...(pendingAction.body !== undefined ? { body: pendingAction.body } : {}),
      })
      const completedAction = pendingAction.kind
      if (completedAction === 'delete' && editing?.id === pendingAction.rowId) resetForm()
      if (completedAction !== 'delete') resetForm()
      setPendingAction(null)
      setNotice(completedAction === 'create' ? 'Registro creado.' : completedAction === 'update' ? 'Cambios guardados.' : 'Registro eliminado.')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
      setPendingAction(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {pendingAction ? (
        <ConfirmationDialog
          message={pendingAction.kind === 'delete'
            ? `¿Seguro que quieres eliminar "${pendingAction.label}"? Esta acción no se puede deshacer.`
            : pendingAction.kind === 'update'
              ? `¿Confirmas los cambios para "${pendingAction.label}"?`
              : `¿Confirmas la creación de "${pendingAction.label}"?`}
          confirmLabel={pendingAction.kind === 'delete' ? 'Eliminar' : pendingAction.kind === 'update' ? 'Guardar cambios' : 'Crear'}
          destructive={pendingAction.kind === 'delete'}
          busy={saving}
          onConfirm={() => void confirmPendingAction()}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
      <div className="section-heading">
        <div><h1>{title}</h1></div>
        <p className="section-description">Administra y actualiza los registros del catálogo.</p>
      </div>

      <div className="catalog-columns">
        <section className="catalog-list" aria-label={`Listado de ${title}`}>
          <div className="catalog-list-heading"><div><h2>Cantidad: {rows.length}</h2></div><button className="icon-action refresh-action" type="button" onClick={() => void refresh()} aria-label="Actualizar listado" title="Actualizar">↻</button></div>
          {error && !editing ? <p className="error-message">{error}</p> : null}
          {loading ? <p className="catalog-state">Cargando registros...</p> : rows.length === 0 ? <p className="catalog-state">Todavía no hay {title.toLowerCase()}.</p> : (
            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <thead><tr>{displayFields[section].map((field) => <th key={field.name}>{field.label}</th>)}{section !== 'receta-ingredientes' ? <th><span className="sr-only">Acciones</span></th> : null}</tr></thead>
                <tbody>{rows.map((row) => (
                  <tr key={String(row.id)}>
                    {displayFields[section].map((field) => <td key={field.name}>{valueOf(row, field.name)}</td>)}
                    {section !== 'receta-ingredientes' ? <td><div className="table-actions"><button type="button" className="text-action" onClick={() => beginEdit(row)}>Editar</button><button type="button" className="text-action delete-action" onClick={() => void handleDelete(row)}>Eliminar</button></div></td> : null}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="catalog-form" aria-label={editing ? `Editar ${title}` : `Crear ${title}`}>
          <div className="catalog-form-heading"><h2>{editing ? 'Editar' : 'Agregar'} {title.toLocaleLowerCase()}</h2></div>
          <form className="resource-form" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <label className={field.kind === 'checkbox' ? 'check-field' : ''} key={field.name}>
                {field.kind === 'checkbox' ? (
                  <><input type="checkbox" checked={Boolean(draft[field.name])} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.checked }))} /><span>{field.label}</span></>
                ) : <><span>{field.label}</span>{field.kind === 'textarea' ? (
                  <textarea value={String(draft[field.name] ?? '')} required={field.required} rows={4} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))} />
                ) : field.kind === 'select' ? (
                  <select value={String(draft[field.name] ?? '')} required={field.required} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))}>
                    <option value="">Selecciona una opción</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : field.kind === 'file' ? (
                  <>
                    {section === 'categorias' && editing && imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt={`Imagen de ${String(editing.nombre_es ?? 'la categoría')}`} />
                        <span>{isReplacementPreview ? 'Vista previa de la nueva imagen' : 'Imagen actual'}</span>
                      </div>
                    ) : null}
                    <input
                      name={field.name}
                      type="file"
                      accept={field.accept}
                      required={field.required && !editing}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (section === 'categorias') {
                          if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
                          previewObjectUrl.current = file ? URL.createObjectURL(file) : null
                          setImagePreview(previewObjectUrl.current ?? (editing && typeof editing.imagen_url === 'string' ? editing.imagen_url : ''))
                          setIsReplacementPreview(Boolean(file))
                        }
                        setDraft((current) => ({ ...current, [field.name]: file?.name ?? '' }))
                      }}
                    />
                  </>
                ) : (
                  <input type={field.kind} min={field.kind === 'number' ? '0' : undefined} step={field.name === 'precio' || field.name === 'cantidad' || field.name === 'stock' ? '0.01' : '1'} value={String(draft[field.name] ?? '')} required={field.required} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))} />
                )}</>}
              </label>
            ))}
            {error ? <p className="error-message">{error}</p> : null}
            {notice ? <p className="success-message">{notice}</p> : null}
            <div className="resource-form-actions"><button type="submit" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : `Crear ${title}`}</button>{editing ? <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button> : null}</div>
          </form>
        </section>
      </div>
    </>
  )
}