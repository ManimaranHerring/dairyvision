import { useEffect, useRef, useState } from 'react'

export default function MapPicker({ lat, lng, onSelect }) {
  const mapRef    = useRef(null)
  const markerRef = useRef(null)
  const mapObjRef = useRef(null)
  const [coords, setCoords] = useState({
    lat: lat || 9.9252,
    lng: lng || 78.1198,
  })

  useEffect(() => {
    if (mapObjRef.current) return
    // Dynamically load Leaflet
    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 13)
    mapObjRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Satellite layer option
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri World Imagery', maxZoom: 19 }
    )

    const baseMaps = {
      'Street map': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }),
      'Satellite': satellite,
    }
    L.control.layers(baseMaps).addTo(map)

    // Custom icon
    const icon = L.divIcon({
      html: '<div style="background:#0F6E56;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: '',
    })

    // Initial marker
    const marker = L.marker([coords.lat, coords.lng], {
      draggable: true,
      icon,
    }).addTo(map)
    markerRef.current = marker

    marker.bindPopup('<b>Farm location</b><br>Drag to adjust').openPopup()

    // Click to move marker
    map.on('click', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng
      marker.setLatLng([newLat, newLng])
      const rounded = {
        lat: parseFloat(newLat.toFixed(6)),
        lng: parseFloat(newLng.toFixed(6)),
      }
      setCoords(rounded)
      onSelect(rounded)
    })

    // Drag marker
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      const rounded = {
        lat: parseFloat(pos.lat.toFixed(6)),
        lng: parseFloat(pos.lng.toFixed(6)),
      }
      setCoords(rounded)
      onSelect(rounded)
    })

    return () => {
      map.remove()
      mapObjRef.current = null
    }
  }, [])

  const locateMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const newCoords = {
        lat: parseFloat(pos.coords.latitude.toFixed(6)),
        lng: parseFloat(pos.coords.longitude.toFixed(6)),
      }
      setCoords(newCoords)
      onSelect(newCoords)
      if (mapObjRef.current && markerRef.current) {
        mapObjRef.current.setView([newCoords.lat, newCoords.lng], 15)
        markerRef.current.setLatLng([newCoords.lat, newCoords.lng])
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#888' }}>
          Click on the map or drag the marker to select farm location
        </div>
        <button
          type="button"
          onClick={locateMe}
          style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid #0F6E56',
            background: '#e1f5ee', color: '#0F6E56', fontSize: 12,
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          My location
        </button>
      </div>

      <div
        ref={mapRef}
        style={{
          height: 300, borderRadius: 10, border: '2px solid #e8e6df',
          overflow: 'hidden', marginBottom: 10,
        }}
      />

      <div style={{
        display: 'flex', gap: 10, background: '#f9f8f5',
        borderRadius: 8, padding: '10px 14px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#888' }}>Latitude</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0F6E56', fontFamily: 'monospace' }}>
            {coords.lat}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#888' }}>Longitude</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0F6E56', fontFamily: 'monospace' }}>
            {coords.lng}
          </div>
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 11, color: '#888' }}>Switch to satellite view</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
            Use the layer button on the map top-right
          </div>
        </div>
      </div>
    </div>
  )
}
