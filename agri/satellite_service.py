import ee
import requests
from datetime import date, timedelta
from decimal import Decimal
import os
import random

# ── Initialise Earth Engine with service account ──────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_FILE  = os.path.join(BASE_DIR, 'gee_key.json')
SA_EMAIL  = 'dairyvision-ee@dairyvision-ndvi.iam.gserviceaccount.com'

_ee_ready = False

def _init_ee():
    global _ee_ready
    if _ee_ready:
        return True
    try:
        credentials = ee.ServiceAccountCredentials(SA_EMAIL, KEY_FILE)
        ee.Initialize(credentials)
        _ee_ready = True
        return True
    except Exception as ex:
        print(f'[EE] Init failed: {ex}')
        return False


# ── Real NDVI from Sentinel-2 ─────────────────────────────────
def get_real_ndvi(lat, lng):
    """
    Fetches median NDVI from Sentinel-2 SR for a 500m buffer
    around the given coordinates over the last 30 days.
    Returns float NDVI value or None if failed.
    """
    if not _init_ee():
        return None
    try:
        point    = ee.Geometry.Point([float(lng), float(lat)])
        region   = point.buffer(500)
        end      = date.today()
        start    = end - timedelta(days=30)

        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region)
                .filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B8', 'B4']))

        count = s2.size().getInfo()
        if count == 0:
            print(f'[EE] No cloud-free images for {lat},{lng} — using simulated')
            return None

        median = s2.median()
        nir    = median.select('B8')
        red    = median.select('B4')
        ndvi_img = nir.subtract(red).divide(nir.add(red)).rename('NDVI')

        stats = ndvi_img.reduceRegion(
            reducer  = ee.Reducer.mean(),
            geometry = region,
            scale    = 10,
            maxPixels= 1e9,
        )
        val = stats.getInfo().get('NDVI')
        if val is None:
            return None
        return round(float(val), 3)

    except Exception as ex:
        print(f'[EE] NDVI fetch failed: {ex}')
        return None


# ── Fallback simulated NDVI (used when EE unavailable) ────────
def get_simulated_ndvi(farm):
    base = {
        'sorghum': 0.45, 'maize': 0.50, 'napier': 0.55,
        'paddy': 0.60, 'sugarcane': 0.65, 'cotton': 0.40,
        'groundnut': 0.38, 'other': 0.42,
    }.get(farm.crop_type, 0.42)
    month = date.today().month
    seasonal = {
        7: 0.10, 8: 0.10, 9: 0.08, 10: 0.06,
        11: 0.04, 12: 0.03, 1: 0.02, 2: 0.02,
        3: -0.08, 4: -0.06, 5: -0.10, 6: -0.04,
    }.get(month, 0)
    ndvi = base + seasonal + random.uniform(-0.07, 0.07)
    return round(max(0.05, min(0.80, ndvi)), 3)


# ── Main NDVI fetch (real first, fallback to simulated) ────────
def get_ndvi_for_farm(farm):
    if not farm.latitude or not farm.longitude:
        return None
    ndvi = get_real_ndvi(farm.latitude, farm.longitude)
    if ndvi is None:
        print(f'[EE] Using simulated NDVI for {farm.name}')
        ndvi = get_simulated_ndvi(farm)
    return ndvi


# ── Weather from Open-Meteo (free, no API key) ────────────────
def get_weather(lat, lng):
    try:
        r = requests.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': float(lat), 'longitude': float(lng),
                'daily': 'precipitation_sum,temperature_2m_max',
                'timezone': 'Asia/Kolkata',
                'past_days': 1, 'forecast_days': 3,
            },
            timeout=8,
        )
        if r.status_code == 200:
            d = r.json().get('daily', {})
            return {
                'rainfall_mm': d.get('precipitation_sum', [0, 0])[1] or 0,
                'temp_max':    d.get('temperature_2m_max', [32, 32])[1] or 32,
            }
    except Exception:
        pass
    return {'rainfall_mm': 0, 'temp_max': 32}


# ── Refresh all farms ─────────────────────────────────────────
def refresh_all_farms():
    from farmers.models import Farm
    from .models import NDVIReading, CropAlert
    today   = date.today()
    results = []

    for farm in Farm.objects.exclude(latitude=None).exclude(longitude=None):
        ndvi = get_ndvi_for_farm(farm)
        if ndvi is None:
            continue

        weather = get_weather(farm.latitude, farm.longitude)
        health  = NDVIReading.get_health_from_ndvi(ndvi)

        NDVIReading.objects.update_or_create(
            farm=farm, reading_date=today,
            defaults={
                'ndvi_value':    Decimal(str(ndvi)),
                'health_status': health,
                'rainfall_mm':   weather['rainfall_mm'],
                'temperature_c': weather['temp_max'],
            },
        )

        if health in ['stressed', 'critical']:
            CropAlert.objects.get_or_create(
                farm=farm, is_resolved=False,
                defaults={
                    'alert_type': 'stress',
                    'severity':   'high' if health == 'critical' else 'medium',
                    'message_en': (
                        f"Crop stress on '{farm.name}'. "
                        f"NDVI={ndvi:.2f} from Sentinel-2. "
                        f"Irrigate immediately."
                    ),
                    'message_ta': (
                        f"'{farm.name}' நிலத்தில் மன அழுத்தம். "
                        f"NDVI={ndvi:.2f}. நீர்ப்பாசனம் தேவை."
                    ),
                },
            )

        source = 'Sentinel-2' if _ee_ready else 'Simulated'
        results.append({
            'farm':   farm.name,
            'ndvi':   ndvi,
            'health': health,
            'source': source,
        })
        print(f'[EE] {farm.name}: NDVI={ndvi:.3f} ({health}) [{source}]')

    return results