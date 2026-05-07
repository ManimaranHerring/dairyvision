import ee
import requests
from datetime import date, timedelta
from decimal import Decimal
import os
import random

# ── Earth Engine init ─────────────────────────────────────────
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


# ── MSG91 SMS ─────────────────────────────────────────────────
MSG91_AUTH_KEY    = os.getenv('MSG91_AUTH_KEY', '')
MSG91_SENDER_ID   = os.getenv('MSG91_SENDER_ID', 'DVISION')
MSG91_TEMPLATE_EN = os.getenv('MSG91_TEMPLATE_EN', '')
MSG91_TEMPLATE_TA = os.getenv('MSG91_TEMPLATE_TA', '')


def send_sms(phone, message):
    if not MSG91_AUTH_KEY:
        print(f'[SMS] No auth key — skipping SMS to {phone}')
        return False
    try:
        mobile = '91' + str(phone).strip()
        r = requests.post(
            'https://api.msg91.com/api/v5/flow/',
            json={
                'template_id': MSG91_TEMPLATE_EN,
                'short_url': '0',
                'recipients': [{'mobiles': mobile}],
            },
            headers={'authkey': MSG91_AUTH_KEY, 'content-type': 'application/json'},
            timeout=10,
        )
        result = r.json()
        if result.get('type') == 'success':
            print(f'[SMS] Sent to {phone}')
            return True
        print(f'[SMS] Failed: {result}')
        return False
    except Exception as ex:
        print(f'[SMS] Error: {ex}')
        return False


def send_stress_sms(farmer, farm_name, ndvi, health):
    phone = farmer.phone
    en_msg = (f"DairyVision Alert: Crop stress on {farm_name}. "
              f"NDVI={ndvi:.2f} ({health}). Irrigate immediately. -NABARD MABIF Madurai")
    ta_msg = (f"DairyVision: {farm_name} ndvi={ndvi:.2f}. "
              f"Irrigate immediately. -NABARD MABIF")
    print(f'[SMS] Stress alert to {phone}: {en_msg}')
    return send_sms(phone, en_msg)


# ── Real NDVI from Sentinel-2 ─────────────────────────────────
def get_real_ndvi(lat, lng):
    if not _init_ee():
        return None
    try:
        point  = ee.Geometry.Point([float(lng), float(lat)])
        region = point.buffer(500)
        end    = date.today()
        start  = end - timedelta(days=30)
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region)
                .filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B8', 'B4']))
        if s2.size().getInfo() == 0:
            return None
        median   = s2.median()
        ndvi_img = median.select('B8').subtract(median.select('B4')).divide(
                   median.select('B8').add(median.select('B4'))).rename('NDVI')
        stats = ndvi_img.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9)
        val = stats.getInfo().get('NDVI')
        return round(float(val), 3) if val is not None else None
    except Exception as ex:
        print(f'[EE] NDVI fetch failed: {ex}')
        return None


# ── Simulated NDVI fallback ───────────────────────────────────
def get_simulated_ndvi(farm):
    base = {
        'sorghum':0.45,'maize':0.50,'napier':0.55,'paddy':0.60,
        'sugarcane':0.65,'cotton':0.40,'groundnut':0.38,'other':0.42,
    }.get(farm.crop_type, 0.42)
    month = date.today().month
    seasonal = {
        7:0.10,8:0.10,9:0.08,10:0.06,11:0.04,12:0.03,
        1:0.02,2:0.02,3:-0.08,4:-0.06,5:-0.10,6:-0.04,
    }.get(month, 0)
    return round(max(0.05, min(0.80, base + seasonal + random.uniform(-0.07, 0.07))), 3)


def get_ndvi_for_farm(farm):
    if not farm.latitude or not farm.longitude:
        return None
    ndvi = get_real_ndvi(farm.latitude, farm.longitude)
    if ndvi is None:
        ndvi = get_simulated_ndvi(farm)
    return ndvi


# ── Weather from Open-Meteo ───────────────────────────────────
def get_weather(lat, lng):
    try:
        r = requests.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': float(lat), 'longitude': float(lng),
                'daily': 'precipitation_sum,temperature_2m_max',
                'timezone': 'Asia/Kolkata', 'past_days': 1, 'forecast_days': 3,
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


