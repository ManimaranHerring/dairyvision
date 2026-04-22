import { useState, useEffect } from 'react'
import { farmersAPI } from '../api/index.js'

export default function Farmers() {
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    farmersAPI.list().then(r => setFarmers(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page-body">
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:18, fontWeight:600 }}>Farmers</h2>
        <p style={{ fontSize:13, color:'#888', marginTop:2 }}>
          {farmers.length} farmers registered in your district
        </p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Village</th><th>Phone</th><th>Cattle</th><th>Farms</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {farmers.map(f => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:34, height:34, borderRadius:'50%', background:'#1D9E75',
                        color:'white', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0,
                      }}>
                        {(f.full_name||'?')[0]}
                      </div>
                      <strong>{f.full_name}</strong>
                    </div>
                  </td>
                  <td>{f.village}</td>
                  <td style={{ fontFamily:'monospace', fontSize:13 }}>{f.phone}</td>
                  <td>
                    <span style={{ background:'#e1f5ee', color:'#0F6E56',
                      padding:'2px 8px', borderRadius:12, fontSize:12, fontWeight:600 }}>
                      {f.cattle_count}
                    </span>
                  </td>
                  <td>{f.farm_count} plots</td>
                  <td style={{ color:'#888', fontSize:13 }}>
                    {new Date(f.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
              {farmers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'#888' }}>
                  No farmers registered yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}