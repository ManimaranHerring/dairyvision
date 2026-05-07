import { useState, useEffect } from 'react'

// Uses free Esri World Imagery static tiles
// No API key needed

export default function SatelliteImagery({ lat, lng, farmName, zoom = 16 }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [mapUrl, setMapUrl]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!lat || !lng) return
    setLoading(true)

    // Esri World Imagery — completely free, no API key
    const w = 640, h = 400
    const esriUrl = `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${
      lng-0.003},${lat-0.002},${lng+0.003},${lat+0.002
    }&bboxSR=4326&imageSR=4326&size=${w},${h}&format=png&transparent=false&f=image`

    // OpenStreetMap tile for street map view
    const osmTileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
    const osmTileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) +
      1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))

    setImageUrl(esriUrl)
    setMapUrl(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`)
    setLoading(false)
  }, [lat, lng, zoom])

  if (!lat || !lng) return null

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>🛰️ Satellite View</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Esri World Imagery — {farmName}
            </div>
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid #0F6E56',
              background: '#e1f5ee', color: '#0F6E56', fontSize: 12,
              cursor: 'pointer', fontWeight: 500, textDecoration: 'none',
            }}
          >
            Open in Maps ↗
          </a>
        </div>

        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e6df' }}>
          {loading && (
            <div style={{
              height: 320, background: '#f0f0ec',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div className="spinner" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={`Satellite view of ${farmName}`}
            style={{
              width: '100%', height: 320,
              objectFit: 'cover', display: loading ? 'none' : 'block',
            }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          {/* Farm marker overlay */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 20, height: 20, background: '#0F6E56',
              borderRadius: '50%', border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }} />
            <div style={{
              position: 'absolute', top: 24, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15,110,86,0.9)', color: 'white',
              padding: '3px 8px', borderRadius: 6, fontSize: 11,
              whiteSpace: 'nowrap', fontWeight: 600,
            }}>
              {farmName}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 8, marginTop: 10,
        }}>
          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Latitude</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#0F6E56' }}>
              {parseFloat(lat).toFixed(4)}° N
            </div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Longitude</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#0F6E56' }}>
              {parseFloat(lng).toFixed(4)}° E
            </div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Image source</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A5276' }}>
              Esri World Imagery
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: '#888', textAlign: 'center' }}>
          High-resolution satellite imagery. Green dot marks the registered farm location.
        </div>
      </div>
    </div>
  )
}
