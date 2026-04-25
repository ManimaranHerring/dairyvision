from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (ProductListingViewSet, OrderViewSet, EnquiryViewSet,
                    PublicListingsView, PublicOrderCreateView,
                    PublicEnquiryView, MarketDashboardView)

router = DefaultRouter()
router.register('listings', ProductListingViewSet, basename='listing')
router.register('orders', OrderViewSet, basename='order')
router.register('enquiries', EnquiryViewSet, basename='enquiry')

urlpatterns = [
    path('public/', PublicListingsView.as_view()),
    path('public/order/', PublicOrderCreateView.as_view()),
    path('public/enquiry/', PublicEnquiryView.as_view()),
    path('dashboard/', MarketDashboardView.as_view()),
    path('', include(router.urls)),
]
