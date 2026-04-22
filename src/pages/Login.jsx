import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await login(phone, pw)
      navigate('/')
    } catch {
      setErr('Wrong phone or password. Use demo credentials below.')
    } finally {
      setBusy(false)
    }
  }

  const quick = (p, w) => { setPhone(p); setPw(w) }

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>DairyVision</h1>
        <div className="tagline">
          Dairy VAP + Agri Intelligence<br />
          NABARD MABIF · Tamil Nadu
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input className="form-input" type="tel"
              placeholder="e.g. 9876543201"
              value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password"
              placeholder="Password"
              value={pw} onChange={e => setPw(e.target.value)} required />
          </div>
          {err && <div className="error-msg">{err}</div>}
          <button className="btn btn-primary" type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="demo-box">
          <strong>Quick demo login — click to fill</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {[
              ['9876543201', 'demo1234',    'Murugan'],
              ['9876543202', 'demo1234',    'Lakshmi'],
              ['9876543203', 'demo1234',    'Ravi'],
              ['9000000001', 'manager1234', 'Manager'],
            ].map(([p, w, label]) => (
              <button key={p} onClick={() => quick(p, w)}
                style={{
                  padding: '4px 10px', borderRadius: 5,
                  border: '1px solid #ccc', background: '#fff',
                  cursor: 'pointer', fontSize: 12,
                }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, color: '#888', lineHeight: 1.7 }}>
            Farmer password: <strong>demo1234</strong><br />
            Manager password: <strong>manager1234</strong>
          </div>
        </div>
      </div>
    </div>
  )
}