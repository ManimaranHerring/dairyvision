import { useState, useEffect } from 'react'
import { dairyAPI, farmersAPI } from '../api/index.js'

function CreateModal({ onClose, onSaved }) {
  const [farmers, setFarmers] = useState([])
  const [form, setForm] = useState({
    product_type: 'ghee', quantity_kg: '',
    production_date: new Date().toISOString().slice(0,10),
    expiry_date: '', source_farmers: [],
    total_milk_used_litres: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    farmersAPI.list().then(r => setFarmers(r.data))
  }, [])

  const toggleFarmer = id => setForm(f => ({
    ...f,
    source_farmers: f.source_farmers.includes(id)
      ? f.source_farmers.filter(x => x !== id)
      : [...f.source_farmers, id],
  }))

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      await dairyAPI.createBatch(form)
      onSaved()
      onClose()
    } catch (ex) {
      alert('Error: ' + JSON.stringify(ex.response?.data))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:520 }}>
        <div className="modal-head">
          <h3>Create VAP batch</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product</label>
                <select className="form-select" value={form.product_type}
                  onChange={e => set('product_type', e.target.value)}>
                  <option value="ghee">Ghee</option>
                  <option value="paneer">Paneer</option>
                  <option value="curd">Curd / Yogurt</option>
                  <option value="butter">Butter</option>
                  <option value="buttermilk">Buttermilk</option>
                  <option value="khoya">Khoya</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Qty (kg)</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="12.5" value={form.quantity_kg}
                  onChange={e => set('quantity_kg', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Production date</label>
                <input className="form-input" type="date" value={form.production_date}
                  onChange={e => set('production_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry date</label>
                <input className="form-input" type="date" value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total milk used (litres)</label>
              <input className="form-input" type="number" step="0.1"
                placeholder="125" value={form.total_milk_used_litres}
                onChange={e => set('total_milk_used_litres', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Source farmers</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:5 }}>
                {farmers.map(f => {
                  const sel = form.source_farmers.includes(f.id)
                  return (
                    <label key={f.id} style={{
                      display:'flex', alignItems:'center', gap:5,
                      padding:'5px 11px', borderRadius:20, cursor:'pointer',
                      border:`1px solid ${sel ? '#1D9E75' : '#ccc'}`,
                      background: sel ? '#e1f5ee' : 'white', fontSize:13,
                    }}>
                      <input type="checkbox" checked={sel}
                        onChange={() => toggleFarmer(f.id)}
                        style={{ display:'none' }} />
                      {f.full_name} · {f.village}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" placeholder="Processing notes…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create + generate QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TraceModal({ batchId, onClose }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    dairyAPI.publicTrace(batchId).then(r => setData(r.data))
  }, [batchId])

  if (!data) return (
    <div className="overlay">
      <div className="modal">
        <div className="loading"><div className="spinner" /></div>
      </div>
    </div>
  )

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Product traceability</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background:'#e1f5ee', borderRadius:8, padding:'12px 16px', marginBottom:14 }}>
            <div style={{ fontSize:11, color:'#0F6E56', fontWeight:600 }}>BATCH ID</div>
            <div style={{ fontSize:24, fontWeight:700, color:'#0F6E56', letterSpacing:2 }}>
              {data.batch_short_id}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              ['Product', data.product],
              ['Quantity', `${data.quantity_kg} kg`],
              ['Produced', data.production_date],
              ['Expires', data.expiry_date || 'N/A'],
              ['Milk used', `${data.milk_used_litres} L`],
              ['Status', data.status],
            ].map(([k, v]) => (
              <div key={k} style={{ background:'#f9f9f6', borderRadius:6, padding:'9px 11px' }}>
                <div style={{ fontSize:11, color:'#888' }}>{k}</div>
                <div style={{ fontSize:14, fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Source farmers</div>
          {data.source_farmers.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
              padding:'8px 0', borderBottom:'1px solid #f0ede6' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#1D9E75',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontWeight:600 }}>
                {f.name[0]}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>{f.name}</div>
                <div style={{ fontSize:12, color:'#888' }}>{f.village}</div>
              </div>
            </div>
          ))}
          <div style={{ background:'#f0f8f4', borderRadius:8, padding:'11px 13px',
            fontSize:13, color:'#0F6E56', marginTop:12 }}>
            {data.message}
          </div>
        </div>
      </div>
    </div>
  )
}

const ICON = { ghee:'🧈', paneer:'🧀', curd:'🥛', butter:'🧈', buttermilk:'🥛', khoya:'🍮' }

export default function VAPBatches() {
  const [batches, setBatches] = useState([])
  const [create, setCreate] = useState(false)
  const [traceId, setTraceId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    dairyAPI.batches()
      .then(r => { setBatches(r.data); setError('') })
      .catch(() => setError('Could not load batches.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  if (error) return (
    <div className="page-body">
      <div className="empty">
        <div className="icon">⚠</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={load}>Try again</button>
      </div>
    </div>
  )

  return (
    <div className="page-body">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:600 }}>VAP batches</h2>
          <p style={{ fontSize:13, color:'#888', marginTop:2 }}>Value-added products with QR traceability</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreate(true)}>+ New batch</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Batch ID</th><th>Product</th><th>Qty</th>
                <th>Produced</th><th>Status</th><th>Farmers</th><th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td>
                    <code style={{ background:'#f0f0ec', padding:'2px 6px', borderRadius:4, fontSize:12 }}>
                      {b.batch_short_id}
                    </code>
                  </td>
                  <td>{ICON[b.product_type] || '📦'} {b.product_display}</td>
                  <td>{b.quantity_kg} kg</td>
                  <td>{b.production_date}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status_display}</span></td>
                  <td>{b.source_farmer_names?.length || 0}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => setTraceId(b.batch_id)}>
                      View trace
                    </button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', padding:30, color:'#888' }}>
                    No batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {create && <CreateModal onClose={() => setCreate(false)} onSaved={load} />}
      {traceId && <TraceModal batchId={traceId} onClose={() => setTraceId(null)} />}
    </div>
  )
}