import { useState, useEffect } from 'react'
import { farmersAPI } from '../api/index.js'
import { useAuth } from '../components/AuthContext.jsx'

function AddCattleModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    tag_number: '', breed: 'hf', age_years: 3,
    is_milking: true, expected_daily_yield_litres: 8,
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try { await farmersAPI.createCattle(form); onSaved(); onClose() }
    catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
    finally { setBusy(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Register cattle</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tag number *</label>
                <input className="form-input" placeholder="e.g. MR-101"
                  value={form.tag_number} onChange={e => set('tag_number', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Age (years)</label>
                <input className="form-input" type="number" min="1" max="20"
                  value={form.age_years} onChange={e => set('age_years', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Breed *</label>
              <select className="form-select" value={form.breed} onChange={e => set('breed', e.target.value)}>
                <option value="hf">Holstein Friesian</option>
                <option value="jersey">Jersey</option>
                <option value="gir">Gir</option>
                <option value="sahiwal">Sahiwal</option>
                <option value="murrah">Murrah Buffalo</option>
                <option value="surti">Surti Buffalo</option>
                <option value="mixed">Mixed Breed</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Currently milking?</label>
                <select className="form-select" value={form.is_milking}
                  onChange={e => set('is_milking', e.target.value === 'true')}>
                  <option value="true">Yes — currently milking</option>
                  <option value="false">No — dry / calf</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected yield (litres/day)</label>
                <input className="form-input" type="number" step="0.5" min="0"
                  value={form.expected_daily_yield_litres}
                  onChange={e => set('expected_daily_yield_litres', e.target.value)} />
              </div>
            </div>
            <div style={{ background: '#e1f5ee', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#0F6E56' }}>
              After registering cattle, go to Milk log to start recording daily yield.
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Register cattle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Farmers() {
  const { isManager } = useAuth()
  const [farmers, setFarmers] = useState([])
  const [cattle, setCattle] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('farmers')
  const [cattleModal, setCattleModal] = useState(false)
  const [joinInfo, setJoinInfo] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([farmersAPI.list(), farmersAPI.cattle()])
      .then(([f, c]) => { setFarmers(f.data); setCattle(c.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Get join link info from localStorage (set during login)
    const code = localStorage.getItem('cooperative_code')
    if (code) setJoinInfo(code)
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: '#888' }}>
          {farmers.length} farmers registered in your cooperative
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setCattleModal(true)}>
            + Add cattle
          </button>
        </div>
      </div>

      {joinInfo && isManager && (
        <div style={{ background: '#e1f5ee', borderRadius: 10, padding: '14px 18px', marginBottom: 18, border: '1px solid #9FE1CB' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0F6E56', marginBottom: 6 }}>
            Invite farmers to join your cooperative
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
            Share this link with your farmers — they can register themselves:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ background: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 13, color: '#0F6E56', border: '1px solid #9FE1CB', flex: 1 }}>
              {window.location.origin}/join/{joinInfo}
            </code>
            <button className="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/join/${joinInfo}`)
                alert('Link copied!')
              }}>
              Copy
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            Join code: <strong style={{ color: '#0F6E56', letterSpacing: 2 }}>{joinInfo}</strong>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '2px solid #e8e6df' }}>
        {['farmers', 'cattle'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 14, fontWeight: 500,
              color: activeTab === tab ? '#0F6E56' : '#888',
              borderBottom: activeTab === tab ? '2px solid #0F6E56' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {tab === 'farmers' ? `Farmers (${farmers.length})` : `Cattle (${cattle.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'farmers' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Village</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Cattle</th>
                  <th>Farms</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: f.role === 'manager' ? '#0F6E56' : '#1A5276',
                          color: 'white', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 600, fontSize: 13,
                          flexShrink: 0,
                        }}>
                          {f.full_name?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{f.full_name}</span>
                      </div>
                    </td>
                    <td>{f.village || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{f.phone}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: f.role === 'manager' ? '#e1f5ee' : '#f0f0ec',
                        color: f.role === 'manager' ? '#0F6E56' : '#5D6D7E',
                      }}>
                        {f.role === 'manager' ? 'Manager' : 'Farmer'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: '#e1f5ee', color: '#0F6E56', borderRadius: 12,
                        padding: '2px 8px', fontSize: 13, fontWeight: 600,
                      }}>
                        {f.cattle_count ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#888' }}>
                      {f.farm_count ?? 0} plots
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>
                      {f.joined ? new Date(f.joined).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                ))}
                {farmers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#888' }}>
                      No farmers registered yet. Share your join link above to invite farmers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cattle' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tag number</th>
                  <th>Breed</th>
                  <th>Farmer</th>
                  <th>Age</th>
                  <th>Milking</th>
                  <th>Expected yield</th>
                </tr>
              </thead>
              <tbody>
                {cattle.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.tag_number}</strong></td>
                    <td>{c.breed_display || c.breed}</td>
                    <td>{c.farmer_name}</td>
                    <td>{c.age_years} yrs</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: c.is_milking ? '#e1f5ee' : '#f0f0ec',
                        color: c.is_milking ? '#0F6E56' : '#888',
                      }}>
                        {c.is_milking ? 'Milking' : 'Dry'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#0F6E56' }}>
                      {c.expected_daily_yield_litres || c.expected_daily_yield} L/day
                    </td>
                  </tr>
                ))}
                {cattle.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#888' }}>
                      No cattle registered. Click "+ Add cattle" to register your first animal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cattleModal && <AddCattleModal onClose={() => setCattleModal(false)} onSaved={load} />}
    </div>
  )
}
