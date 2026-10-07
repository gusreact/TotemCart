import { createContext } from 'react'

export type AuthUser = {
  username: string
  nombre: string
}

export type AuthResponse = {
  access_token: string
  token_type: string
  username: string
  nombre: string
}

export type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)





