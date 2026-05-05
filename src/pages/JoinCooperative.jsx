import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function JoinCooperative() {
  const { code } = useParams()
  const nav = useNavigate()
  const [coop, setCoop] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ full_name:'', phone:'', password:'', confirm_password:'', village:'' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const set = (k, v) => setForm(f => ({...f, [k]:v}))

  useEffect(() => {
    axios.get(`${BASE}/farmers/join/${code}/`)
      .then(r => setCoop(r.data))
      .catch(() => setNotFound(true))
  }, [code])

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(form.phone)) { setError('Phone must be exactly 10 digits'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    setBusy(true)
    try {
      const r = await axios.post(`${BASE}/farmers/join/${code}/`, form)
      localStorage.setItem('access', r.data.access)
      localStorage.setItem('refresh', r.data.refresh)
      setSuccess(r.data)
    } catch (ex) {
      setError(ex.response?.data?.error || 'Registration failed. Please try again.')
    } finally { setBusy(false) }
  }

  if (notFound) return (
    <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48 }}>❌</div>
        <h2 style={{ color:'#A93226', marginTop:12 }}>Invalid join code</h2>
        <p style={{ color:'#555' }}>The cooperative code <strong>{code}</strong> was not found.</p>
        <Link to="/login" style={{ color:'#0F6E56', fontWeight:500 }}>Go to login</Link>
      </div>
    </div>
  )

  if (!coop) return (
    <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" />
    </div>
  )

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:16, padding:40, maxWidth:440, width:'100%', textAlign:'center', border:'1px solid #e8e6df' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🌾</div>
        <h2 style={{ color:'#0F6E56', fontSize:22, fontWeight:600, marginBottom:8 }}>Welcome, {success.farmer_name}!</h2>
        <p style={{ color:'#555', marginBottom:24 }}>You have joined <strong>{success.cooperative_name}</strong> successfully.</p>
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
          onClick={() => nav('/')}>Go to your dashboard</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:16, maxWidth:440, width:'100%', border:'1px solid #e8e6df', overflow:'hidden' }}>

        <div style={{ background:'#0F6E56', padding:'24px 28px' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Join cooperative</div>
          <h2 style={{ color:'white', fontSize:20, fontWeight:600, margin:0 }}>{coop.cooperative_name}</h2>
          <div style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginTop:4 }}>{coop.district} district</div>
        </div>

        <div style={{ padding:'20px 28px 8px', background:'#e1f5ee' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'#0F6E56' }}>Farmers joined: <strong>{coop.farmer_count}</strong></span>
            <span style={{ color: coop.can_join ? '#0F6E56' : '#A93226' }}>
              {coop.can_join ? `${coop.max_farmers - coop.farmer_count} spots remaining` : 'Cooperative is full'}
            </span>
          </div>
        </div>

        {!coop.can_join ? (
          <div style={{ padding:28, textAlign:'center' }}>
            <p style={{ color:'#A93226' }}>This cooperative has reached its farmer limit. Please contact your manager.</p>
            <Link to="/login" style={{ color:'#0F6E56', fontWeight:500 }}>Go to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding:'24px 28px 28px' }}>
            {error && (
              <div style={{ background:'#FADBD8', color:'#A93226', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Your full name *</label>
              <input className="form-input" placeholder="e.g. Murugan Selvam"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Village *</label>
              <input className="form-input" placeholder="e.g. Vadipatti"
                value={form.village} onChange={e => set('village', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile number (used for login) *</label>
              <input className="form-input" type="tel" placeholder="10-digit mobile number"
                maxLength={10} value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g,''))} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" placeholder="Min 6 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm *</label>
                <input className="form-input" type="password" placeholder="Repeat"
                  value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', marginTop:8 }} disabled={busy}>
              {busy ? 'Joining…' : `Join ${coop.cooperative_name}`}
            </button>
            <p style={{ textAlign:'center', fontSize:13, color:'#888', marginTop:16, marginBottom:0 }}>
              Already registered? <Link to="/login" style={{ color:'#0F6E56', fontWeight:500 }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
