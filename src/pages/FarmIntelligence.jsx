import { useState, useEffect } from 'react'
import { agriAPI, farmersAPI } from '../api/index.js'
import SatelliteImagery from '../components/SatelliteImagery.jsx'

const STATUS_COLOR = {
  sufficient: '#1E8449', moderate: '#BA7517', deficient: '#A93226',
  well_watered: '#1A5276', adequate: '#1D9E75', low: '#BA7517', dry: '#A93226',
  high: '#1E8449', clean: '#1E8449', elevated: '#A93226',
  normal: '#1E8449', slightly_elevated: '#BA7517',
  good: '#1E8449', unknown: '#888888',
}

const STATUS_LABEL = {
  sufficient: 'Sufficient', moderate: 'Moderate', deficient: 'Deficient',
  well_watered: 'Well Watered', adequate: 'Adequate', low: 'Low', dry: 'Dry',
  high: 'High', clean: 'Clean', elevated: 'Elevated',
  normal: 'Normal', slightly_elevated: 'Slightly Elevated',
  good: 'Good', unknown: 'No data',
}

function StatusBadge({ status, label }) {
  const color = STATUS_COLOR[status] || STATUS_COLOR.unknown
  const text  = label || STATUS_LABEL[status] || status
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: color + '22', color,
    }}>{text}</span>
  )
}

function IndexCard({ label, value, unit, description, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '14px 16px',
      border: '1px solid #e8e6df', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#0F6E56' }}>
        {value !== null && value !== undefined ? value : '--'}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2833', marginTop: 2 }}>{label}</div>
      {description && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{description}</div>}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle, source }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{icon} {title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {source && (
        <span style={{ fontSize: 11, background: '#e1f5ee', color: '#0F6E56', borderRadius: 12, padding: '2px 8px' }}>
          {source}
        </span>
      )}
    </div>
  )
}

function VegetationSection({ data }) {
  if (!data) return null
  const props = data.properties || {}
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 18px' }}>
        <SectionHeader
          icon="🌿" title="Vegetation Analysis"
          subtitle="Crop and plant identification from spectral signature"
          source={data.source}
        />
        <div style={{
          background: '#e1f5ee', borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          border: '1px solid #9FE1CB',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0F6E56', marginBottom: 4 }}>
            {data.vegetation_type}
          </div>
          <div style={{ fontSize: 13, color: '#2E4057', marginBottom: 6 }}>
            {props.description}
          </div>
          {props.likely_species && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              <strong>Likely species:</strong> {props.likely_species}
            </div>
          )}
          {props.protein_content && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              <strong>Protein content:</strong> {props.protein_content}
            </div>
          )}
          {props.grazing_suitability && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              <strong>Grazing suitability:</strong> {props.grazing_suitability}
            </div>
          )}
          {props.grazing_days_estimate && (
            <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>
              {props.grazing_days_estimate}
            </div>
          )}
          {props.recommendation && (
            <div style={{ fontSize: 12, color: '#BA7517', marginTop: 4 }}>
              {props.recommendation}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: '#888' }}>Canopy cover</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0F6E56', marginTop: 2 }}>{data.canopy_cover}</div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: '#888' }}>Growth stage</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1A5276', marginTop: 2 }}>{data.growth_stage}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <IndexCard label="NDVI" value={data.ndvi} description="Vegetation health" color="#0F6E56" />
          <IndexCard label="NDRE" value={data.ndre} description="Nitrogen content" color="#1A5276" />
          <IndexCard label="NDWI" value={data.ndwi} description="Water content" color="#1D9E75" />
          <IndexCard label="SAVI" value={data.savi} description="Soil-adj. veg." color="#6C3483" />
        </div>
      </div>
    </div>
  )
}

function SoilSection({ data }) {
  if (!data) return null
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 18px' }}>
        <SectionHeader
          icon="🌍" title="Soil Health Analysis"
          subtitle="Nutrient and moisture status from Sentinel-2 spectral bands"
          source={data.source}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Nitrogen status</div>
            <StatusBadge status={data.nitrogen_status} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>NDRE: {data.ndre}</div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Soil moisture</div>
            <StatusBadge status={data.moisture_status} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>NDWI: {data.ndwi}</div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Organic carbon</div>
            <StatusBadge status={data.organic_carbon} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>BSI: {data.bsi}</div>
          </div>
        </div>
        <div style={{ background: '#e1f5ee', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#0F6E56' }}>Overall Soil Health Score</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              Based on nitrogen, moisture, and organic carbon indices
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0F6E56' }}>
            {data.soil_health_score}
            <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/100</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 12 }}>
          <IndexCard label="EVI" value={data.evi} description="Enhanced veg. index" color="#1E8449" />
          <IndexCard label="BSI" value={data.bsi} description="Bare soil index" color="#7D6608" />
        </div>
      </div>
    </div>
  )
}

