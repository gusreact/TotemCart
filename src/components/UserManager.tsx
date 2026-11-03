import { useEffect, useMemo, useState } from 'react'
import { apiRequest, unwrapRows } from '../services/apiClient'
import { ConfirmationDialog } from './ConfirmationDialog'
import { useUsers } from '../hooks/useUsers'
import type { User, UserCreatePayload, UserUpdatePayload } from '../types/user'

type Role = {
  id: number
  nombre_es: string
  nombre_en: string
}

type UserFormState = {
  username: string
  password: string
  nombre: string
  role: string
}

type UserConfirmation =
  | { kind: 'create'; payload: UserCreatePayload; label: string }
  | { kind: 'update'; userId: number; payload: UserUpdatePayload; label: string }
  | { kind: 'delete'; userId: number; label: string }

const emptyForm: UserFormState = {
  username: '',
  password: '',
  nombre: '',
  role: '',
}

export function UserManager({ token }: { token?: string | null }) {
  const { users, loading, error, reload, createUser, updateUser, deleteUser } = useUsers(token)
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState('')
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [pendingAction, setPendingAction] = useState(false)
  const [confirmation, setConfirmation] = useState<UserConfirmation | null>(null)

  const totalUsers = useMemo(() => users.length, [users])

  useEffect(() => {
    let active = true
    const loadRoles = async () => {
      setRolesLoading(true)
      setRolesError('')
      try {
        const payload = await apiRequest('/api/roles', token)
        if (active) setRoles(unwrapRows(payload) as Role[])
      } catch (err) {
        if (active) setRolesError(err instanceof Error ? err.message : 'No se pudieron cargar los roles.')
      } finally {
        if (active) setRolesLoading(false)
      }
    }
    void loadRoles()
    return () => { active = false }
  }, [token])

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')
    const roleId = Number(form.role)
    if (!Number.isInteger(roleId) || !roles.some((role) => role.id === roleId)) {
      setFormError('Selecciona un rol válido.')
      return
    }
    const payload: UserCreatePayload = {
      username: form.username.trim(),
      password: form.password,
      nombre: form.nombre.trim(),
      role_id: roleId,
    }

    if (editingId !== null) {
      const updatePayload: UserUpdatePayload = {
        ...(payload.username ? { username: payload.username } : {}),
        ...(payload.nombre ? { nombre: payload.nombre } : {}),
        role_id: roleId,
        ...(payload.password ? { password: payload.password } : {}),
      }
      setConfirmation({ kind: 'update', userId: editingId, payload: updatePayload, label: payload.nombre })
    } else {
      setConfirmation({ kind: 'create', payload, label: payload.nombre })
    }
  }

  const handleEdit = (user: User) => {
    const userRole = String(user.role_id).trim()
    const normalizedUserRole = userRole.toLocaleLowerCase()
    const matchingRole = roles.find((role) => (
      String(role.id) === userRole ||
      role.nombre_es.trim().toLocaleLowerCase() === normalizedUserRole ||
      role.nombre_en.trim().toLocaleLowerCase() === normalizedUserRole
    ))
    setEditingId(user.id)
    setForm({
      username: user.username,
      password: '',
      nombre: user.nombre,
      role: matchingRole ? String(matchingRole.id) : '',
    })
    setFormError(matchingRole ? '' : 'No se encontró el rol asignado a este usuario en la lista de roles.')
    setSuccessMessage('')
  }

  const handleDelete = (user: User) => {
    setFormError('')
    setSuccessMessage('')
    setConfirmation({ kind: 'delete', userId: user.id, label: user.nombre })
  }

  const confirmAction = async () => {
    if (!confirmation) return
    setPendingAction(true)
    try {
      if (confirmation.kind === 'create') {
        await createUser(confirmation.payload)
        setSuccessMessage('Usuario creado correctamente.')
      } else if (confirmation.kind === 'update') {
        await updateUser(confirmation.userId, confirmation.payload)
        setSuccessMessage('Usuario actualizado correctamente.')
      } else {
        await deleteUser(confirmation.userId)
        setSuccessMessage('Usuario eliminado correctamente.')
      }
      if (confirmation.kind !== 'delete' || editingId === confirmation.userId) {
        setForm(emptyForm)
        setEditingId(null)
      }
      setConfirmation(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
      setConfirmation(null)
    } finally {
      setPendingAction(false)
    }
  }

  return (
    <div className="catalog-columns user-management-layout">
      {confirmation ? (
        <ConfirmationDialog
          message={confirmation.kind === 'delete'
            ? `¿Seguro que quieres eliminar a "${confirmation.label}"? Esta acción no se puede deshacer.`
            : confirmation.kind === 'update'
              ? `¿Confirmas los cambios para "${confirmation.label}"?`
              : `¿Confirmas la creación del usuario "${confirmation.label}"?`}
          confirmLabel={confirmation.kind === 'delete' ? 'Eliminar' : confirmation.kind === 'update' ? 'Guardar cambios' : 'Crear usuario'}
          destructive={confirmation.kind === 'delete'}
          busy={pendingAction}
          onConfirm={() => void confirmAction()}
          onCancel={() => setConfirmation(null)}
        />
      ) : null}
      <section className="catalog-form user-editor">
        <div className="catalog-form-heading">
          <h2>{editingId !== null ? 'Editar usuario' : 'Crear usuario'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="resource-form">
        <label>
          <span>Username</span>
          <input
            type="text"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="usuario"
            required
          />
        </label>

        <label>
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder={editingId !== null ? 'Dejar vacío para mantener la actual' : '********'}
            required={editingId === null}
          />
        </label>

        <label>
          <span>Nombre</span>
          <input
            type="text"
            value={form.nombre}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            placeholder="Nombre completo"
            required
          />
        </label>

        <label>
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            required
            disabled={rolesLoading || Boolean(rolesError)}
          >
            <option value="">{rolesLoading ? 'Cargando roles...' : 'Selecciona un rol'}</option>
            {roles.map((role) => (
              <option key={role.id} value={String(role.id)}>
                {[role.nombre_es, role.nombre_en].filter(Boolean).join(' / ')}
              </option>
            ))}
          </select>
        </label>

        {rolesError ? <p className="error-message" role="alert">No se pudieron cargar los roles: {rolesError}</p> : null}
        {!rolesLoading && !rolesError && roles.length === 0 ? <p className="error-message" role="alert">No hay roles disponibles. Crea un rol antes de asignarlo.</p> : null}

        {formError ? <p className="error-message">{formError}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        <div className="resource-form-actions">
          <button type="submit" disabled={pendingAction || loading || rolesLoading || roles.length === 0 || Boolean(rolesError)}>
            {pendingAction ? 'Guardando...' : editingId !== null ? 'Actualizar usuario' : 'Crear usuario'}
          </button>

          {editingId !== null ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setFormError('')
                setSuccessMessage('')
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
        </form>
      </section>

      <section className="catalog-list user-directory" aria-label="Listado de usuarios">
        <div className="catalog-list-heading">
          <div><h2>Usuarios</h2><span>{totalUsers} usuarios</span></div>
          <button className="icon-action" type="button" onClick={() => void reload()} aria-label="Actualizar usuarios" title="Actualizar">↻</button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        {loading ? <p className="catalog-state">Cargando usuarios...</p> : users.length === 0 ? (
          <p className="catalog-state">No hay usuarios registrados.</p>
        ) : (
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr><th>Nombre</th><th>Username</th><th>Rol</th><th><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userRole = String(user.role_id)
                  const assignedRole = roles.find((role) => (
                    String(role.id) === userRole ||
                    role.nombre_es === userRole ||
                    role.nombre_en === userRole
                  ))
                  return (
                    <tr key={user.id}>
                      <td>{user.nombre}</td>
                      <td>{user.username}</td>
                      <td><span className="user-role">{assignedRole?.nombre_es ?? userRole}</span></td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="text-action" onClick={() => handleEdit(user)} disabled={rolesLoading}>Editar</button>
                          <button type="button" className="text-action delete-action" onClick={() => handleDelete(user)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
