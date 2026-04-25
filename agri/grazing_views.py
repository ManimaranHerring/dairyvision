from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import math
from .models import (GrazingLand, PastureReading, CattleLocation,
                     GrazingGeofence, GrazingSession)
from .satellite_service import get_pasture_ndvi, classify_pasture_health, get_weather
from farmers.models import Cattle


# ── Serializers ───────────────────────────────────────────────
class GrazingLandSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    land_type_display = serializers.SerializerMethodField()
    latest_pasture_health = serializers.SerializerMethodField()
    latest_ndvi = serializers.SerializerMethodField()
    latest_reading_date = serializers.SerializerMethodField()

    class Meta:
        model = GrazingLand
        fields = ['id', 'farmer', 'farmer_name', 'name', 'land_type',
                  'land_type_display', 'area_acres', 'latitude', 'longitude',
                  'max_cattle_capacity', 'notes', 'latest_pasture_health',
                  'latest_ndvi', 'latest_reading_date', 'created_at']
        read_only_fields = ['farmer']

    def get_farmer_name(self, obj): return obj.farmer.user.get_full_name()
    def get_land_type_display(self, obj): return obj.get_land_type_display()

    def get_latest_pasture_health(self, obj):
        r = obj.pasture_readings.first()
        return r.pasture_health if r else 'unknown'

    def get_latest_ndvi(self, obj):
        r = obj.pasture_readings.first()
        return float(r.ndvi_value) if r else None

    def get_latest_reading_date(self, obj):
        r = obj.pasture_readings.first()
        return str(r.reading_date) if r else None

    def create(self, validated_data):
        farmer = self.context['request'].user.farmer_profile
        return GrazingLand.objects.create(farmer=farmer, **validated_data)


class PastureReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PastureReading
        fields = ['id', 'grazing_land', 'reading_date', 'ndvi_value',
                  'pasture_health', 'estimated_grazing_days',
                  'rainfall_mm', 'recommendation', 'created_at']


class CattleLocationSerializer(serializers.ModelSerializer):
    cattle_tag = serializers.SerializerMethodField()
    farmer_name = serializers.SerializerMethodField()

    class Meta:
        model = CattleLocation
        fields = ['id', 'cattle', 'cattle_tag', 'farmer_name',
                  'latitude', 'longitude', 'accuracy_metres',
                  'battery_percent', 'is_outside_geofence', 'recorded_at']

    def get_cattle_tag(self, obj): return obj.cattle.tag_number
    def get_farmer_name(self, obj): return obj.cattle.farmer.user.get_full_name()


class GrazingGeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrazingGeofence
        fields = ['id', 'grazing_land', 'center_lat', 'center_lng',
                  'radius_metres', 'is_active', 'created_at']


class GrazingSessionSerializer(serializers.ModelSerializer):
    cattle_tag = serializers.SerializerMethodField()
    land_name = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()

    class Meta:
        model = GrazingSession
        fields = ['id', 'cattle', 'cattle_tag', 'grazing_land', 'land_name',
                  'start_time', 'end_time', 'distance_km', 'is_active',
                  'duration_hours', 'notes']

    def get_cattle_tag(self, obj): return obj.cattle.tag_number
    def get_land_name(self, obj): return obj.grazing_land.name
    def get_duration_hours(self, obj):
        if obj.end_time:
            delta = obj.end_time - obj.start_time
            return round(delta.total_seconds() / 3600, 1)
        return None


# ── Helper: Haversine distance ────────────────────────────────
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ── Views ─────────────────────────────────────────────────────
class GrazingLandViewSet(viewsets.ModelViewSet):
    serializer_class = GrazingLandSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return GrazingLand.objects.filter(farmer__district=p.district)
            return GrazingLand.objects.filter(farmer__user=self.request.user)
        except Exception:
            return GrazingLand.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class RefreshPastureView(APIView):
    """Refresh satellite pasture NDVI for all grazing lands."""
    def post(self, request):
        try:
            p = request.user.farmer_profile
            lands = GrazingLand.objects.filter(farmer__district=p.district) \
                    if p.role in ['manager', 'nabard'] \
                    else GrazingLand.objects.filter(farmer__user=request.user)
        except Exception:
            lands = GrazingLand.objects.none()

        from datetime import date
        today = date.today()
        results = []

        for land in lands:
            ndvi = get_pasture_ndvi(land.latitude, land.longitude, land.area_acres)
            health, recommendation = classify_pasture_health(ndvi)
            weather = get_weather(land.latitude, land.longitude)

            # Estimate grazing days based on NDVI and herd size
            grazing_days = max(0, int((ndvi - 0.15) * land.max_cattle_capacity * 8))

            PastureReading.objects.update_or_create(
                grazing_land=land, reading_date=today,
                defaults={
                    'ndvi_value': Decimal(str(ndvi)),
                    'pasture_health': health,
                    'estimated_grazing_days': grazing_days,
                    'rainfall_mm': weather['rainfall_mm'],
                    'recommendation': recommendation,
                }
            )
            results.append({
                'land': land.name,
                'ndvi': ndvi,
                'health': health,
                'grazing_days': grazing_days,
                'recommendation': recommendation,
            })

        return Response({'message': f'Refreshed {len(results)} grazing lands.', 'results': results})