# ── Refresh all farms + SMS alerts ───────────────────────────
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
            alert, created = CropAlert.objects.get_or_create(
                farm=farm, is_resolved=False,
                defaults={
                    'alert_type': 'stress',
                    'severity':   'high' if health == 'critical' else 'medium',
                    'message_en': f"Crop stress on '{farm.name}'. NDVI={ndvi:.2f}. Irrigate immediately.",
                    'message_ta': f"'{farm.name}' ndvi={ndvi:.2f}. Irrigate immediately.",
                },
            )
            if created:
                send_stress_sms(farm.farmer, farm.name, ndvi, health)
        source = 'Sentinel-2' if _ee_ready else 'Simulated'
        results.append({'farm': farm.name, 'ndvi': ndvi, 'health': health, 'source': source})
        print(f'[EE] {farm.name}: NDVI={ndvi:.3f} ({health}) [{source}]')
    return results


# ── Pasture NDVI ──────────────────────────────────────────────
def get_pasture_ndvi(lat, lng, area_acres=None):
    if not _init_ee():
        return get_simulated_pasture_ndvi()
    try:
        point    = ee.Geometry.Point([float(lng), float(lat)])
        buffer_m = max(500, int((float(area_acres or 2) * 4047) ** 0.5) * 2) if area_acres else 800
        region   = point.buffer(buffer_m)
        end      = date.today()
        start    = end - timedelta(days=30)
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region)
                .filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B8', 'B4']))
        if s2.size().getInfo() == 0:
            return get_simulated_pasture_ndvi()
        median   = s2.median()
        ndvi_img = median.select('B8').subtract(median.select('B4')).divide(
                   median.select('B8').add(median.select('B4'))).rename('NDVI')
        stats    = ndvi_img.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9)
        val = stats.getInfo().get('NDVI')
        return round(float(val), 3) if val is not None else get_simulated_pasture_ndvi()
    except Exception as ex:
        print(f'[EE] Pasture NDVI failed: {ex}')
        return get_simulated_pasture_ndvi()


def get_simulated_pasture_ndvi():
    month    = date.today().month
    base     = 0.45
    seasonal = {
        7:0.15,8:0.12,9:0.10,10:0.05,11:0.02,12:0.00,
        1:-0.02,2:-0.03,3:-0.10,4:-0.12,5:-0.15,6:-0.05,
    }.get(month, 0)
    return round(max(0.05, min(0.75, base + seasonal + random.uniform(-0.05, 0.05))), 3)


def classify_pasture_health(ndvi):
    if ndvi >= 0.45: return 'abundant',  'Grass is abundant — good for grazing'
    if ndvi >= 0.30: return 'adequate',  'Grass is adequate — monitor closely'
    if ndvi >= 0.18: return 'depleted',  'Grass depleting — consider rotation'
    return 'exhausted', 'Pasture exhausted — move cattle immediately'


# ── Sentinel-5P Atmospheric Carbon Data ──────────────────────
def get_atmospheric_data(lat, lng):
    if not _init_ee():
        return get_simulated_atmospheric_data()
    try:
        point  = ee.Geometry.Point([float(lng), float(lat)])
        region = point.buffer(5000)
        end    = date.today()
        start  = end - timedelta(days=15)

        co = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
                .filterBounds(region).filterDate(str(start), str(end))
                .select('CO_column_number_density').mean())
        ch4 = (ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
                 .filterBounds(region).filterDate(str(start), str(end))
                 .select('CH4_column_volume_mixing_ratio_dry_air').mean())
        no2 = (ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
                 .filterBounds(region).filterDate(str(start), str(end))
                 .select('NO2_column_number_density').mean())

        stats   = ee.Image.cat([co, ch4, no2]).reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=1000, maxPixels=1e9
        ).getInfo()

        co_val  = stats.get('CO_column_number_density')
        ch4_val = stats.get('CH4_column_volume_mixing_ratio_dry_air')
        no2_val = stats.get('NO2_column_number_density')

        return {
            'co_mol_m2':   round(float(co_val), 6)  if co_val  else None,
            'ch4_ppb':     round(float(ch4_val), 1) if ch4_val else None,
            'no2_mol_m2':  round(float(no2_val), 8) if no2_val else None,
            'co_status':   'clean' if co_val and co_val < 0.03 else 'elevated',
            'ch4_status':  'normal' if ch4_val and ch4_val < 1880 else 'elevated',
            'air_quality': 'good' if co_val and co_val < 0.03 else 'moderate',
            'source': 'Sentinel-5P',
        }
    except Exception as ex:
        print(f'[EE] Atmospheric data failed: {ex}')
        return get_simulated_atmospheric_data()


def get_simulated_atmospheric_data():
    return {
        'co_mol_m2':   round(random.uniform(0.018, 0.035), 6),
        'ch4_ppb':     round(random.uniform(1840, 1890), 1),
        'no2_mol_m2':  round(random.uniform(0.00002, 0.00008), 8),
        'co_status':   'clean',
        'ch4_status':  'normal',
        'air_quality': 'good',
        'source': 'Simulated',
    }


