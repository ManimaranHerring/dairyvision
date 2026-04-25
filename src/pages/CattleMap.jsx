import { useState, useEffect } from 'react'
import { agriAPI, farmersAPI } from '../api/index.js'

export default function CattleMap() {
  const [cattle, setCattle] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [allCattle, setAllCattle] = useState([])
  const [grazingLands, setGrazingLands] = useState([])
  const [form, setForm] = useState({ cattle: '', grazing_land: '', start_time: new Date().toISOString().slice(0, 16), notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = () => {
    setLoading(true)
    Promise.all([
      agriAPI.cattleLiveMap(),
      agriAPI.grazingSessions(),
      farmersAPI.cattle(),
      agriAPI.grazingLands(),
    ]).then(([c, s, ac, gl]) => {
      setCattle(c.data)
      setSessions(s.data)
      setAllCattle(ac.data)
      setGrazingLands(gl.data)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const startSession = async e => {
    e.preventDefault()
    try {
      await agriAPI.createSession({ ...form, start_time: form.start_time + ':00' })
      setShowForm(false)
      load()
    } catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const withGPS = cattle.filter(c => c.latitude)
  const withoutGPS = cattle.filter(c => !c.latitude)
  const activeSessions = sessions.filter(s => s.is_active)

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Cattle Map</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            GPS collar tracking + grazing session management
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + Log grazing session
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header"><h3>Start grazing session</h3></div>
          <form onSubmit={startSession}>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cattle</label>
                  <select className="form-select" value={form.cattle}
                    onChange={e => set('cattle', e.target.value)} required>
                    <option value="">Select cattle…</option>
                    {allCattle.map(c => (
                      <option key={c.id} value={c.id}>{c.tag_number} — {c.breed_display}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Grazing land</label>
                  <select className="form-select" value={form.grazing_land}
                    onChange={e => set('grazing_land', e.target.value)} required>
                    <option value="">Select land…</option>
                    {grazingLands.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Start time</label>
                <input className="form-input" type="datetime-local" value={form.start_time}
                  onChange={e => set('start_time', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="Any notes..."
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary">Start session</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="two-col" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="lbl">Total cattle</div>
          <div className="val">{cattle.length}</div>
          <div className="sub">registered</div>
        </div>
        <div className="stat-card blue">
          <div className="lbl">With GPS collar</div>
          <div className="val">{withGPS.length}</div>
          <div className="sub">location tracked</div>
        </div>
        <div className="stat-card green">
          <div className="lbl">Active sessions</div>
          <div className="val">{activeSessions.length}</div>
          <div className="sub">currently grazing</div>
        </div>
        <div className="stat-card amber">
          <div className="lbl">Outside geofence</div>
          <div className="val">{cattle.filter(c => c.is_outside_geofence).length}</div>
          <div className="sub">need attention</div>
        </div>
      </div>

      {withGPS.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header"><h3>📍 GPS-tracked cattle</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tag</th><th>Breed</th><th>Farmer</th><th>Latitude</th><th>Longitude</th><th>Battery</th><th>Status</th><th>Last Seen</th></tr>
              </thead>
              <tbody>
                {withGPS.map(c => (
                  <tr key={c.cattle_id}>
                    <td><strong>{c.tag_number}</strong></td>
                    <td>{c.breed}</td>
                    <td>{c.farmer} · {c.village}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.latitude?.toFixed(4)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.longitude?.toFixed(4)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 40, height: 8, borderRadius: 4,
                          background: '#eee', overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${c.battery}%`, height: '100%',
                            background: c.battery > 30 ? '#1D9E75' : '#E24B4A',
                          }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{c.battery}%</span>
                      </div>
                    </td>
                    <td>
                      {c.is_outside_geofence ? (
                        <span style={{ color: '#E24B4A', fontWeight: 600, fontSize: 12 }}>⚠ Outside fence</span>
                      ) : (
                        <span style={{ color: '#1D9E75', fontSize: 12 }}>✓ In zone</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>
                      {c.last_seen ? new Date(c.last_seen).toLocaleTimeString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {withoutGPS.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <h3>🐄 Cattle without GPS collar</h3>
            <span style={{ fontSize: 12, color: '#888' }}>Fit GPS collar to track location</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tag</th><th>Breed</th><th>Farmer</th><th>Village</th></tr>
              </thead>
              <tbody>
                {withoutGPS.map(c => (
                  <tr key={c.cattle_id}>
                    <td><strong>{c.tag_number}</strong></td>
                    <td>{c.breed}</td>
                    <td>{c.farmer}</td>
                    <td>{c.village}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>Recent grazing sessions</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Cattle</th><th>Grazing Land</th><th>Start</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map(s => (
                <tr key={s.id}>
                  <td><strong>{s.cattle_tag}</strong></td>
                  <td>{s.land_name}</td>
                  <td style={{ fontSize: 13 }}>{new Date(s.start_time).toLocaleString('en-IN')}</td>
                  <td>{s.duration_hours ? `${s.duration_hours} hrs` : '—'}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: s.is_active ? '#e1f5ee' : '#f0f0ec',
                      color: s.is_active ? '#0F6E56' : '#888',
                    }}>
                      {s.is_active ? '● Active' : 'Completed'}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#888' }}>
                  No sessions logged yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
