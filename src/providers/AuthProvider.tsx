import { useEffect, useMemo, useState } from 'react'
import { AuthContext, type AuthContextValue, type AuthUser, type AuthResponse } from '../context/AuthContext'

const STORAGE_KEY = 'totemcart-auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`${STORAGE_KEY}:token`)
  })

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null

    const savedUser = window.localStorage.getItem(`${STORAGE_KEY}:user`)
    if (!savedUser) return null

    try {
      return JSON.parse(savedUser) as AuthUser
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (token && user) {
      window.localStorage.setItem(`${STORAGE_KEY}:token`, token)
      window.localStorage.setItem(`${STORAGE_KEY}:user`, JSON.stringify(user))
      return
    }

    window.localStorage.removeItem(`${STORAGE_KEY}:token`)
    window.localStorage.removeItem(`${STORAGE_KEY}:user`)
  }, [token, user])

  const login = async (username: string, password: string) => {
    const loginUrl = `${import.meta.env.VITE_RENDER_API_DOMAIN}/api/auth/login`
    console.log('Attempting login with username:', username);
    console.log('Login URL:', loginUrl);

    const formBody = new URLSearchParams({
      username,
      password,
    })

    const response =await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const message =
        errorPayload?.detail ||
        errorPayload?.message ||
        'Credenciales inválidas. Intente nuevamente.'
      throw new Error(message)
    }

    const data = (await response.json()) as AuthResponse

    setToken(data.access_token)
    setUser({
      username: data.username,
      nombre: data.nombre,
    })
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}