from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal
from datetime import date, timedelta
from .models import NDVIReading, CropAlert
from .satellite_service import (
    refresh_all_farms, get_weather,
    get_full_farm_intelligence,
)


# ── Farm Health Map ───────────────────────────────────────────
class FarmHealthMapView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            from farmers.models import Farm
            if p.role in ['manager', 'nabard'] and p.cooperative:
                farms = Farm.objects.filter(
                    farmer__cooperative=p.cooperative
                ).select_related('farmer__user')
            else:
                farms = Farm.objects.filter(farmer=p)
        except Exception:
            return Response([])

        result = []
        for farm in farms:
            latest = farm.ndvi_readings.first()
            alerts = farm.alerts.filter(is_resolved=False).count()
            result.append({
                'farm_id':      farm.id,
                'farm_name':    farm.name,
                'farmer_name':  farm.farmer.user.get_full_name(),
                'crop_type':    farm.crop_type,
                'crop_display': farm.get_crop_type_display(),
                'area_acres':   float(farm.area_acres),
                'latitude':     float(farm.latitude) if farm.latitude else None,
                'longitude':    float(farm.longitude) if farm.longitude else None,
                'health_status':latest.health_status if latest else 'unknown',
                'latest_ndvi':  float(latest.ndvi_value) if latest else None,
                'last_reading': str(latest.reading_date) if latest else None,
                'alert_count':  alerts,
            })
        return Response(result)


# ── NDVI Trend ────────────────────────────────────────────────
class FarmNDVITrendView(APIView):
    def get(self, request, farm_id):
        from farmers.models import Farm
        try:
            farm = Farm.objects.get(id=farm_id)
        except Farm.DoesNotExist:
            return Response({'error': 'Farm not found'}, status=404)
        readings = farm.ndvi_readings.order_by('reading_date')[:14]
        return Response({
            'farm_name': farm.name,
            'crop_type': farm.get_crop_type_display(),
            'readings': [{
                'date':   str(r.reading_date),
                'ndvi':   float(r.ndvi_value),
                'health': r.health_status,
            } for r in readings],
        })


# ── Refresh NDVI ──────────────────────────────────────────────
class RefreshNDVIView(APIView):
    def post(self, request):
        results = refresh_all_farms()
        return Response({
            'message': f'Refreshed {len(results)} farms',
            'results': results,
        })


# ── Weather ───────────────────────────────────────────────────
class WeatherView(APIView):
    def get(self, request):
        lat = request.query_params.get('lat', '9.9252')
        lng = request.query_params.get('lng', '78.1198')
        return Response(get_weather(lat, lng))


# ── Active Alerts ─────────────────────────────────────────────
class ActiveAlertsView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            if p.role in ['manager', 'nabard'] and p.cooperative:
                alerts = CropAlert.objects.filter(
                    farm__farmer__cooperative=p.cooperative,
                    is_resolved=False
                ).select_related('farm__farmer__user')
            else:
                alerts = CropAlert.objects.filter(
                    farm__farmer=p, is_resolved=False
                )
        except Exception:
            return Response([])

        return Response([{
            'id':          a.id,
            'farm_name':   a.farm.name,
            'farmer_name': a.farm.farmer.user.get_full_name(),
            'village':     a.farm.farmer.village,
            'severity':    a.severity,
            'message_en':  a.message_en,
            'message_ta':  a.message_ta,
            'created_at':  str(a.created_at.date()),
        } for a in alerts])


# ── Farm Intelligence — Full Satellite Analysis ───────────────
class FarmIntelligenceView(APIView):
    def get(self, request, farm_id):
        from farmers.models import Farm
        try:
            farm = Farm.objects.get(id=farm_id)
        except Farm.DoesNotExist:
            return Response({'error': 'Farm not found'}, status=404)
        if not farm.latitude or not farm.longitude:
            return Response({'error': 'Farm has no GPS coordinates'}, status=400)
        data = get_full_farm_intelligence(farm.latitude, farm.longitude)
        return Response({
            'farm_id':   farm_id,
            'farm_name': farm.name,
            'farmer':    farm.farmer.user.get_full_name(),
            'crop_type': farm.get_crop_type_display(),
            'location': {
                'lat': float(farm.latitude),
                'lng': float(farm.longitude),
            },
            **data,
        })
