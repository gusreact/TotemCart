const apiBase = import.meta.env.VITE_RENDER_API_DOMAIN

export async function apiRequest(path: string, token: string | null | undefined, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = Array.isArray(payload?.detail)
      ? payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ')
      : payload?.detail
    throw new Error(detail || payload?.message || 'No se pudo completar la solicitud.')
  }

  return payload
}

export function unwrapRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data
    if (Array.isArray(data)) return data as Record<string, unknown>[]
  }
  return []
}

export function valueOf(row: Record<string, unknown>, key: string) {
  const value = row[key]
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}