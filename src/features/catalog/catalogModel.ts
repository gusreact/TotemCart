export type AdminSection = 'categorias' | 'productos' | 'recetas' | 'materias-primas' | 'unidades-medida' | 'usuarios'
export type CatalogResource = Exclude<AdminSection, 'usuarios'>
export type Row = Record<string, unknown>
export type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file'

export type Field = {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: { value: string; label: string }[]
  accept?: string
}

export type PendingAction = {
  kind: 'create' | 'update' | 'delete'
  path: string
  method: 'POST' | 'PUT' | 'DELETE'
  body?: FormData | string
  rowId?: unknown
  label: string
  recipeMaterials?: { id: number; cantidad: number }[]
}

export type RecipeMaterial = {
  id: number
  nombre: string
  unidad_medida: string
  cantidad: string | number
}

export type RecipeWithMaterials = {
  receta_id: number
  receta_nombre: string
  materias_primas: RecipeMaterial[]
}

export type RecipeMaterialDraft = Omit<RecipeMaterial, 'cantidad'> & { cantidad: string }

export const sections: { id: AdminSection; label: string; endpoint?: string }[] = [
  { id: 'categorias', label: 'Categorías', endpoint: '/api/categorias' },
  { id: 'productos', label: 'Productos', endpoint: '/api/productos' },
  { id: 'recetas', label: 'Recetas', endpoint: '/api/recetas' },
  { id: 'materias-primas', label: 'Materia Prima', endpoint: '/api/materias-primas' },
  { id: 'unidades-medida', label: 'Unidades de Medida', endpoint: '/api/unidades-medida' },
  { id: 'usuarios', label: 'Usuarios' },
]

export const fieldDefinitions: Record<CatalogResource, Field[]> = {
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
    { name: 'instrucciones_es', label: 'Instrucciones en español', kind: 'textarea' },
    { name: 'instrucciones_en', label: 'Instrucciones en inglés', kind: 'textarea' },
  ],
  'materias-primas': [
    { name: 'nombre', label: 'Nombre', kind: 'text', required: true },
    { name: 'unidad_medida_id', label: 'Unidad de medida', kind: 'select', required: true },
    { name: 'stock', label: 'Stock', kind: 'number', required: true },
    { name: 'stock_min', label: 'Stock mínimo', kind: 'number' },
  ],
  'unidades-medida': [
    { name: 'medida_es', label: 'Medida en español', kind: 'text', required: true },
    { name: 'medida_en', label: 'Medida en inglés', kind: 'text', required: true },
  ],
}

export const displayFields: Record<CatalogResource, { name: string; label: string }[]> = {
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
    { name: 'instrucciones_es', label: 'Instrucciones en español' },
    { name: 'instrucciones_en', label: 'Instrucciones en inglés' },
  ],
  'materias-primas': [
    { name: 'nombre', label: 'Materia prima' },
    { name: 'unidad_medida_id', label: 'Unidad de medida' },
    { name: 'stock', label: 'Stock' },
    { name: 'stock_min', label: 'Stock mínimo' },
  ],
  'unidades-medida': [
    { name: 'medida_es', label: 'Medida en español' },
    { name: 'medida_en', label: 'Medida en inglés' },
  ],
}