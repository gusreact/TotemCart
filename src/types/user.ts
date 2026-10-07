export type UserRole = 'user' | 'admin'

export type User = {
  id: number
  username: string
  nombre: string
  role: UserRole
}

export type UserCreatePayload = {
  username: string
  password: string
  nombre: string
  role?: UserRole
}

export type UserUpdatePayload = Partial<Pick<User, 'username' | 'nombre' | 'role'>> & {
  password?: string
}
