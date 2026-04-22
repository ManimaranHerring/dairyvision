from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
import qrcode, io
from django.core.files.base import ContentFile
from .models import MilkLog, VAPBatch
from .serializers import MilkLogSerializer, VAPBatchSerializer


class MilkLogViewSet(viewsets.ModelViewSet):
    serializer_class = MilkLogSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return MilkLog.objects.filter(farmer__district=p.district)
            return MilkLog.objects.filter(farmer__user=self.request.user)
        except Exception:
            return MilkLog.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = timezone.now().date()
        qs = self.get_queryset()
        today_total = qs.filter(date=today).aggregate(t=Sum('quantity_litres'))['t'] or 0
        week_total = qs.filter(date__gte=today - timedelta(days=7)).aggregate(t=Sum('quantity_litres'))['t'] or 0
        month_total = qs.filter(date__gte=today - timedelta(days=30)).aggregate(t=Sum('quantity_litres'))['t'] or 0
        trend = []
        for i in range(13, -1, -1):
            day = today - timedelta(days=i)
            total = qs.filter(date=day).aggregate(t=Sum('quantity_litres'))['t'] or 0
            trend.append({'date': str(day), 'litres': float(total)})
        return Response({
            'today_litres': float(today_total),
            'week_litres': float(week_total),
            'month_litres': float(month_total),
            'daily_trend': trend,
        })


class VAPBatchViewSet(viewsets.ModelViewSet):
    serializer_class = VAPBatchSerializer

    def get_queryset(self):
        return VAPBatch.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        batch = serializer.save()
        self._make_qr(batch)

    def _make_qr(self, batch):
        url = f"http://localhost:3000/trace/{batch.batch_id}"
        qr = qrcode.QRCode(version=1, box_size=8, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        batch.qr_code.save(f"qr_{batch.batch_short_id}.png",
                           ContentFile(buf.getvalue()), save=True)


class PublicTraceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, batch_id):
        try:
            b = VAPBatch.objects.get(batch_id=batch_id)
            farmers = b.source_farmers.all()
            return Response({
                'batch_id': str(b.batch_id),
                'batch_short_id': b.batch_short_id,
                'product': b.get_product_type_display(),
                'quantity_kg': float(b.quantity_kg),
                'production_date': str(b.production_date),
                'expiry_date': str(b.expiry_date) if b.expiry_date else None,
                'status': b.get_status_display(),
                'milk_used_litres': float(b.total_milk_used_litres),
                'source_farmers': [{'name': f.user.get_full_name(),
                                    'village': f.village} for f in farmers],
                'message': f"This {b.get_product_type_display()} was made from milk collected from {farmers.count()} farmers in Tamil Nadu.",
            })
        except VAPBatch.DoesNotExist:
            return Response({'error': 'Batch not found.'}, status=404)