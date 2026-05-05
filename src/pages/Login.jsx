import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext.jsx'

const DEMO_USERS = [
  { label: 'Murugan',  phone: '9876543201', password: 'demo1234' },
  { label: 'Lakshmi',  phone: '9876543202', password: 'demo1234' },
  { label: 'Ravi',     phone: '9876543203', password: 'demo1234' },
  { label: 'Manager',  phone: '9000000001', password: 'manager1234' },
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const err = await login(phone, password)
    if (err) {
      setError(err)
      setBusy(false)
    } else {
      nav('/')
    }
  }

  const fillDemo = (user) => {
    setPhone(user.phone)
    setPassword(user.password)
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F6E56',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ color: '#0F6E56', fontSize: 28, fontWeight: 700, margin: 0 }}>
            DairyVision
          </h1>
          <p style={{ color: '#888', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            Dairy VAP + Agri Intelligence
          </p>
          <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
            NABARD MABIF · Tamil Nadu
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FADBD8', color: '#A93226', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="e.g. 9876543201"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo quick login */}
        <div style={{
          marginTop: 24,
          padding: '14px 16px',
          background: '#f9f8f5',
          borderRadius: 10,
          border: '1px solid #e8e6df',
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 500 }}>
            Quick demo login — click to fill
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.label}
                type="button"
                onClick={() => fillDemo(u)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid #e8e6df',
                  background: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: '#0F6E56',
                  fontWeight: 500,
                }}
              >
                {u.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            Farmer password: <strong>demo1234</strong><br />
            Manager password: <strong>manager1234</strong>
          </div>
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20, marginBottom: 0 }}>
          New cooperative?{' '}
          <Link to="/register" style={{ color: '#0F6E56', fontWeight: 600 }}>
            Register here
          </Link>
        </p>

      </div>
    </div>
  )
}
