import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const DISTRICTS = [
  'Madurai','Dindigul','Theni','Virudhunagar','Sivaganga',
  'Ramanathapuram','Tirunelveli','Thoothukudi','Salem','Coimbatore',
  'Tiruchirappalli','Thanjavur','Nagapattinam','Vellore','Tirupur',
  'Erode','Namakkal','Karur','Perambalur','Ariyalur',
  'Pudukkottai','Tiruvarur','Cuddalore','Villupuram','Krishnagiri',
  'Dharmapuri','Tiruvannamalai','Kancheepuram','Chengalpattu','Chennai',
]

const PLANS = [
  { id:'starter', name:'Starter', price:'Free', max:'Up to 10 farmers', color:'#0F6E56', features:['Milk log','Farm NDVI','VAP + QR','Crop alerts'] },
  { id:'growth', name:'Growth', price:'₹999/mo', max:'Up to 50 farmers', color:'#1A5276', features:['All Starter features','SMS alerts','Market linkage','Grazing monitor','GPS tracking'] },
  { id:'enterprise', name:'Enterprise', price:'₹2499/mo', max:'Unlimited farmers', color:'#6C3483', features:['All Growth features','Custom domain','NABARD reports','API access','White label'] },
]

export default function Register() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [plan, setPlan] = useState('starter')
  const [form, setForm] = useState({
    cooperative_name:'', district:'Madurai', state:'Tamil Nadu',
    manager_name:'', phone:'', password:'', confirm_password:'',
    address:'', email:'',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const set = (k, v) => setForm(f => ({...f, [k]:v}))

  const validateStep1 = () => {
    if (!form.cooperative_name) return 'Cooperative name is required'
    if (!form.district) return 'District is required'
    return null
  }

  const validateStep2 = () => {
    if (!form.manager_name) return 'Manager name is required'
    if (!/^\d{10}$/.test(form.phone)) return 'Phone must be exactly 10 digits'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    if (form.password !== form.confirm_password) return 'Passwords do not match'
    return null
  }

  const nextStep = () => {
    setError('')
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
      setStep(2)
    } else if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
      setStep(3)
    }
  }

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const r = await axios.post(`${BASE}/farmers/register-cooperative/`, {
        ...form, plan,
      })
      localStorage.setItem('access', r.data.access)
      localStorage.setItem('refresh', r.data.refresh)
      setSuccess(r.data)
    } catch (ex) {
      setError(ex.response?.data?.error || 'Registration failed. Please try again.')
    } finally { setBusy(false) }
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'white', borderRadius:16, padding:40, maxWidth:480, width:'100%', textAlign:'center', border:'1px solid #e8e6df' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
          <h2 style={{ color:'#0F6E56', fontSize:22, fontWeight:600, marginBottom:8 }}>Welcome to DairyVision!</h2>
          <p style={{ color:'#555', marginBottom:20 }}>Your cooperative <strong>{success.cooperative_name}</strong> is ready.</p>

          <div style={{ background:'#e1f5ee', borderRadius:10, padding:20, marginBottom:24 }}>
            <div style={{ fontSize:13, color:'#0F6E56', marginBottom:8 }}>Your farmer join code</div>
            <div style={{ fontSize:32, fontWeight:700, color:'#0F6E56', letterSpacing:4 }}>{success.cooperative_code}</div>
            <div style={{ fontSize:12, color:'#555', marginTop:8 }}>Share this code with your farmers so they can join at</div>
            <div style={{ fontSize:12, color:'#1A5276', marginTop:4, fontWeight:600 }}>
              {window.location.origin}/join/{success.cooperative_code}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:12 }}
            onClick={() => nav('/')}>
            Go to Dashboard
          </button>
          <p style={{ fontSize:12, color:'#888' }}>
            Share join link: <strong>{window.location.origin}/join/{success.cooperative_code}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f4f3ef', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:16, maxWidth:600, width:'100%', border:'1px solid #e8e6df', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'#0F6E56', padding:'28px 32px' }}>
          <h1 style={{ color:'white', fontSize:22, fontWeight:600, margin:0 }}>DairyVision</h1>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginTop:4, marginBottom:0 }}>Register your cooperative</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', padding:'20px 32px 0', gap:8 }}>
          {['Cooperative details','Manager account','Choose plan'].map((s, i) => (
            <div key={i} style={{ flex:1, textAlign:'center' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', margin:'0 auto 6px',
                background: step > i+1 ? '#0F6E56' : step === i+1 ? '#0F6E56' : '#e8e6df',
                color: step >= i+1 ? 'white' : '#888',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:600,
              }}>{step > i+1 ? '✓' : i+1}</div>
              <div style={{ fontSize:11, color: step === i+1 ? '#0F6E56' : '#888' }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ padding:'24px 32px 32px' }}>

          {error && (
            <div style={{ background:'#FADBD8', color:'#A93226', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Cooperative details</h3>
              <div className="form-group">
                <label className="form-label">Cooperative / FPO name *</label>
                <input className="form-input" placeholder="e.g. Madurai MABIF Dairy Cooperative"
                  value={form.cooperative_name} onChange={e => set('cooperative_name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <select className="form-select" value={form.district} onChange={e => set('district', e.target.value)}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address (optional)</label>
                <input className="form-input" placeholder="Street, village, taluk"
                  value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input className="form-input" type="email" placeholder="cooperative@email.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
                onClick={nextStep}>
                Continue to manager account →
              </button>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Manager account</h3>
              <div style={{ background:'#e1f5ee', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#0F6E56' }}>
                Creating manager account for <strong>{form.cooperative_name}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Manager full name *</label>
                <input className="form-input" placeholder="e.g. Manimaran Herring"
                  value={form.manager_name} onChange={e => set('manager_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile number (used for login) *</label>
                <input className="form-input" type="tel" placeholder="10-digit mobile number"
                  maxLength={10} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,''))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" placeholder="Min 6 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm password *</label>
                  <input className="form-input" type="password" placeholder="Repeat password"
                    value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}
                  onClick={nextStep}>Continue to plan →</button>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Choose your plan</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
                {PLANS.map(pl => (
                  <div key={pl.id}
                    onClick={() => setPlan(pl.id)}
                    style={{
                      border: `2px solid ${plan === pl.id ? pl.color : '#e8e6df'}`,
                      borderRadius:10, padding:'14px 16px', cursor:'pointer',
                      background: plan === pl.id ? pl.color + '0D' : 'white',
                      transition:'all 0.15s',
                    }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div>
                        <span style={{ fontWeight:600, fontSize:15, color: plan === pl.id ? pl.color : '#1C2833' }}>{pl.name}</span>
                        <span style={{ marginLeft:10, fontSize:12, color:'#888' }}>{pl.max}</span>
                      </div>
                      <div style={{ fontWeight:700, fontSize:18, color: plan === pl.id ? pl.color : '#1C2833' }}>{pl.price}</div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {pl.features.map(f => (
                        <span key={f} style={{ fontSize:11, background: plan===pl.id ? pl.color+'22' : '#f0f0ec', color: plan===pl.id ? pl.color : '#555', borderRadius:20, padding:'2px 8px' }}>
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}
                  disabled={busy} onClick={submit}>
                  {busy ? 'Creating account…' : 'Create cooperative account'}
                </button>
              </div>
            </>
          )}

          <p style={{ textAlign:'center', fontSize:13, color:'#888', marginTop:20, marginBottom:0 }}>
            Already have an account? <Link to="/login" style={{ color:'#0F6E56', fontWeight:500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
