import { useState, useEffect } from 'react'
import { agriAPI } from '../api/index.js'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    agriAPI.alerts().then(r => setAlerts(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page-body">
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:18, fontWeight:600 }}>Crop alerts</h2>
        <p style={{ fontSize:13, color:'#888', marginTop:2 }}>
          Active satellite-detected stress alerts
        </p>
      </div>
      {alerts.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="icon">✅</div>
            <p>No active alerts — all farms are healthy</p>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {alerts.map(a => (
            <div key={a.id} className="card">
              <div style={{ padding:'15px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{a.farm}</div>
                    <div style={{ fontSize:13, color:'#888', marginTop:2 }}>
                      {a.farmer} · {a.village} · {a.created_at}
                    </div>
                  </div>
                  <span style={{
                    padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                    background: a.severity==='high' ? '#FCEBEB' : '#fff3e0',
                    color: a.severity==='high' ? '#791F1F' : '#bf360c',
                  }}>
                    {a.severity.toUpperCase()}
                  </span>
                </div>
                <div style={{ background:'#f9f9f6', borderRadius:6, padding:'10px 12px', fontSize:14 }}>
                  {a.message}
                </div>
                {a.message_ta && (
                  <div style={{ background:'#e1f5ee', borderRadius:6, padding:'10px 12px',
                    fontSize:14, marginTop:8, color:'#0F6E56' }}>
                    {a.message_ta}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}