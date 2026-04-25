import { NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const LINKS = [
  { to: '/',        icon: '▦',  label: 'Dashboard'      },
  { to: '/milk',    icon: '🥛', label: 'Milk log'        },
  { to: '/vap',     icon: '📦', label: 'VAP batches'     },
  { to: '/farms',   icon: '🌾', label: 'Farm health'     },
  { to: '/grazing', icon: '🌿', label: 'Grazing monitor' },
  { to: '/cattle-map', icon: '🐄', label: 'Cattle map'   },
  { to: '/market',  icon: '🏪', label: 'Market linkage'  },
  { to: '/alerts',  icon: '⚠',  label: 'Crop alerts'    },
  { to: '/farmers', icon: '👥', label: 'Farmers'         },
]

export default function Sidebar() {
  const { farmer, logout } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>DairyVision</h2>
        <p>NABARD MABIF · Madurai</p>
      </div>
      <nav>
        {LINKS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <strong>{farmer?.full_name || '...'}</strong>
        <span style={{ display: 'block', opacity: 0.75, marginBottom: 8 }}>
          {farmer?.role === 'manager' ? 'Cooperative Manager' : 'Farmer'}
          {farmer?.village ? ` · ${farmer.village}` : ''}
        </span>
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>
    </aside>
  )
}
