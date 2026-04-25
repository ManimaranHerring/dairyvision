import { useState, useEffect } from 'react'
import { marketAPI, dairyAPI } from '../api/index.js'
import { useAuth } from '../components/AuthContext.jsx'

const PRODUCT_ICONS = {
  ghee: '🧈', paneer: '🧀', curd: '🥛', butter: '🧈',
  buttermilk: '🥛', khoya: '🍮', milk: '🥛', other: '📦',
}

function CreateListingModal({ onClose, onSaved }) {
  const [batches, setBatches] = useState([])
  const [form, setForm] = useState({
    product_name: '', product_type: 'ghee', description: '',
    price_per_unit: '', unit: 'kg', quantity_available: '',
    minimum_order: '1', source_batch: '', district: 'Madurai',
    certifications: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { dairyAPI.batches().then(r => setBatches(r.data)) }, [])

  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try {
      await marketAPI.createListing(form)
      onSaved(); onClose()
    } catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
    finally { setBusy(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-head">
          <h3>Create product listing</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Product name</label>
              <input className="form-input" placeholder="e.g. Pure Cow Ghee — Madurai Cooperative"
                value={form.product_name} onChange={e => set('product_name', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product type</label>
                <select className="form-select" value={form.product_type}
                  onChange={e => set('product_type', e.target.value)}>
                  <option value="ghee">Ghee</option>
                  <option value="paneer">Paneer</option>
                  <option value="curd">Curd / Yogurt</option>
                  <option value="butter">Butter</option>
                  <option value="buttermilk">Buttermilk</option>
                  <option value="khoya">Khoya</option>
                  <option value="milk">Fresh Milk</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit}
                  onChange={e => set('unit', e.target.value)}>
                  <option value="kg">Kilogram</option>
                  <option value="litre">Litre</option>
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input"
                placeholder="e.g. 100% pure cow ghee from grass-fed cows in Madurai district"
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price per unit (₹)</label>
                <input className="form-input" type="number" step="0.01"
                  placeholder="580.00" value={form.price_per_unit}
                  onChange={e => set('price_per_unit', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity available</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="25" value={form.quantity_available}
                  onChange={e => set('quantity_available', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Minimum order</label>
                <input className="form-input" type="number" step="0.1"
                  placeholder="1" value={form.minimum_order}
                  onChange={e => set('minimum_order', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <input className="form-input" value={form.district}
                  onChange={e => set('district', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Link to VAP batch (for traceability)</label>
              <select className="form-select" value={form.source_batch}
                onChange={e => set('source_batch', e.target.value)}>
                <option value="">No batch linked</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_short_id} — {b.product_display} ({b.production_date})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Certifications (optional)</label>
              <input className="form-input"
                placeholder="e.g. FSSAI, Organic, NABARD certified"
                value={form.certifications}
                onChange={e => set('certifications', e.target.value)} />
            </div>
            <div style={{ background: '#e1f5ee', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#0F6E56' }}>
              Linking a VAP batch adds QR traceability proof to your listing — buyers can scan to verify farm origin.
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Publish listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OrderModal({ listing, onClose, onSaved }) {
  const [form, setForm] = useState({
    listing: listing.id,
    buyer_name: '', buyer_phone: '', buyer_email: '',
    buyer_type: 'hotel', buyer_city: '',
    quantity: listing.minimum_order,
    delivery_address: '', special_instructions: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = (parseFloat(form.quantity) || 0) * parseFloat(listing.price_per_unit)

  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try {
      const r = await marketAPI.createOrder(form)
      alert(`✅ Order ${r.data.order_short_id} placed!\n${r.data.message}`)
      onSaved(); onClose()
    } catch (ex) { alert('Error: ' + JSON.stringify(ex.response?.data)) }
    finally { setBusy(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-head">
          <h3>Place order — {listing.product_name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ background: '#e1f5ee', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{listing.product_name}</div>
              <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 2 }}>
                ₹{listing.price_per_unit} per {listing.unit_display} · {listing.cooperative_name}
              </div>
              {listing.batch_short_id && (
                <div style={{ fontSize: 11, marginTop: 4, color: '#0F6E56' }}>
                  🔗 Traceability: Batch {listing.batch_short_id}
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Your name</label>
                <input className="form-input" placeholder="Full name"
                  value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" placeholder="Mobile number"
                  value={form.buyer_phone} onChange={e => set('buyer_phone', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Buyer type</label>
                <select className="form-select" value={form.buyer_type}
                  onChange={e => set('buyer_type', e.target.value)}>
                  <option value="hotel">Hotel / Restaurant</option>
                  <option value="supermarket">Supermarket / Retail</option>
                  <option value="school">School / Institution</option>
                  <option value="export">Export Aggregator</option>
                  <option value="government">Government / AAVIN</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="e.g. Chennai"
                  value={form.buyer_city} onChange={e => set('buyer_city', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Quantity ({listing.unit_display}) — min: {listing.minimum_order}
              </label>
              <input className="form-input" type="number" step="0.1"
                min={listing.minimum_order} value={form.quantity}
                onChange={e => set('quantity', e.target.value)} required />
            </div>
            <div style={{ background: '#f9f9f6', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#888' }}>Total amount</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0F6E56' }}>₹{total.toFixed(2)}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Delivery address</label>
              <input className="form-input" placeholder="Full delivery address"
                value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Special instructions (optional)</label>
              <input className="form-input" placeholder="Any packaging or delivery notes"
                value={form.special_instructions}
                onChange={e => set('special_instructions', e.target.value)} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Placing order…' : `Place order — ₹${total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OrdersPanel({ orders, onStatusChange }) {
  const STATUS_COLOR = {
    pending: '#BA7517', confirmed: '#1D9E75',
    dispatched: '#378ADD', delivered: '#639922', cancelled: '#E24B4A',
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header"><h3>📋 Incoming orders</h3></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th><th>Product</th><th>Buyer</th><th>City</th>
              <th>Qty</th><th>Amount</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td><code style={{ background: '#f0f0ec', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{o.order_short_id}</code></td>
                <td style={{ fontSize: 13 }}>{o.product_name}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{o.buyer_name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{o.buyer_type}</div>
                </td>
                <td>{o.buyer_city}</td>
                <td>{o.quantity}</td>
                <td><strong>₹{parseFloat(o.total_amount).toFixed(0)}</strong></td>
                <td>
                  <span style={{
                    padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: STATUS_COLOR[o.status] + '22',
                    color: STATUS_COLOR[o.status],
                    textTransform: 'capitalize',
                  }}>
                    {o.status}
                  </span>
                </td>
                <td>
                  {o.status === 'pending' && (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => onStatusChange(o.id, 'confirmed')}>
                      Confirm
                    </button>
                  )}
                  {o.status === 'confirmed' && (
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => onStatusChange(o.id, 'dispatched')}>
                      Dispatch
                    </button>
                  )}
                  {o.status === 'dispatched' && (
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => onStatusChange(o.id, 'delivered')}>
                      Delivered
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: '#888' }}>
                No orders yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function MarketLinkage() {
  const { isManager } = useAuth()
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [orderModal, setOrderModal] = useState(null)
  const [activeTab, setActiveTab] = useState('catalogue')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    const calls = [marketAPI.publicListings()]
    if (isManager) {
      calls.push(marketAPI.orders())
      calls.push(
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/market/dashboard/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        }).then(r => r.json())
      )
    }
    Promise.all(calls).then(([l, o, d]) => {
      setListings(l.data || [])
      if (o) setOrders(o.data || [])
      if (d) setDashboard(d)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [isManager])

  const handleStatusChange = async (orderId, newStatus) => {
    await marketAPI.updateOrder(orderId, { status: newStatus })
    load()
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Market Linkage</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Connect cooperative products to institutional buyers with traceability proof
          </p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
            + New listing
          </button>
        )}
      </div>

      {isManager && dashboard && (
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="lbl">Active listings</div>
            <div className="val">{dashboard.total_listings}</div>
          </div>
          <div className="stat-card blue">
            <div className="lbl">Total orders</div>
            <div className="val">{dashboard.total_orders}</div>
          </div>
          <div className="stat-card amber">
            <div className="lbl">Pending orders</div>
            <div className="val">{dashboard.pending_orders}</div>
          </div>
          <div className="stat-card green">
            <div className="lbl">Revenue</div>
            <div className="val">₹{dashboard.total_revenue?.toFixed(0)}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '2px solid #e8e6df' }}>
        {['catalogue', 'orders'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 14, fontWeight: 500,
              color: activeTab === tab ? '#0F6E56' : '#888',
              borderBottom: activeTab === tab ? '2px solid #0F6E56' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {tab === 'catalogue' ? '🏪 Product Catalogue' : '📋 Orders'}
          </button>
        ))}
      </div>

      {activeTab === 'catalogue' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
          {listings.map(l => (
            <div key={l.id} className="card">
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 28 }}>{PRODUCT_ICONS[l.product_type] || '📦'}</div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginTop: 6 }}>{l.product_name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {l.cooperative} · {l.district}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0F6E56' }}>
                      ₹{parseFloat(l.price_per_unit).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>per {l.unit}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#555', marginBottom: 10, lineHeight: 1.5 }}>
                  {l.description}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ background: '#f0f0ec', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                    {l.quantity_available} {l.unit} available
                  </span>
                  <span style={{ background: '#f0f0ec', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                    Min: {l.minimum_order} {l.unit}
                  </span>
                  {l.certifications && (
                    <span style={{ background: '#e1f5ee', color: '#0F6E56', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                      ✓ {l.certifications}
                    </span>
                  )}
                </div>

                {l.batch_short_id && (
                  <div style={{ background: '#e8f4fd', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#185FA5' }}>
                    🔗 Traceability: Batch {l.batch_short_id} — scan QR to verify farm origin
                  </div>
                )}

                <button className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setOrderModal(l)}>
                  Place order
                </button>
              </div>
            </div>
          ))}
          {listings.length === 0 && (
            <div className="empty" style={{ gridColumn: '1/-1' }}>
              <div className="icon">🏪</div>
              <p>No products listed yet.{isManager ? ' Click "+ New listing" to publish your first product.' : ''}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && isManager && (
        <OrdersPanel orders={orders} onStatusChange={handleStatusChange} />
      )}

      {activeTab === 'orders' && !isManager && (
        <div className="empty">
          <div className="icon">🔒</div>
          <p>Order management is available for cooperative managers only.</p>
        </div>
      )}

      {createModal && <CreateListingModal onClose={() => setCreateModal(false)} onSaved={load} />}
      {orderModal && <OrderModal listing={orderModal} onClose={() => setOrderModal(null)} onSaved={load} />}
    </div>
  )
}
