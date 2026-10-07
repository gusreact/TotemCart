import type { User, UserCreatePayload, UserUpdatePayload } from '../types/user'

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const API_PREFIX = import.meta.env.VITE_RENDER_API_DOMAIN
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || 'La solicitud falló.')
  }

  return payload as T
}

export const userService = {
  getAllUsers: async (token?: string | null) => {
    return request<User[]>('/api/users', { method: 'GET' }, token)
  },

  createUser: async (payload: UserCreatePayload, token?: string | null) => {
    return request<User>('/api/users', { method: 'POST', body: JSON.stringify(payload) }, token)
  },

  updateUser: async (userId: number, payload: UserUpdatePayload, token?: string | null) => {
    return request<User>(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
  },

  deleteUser: async (userId: number, token?: string | null) => {
    return request<void>(`/api/users/${userId}`, { method: 'DELETE' }, token)
  },
}
