export type AdminSection = 'categorias' | 'productos' | 'recetas' | 'materias-primas' | 'unidades-medida' | 'roles' | 'pedido-estados' | 'pedidos' | 'usuarios'
export type CatalogResource = Exclude<AdminSection, 'usuarios' | 'pedidos'>
export type Row = Record<string, unknown>
export type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file'

export type Field = {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  nullable?: boolean
  createOnly?: boolean
  min?: number
  max?: number
  maxLength?: number
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
  recipeMaterials?: { id: number; cantidad: number; requerido: boolean }[]
}

export type RecipeMaterial = {
  id: number
  nombre?: string
  nombre_es?: string
  nombre_en?: string
  unidad_medida: string
  cantidad: string | number
  requerido?: boolean
}

export type RecipeWithMaterials = {
  receta_id: number
  receta_nombre: string
  materias_primas: RecipeMaterial[]
}

export type RecipeMaterialDraft = Omit<RecipeMaterial, 'cantidad' | 'requerido'> & {
  cantidad: string
  requerido: boolean
}

export const sections: { id: AdminSection; label: string; endpoint?: string }[] = [
  { id: 'categorias', label: 'Categorías', endpoint: '/api/categorias' },
  { id: 'productos', label: 'Productos', endpoint: '/api/productos' },
  { id: 'recetas', label: 'Recetas', endpoint: '/api/recetas' },
  { id: 'materias-primas', label: 'Materia Prima', endpoint: '/api/materias-primas' },
  { id: 'unidades-medida', label: 'Unidades de Medida', endpoint: '/api/unidades-medida' },
  { id: 'roles', label: 'Roles', endpoint: '/api/roles' },
  { id: 'pedido-estados', label: 'Estado Pedidos', endpoint: '/api/pedido-estados' },
  { id: 'pedidos', label: 'Pedidos' },
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
    { name: 'tiempo_preparacion', label: 'Minutos', kind: 'number', nullable: true },
    { name: 'disponible', label: 'Disponible', kind: 'checkbox' },
    { name: 'file', label: 'Imagen del producto', kind: 'file', required: true, accept: 'image/*' },
  ],
  recetas: [
    { name: 'nombre', label: 'Nombre', kind: 'text', required: true },
    { name: 'instrucciones_es', label: 'Instrucciones en español', kind: 'textarea' },
    { name: 'instrucciones_en', label: 'Instrucciones en inglés', kind: 'textarea' },
  ],
  'materias-primas': [
    { name: 'nombre_es', label: 'Nombre en español', kind: 'text', required: true },
    { name: 'nombre_en', label: 'Nombre en inglés', kind: 'text', required: true },
    { name: 'unidad_medida_id', label: 'Unidad de medida', kind: 'select', required: true },
    { name: 'stock', label: 'Stock', kind: 'number', required: true },
    { name: 'stock_min', label: 'Stock mínimo', kind: 'number' },
  ],
  'unidades-medida': [
    { name: 'medida_es', label: 'Medida en español', kind: 'text', required: true },
    { name: 'medida_en', label: 'Medida en inglés', kind: 'text', required: true },
  ],
  roles: [
    { name: 'nombre_es', label: 'Nombre en español', kind: 'text', required: true },
    { name: 'nombre_en', label: 'Nombre en inglés', kind: 'text', required: true },
  ],
  'pedido-estados': [
    { name: 'id', label: 'ID (1–5)', kind: 'number', required: true, createOnly: true, min: 1, max: 5 },
    { name: 'descripcion_es', label: 'Descripción en español', kind: 'text', required: true, maxLength: 50 },
    { name: 'descripcion_en', label: 'Descripción en inglés', kind: 'text', required: true, maxLength: 50 },
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
    { name: 'tiempo_preparacion', label: 'Minutos' },
    { name: 'disponible', label: 'Disponible' },
  ],
  recetas: [
    { name: 'nombre', label: 'Receta' },
    { name: 'instrucciones_es', label: 'Instrucciones en español' },
    { name: 'instrucciones_en', label: 'Instrucciones en inglés' },
  ],
  'materias-primas': [
    { name: 'nombre_es', label: 'Nombre en español' },
    { name: 'nombre_en', label: 'Nombre en inglés' },
    { name: 'unidad_medida_id', label: 'Unidad de medida' },
    { name: 'stock', label: 'Stock' },
    { name: 'stock_min', label: 'Stock mínimo' },
  ],
  'unidades-medida': [
    { name: 'medida_es', label: 'Medida en español' },
    { name: 'medida_en', label: 'Medida en inglés' },
  ],
  roles: [
    { name: 'nombre_es', label: 'Nombre en español' },
    { name: 'nombre_en', label: 'Nombre en inglés' },
  ],
  'pedido-estados': [
    { name: 'id', label: 'ID' },
    { name: 'descripcion_es', label: 'Descripción en español' },
    { name: 'descripcion_en', label: 'Descripción en inglés' },
  ],
}