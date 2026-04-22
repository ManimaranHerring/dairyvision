import { useState, useEffect } from 'react'
import { dairyAPI, farmersAPI } from '../api/index.js'
import { useAuth } from '../components/AuthContext.jsx'

function BarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-val">{d.total > 0 ? d.total.toFixed(0) : ''}</div>
          <div className="bar-fill"
            style={{ height: `${Math.max((d.total / max) * 120, 2)}px` }} />
          <div className="bar-lbl">{d.date}</div>
        </div>
      ))}
    </div>
  )
}

function LogModal({ onClose, onSaved }) {
  const { isManager } = useAuth()
  const [farmers, setFarmers] = useState([])
  const [form, setForm] = useState({
    farmer: '',
    date: new Date().toISOString().slice(0, 10),
    session: 'morning',
    quantity_litres: '',
    fat_percentage: '',
    snf_percentage: '',
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isManager) {
      farmersAPI.list().then(r => setFarmers(r.data))
    }
  }, [isManager])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await dairyAPI.logMilk(form)
      onSaved()
      onClose()
    } catch (ex) {
      setErr(ex.response?.data?.non_field_errors?.[0] || 'Already logged for this session.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Log milk yield</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {err && <div className="error-msg">{err}</div>}
            {isManager && (
              <div className="form-group">
                <label className="form-label">Farmer</label>
                <select className="form-select" value={form.farmer}
                  onChange={e => set('farmer', e.target.value)} required>
                  <option value="">Select farmer…</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.full_name} — {f.village}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date}
                  onChange={e => set('date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Session</label>
                <select className="form-select" value={form.session}
                  onChange={e => set('session', e.target.value)}>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity (litres)</label>
              <input className="form-input" type="number" step="0.1" min="0"
                placeholder="e.g. 18.5" value={form.quantity_litres}
                onChange={e => set('quantity_litres', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fat %</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="4.2" value={form.fat_percentage}
                  onChange={e => set('fat_percentage', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">SNF %</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="8.5" value={form.snf_percentage}
                  onChange={e => set('snf_percentage', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MilkLog() {
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([dairyAPI.milkLogs(), dairyAPI.milkSummary()])
      .then(([l, s]) => {
        setLogs(l.data)
        setSummary(s.data)
        setError('')
      })
      .catch(() => setError('Could not load milk data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const chartData = (summary?.daily_trend || []).slice(-10).map(d => ({
    date: d.date.slice(5),
    total: d.litres,
  }))

  if (loading) return <div className="loading"><div className="spinner" /></div>

  if (error) return (
    <div className="page-body">
      <div className="empty">
        <div className="icon">⚠</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>Try again</button>
      </div>
    </div>
  )

  return (
    <div className="page-body">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:600 }}>Milk log</h2>
          <p style={{ fontSize:13, color:'#888', marginTop:2 }}>Track daily milk collection</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Log milk</button>
      </div>

      <div className="stats-grid" style={{ marginBottom:18 }}>
        <div className="stat-card">
          <div className="lbl">Today</div>
          <div className="val">{(summary?.today_litres || 0).toFixed(1)} L</div>
        </div>
        <div className="stat-card blue">
          <div className="lbl">This week</div>
          <div className="val">{(summary?.week_litres || 0).toFixed(1)} L</div>
        </div>
        <div className="stat-card amber">
          <div className="lbl">This month</div>
          <div className="val">{(summary?.month_litres || 0).toFixed(1)} L</div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><h3>Daily collection — last 10 days</h3></div>
          <div className="card-body">
            <BarChart data={chartData} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Recent entries</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Farmer</th><th>Date</th><th>Session</th><th>Litres</th><th>Fat%</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 12).map(l => (
                  <tr key={l.id}>
                    <td>{l.farmer_name}</td>
                    <td>{l.date}</td>
                    <td style={{ textTransform:'capitalize' }}>{l.session}</td>
                    <td><strong>{l.quantity_litres} L</strong></td>
                    <td>{l.fat_percentage ? `${l.fat_percentage}%` : '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign:'center', padding:28, color:'#888' }}>
                      No logs yet. Click "+ Log milk" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && <LogModal onClose={() => setModal(false)} onSaved={load} />}
    </div>
  )
}