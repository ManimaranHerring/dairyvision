from rest_framework.views import APIView
from rest_framework.response import Response
from .models import NDVIReading, CropAlert
from .satellite_service import refresh_all_farms, get_weather
from farmers.models import Farm


class FarmHealthMapView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            farms = Farm.objects.filter(farmer__district=p.district) \
                    if p.role in ['manager', 'nabard'] \
                    else Farm.objects.filter(farmer__user=request.user)
        except Exception:
            farms = Farm.objects.none()
        out = []
        for f in farms:
            latest = f.ndvi_readings.first()
            out.append({
                'farm_id': f.id,
                'farm_name': f.name,
                'farmer_name': f.farmer.user.get_full_name(),
                'village': f.farmer.village,
                'crop_type': f.get_crop_type_display(),
                'area_acres': float(f.area_acres),
                'latitude': float(f.latitude) if f.latitude else None,
                'longitude': float(f.longitude) if f.longitude else None,
                'latest_ndvi': float(latest.ndvi_value) if latest else None,
                'health_status': latest.health_status if latest else 'unknown',
                'reading_date': str(latest.reading_date) if latest else None,
                'alert_count': f.alerts.filter(is_resolved=False).count(),
            })
        return Response(out)


class FarmNDVITrendView(APIView):
    def get(self, request, farm_id):
        try:
            farm = Farm.objects.get(id=farm_id)
        except Farm.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        readings = farm.ndvi_readings.order_by('reading_date')
        return Response({
            'farm': farm.name,
            'readings': [{'date': str(r.reading_date),
                          'ndvi': float(r.ndvi_value),
                          'health': r.health_status} for r in readings],
        })


class RefreshNDVIView(APIView):
    def post(self, request):
        results = refresh_all_farms()
        return Response({'message': f'Refreshed {len(results)} farms.', 'results': results})


class WeatherView(APIView):
    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response({'error': 'lat and lng required'}, status=400)
        return Response(get_weather(lat, lng))


class ActiveAlertsView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            alerts = CropAlert.objects.filter(
                farm__farmer__district=p.district, is_resolved=False) \
                if p.role in ['manager', 'nabard'] \
                else CropAlert.objects.filter(
                farm__farmer__user=request.user, is_resolved=False)
        except Exception:
            alerts = CropAlert.objects.none()
        return Response([{
            'id': a.id,
            'farm': a.farm.name,
            'farmer': a.farm.farmer.user.get_full_name(),
            'village': a.farm.farmer.village,
            'severity': a.severity,
            'message': a.message_en,
            'message_ta': a.message_ta,
            'created_at': str(a.created_at.date()),
        } for a in alerts])