class PastureHistoryView(APIView):
    """Get pasture reading history for a grazing land."""
    def get(self, request, land_id):
        try:
            land = GrazingLand.objects.get(id=land_id)
        except GrazingLand.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        readings = land.pasture_readings.order_by('reading_date')
        return Response({
            'land': land.name,
            'area_acres': float(land.area_acres),
            'max_capacity': land.max_cattle_capacity,
            'readings': [{
                'date': str(r.reading_date),
                'ndvi': float(r.ndvi_value),
                'health': r.pasture_health,
                'grazing_days': r.estimated_grazing_days,
                'recommendation': r.recommendation,
            } for r in readings],
        })


class CattleLocationViewSet(viewsets.ModelViewSet):
    serializer_class = CattleLocationSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return CattleLocation.objects.filter(
                    cattle__farmer__district=p.district).order_by('-recorded_at')
            return CattleLocation.objects.filter(
                cattle__farmer__user=self.request.user).order_by('-recorded_at')
        except Exception:
            return CattleLocation.objects.none()


class LiveCattleMapView(APIView):
    """Latest location of every cattle for live map."""
    def get(self, request):
        try:
            p = request.user.farmer_profile
            cattle_qs = Cattle.objects.filter(farmer__district=p.district) \
                        if p.role in ['manager', 'nabard'] \
                        else Cattle.objects.filter(farmer__user=request.user)
        except Exception:
            cattle_qs = Cattle.objects.none()

        results = []
        for cow in cattle_qs:
            latest = cow.locations.first()
            if latest:
                results.append({
                    'cattle_id': cow.id,
                    'tag_number': cow.tag_number,
                    'breed': cow.get_breed_display(),
                    'farmer': cow.farmer.user.get_full_name(),
                    'village': cow.farmer.village,
                    'latitude': float(latest.latitude),
                    'longitude': float(latest.longitude),
                    'battery': latest.battery_percent,
                    'is_outside_geofence': latest.is_outside_geofence,
                    'last_seen': str(latest.recorded_at),
                })
            else:
                results.append({
                    'cattle_id': cow.id,
                    'tag_number': cow.tag_number,
                    'breed': cow.get_breed_display(),
                    'farmer': cow.farmer.user.get_full_name(),
                    'village': cow.farmer.village,
                    'latitude': None,
                    'longitude': None,
                    'battery': None,
                    'is_outside_geofence': False,
                    'last_seen': None,
                })
        return Response(results)


class LogCattleLocationView(APIView):
    """
    GPS collar posts location here every 30 minutes.
    Also checks geofence and creates alert if outside.
    """
    def post(self, request):
        tag_number = request.data.get('tag_number')
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        battery = request.data.get('battery_percent', 100)

        if not all([tag_number, lat, lng]):
            return Response({'error': 'tag_number, latitude, longitude required'}, status=400)

        try:
            cattle = Cattle.objects.get(tag_number=tag_number)
        except Cattle.DoesNotExist:
            return Response({'error': 'Cattle not found'}, status=404)

        # Check geofence
        is_outside = False
        grazing_lands = GrazingLand.objects.filter(farmer=cattle.farmer)
        for land in grazing_lands:
            if hasattr(land, 'geofence') and land.geofence.is_active:
                dist = haversine_distance(
                    float(lat), float(lng),
                    float(land.geofence.center_lat),
                    float(land.geofence.center_lng)
                )
                if dist > land.geofence.radius_metres:
                    is_outside = True

        location = CattleLocation.objects.create(
            cattle=cattle,
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lng)),
            battery_percent=int(battery),
            is_outside_geofence=is_outside,
            recorded_at=timezone.now(),
        )

        return Response({
            'status': 'ok',
            'tag': tag_number,
            'is_outside_geofence': is_outside,
            'location_id': location.id,
        })


class GeofenceViewSet(viewsets.ModelViewSet):
    serializer_class = GrazingGeofenceSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return GrazingGeofence.objects.filter(
                    grazing_land__farmer__district=p.district)
            return GrazingGeofence.objects.filter(
                grazing_land__farmer__user=self.request.user)
        except Exception:
            return GrazingGeofence.objects.none()


class GrazingSessionViewSet(viewsets.ModelViewSet):
    serializer_class = GrazingSessionSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return GrazingSession.objects.filter(
                    cattle__farmer__district=p.district)
            return GrazingSession.objects.filter(
                cattle__farmer__user=self.request.user)
        except Exception:
            return GrazingSession.objects.none()
