import { useMemo, useState } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'
import { useUsers } from '../hooks/useUsers'
import type { User, UserCreatePayload, UserRole, UserUpdatePayload } from '../types/user'

type UserFormState = {
  username: string
  password: string
  nombre: string
  role: UserRole
}

type UserConfirmation =
  | { kind: 'create'; payload: UserCreatePayload; label: string }
  | { kind: 'update'; userId: number; payload: UserUpdatePayload; label: string }
  | { kind: 'delete'; userId: number; label: string }

const emptyForm: UserFormState = {
  username: '',
  password: '',
  nombre: '',
  role: 'user',
}

export function UserManager({ token }: { token?: string | null }) {
  const { users, loading, error, createUser, updateUser, deleteUser } = useUsers(token)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [pendingAction, setPendingAction] = useState(false)
  const [confirmation, setConfirmation] = useState<UserConfirmation | null>(null)

  const totalUsers = useMemo(() => users.length, [users])

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')
    const payload: UserCreatePayload = {
      username: form.username.trim(),
      password: form.password,
      nombre: form.nombre.trim(),
      role: form.role,
    }

    if (editingId !== null) {
      const updatePayload: UserUpdatePayload = {
        ...(payload.username ? { username: payload.username } : {}),
        ...(payload.nombre ? { nombre: payload.nombre } : {}),
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.password ? { password: payload.password } : {}),
      }
      setConfirmation({ kind: 'update', userId: editingId, payload: updatePayload, label: payload.nombre })
    } else {
      setConfirmation({ kind: 'create', payload, label: payload.nombre })
    }
  }

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setForm({
      username: user.username,
      password: '',
      nombre: user.nombre,
      role: user.role,
    })
    setFormError('')
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
    <div className="admin-card user-form-card">
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
      <h2>{editingId !== null ? 'Editar usuario' : 'Crear usuario'}</h2>

      <form onSubmit={handleSubmit} className="login-form">
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
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as 'user' | 'admin' }))}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>

        {formError ? <p className="error-message">{formError}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        <div className="form-actions">
          <button type="submit" disabled={pendingAction || loading}>
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

      <div className="users-list-container">
        <div className="users-list-header">
          <h3>Usuarios</h3>
          <span>{totalUsers}</span>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        {users.length === 0 && !loading ? (
          <p className="empty-state">No hay usuarios registrados.</p>
        ) : null}

        <ul className="users-list">
          {users.map((user) => (
            <li key={user.id} className="user-row">
              <div>
                <strong>{user.nombre}</strong>
                <small>
                  {user.username} · {user.role}
                </small>
              </div>

              <div className="user-row-actions">
                <button type="button" className="secondary-button" onClick={() => handleEdit(user)}>
                  Editar
                </button>
                <button type="button" className="danger-button" onClick={() => handleDelete(user)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
