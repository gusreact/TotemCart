import { useState, type SubmitEvent } from 'react'
import { UserManager } from './UserManager'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login, isAuthenticated, user, logout, token } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated && user) {
    return (
      <main className="auth-shell">
        <section className="admin-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Administración</p>
              <h1>Bienvenido, {user.nombre}</h1>
            </div>
            <button type="button" className="logout-button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>

          <div className="admin-card">
            <h2>Panel de administración</h2>
            <p>Usuario autenticado: {user.username}</p>
            <p>Sesión activa y lista para usar el sistema.</p>
          </div>

          <UserManager token={token} />
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="login-card">
        <p className="eyebrow">TotemCart</p>
        <h1>Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Usuario</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ingresá tu usuario"
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresá tu contraseña"
              required
            />
          </label>

          {error ? <p className="error-message">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