function AtmosphereSection({ data }) {
  if (!data) return null
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 18px' }}>
        <SectionHeader
          icon="💨" title="Atmospheric Analysis"
          subtitle="Carbon and air quality from Sentinel-5P satellite"
          source={data.source}
        />
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Overall air quality</span>
            <StatusBadge status={data.air_quality} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Carbon Monoxide (CO)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLOR[data.co_status] || '#888' }}>
              {data.co_mol_m2 ? (data.co_mol_m2 * 1000).toFixed(3) : '--'}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>mol/m2 x 10-3</div>
            <div style={{ marginTop: 6 }}><StatusBadge status={data.co_status} /></div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Methane (CH4)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLOR[data.ch4_status] || '#888' }}>
              {data.ch4_ppb || '--'}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>ppb (dry air)</div>
            <div style={{ marginTop: 6 }}><StatusBadge status={data.ch4_status} /></div>
          </div>
          <div style={{ background: '#f9f8f5', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid #e8e6df' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Nitrogen Dioxide (NO2)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A5276' }}>
              {data.no2_mol_m2 ? (data.no2_mol_m2 * 1e6).toFixed(2) : '--'}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>umol/m2</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, background: '#D6EAF8', color: '#1A5276', borderRadius: 12, padding: '2px 8px' }}>
                Soil activity indicator
              </span>
            </div>
          </div>
        </div>
        <div style={{ background: '#FEF9E7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7D6608', border: '1px solid #F9E79F' }}>
          <strong>Note for livestock:</strong> CH4 levels above 1900 ppb may indicate higher methane
          emission from cattle — relevant for carbon footprint calculations under NABARD sustainability schemes.
        </div>
      </div>
    </div>
  )
}

function WeatherSection({ data }) {
  if (!data) return null
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 18px' }}>
        <SectionHeader icon="🌤" title="Weather Data" subtitle="Open-Meteo forecast for farm location" source="Open-Meteo" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <IndexCard label="Rainfall today" value={data.rainfall_mm} unit="mm" description="Precipitation" color="#1A5276" />
          <IndexCard label="Max temperature" value={data.temp_max} unit="°C" description="Today forecast" color="#BA7517" />
        </div>
      </div>
    </div>
  )
}

export default function FarmIntelligence() {
  const [farms, setFarms]         = useState([])
  const [selected, setSelected]   = useState(null)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [farmsLoading, setFarmsLoading] = useState(true)

  useEffect(() => {
    farmersAPI.farms()
      .then(r => {
        const withGPS = r.data.filter(f => f.latitude && f.longitude)
        setFarms(withGPS)
        if (withGPS.length > 0) setSelected(withGPS[0].id)
      })
      .finally(() => setFarmsLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setData(null)
    setLoading(true)
    agriAPI.farmIntelligence(selected)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selected])

  if (farmsLoading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page-body">
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
          Full satellite analysis — vegetation identification, soil nutrients, atmospheric carbon, satellite imagery and weather
        </p>

        {farms.length === 0 ? (
          <div className="empty">
            <div className="icon">🛰️</div>
            <p>No farms with GPS coordinates found. Add GPS coordinates to your farms first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {farms.map(f => (
              <button key={f.id} onClick={() => setSelected(f.id)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: '2px solid',
                  borderColor: selected === f.id ? '#0F6E56' : '#e8e6df',
                  background: selected === f.id ? '#e1f5ee' : 'white',
                  color: selected === f.id ? '#0F6E56' : '#555',
                  cursor: 'pointer', fontSize: 13,
                  fontWeight: selected === f.id ? 600 : 400,
                }}>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: '#888' }}>
            Fetching satellite data from Sentinel-2 and Sentinel-5P...
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
            This may take 20-30 seconds for real satellite data
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Farm header */}
          <div style={{
            background: 'linear-gradient(135deg, #0F6E56, #1A5276)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: 'white',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {data.farm_name}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
              {data.farmer} · {data.crop_type}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Latitude</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {data.location?.lat?.toFixed(4)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Longitude</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {data.location?.lng?.toFixed(4)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>NDVI</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {typeof data.ndvi === 'number' ? data.ndvi.toFixed(3) : '--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Data sources</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sentinel-2 + Sentinel-5P</div>
              </div>
            </div>
          </div>

          {/* Satellite imagery */}
          <SatelliteImagery
            lat={data.location?.lat}
            lng={data.location?.lng}
            farmName={data.farm_name}
          />

          {/* Analysis sections */}
          <VegetationSection data={data.vegetation} />
          <SoilSection data={data.soil} />
          <AtmosphereSection data={data.atmosphere} />
          <WeatherSection data={data.weather} />

          <div style={{ background: '#f9f8f5', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#888', marginBottom: 16 }}>
            Data from European Space Agency Sentinel-2 (10m resolution, vegetation and soil)
            and Sentinel-5P (atmospheric carbon and air quality).
            Satellite imagery from Esri World Imagery.
            Weather from Open-Meteo API. Updated every 5 days.
          </div>
        </>
      )}

      {!loading && !data && selected && (
        <div className="empty">
          <div className="icon">🛰️</div>
          <p>Select a farm above to view full satellite intelligence.</p>
        </div>
      )}
    </div>
  )
}