# ── Soil Nutrients from Sentinel-2 ───────────────────────────
def get_soil_data(lat, lng):
    if not _init_ee():
        return get_simulated_soil_data()
    try:
        point  = ee.Geometry.Point([float(lng), float(lat)])
        region = point.buffer(300)
        end    = date.today()
        start  = end - timedelta(days=30)
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region).filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B4','B5','B6','B7','B8','B11','B12']))
        if s2.size().getInfo() == 0:
            return get_simulated_soil_data()
        median = s2.median()

        bsi  = median.expression(
            '(SWIR + RED - NIR) / (SWIR + RED + NIR)',
            {'SWIR': median.select('B11'), 'RED': median.select('B4'), 'NIR': median.select('B8')}
        ).rename('BSI')
        ndre = median.normalizedDifference(['B7', 'B5']).rename('NDRE')
        ndwi = median.normalizedDifference(['B8', 'B11']).rename('NDWI')
        evi  = median.expression(
            '2.5 * (NIR - RED) / (NIR + 6 * RED + 1)',
            {'NIR': median.select('B8'), 'RED': median.select('B4')}
        ).rename('EVI')

        stats = ee.Image.cat([bsi, ndre, ndwi, evi]).reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9
        ).getInfo()

        bsi_v  = stats.get('BSI')
        ndre_v = stats.get('NDRE')
        ndwi_v = stats.get('NDWI')
        evi_v  = stats.get('EVI')

        def n_status(v):
            if v is None: return 'unknown'
            return 'sufficient' if v > 0.35 else ('moderate' if v > 0.20 else 'deficient')

        def m_status(v):
            if v is None: return 'unknown'
            return 'well_watered' if v > 0.30 else ('adequate' if v > 0.10 else ('low' if v > -0.10 else 'dry'))

        def oc_status(v):
            if v is None: return 'unknown'
            return 'high' if v < 0.0 else ('moderate' if v < 0.1 else 'low')

        return {
            'bsi':  round(float(bsi_v), 3)  if bsi_v  else None,
            'ndre': round(float(ndre_v), 3) if ndre_v else None,
            'ndwi': round(float(ndwi_v), 3) if ndwi_v else None,
            'evi':  round(float(evi_v), 3)  if evi_v  else None,
            'nitrogen_status': n_status(ndre_v),
            'moisture_status': m_status(ndwi_v),
            'organic_carbon':  oc_status(bsi_v),
            'soil_health_score': round(
                ((ndre_v or 0.25)*40 + (ndwi_v or 0.1)*30 + max(0,-(bsi_v or 0))*30), 1),
            'source': 'Sentinel-2',
        }
    except Exception as ex:
        print(f'[EE] Soil data failed: {ex}')
        return get_simulated_soil_data()


def get_simulated_soil_data():
    ndre = round(random.uniform(0.18, 0.42), 3)
    ndwi = round(random.uniform(-0.05, 0.35), 3)
    bsi  = round(random.uniform(-0.08, 0.15), 3)
    return {
        'bsi': bsi, 'ndre': ndre, 'ndwi': ndwi,
        'evi': round(random.uniform(0.15, 0.55), 3),
        'nitrogen_status': 'sufficient' if ndre > 0.30 else 'moderate',
        'moisture_status': 'adequate'   if ndwi > 0.10 else 'low',
        'organic_carbon':  'moderate',
        'soil_health_score': round(ndre*40 + ndwi*30 + max(0,-bsi)*30, 1),
        'source': 'Simulated',
    }


# ── Vegetation Identification ────────────────────────────────
def classify_vegetation_type(ndvi, ndre, ndwi, savi):
    if ndvi < 0.1:
        return 'Bare soil / Fallow', {
            'description': 'No significant vegetation cover detected',
            'recommendation': 'Consider cover cropping or mulching',
            'grazing_suitability': 'Poor',
        }
    elif ndvi > 0.6 and ndwi > 0.2:
        return 'Dense paddy / Irrigated crop', {
            'description': 'Dense irrigated vegetation with high water content',
            'likely_species': 'Oryza sativa (Paddy) or Sugarcane',
            'chlorophyll': 'High',
            'grazing_suitability': 'Not suitable — active crop',
        }
    elif ndvi > 0.5 and ndre > 0.3:
        return 'Healthy fodder grass / Napier', {
            'description': 'Dense grass with high nitrogen content',
            'likely_species': 'Napier grass (Pennisetum purpureum) or Sorghum',
            'protein_content': 'High (14-18% estimated)',
            'grazing_suitability': 'Excellent',
            'grazing_days_estimate': 'Can support grazing for 8-12 days',
        }
    elif ndvi > 0.35 and ndre > 0.2:
        return 'Moderate vegetation / Mixed crop', {
            'description': 'Moderate vegetation density — mixed species',
            'likely_species': 'Maize, Sorghum, or mixed grassland',
            'protein_content': 'Moderate (8-12% estimated)',
            'grazing_suitability': 'Good',
            'grazing_days_estimate': 'Can support grazing for 4-6 days',
        }
    elif ndvi > 0.2:
        return 'Sparse vegetation / Degraded grassland', {
            'description': 'Low density vegetation',
            'likely_species': 'Native grasses, weeds',
            'protein_content': 'Low (4-7% estimated)',
            'grazing_suitability': 'Poor — needs rest period',
            'grazing_days_estimate': 'Rest recommended for 15-20 days',
        }
    else:
        return 'Stressed / Dry vegetation', {
            'description': 'Very low vegetation density — severe stress or dry season',
            'recommendation': 'Avoid grazing — allow recovery',
            'grazing_suitability': 'Not suitable',
        }


