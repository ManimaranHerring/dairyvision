import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const r = await axios.post(`${BASE}/auth/refresh/`, { refresh })
          localStorage.setItem('access', r.data.access)
          err.config.headers.Authorization = `Bearer ${r.data.access}`
          return api.request(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (phone, pw) => api.post('/auth/login/', { username: phone, password: pw }),
  getMe: () => api.get('/farmers/me/'),
}

export const farmersAPI = {
  list: () => api.get('/farmers/list/'),
  stats: () => api.get('/farmers/dashboard-stats/'),
  farms: () => api.get('/farmers/farms/'),
  createFarm: (d) => api.post('/farmers/farms/', d),
  cattle: () => api.get('/farmers/cattle/'),
}

export const dairyAPI = {
  milkLogs: () => api.get('/dairy/milklogs/'),
  milkSummary: () => api.get('/dairy/milklogs/summary/'),
  logMilk: (d) => api.post('/dairy/milklogs/', d),
  batches: () => api.get('/dairy/batches/'),
  createBatch: (d) => api.post('/dairy/batches/', d),
  publicTrace: (id) => axios.get(`${BASE}/dairy/trace/${id}/`),
}

export const agriAPI = {
  healthMap: () => api.get('/agri/health-map/'),
  ndviTrend: (id) => api.get(`/agri/ndvi-trend/${id}/`),
  refreshNDVI: () => api.post('/agri/refresh-ndvi/'),
  alerts: () => api.get('/agri/alerts/'),
  // Grazing
  grazingLands: () => api.get('/agri/grazing-lands/'),
  createGrazingLand: (d) => api.post('/agri/grazing-lands/', d),
  refreshPasture: () => api.post('/agri/refresh-pasture/'),
  pastureHistory: (id) => api.get(`/agri/pasture-history/${id}/`),
  cattleLiveMap: () => api.get('/agri/cattle-live-map/'),
  grazingSessions: () => api.get('/agri/grazing-sessions/'),
  createSession: (d) => api.post('/agri/grazing-sessions/', d),
}

export const marketAPI = {
  listings: () => api.get('/market/listings/'),
  createListing: (d) => api.post('/market/listings/', d),
  orders: () => api.get('/market/orders/'),
  createOrder: (d) => api.post('/market/orders/', d),
  updateOrder: (id, d) => api.patch(`/market/orders/${id}/`, d),
  publicListings: () => axios.get(`${BASE}/market/public/`),
}
