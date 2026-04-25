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
MSG91_AUTH_KEY  = os.getenv('MSG91_AUTH_KEY', '')
MSG91_SENDER_ID = os.getenv('MSG91_SENDER_ID', 'DVISION')
MSG91_TEMPLATE_EN = os.getenv('MSG91_TEMPLATE_EN', '')
MSG91_TEMPLATE_TA = os.getenv('MSG91_TEMPLATE_TA', '')


def send_sms(phone, message):
    """Send SMS via MSG91. Phone must be 10 digits."""
    if not MSG91_AUTH_KEY:
        print(f'[SMS] No auth key configured — skipping SMS to {phone}')
        return False
    try:
        mobile = '91' + str(phone).strip()
        url = 'https://api.msg91.com/api/v5/flow/'
        payload = {
            'template_id': MSG91_TEMPLATE_EN,
            'short_url':   '0',
            'recipients':  [{'mobiles': mobile}],
        }
        headers = {
            'authkey':      MSG91_AUTH_KEY,
            'content-type': 'application/json',
        }
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        result = r.json()
        if result.get('type') == 'success':
            print(f'[SMS] Sent to {phone}: {message[:40]}...')
            return True
        else:
            print(f'[SMS] Failed: {result}')
            return False
    except Exception as ex:
        print(f'[SMS] Error: {ex}')
        return False


def send_stress_sms(farmer, farm_name, ndvi, health):
    """Send crop stress SMS alert to farmer."""
    phone = farmer.phone
    en_msg = (
        f"DairyVision Alert: Crop stress on {farm_name}. "
        f"NDVI={ndvi:.2f} ({health}). "
        f"Please irrigate immediately. -NABARD MABIF Madurai"
    )
    ta_msg = (
        f"DairyVision: {farm_name} நிலத்தில் பயிர் மன அழுத்தம். "
        f"NDVI={ndvi:.2f}. "
        f"உடனடியாக நீர்ப்பாசனம் செய்யுங்கள். -NABARD MABIF"
    )
    print(f'[SMS] Sending stress alert to {farmer.user.get_full_name()} ({phone})')
    print(f'[SMS] EN: {en_msg}')
    print(f'[SMS] TA: {ta_msg}')
    sent = send_sms(phone, en_msg)
    return sent


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
        count = s2.size().getInfo()
        if count == 0:
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
        'sorghum': 0.45, 'maize': 0.50, 'napier': 0.55,
        'paddy': 0.60, 'sugarcane': 0.65, 'cotton': 0.40,
        'groundnut': 0.38, 'other': 0.42,
    }.get(farm.crop_type, 0.42)
    month    = date.today().month
    seasonal = {7:0.10,8:0.10,9:0.08,10:0.06,11:0.04,12:0.03,
                1:0.02,2:0.02,3:-0.08,4:-0.06,5:-0.10,6:-0.04}.get(month, 0)
    ndvi     = base + seasonal + random.uniform(-0.07, 0.07)
    return round(max(0.05, min(0.80, ndvi)), 3)


def get_ndvi_for_farm(farm):
    if not farm.latitude or not farm.longitude:
        return None
    ndvi = get_real_ndvi(farm.latitude, farm.longitude)
    if ndvi is None:
        print(f'[EE] Using simulated NDVI for {farm.name}')
        ndvi = get_simulated_ndvi(farm)
    return ndvi


# ── Weather ───────────────────────────────────────────────────
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


# ── Refresh all farms + send SMS alerts ───────────────────────
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

        # Create alert and send SMS if stressed
        if health in ['stressed', 'critical']:
            alert, created = CropAlert.objects.get_or_create(
                farm=farm, is_resolved=False,
                defaults={
                    'alert_type': 'stress',
                    'severity':   'high' if health == 'critical' else 'medium',
                    'message_en': (
                        f"Crop stress on '{farm.name}'. "
                        f"NDVI={ndvi:.2f} from Sentinel-2. Irrigate immediately."
                    ),
                    'message_ta': (
                        f"'{farm.name}' நிலத்தில் மன அழுத்தம். "
                        f"NDVI={ndvi:.2f}. நீர்ப்பாசனம் தேவை."
                    ),
                },
            )
            # Send SMS only for new alerts
            if created:
                send_stress_sms(farm.farmer, farm.name, ndvi, health)

        source = 'Sentinel-2' if _ee_ready else 'Simulated'
        results.append({
            'farm':   farm.name,
            'ndvi':   ndvi,
            'health': health,
            'source': source,
        })
        print(f'[EE] {farm.name}: NDVI={ndvi:.3f} ({health}) [{source}]')

    return results


# ── Pasture NDVI monitoring (for grazing) ────────────────────
def get_pasture_ndvi(lat, lng, area_acres=None):
    """
    Same as crop NDVI but uses a larger buffer for grazing land.
    Returns NDVI value representing pasture grass quality.
    """
    if not _init_ee():
        return get_simulated_pasture_ndvi()
    try:
        point  = ee.Geometry.Point([float(lng), float(lat)])
        # Larger buffer for grazing land
        buffer_m = max(500, int((float(area_acres or 2) * 4047) ** 0.5) * 2) if area_acres else 800
        region = point.buffer(buffer_m)
        end    = date.today()
        start  = end - timedelta(days=30)
        s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(region)
                .filterDate(str(start), str(end))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .select(['B8', 'B4']))
        count = s2.size().getInfo()
        if count == 0:
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
    month = date.today().month
    base  = 0.45
    seasonal = {7:0.15,8:0.12,9:0.10,10:0.05,11:0.02,12:0.00,
                1:-0.02,2:-0.03,3:-0.10,4:-0.12,5:-0.15,6:-0.05}.get(month, 0)
    return round(max(0.05, min(0.75, base + seasonal + random.uniform(-0.05, 0.05))), 3)


def classify_pasture_health(ndvi):
    if ndvi >= 0.45: return 'abundant',   'Grass is abundant — good for grazing'
    if ndvi >= 0.30: return 'adequate',   'Grass is adequate — monitor closely'
    if ndvi >= 0.18: return 'depleted',   'Grass is depleting — consider rotation'
    return 'exhausted', 'Pasture exhausted — move cattle immediately'