def classify_canopy(ndvi):
    if ndvi > 0.6: return 'Dense (>60%)'
    if ndvi > 0.4: return 'Moderate (40-60%)'
    if ndvi > 0.2: return 'Sparse (20-40%)'
    return 'Very sparse (<20%)'


def classify_growth_stage(ndvi, ndre):
    if ndvi > 0.6 and ndre > 0.3: return 'Peak growth / Flowering'
    if ndvi > 0.4: return 'Active vegetative growth'
    if ndvi > 0.2: return 'Early growth / Establishment'
    return 'Dormant / Stressed'


def get_vegetation_data(lat, lng):
    if not _init_ee():
        return get_simulated_vegetation_data()
    try:
        point  = ee.Geometry.Point([float(lng), float(lat)])
        region = point.buffer(200)
        end    = date.today()
        start  = end - timedelta(days=30)
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region).filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B4','B5','B7','B8','B11']))
        if s2.size().getInfo() == 0:
            return get_simulated_vegetation_data()
        median = s2.median()
        ndvi   = median.normalizedDifference(['B8','B4']).rename('NDVI')
        ndre   = median.normalizedDifference(['B7','B5']).rename('NDRE')
        ndwi   = median.normalizedDifference(['B8','B11']).rename('NDWI')
        savi   = median.expression(
            '1.5 * (NIR - RED) / (NIR + RED + 0.5)',
            {'NIR': median.select('B8'), 'RED': median.select('B4')}
        ).rename('SAVI')
        stats = ee.Image.cat([ndvi, ndre, ndwi, savi]).reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9
        ).getInfo()
        ndvi_v = stats.get('NDVI') or 0
        ndre_v = stats.get('NDRE') or 0
        ndwi_v = stats.get('NDWI') or 0
        savi_v = stats.get('SAVI') or 0
        veg_type, veg_props = classify_vegetation_type(ndvi_v, ndre_v, ndwi_v, savi_v)
        return {
            'ndvi': round(float(ndvi_v), 3),
            'ndre': round(float(ndre_v), 3),
            'ndwi': round(float(ndwi_v), 3),
            'savi': round(float(savi_v), 3),
            'vegetation_type': veg_type,
            'properties': veg_props,
            'canopy_cover':  classify_canopy(ndvi_v),
            'growth_stage':  classify_growth_stage(ndvi_v, ndre_v),
            'source': 'Sentinel-2',
        }
    except Exception as ex:
        print(f'[EE] Vegetation data failed: {ex}')
        return get_simulated_vegetation_data()


def get_simulated_vegetation_data():
    ndvi = round(random.uniform(0.25, 0.55), 3)
    ndre = round(random.uniform(0.15, 0.38), 3)
    veg_type, veg_props = classify_vegetation_type(
        ndvi, ndre, round(random.uniform(-0.05, 0.25), 3), round(random.uniform(0.15, 0.45), 3))
    return {
        'ndvi': ndvi, 'ndre': ndre,
        'ndwi': round(random.uniform(-0.05, 0.25), 3),
        'savi': round(random.uniform(0.15, 0.45), 3),
        'vegetation_type': veg_type,
        'properties': veg_props,
        'canopy_cover': classify_canopy(ndvi),
        'growth_stage': classify_growth_stage(ndvi, ndre),
        'source': 'Simulated',
    }


# ── Full Farm Intelligence ────────────────────────────────────
def get_full_farm_intelligence(lat, lng):
    return {
        'ndvi':       get_real_ndvi(lat, lng) or get_simulated_pasture_ndvi(),
        'soil':       get_soil_data(lat, lng),
        'atmosphere': get_atmospheric_data(lat, lng),
        'vegetation': get_vegetation_data(lat, lng),
        'weather':    get_weather(lat, lng),
    }
