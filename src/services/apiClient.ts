const apiBase = import.meta.env.VITE_RENDER_API_DOMAIN
export const SESSION_EXPIRED_EVENT = 'totemcart:session-expired'
const SESSION_EXPIRED_MESSAGE = 'Sesión expirada o token inválido'

export function notifySessionExpired(status: number, message: unknown) {
  if (status === 401 && typeof message === 'string' &&
    message.includes(SESSION_EXPIRED_MESSAGE) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
}

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
    const message = detail || payload?.message || 'No se pudo completar la solicitud.'
    notifySessionExpired(response.status, message)
    throw new Error(message)
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