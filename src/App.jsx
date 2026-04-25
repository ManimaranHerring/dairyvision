import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MilkLog from './pages/MilkLog.jsx'
import VAPBatches from './pages/VAPBatches.jsx'
import FarmHealth from './pages/FarmHealth.jsx'
import GrazingMonitor from './pages/GrazingMonitor.jsx'
import CattleMap from './pages/CattleMap.jsx'
import MarketLinkage from './pages/MarketLinkage.jsx'
import Alerts from './pages/Alerts.jsx'
import Farmers from './pages/Farmers.jsx'

function Shell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content"><Outlet /></main>
    </div>
  )
}

function Guard() {
  const { farmer, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /></div>
  return farmer ? <Shell /> : <Navigate to="/login" replace />
}

function Header({ title, sub }) {
  return (
    <div className="top-bar">
      <div><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard />}>
            <Route path="/" element={<><Header title="Dashboard" sub="Dairy and agri operations overview" /><Dashboard /></>} />
            <Route path="/milk" element={<><Header title="Milk log" sub="Daily milk collection" /><MilkLog /></>} />
            <Route path="/vap" element={<><Header title="VAP batches" sub="Value-added products with QR traceability" /><VAPBatches /></>} />
            <Route path="/farms" element={<><Header title="Farm health" sub="Satellite NDVI crop monitoring" /><FarmHealth /></>} />
            <Route path="/grazing" element={<><Header title="Grazing monitor" sub="Satellite pasture quality monitoring" /><GrazingMonitor /></>} />
            <Route path="/cattle-map" element={<><Header title="Cattle map" sub="GPS collar tracking and grazing sessions" /><CattleMap /></>} />
            <Route path="/market" element={<><Header title="Market linkage" sub="Connect to institutional buyers with traceability" /><MarketLinkage /></>} />
            <Route path="/alerts" element={<><Header title="Crop alerts" sub="Stress alerts from satellite data" /><Alerts /></>} />
            <Route path="/farmers" element={<><Header title="Farmers" sub="All registered farmers" /><Farmers /></>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
