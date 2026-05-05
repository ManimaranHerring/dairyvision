from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Farmer, Farm, Cattle, Cooperative
from .serializers import FarmerSerializer, FarmSerializer, CattleSerializer
from dairy.models import MilkLog
from django.db.models import Sum
from datetime import date, timedelta
import re


# ── Public: Register a new cooperative ────────────────────────
class RegisterCooperativeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        # Validate required fields
        required = ['cooperative_name', 'district', 'manager_name',
                    'phone', 'password']
        for field in required:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        phone = str(data['phone']).strip()
        if not re.match(r'^\d{10}$', phone):
            return Response(
                {'error': 'Phone must be exactly 10 digits'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=phone).exists():
            return Response(
                {'error': 'This phone number is already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create cooperative
        coop = Cooperative.objects.create(
            name=data['cooperative_name'],
            district=data['district'],
            state=data.get('state', 'Tamil Nadu'),
            address=data.get('address', ''),
            phone=phone,
            email=data.get('email', ''),
            plan='starter',
            max_farmers=10,
        )

        # Create manager user
        parts = str(data['manager_name']).split()
        user = User.objects.create_user(
            username=phone,
            password=data['password'],
            first_name=parts[0],
            last_name=' '.join(parts[1:]) if len(parts) > 1 else '',
        )

        farmer = Farmer.objects.create(
            user=user,
            cooperative=coop,
            phone=phone,
            village=data.get('village', data['district']),
            district=data['district'],
            role='manager',
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': f"Cooperative '{coop.name}' registered successfully!",
            'cooperative_code': coop.code,
            'cooperative_name': coop.name,
            'district': coop.district,
            'plan': coop.plan,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


# ── Public: Register a farmer via cooperative join code ────────
class RegisterFarmerView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        """Return cooperative info for the join page."""
        try:
            coop = Cooperative.objects.get(code=code.upper(), is_active=True)
        except Cooperative.DoesNotExist:
            return Response(
                {'error': 'Invalid cooperative code'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'cooperative_name': coop.name,
            'district': coop.district,
            'code': coop.code,
            'can_join': coop.can_add_farmer,
            'farmer_count': coop.farmer_count,
            'max_farmers': coop.max_farmers,
        })

    def post(self, request, code):
        """Register a new farmer under this cooperative."""
        try:
            coop = Cooperative.objects.get(code=code.upper(), is_active=True)
        except Cooperative.DoesNotExist:
            return Response(
                {'error': 'Invalid cooperative code'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not coop.can_add_farmer:
            return Response(
                {'error': f'This cooperative has reached its limit of {coop.max_farmers} farmers. Please ask your manager to upgrade the plan.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        required = ['full_name', 'phone', 'password']
        for field in required:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        phone = str(data['phone']).strip()
        if not re.match(r'^\d{10}$', phone):
            return Response(
                {'error': 'Phone must be exactly 10 digits'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=phone).exists():
            return Response(
                {'error': 'This phone number is already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parts = str(data['full_name']).split()
        user = User.objects.create_user(
            username=phone,
            password=data['password'],
            first_name=parts[0],
            last_name=' '.join(parts[1:]) if len(parts) > 1 else '',
        )

        farmer = Farmer.objects.create(
            user=user,
            cooperative=coop,
            phone=phone,
            village=data.get('village', ''),
            district=coop.district,
            role='farmer',
        )

        refresh = RefreshToken.for_user(user)

        return Response({
            'message': f"Welcome to {coop.name}!",
            'farmer_name': user.get_full_name(),
            'cooperative_name': coop.name,
            'cooperative_code': coop.code,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


# ── Auth: Get current user profile ────────────────────────────
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            farmer = request.user.farmer_profile
            coop = farmer.cooperative
            return Response({
                'id': farmer.id,
                'full_name': farmer.full_name,
                'phone': farmer.phone,
                'village': farmer.village,
                'district': farmer.district,
                'role': farmer.role,
                'cooperative_name': coop.name if coop else '',
                'cooperative_code': coop.code if coop else '',
                'plan': coop.plan if coop else 'starter',
                'is_manager': farmer.role in ['manager', 'nabard'],
            })
        except Exception:
            return Response({'error': 'Profile not found'}, status=404)


# ── Auth: List farmers in cooperative ─────────────────────────
class FarmerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            p = request.user.farmer_profile
            if p.role in ['manager', 'nabard'] and p.cooperative:
                farmers = Farmer.objects.filter(
                    cooperative=p.cooperative
                ).select_related('user')
            else:
                farmers = Farmer.objects.filter(user=request.user)
            return Response(FarmerSerializer(farmers, many=True).data)
        except Exception:
            return Response([], status=200)


# ── Auth: Dashboard stats ──────────────────────────────────────
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            p = request.user.farmer_profile
            coop = p.cooperative

            if p.role in ['manager', 'nabard'] and coop:
                farmers = Farmer.objects.filter(cooperative=coop)
                farmer_ids = farmers.values_list('id', flat=True)
            else:
                farmers = Farmer.objects.filter(user=request.user)
                farmer_ids = [p.id]

            from agri.models import CropAlert
            today = date.today()
            week_start = today - timedelta(days=6)

            total_cattle = sum(f.cattle.count() for f in farmers)
            total_area = sum(
                float(fm.area_acres) for f in farmers for fm in f.farms.all()
            )

            milk_today = MilkLog.objects.filter(
                farmer_id__in=farmer_ids, date=today
            ).aggregate(total=Sum('quantity_litres'))['total'] or 0

            milk_week = MilkLog.objects.filter(
                farmer_id__in=farmer_ids,
                date__gte=week_start, date__lte=today
            ).aggregate(total=Sum('quantity_litres'))['total'] or 0

            # 14-day trend
            trend = []
            for i in range(13, -1, -1):
                d = today - timedelta(days=i)
                qty = MilkLog.objects.filter(
                    farmer_id__in=farmer_ids, date=d
                ).aggregate(total=Sum('quantity_litres'))['total'] or 0
                trend.append({'date': str(d), 'litres': round(float(qty), 1)})

            active_alerts = CropAlert.objects.filter(
                farm__farmer_id__in=farmer_ids,
                is_resolved=False
            )

            return Response({
                'total_farmers': farmers.count(),
                'total_cattle': total_cattle,
                'total_area_acres': round(total_area, 1),
                'milk_today': round(float(milk_today), 1),
                'milk_this_week': round(float(milk_week), 1),
                'active_alerts': active_alerts.count(),
                'alert_list': [{
                    'farm_name': a.farm.name,
                    'village': a.farm.farmer.village,
                    'message_en': a.message_en,
                    'message_ta': a.message_ta,
                    'severity': a.severity,
                } for a in active_alerts[:5]],
                'milk_trend': trend,
                'plan': coop.plan if coop else 'starter',
                'cooperative_code': coop.code if coop else '',
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ── Auth: Farm CRUD ────────────────────────────────────────────
class FarmListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            p = request.user.farmer_profile
            if p.role in ['manager', 'nabard'] and p.cooperative:
                farms = Farm.objects.filter(
                    farmer__cooperative=p.cooperative
                ).select_related('farmer__user')
            else:
                farms = Farm.objects.filter(farmer=p)
            return Response(FarmSerializer(farms, many=True).data)
        except Exception:
            return Response([], status=200)

    def post(self, request):
        try:
            p = request.user.farmer_profile
        except Exception:
            return Response({'error': 'Profile not found'}, status=404)
        s = FarmSerializer(data=request.data)
        if s.is_valid():
            s.save(farmer=p)
            return Response(s.data, status=201)
        return Response(s.errors, status=400)


# ── Auth: Cattle CRUD ──────────────────────────────────────────
class CattleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            p = request.user.farmer_profile
            if p.role in ['manager', 'nabard'] and p.cooperative:
                cattle = Cattle.objects.filter(
                    farmer__cooperative=p.cooperative
                ).select_related('farmer__user')
            else:
                cattle = Cattle.objects.filter(farmer=p)
            return Response(CattleSerializer(cattle, many=True).data)
        except Exception:
            return Response([], status=200)

    def post(self, request):
        try:
            p = request.user.farmer_profile
        except Exception:
            return Response({'error': 'Profile not found'}, status=404)
        s = CattleSerializer(data=request.data)
        if s.is_valid():
            s.save(farmer=p)
            return Response(s.data, status=201)
        return Response(s.errors, status=400)
