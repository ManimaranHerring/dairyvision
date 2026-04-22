import { useState, useEffect } from 'react'
import { farmersAPI, dairyAPI, agriAPI } from '../api/index.js'

function Stat({ label, value, sub, color }) {
  return (
    <div className={`stat-card ${color || ''}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value ?? '—'}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

function MilkChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.litres), 1)
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-val">{d.litres > 0 ? d.litres.toFixed(0) : ''}</div>
          <div className="bar-fill"
            style={{ height: `${Math.max((d.litres / max) * 120, 2)}px` }} />
          <div className="bar-lbl">{d.date}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [milk, setMilk] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([farmersAPI.stats(), dairyAPI.milkSummary(), agriAPI.alerts()])
      .then(([s, m, a]) => {
        setStats(s.data)
        setMilk(m.data)
        setAlerts(a.data.slice(0, 4))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const trend = milk?.daily_trend?.map(d => ({
    date: d.date.slice(5),
    litres: d.litres,
  })) || []

  return (
    <div className="page-body">
      <div className="stats-grid">
        <Stat label="Total farmers"  value={stats?.total_farmers} color="" sub="registered" />
        <Stat label="Total cattle"   value={stats?.total_cattle}  color="blue" sub={`${stats?.milking_cattle || 0} milking`} />
        <Stat label="Farm area"      value={`${stats?.total_area_acres?.toFixed(1) || 0} ac`} color="green" sub="registered plots" />
        <Stat label="Milk today"     value={`${(milk?.today_litres || 0).toFixed(0)} L`} color="" sub="litres collected" />
        <Stat label="Milk this week" value={`${(milk?.week_litres || 0).toFixed(0)} L`}  color="blue" sub="last 7 days" />
        <Stat label="Active alerts"  value={alerts.length} color={alerts.length > 0 ? 'red' : 'green'} sub="crop stress alerts" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header"><h3>Milk collection — last 14 days</h3></div>
          <div className="card-body">
            <MilkChart data={trend} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Active crop alerts</h3></div>
          <div className="card-body">
            {alerts.length === 0 ? (
              <div className="empty">
                <div className="icon">✅</div>
                <p>All farms healthy — no active alerts</p>
              </div>
            ) : alerts.map(a => (
              <div key={a.id} className={`alert-box ${a.severity}`}>
                <strong style={{ fontSize: 13 }}>{a.farm} · {a.village}</strong>
                <div style={{ fontSize: 12, marginTop: 3 }}>{a.message}</div>
                {a.message_ta && (
                  <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
                    {a.message_ta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}