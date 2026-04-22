from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import Farmer, Farm, Cattle
from .serializers import (FarmerSerializer, FarmerRegisterSerializer,
                          FarmSerializer, CattleSerializer)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = FarmerRegisterSerializer(data=request.data)
        if s.is_valid():
            if User.objects.filter(username=s.validated_data['phone']).exists():
                return Response({'error': 'Phone already registered.'}, status=400)
            farmer = s.save()
            refresh = RefreshToken.for_user(farmer.user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'farmer': FarmerSerializer(farmer).data,
            }, status=201)
        return Response(s.errors, status=400)


class MeView(APIView):
    def get(self, request):
        try:
            return Response(FarmerSerializer(request.user.farmer_profile).data)
        except Exception:
            return Response({'error': 'Not found.'}, status=404)


class FarmerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FarmerSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return Farmer.objects.filter(district=p.district, role='farmer')
        except Exception:
            pass
        return Farmer.objects.filter(user=self.request.user)


class FarmViewSet(viewsets.ModelViewSet):
    serializer_class = FarmSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return Farm.objects.filter(farmer__district=p.district)
            return Farm.objects.filter(farmer__user=self.request.user)
        except Exception:
            return Farm.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CattleViewSet(viewsets.ModelViewSet):
    serializer_class = CattleSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return Cattle.objects.filter(farmer__district=p.district)
            return Cattle.objects.filter(farmer__user=self.request.user)
        except Exception:
            return Cattle.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class DashboardStatsView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                farmers = Farmer.objects.filter(district=p.district, role='farmer')
                farms = Farm.objects.filter(farmer__district=p.district)
                cattle = Cattle.objects.filter(farmer__district=p.district)
            else:
                farmers = Farmer.objects.filter(user=request.user)
                farms = Farm.objects.filter(farmer__user=request.user)
                cattle = Cattle.objects.filter(farmer__user=request.user)
            return Response({
                'total_farmers': farmers.count(),
                'total_farms': farms.count(),
                'total_area_acres': float(sum(f.area_acres for f in farms)),
                'total_cattle': cattle.count(),
                'milking_cattle': cattle.filter(is_milking=True).count(),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)