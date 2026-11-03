export type UserRole = string | number

export type User = {
  id: number
  username: string
  nombre: string
  role_id: UserRole
}

export type UserCreatePayload = {
  username: string
  password: string
  nombre: string
  role_id?: UserRole
}

export type UserUpdatePayload = Partial<Pick<User, 'username' | 'nombre' | 'role_id'>> & {
  password?: string
}
