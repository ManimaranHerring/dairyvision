from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import ProductListing, Order, BuyerEnquiry
from .serializers import (ProductListingSerializer, OrderSerializer,
                           BuyerEnquirySerializer)


class ProductListingViewSet(viewsets.ModelViewSet):
    serializer_class = ProductListingSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return ProductListing.objects.filter(
                    cooperative__district=p.district)
        except Exception:
            pass
        return ProductListing.objects.filter(status='active')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PublicListingsView(APIView):
    """Public product catalogue — no authentication needed."""
    permission_classes = [AllowAny]

    def get(self, request):
        listings = ProductListing.objects.filter(status='active')
        district = request.query_params.get('district')
        product_type = request.query_params.get('type')
        if district:
            listings = listings.filter(district__icontains=district)
        if product_type:
            listings = listings.filter(product_type__icontains=product_type)
        return Response([{
            'id': l.id,
            'product_name': l.product_name,
            'product_type': l.product_type,
            'description': l.description,
            'price_per_unit': float(l.price_per_unit),
            'unit': l.get_unit_display(),
            'quantity_available': float(l.quantity_available),
            'minimum_order': float(l.minimum_order),
            'cooperative': l.cooperative.user.get_full_name(),
            'district': l.district,
            'traceability_url': l.traceability_url,
            'batch_short_id': l.source_batch.batch_short_id if l.source_batch else None,
            'certifications': l.certifications,
        } for l in listings])


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return Order.objects.filter(
                    listing__cooperative__district=p.district)
        except Exception:
            pass
        return Order.objects.none()

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            order.status = new_status
            order.save()
        return Response(OrderSerializer(order).data)


class PublicOrderCreateView(APIView):
    """Anyone can place an order — no auth needed."""
    permission_classes = [AllowAny]

    def post(self, request):
        s = OrderSerializer(data=request.data)
        if s.is_valid():
            order = s.save()
            return Response({
                'order_id': str(order.order_id),
                'order_short_id': order.order_short_id,
                'product': order.listing.product_name,
                'quantity': float(order.quantity),
                'total_amount': float(order.total_amount),
                'status': 'pending',
                'message': f"Order {order.order_short_id} placed successfully. The cooperative will contact you at {order.buyer_phone}.",
            }, status=201)
        return Response(s.errors, status=400)


class EnquiryViewSet(viewsets.ModelViewSet):
    serializer_class = BuyerEnquirySerializer

    def get_queryset(self):
        try:
            p = self.request.user.farmer_profile
            if p.role in ['manager', 'nabard']:
                return BuyerEnquiry.objects.filter(
                    listing__cooperative__district=p.district)
        except Exception:
            pass
        return BuyerEnquiry.objects.none()


class PublicEnquiryView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = BuyerEnquirySerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'message': 'Enquiry submitted. The cooperative will contact you soon.'}, status=201)
        return Response(s.errors, status=400)


class MarketDashboardView(APIView):
    def get(self, request):
        try:
            p = request.user.farmer_profile
            listings = ProductListing.objects.filter(
                cooperative__district=p.district)
            orders = Order.objects.filter(
                listing__cooperative__district=p.district)
        except Exception:
            return Response({'error': 'Not found'}, status=404)
        return Response({
            'total_listings': listings.filter(status='active').count(),
            'total_orders': orders.count(),
            'pending_orders': orders.filter(status='pending').count(),
            'confirmed_orders': orders.filter(status='confirmed').count(),
            'total_revenue': float(sum(
                o.total_amount for o in orders.filter(
                    status__in=['confirmed', 'dispatched', 'delivered']))),
            'recent_orders': [{
                'id': o.order_short_id,
                'product': o.listing.product_name,
                'buyer': o.buyer_name,
                'city': o.buyer_city,
                'quantity': float(o.quantity),
                'amount': float(o.total_amount),
                'status': o.status,
                'date': str(o.ordered_at.date()),
            } for o in orders.order_by('-ordered_at')[:5]],
        })
