from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MilkLogViewSet, VAPBatchViewSet, PublicTraceView

router = DefaultRouter()
router.register('milklogs', MilkLogViewSet, basename='milklog')
router.register('batches', VAPBatchViewSet, basename='vapbatch')

urlpatterns = [
    path('trace/<uuid:batch_id>/', PublicTraceView.as_view()),
    path('', include(router.urls)),
]