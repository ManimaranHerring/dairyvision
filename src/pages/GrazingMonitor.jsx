import { useState, useEffect } from 'react'
import { agriAPI, farmersAPI } from '../api/index.js'

const PCOLOR = {
  abundant: '#1E8449', adequate: '#1D9E75',
  depleted: '#BA7517', exhausted: '#A93226', unknown: '#B4B2A9',
}
const PLABEL = {
  abundant: 'Abundant', adequate: 'Adequate',
  depleted: 'Depleting', exhausted: 'Exhausted', unknown: 'No data',
}

function AddLandModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', land_type: 'common', area_acres: '',
    latitude: '', longitude: '', max_cattle_capacity: 5, notes: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try { await agriAPI.createGrazingLand(form); onSaved(); onClose() }
    catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
    finally { setBusy(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Register Grazing Land</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="e.g. Village Common Land"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Land Type</label>
                <select className="form-select" value={form.land_type}
                  onChange={e => set('land_type', e.target.value)}>
                  <option value="common">Common Grazing Land</option>
                  <option value="private">Private Pasture</option>
                  <option value="roadside">Roadside Grazing</option>
                  <option value="forest">Forest Fringe</option>
                  <option value="fallow">Fallow Field</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area (acres)</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="5.0" value={form.area_acres}
                  onChange={e => set('area_acres', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-input" type="number" step="0.0001"
                  placeholder="9.9312" value={form.latitude}
                  onChange={e => set('latitude', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input className="form-input" type="number" step="0.0001"
                  placeholder="77.9731" value={form.longitude}
                  onChange={e => set('longitude', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Max cattle capacity</label>
              <input className="form-input" type="number"
                value={form.max_cattle_capacity}
                onChange={e => set('max_cattle_capacity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Any notes..."
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div style={{ background: '#e1f5ee', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#0F6E56' }}>
              After registering, satellite pasture monitoring starts automatically.
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Register land'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TrendPanel({ land, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    agriAPI.pastureHistory(land.id).then(r => setData(r.data))
  }, [land.id])

  const readings = data?.readings || []
  const max = Math.max(...readings.map(r => r.ndvi), 0.8)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-header">
        <h3>Pasture trend — {land.name}</h3>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Close</button>
      </div>
      <div className="card-body">
        {readings.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>No readings yet. Click Refresh Pasture.</p>
        ) : (
          <>
            <div className="bar-chart">
              {readings.map((r, i) => {
                const color = PCOLOR[r.health] || PCOLOR.unknown
                return (
                  <div key={i} className="bar-col">
                    <div className="bar-val">{r.ndvi.toFixed(2)}</div>
                    <div className="bar-fill"
                      style={{ height: `${Math.max((r.ndvi / max) * 120, 2)}px`, background: color }} />
                    <div className="bar-lbl">{r.date.slice(5)}</div>
                  </div>
                )
              })}
            </div>
            {readings.length > 0 && (
              <div style={{ marginTop: 12, background: '#f0f8f4', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#0F6E56' }}>
                <strong>Latest recommendation:</strong> {readings[readings.length - 1]?.recommendation}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
              Green = abundant · Orange = depleting · Red = exhausted
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function GrazingMonitor() {
  const [lands, setLands] = useState([])
  const [selected, setSelected] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    agriAPI.grazingLands()
      .then(r => { setLands(r.data); setError('') })
      .catch(() => setError('Could not load grazing lands.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const doRefresh = async () => {
    setRefreshing(true)
    try { await agriAPI.refreshPasture(); await load() }
    finally { setRefreshing(false) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const sel = lands.find(l => l.id === selected)

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Grazing Monitor</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Satellite pasture quality — Sentinel-2 NDVI for grazing lands
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh Pasture'}
          </button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add land</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
        {Object.entries(PLABEL).filter(([k]) => k !== 'unknown').map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: PCOLOR[k] }} />
            {v}
          </div>
        ))}
      </div>

      {error && <div className="empty"><div className="icon">⚠</div><p>{error}</p></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14, marginBottom: 20 }}>
        {lands.map(l => {
          const color = PCOLOR[l.latest_pasture_health] || PCOLOR.unknown
          const label = PLABEL[l.latest_pasture_health] || 'No data'
          const isSel = selected === l.id
          return (
            <div key={l.id} className="card farm-card"
              style={{ border: `2px solid ${isSel ? '#1D9E75' : '#e8e6df'}` }}
              onClick={() => setSelected(isSel ? null : l.id)}>
              <div style={{ height: 5, background: color, borderRadius: '10px 10px 0 0' }} />
              <div style={{ padding: '13px 15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>🌿 {l.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {l.farmer_name} · {l.land_type_display}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: color + '22', color,
                  }}>{label}</span>
                </div>
                <div className="ndvi-grid" style={{ marginTop: 12 }}>
                  {[
                    [l.latest_ndvi?.toFixed(2) ?? '—', 'NDVI', color],
                    [l.area_acres, 'acres', '#378ADD'],
                    [l.max_cattle_capacity, 'capacity', '#639922'],
                  ].map(([val, sub, c]) => (
                    <div key={sub} className="ndvi-cell">
                      <div className="nv" style={{ color: c }}>{val}</div>
                      <div className="nl">{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📍 {l.farmer_name}</span>
                  <span>{l.latest_reading_date ? `Updated ${l.latest_reading_date}` : 'No readings yet'}</span>
                </div>
              </div>
            </div>
          )
        })}
        {lands.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="icon">🌿</div>
            <p>No grazing lands registered. Click "+ Add land" to start.</p>
          </div>
        )}
      </div>

      {selected && sel && <TrendPanel land={sel} onClose={() => setSelected(null)} />}
      {addModal && <AddLandModal onClose={() => setAddModal(false)} onSaved={load} />}
    </div>
  )
}
