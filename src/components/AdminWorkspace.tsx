import { useState, type ReactNode } from 'react'
import { CatalogManager } from '../features/catalog/CatalogManager'
import { sections, type AdminSection } from '../features/catalog/catalogModel'
import { UserManager } from './UserManager'

type AdminWorkspaceProps = {
  token?: string | null
  username: string
  nombre: string
  onLogout: () => void
}

export function AdminWorkspace({ token, username, nombre, onLogout }: AdminWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('categorias')
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)

  return (
    <main className="admin-workspace">
      <header className="admin-topbar">
        <a className="admin-brand" href="#admin" aria-label="TotemCart administración">
          <span className="brand-mark">T</span>
          <span>TotemCart <small>ADMIN</small></span>
        </a>
        <div className="admin-account">
          <div className="account-copy"><strong>{nombre}</strong><span>{username}</span></div>
          <button type="button" className="logout-button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      <div className={`admin-layout${navigationCollapsed ? ' navigation-collapsed' : ''}`}>
        <nav className="admin-navigation" aria-label="Secciones de administración">
          <button
            type="button"
            className="navigation-toggle"
            onClick={() => setNavigationCollapsed((collapsed) => !collapsed)}
            aria-label={navigationCollapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!navigationCollapsed}
            title={navigationCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {navigationCollapsed ? <path d="m9 5 7 7-7 7" /> : <path d="m15 5-7 7 7 7" />}
            </svg>
            <span className="navigation-toggle-label">Menú</span>
          </button>
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={`admin-nav-item${activeSection === section.id ? ' is-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
              aria-label={section.label}
              title={section.label}
            >
              <NavIcon section={section.id} />
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </nav>

        <section className="admin-content" aria-live="polite">
          {activeSection === 'usuarios' ? (
            <>
              <div className="section-heading">
                <div><p className="eyebrow">Administración</p><h1>Usuarios</h1></div>
                <p className="section-description">Accesos y perfiles del equipo.</p>
              </div>
              <UserManager token={token} />
            </>
          ) : (
            <CatalogManager key={activeSection} section={activeSection} token={token} />
          )}
        </section>
      </div>
    </main>
  )
}

function NavIcon({ section }: { section: AdminSection }) {
  const paths: Record<AdminSection, ReactNode> = {
    categorias: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    productos: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    recetas: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 6v12a2 2 0 0 1 2-2h14M8 7h8M8 10h8" /></>,
    'materias-primas': <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" /></>,
    'unidades-medida': <><path d="M4 20h16M6 17V7M10 17v-4M14 17V7M18 17v-4" /><path d="M4 7h16" /></>,
    usuarios: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4" /></>,
  }

  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[section]}</svg>
}