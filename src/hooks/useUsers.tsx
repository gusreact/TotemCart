import { useCallback, useEffect, useState } from 'react'
import { userService } from '../services/userService'
import type { User, UserCreatePayload, UserUpdatePayload } from '../types/user'

export function useUsers(token?: string | null) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async () => {
    if (!token) {
      setUsers([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await userService.getAllUsers(token)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setUsers([])
        return
      }

      setLoading(true)
      setError('')

      try {
        const data = await userService.getAllUsers(token)

        setUsers(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [token])

  const createUser = async (payload: UserCreatePayload) => {
    if (!token) {
      throw new Error('Debe iniciar sesión para crear usuarios.')
    }

    const createdUser = await userService.createUser(payload, token)
    setUsers((current) => [createdUser, ...current])
    return createdUser
  }

  const updateUser = async (userId: number, payload: UserUpdatePayload) => {
    if (!token) {
      throw new Error('Debe iniciar sesión para actualizar usuarios.')
    }

    const updatedUser = await userService.updateUser(userId, payload, token)
    setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)))
    return updatedUser
  }

  const deleteUser = async (userId: number) => {
    if (!token) {
      throw new Error('Debe iniciar sesión para eliminar usuarios.')
    }

    await userService.deleteUser(userId, token)
    setUsers((current) => current.filter((user) => user.id !== userId))
  }

  return {
    users,
    loading,
    error,
    reload: loadUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
