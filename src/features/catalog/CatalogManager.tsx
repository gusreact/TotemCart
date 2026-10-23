import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { apiRequest, unwrapRows, valueOf } from '../../services/apiClient'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import {
  displayFields,
  fieldDefinitions,
  sections,
  type CatalogResource,
  type PendingAction,
  type RecipeMaterialDraft,
  type RecipeWithMaterials,
  type Row,
} from './catalogModel'

export function CatalogManager({
  section,
  token,
  onMaterialsChange,
}: {
  section: CatalogResource
  token?: string | null
  onMaterialsChange?: (rows: Row[]) => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<Row[]>([])
  const [recipes, setRecipes] = useState<Row[]>([])
  const [ingredients, setIngredients] = useState<Row[]>([])
  const [units, setUnits] = useState<Row[]>([])
  const [recipeMaterials, setRecipeMaterials] = useState<RecipeWithMaterials[]>([])
  const [draftMaterials, setDraftMaterials] = useState<RecipeMaterialDraft[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [materialQuantity, setMaterialQuantity] = useState('1')
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<number[]>([])
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
  const title = sections.find((item) => item.id === section)?.label ?? ''

  useEffect(() => () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
  }, [])

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [payload, recipeMaterialPayload] = await Promise.all([
        apiRequest(endpoint, token),
        section === 'recetas' ? apiRequest('/api/receta-ingredientes', token) : Promise.resolve(null),
      ])
      const nextRows = unwrapRows(payload)
      setRows(nextRows)
      if (section === 'materias-primas') onMaterialsChange?.(nextRows)
      if (section === 'recetas') setRecipeMaterials(unwrapRows(recipeMaterialPayload) as unknown as RecipeWithMaterials[])
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
        const [payload, categoryPayload, recipePayload, ingredientPayload, recipeMaterialPayload, unitPayload] = await Promise.all([
          apiRequest(endpoint, token),
          apiRequest('/api/categorias', token).catch(() => null),
          apiRequest('/api/recetas', token).catch(() => null),
          apiRequest('/api/materias-primas', token).catch(() => null),
          section === 'recetas' ? apiRequest('/api/receta-ingredientes', token).catch(() => null) : Promise.resolve(null),
          section === 'materias-primas' ? apiRequest('/api/unidades-medida', token) : Promise.resolve(null),
        ])
        if (!active) return
        const nextRows = unwrapRows(payload)
        setRows(nextRows)
        if (section === 'materias-primas') onMaterialsChange?.(nextRows)
        setCategories(unwrapRows(categoryPayload))
        setRecipes(unwrapRows(recipePayload))
        setIngredients(unwrapRows(ingredientPayload))
        setUnits(unwrapRows(unitPayload))
        setRecipeMaterials(unwrapRows(recipeMaterialPayload) as unknown as RecipeWithMaterials[])
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [endpoint, onMaterialsChange, section, token])

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
    if (field.name === 'unidad_medida_id') {
      return {
        ...field,
        options: units.map((unit) => ({
          value: String(unit.id),
          label: [unit.medida_es, unit.medida_en].filter((value) => typeof value === 'string' && value).join(' / ') || String(unit.id),
        })),
      }
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
    setDraftMaterials([])
    setSelectedMaterialId('')
    setMaterialQuantity('1')
    setError('')
    setNotice('')
  }

  const addRecipeMaterial = () => {
    const material = ingredients.find((item) => String(item.id) === selectedMaterialId)
    const parsedQuantity = Number(materialQuantity)
    if (!material || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Selecciona una materia prima e indica una cantidad mayor que cero.')
      return
    }
    if (draftMaterials.some((item) => item.id === Number(material.id))) {
      setError('Esa materia prima ya está agregada a la receta.')
      return
    }
    setDraftMaterials((current) => [...current, {
      id: Number(material.id),
      nombre_es: typeof material.nombre_es === 'string' ? material.nombre_es : undefined,
      nombre_en: typeof material.nombre_en === 'string' ? material.nombre_en : undefined,
      nombre: String(material.nombre_es ?? material.nombre_en ?? material.nombre ?? material.id),
      unidad_medida: String(material.unidad_medida ?? ''),
      cantidad: String(parsedQuantity),
      requerido: true,
    }])
    setSelectedMaterialId('')
    setMaterialQuantity('1')
    setError('')
  }

  const beginEdit = (row: Row) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
    previewObjectUrl.current = null
    setEditing(row)
    setImagePreview((section === 'categorias' || section === 'productos') && typeof row.imagen_url === 'string' ? row.imagen_url : '')
    setIsReplacementPreview(false)
    setDraft(Object.fromEntries(fields.filter((field) => field.kind !== 'file').map((field) => [
      field.name,
      field.kind === 'checkbox' ? Boolean(row[field.name]) : String(row[field.name] ?? (field.name === 'unidad_medida_id'
        ? units.find((unit) => unit.medida_es === row.unidad_medida || unit.medida_en === row.unidad_medida)?.id ?? ''
        : '')),
    ])))
    if (section === 'recetas') {
      const grouped = recipeMaterials.find((recipe) => recipe.receta_id === Number(row.id))
      setDraftMaterials(grouped?.materias_primas.map((material) => ({
        ...material,
        cantidad: String(material.cantidad),
        requerido: material.requerido !== false,
      })) ?? [])
      setSelectedMaterialId('')
      setMaterialQuantity('1')
    }
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
            if (field.required && !editing && !file) throw new Error(`Selecciona un archivo para "${field.label}".`)
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
      setPendingAction({
        kind: editing ? 'update' : 'create',
        path: editing ? `${endpoint}/${editing.id}` : endpoint,
        method: editing ? 'PUT' : 'POST',
        body,
        rowId: editing?.id,
        label: String(draft.nombre_es ?? draft.nombre ?? draft.nombre_en ?? title.toLowerCase()),
        ...(section === 'recetas' ? {
          recipeMaterials: draftMaterials.map((material) => ({
            id: material.id,
            cantidad: Number(material.cantidad),
            requerido: material.requerido,
          })),
        } : {}),
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
    let recipeCreated = false
    try {
      const savedRecord = await apiRequest(pendingAction.path, token, {
        method: pendingAction.method,
        ...(pendingAction.body !== undefined ? { body: pendingAction.body } : {}),
      })
      if (section === 'recetas' && pendingAction.kind !== 'delete') {
        recipeCreated = pendingAction.kind === 'create'
        const savedData = savedRecord && typeof savedRecord === 'object' && 'data' in savedRecord
          ? (savedRecord as { data: unknown }).data
          : savedRecord
        const savedRecipeId = pendingAction.kind === 'update'
          ? Number(pendingAction.rowId)
          : savedData && typeof savedData === 'object' && 'id' in savedData
            ? Number((savedData as { id: unknown }).id)
            : Number.NaN
        if (!Number.isFinite(savedRecipeId)) {
          throw new Error('La receta se guardó, pero el servidor no devolvió su ID para guardar sus materias primas.')
        }
        await apiRequest('/api/receta-ingredientes', token, {
          method: pendingAction.kind === 'create' ? 'POST' : 'PUT',
          body: JSON.stringify([{
            receta_id: savedRecipeId,
            materias_primas: pendingAction.recipeMaterials ?? [],
          }]),
        })
      }
      const completedAction = pendingAction.kind
      if (completedAction === 'delete' && editing?.id === pendingAction.rowId) resetForm()
      if (completedAction !== 'delete') resetForm()
      setPendingAction(null)
      setNotice(completedAction === 'create' ? 'Registro creado.' : completedAction === 'update' ? 'Cambios guardados.' : 'Registro eliminado.')
      await refresh()
    } catch (err) {
      if (recipeCreated) {
        resetForm()
        await refresh()
        setError('La receta se creó, pero no se pudieron guardar sus materias primas. Edita la receta para volver a intentarlo.')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
      }
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

      <div className="section-heading catalog-section-heading">
        <div><h1>{title}</h1></div>
      </div>

      <div className="catalog-columns">
        <section className="catalog-list" aria-label={`Listado de ${title}`}>
          <div className="catalog-list-heading">
            <div><h2>Cantidad: {rows.length}</h2></div>
            <button className="icon-action refresh-action" type="button" onClick={() => void refresh()} aria-label="Actualizar listado" title="Actualizar">↻</button>
          </div>
          {error && !editing ? <p className="error-message">{error}</p> : null}
          {loading ? <p className="catalog-state">Cargando registros...</p> : rows.length === 0 ? <p className="catalog-state">Todavía no hay {title.toLowerCase()}.</p> : (
            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <thead><tr>{displayFields[section].map((field) => <th key={field.name}>{field.label}</th>)}<th><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>{rows.map((row) => {
                  const recipeMaterialsForRow = section === 'recetas'
                    ? recipeMaterials.find((recipe) => recipe.receta_id === Number(row.id))?.materias_primas ?? []
                    : []
                  const isRecipeExpanded = section === 'recetas' && expandedRecipeIds.includes(Number(row.id))
                  return (
                    <Fragment key={String(row.id)}>
                      <tr>
                        {displayFields[section].map((field) => {
                          const unit = field.name === 'unidad_medida_id'
                            ? units.find((item) => String(item.id) === String(row.unidad_medida_id))
                            : undefined
                          const displayValue = section === 'materias-primas' && field.name === 'unidad_medida_id'
                            ? row.unidad_medida ?? unit?.medida_es ?? unit?.medida_en ?? row.unidad_medida_id
                            : row[field.name]
                          return <td key={field.name}>{valueOf({ value: displayValue }, 'value')}</td>
                        })}
                        <td>
                          <div className={`table-actions${section === 'recetas' ? ' recipe-table-actions' : ''}`}>
                            <div className="table-actions-primary">
                              <button type="button" className="text-action" onClick={() => beginEdit(row)}>Editar</button>
                              <button type="button" className="text-action delete-action" onClick={() => handleDelete(row)}>Eliminar</button>
                            </div>
                            {section === 'recetas' ? (
                              <button
                                type="button"
                                className="text-action material-disclosure"
                                aria-expanded={isRecipeExpanded}
                                onClick={() => setExpandedRecipeIds((current) => isRecipeExpanded
                                  ? current.filter((id) => id !== Number(row.id))
                                  : [...current, Number(row.id)])}
                              >
                                {isRecipeExpanded ? 'Ocultar materia prima' : 'Ver materia prima'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isRecipeExpanded ? (
                        <tr className="recipe-material-detail-row">
                          <td colSpan={displayFields[section].length + 1}>
                            {recipeMaterialsForRow.length > 0 ? (
                              <ul className="recipe-material-inline-list">
                                {recipeMaterialsForRow.map((material) => (
                                  <li key={material.id}>
                                    <span>{String(material.nombre_es ?? material.nombre ?? material.nombre_en ?? material.id)}</span>
                                    <span>{valueOf({ cantidad: material.cantidad }, 'cantidad')} {material.unidad_medida} · {material.requerido === false ? 'Opcional' : 'Requerido'}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : <span className="empty-state">Sin materias primas asociadas.</span>}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}</tbody>
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
                    {(section === 'categorias' || section === 'productos') && editing && imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt={`Imagen de ${String(editing.nombre_es ?? (section === 'productos' ? 'el producto' : 'la categoría'))}`} />
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
                        if (section === 'categorias' || section === 'productos') {
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
                  <input type={field.kind} min={field.kind === 'number' ? '0' : undefined} step={field.name === 'precio' || field.name === 'stock' || field.name === 'stock_min' ? '0.01' : '1'} value={String(draft[field.name] ?? '')} required={field.required} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))} />
                )}</>}
              </label>
            ))}
            {section === 'recetas' ? (
              <RecipeMaterialsEditor
                materials={ingredients}
                draft={draftMaterials}
                selectedMaterialId={selectedMaterialId}
                quantity={materialQuantity}
                onMaterialChange={setSelectedMaterialId}
                onQuantityChange={setMaterialQuantity}
                onAdd={addRecipeMaterial}
                onRequiredChange={(id, requerido) => setDraftMaterials((current) => current.map((material) => (
                  material.id === id ? { ...material, requerido } : material
                )))}
                onRemove={(id) => setDraftMaterials((current) => current.filter((item) => item.id !== id))}
              />
            ) : null}
            {error ? <p className="error-message">{error}</p> : null}
            {notice ? <p className="success-message">{notice}</p> : null}
            <div className="resource-form-actions">
              <button type="submit" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : `Crear ${title}`}</button>
              {editing ? <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </form>
        </section>
      </div>
    </>
  )
}

function RecipeMaterialsEditor({
  materials,
  draft,
  selectedMaterialId,
  quantity,
  onMaterialChange,
  onQuantityChange,
  onAdd,
  onRequiredChange,
  onRemove,
}: {
  materials: Row[]
  draft: RecipeMaterialDraft[]
  selectedMaterialId: string
  quantity: string
  onMaterialChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onAdd: () => void
  onRequiredChange: (id: number, requerido: boolean) => void
  onRemove: (id: number) => void
}) {
  return (
    <div className="recipe-material-editor">
      <h3>Materias primas <span>{draft.length}</span></h3>
      <div className="recipe-material-add-row">
        <label>
          <span>Materia prima</span>
          <select value={selectedMaterialId} onChange={(event) => onMaterialChange(event.target.value)}>
            <option value="">Selecciona una materia prima</option>
            {materials.map((material) => <option key={String(material.id)} value={String(material.id)}>{String(material.nombre_es ?? material.nombre_en ?? material.nombre ?? material.id)} ({String(material.unidad_medida ?? '')})</option>)}
          </select>
        </label>
        <label>
          <span>Cantidad</span>
          <input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => onQuantityChange(event.target.value)} />
        </label>
        <button type="button" className="add-material-button" onClick={onAdd} aria-label="Agregar materia prima a la receta" title="Agregar materia prima">+</button>
      </div>
      <ul className="recipe-material-edit-list">
        {draft.map((material) => (
          <li key={material.id}>
            <div><strong>{material.nombre_es ?? material.nombre ?? material.nombre_en ?? material.id}</strong><small>{material.cantidad} {material.unidad_medida}</small></div>
            <div className="recipe-material-actions">
              <label className="recipe-material-required">
                <input
                  type="checkbox"
                  checked={material.requerido}
                  onChange={(event) => onRequiredChange(material.id, event.target.checked)}
                />
                <span>Requerido</span>
              </label>
              <button type="button" className="remove-material-button" onClick={() => onRemove(material.id)} aria-label={`Quitar ${material.nombre_es ?? material.nombre ?? material.nombre_en ?? material.id}`} title={`Quitar ${material.nombre_es ?? material.nombre ?? material.nombre_en ?? material.id}`}>×</button>
            </div>
          </li>
        ))}
        {draft.length === 0 ? <li className="empty-state">Sin materias primas seleccionadas.</li> : null}
      </ul>
    </div>
  )
}