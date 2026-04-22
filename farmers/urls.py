from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (RegisterView, MeView, FarmerViewSet,
                    FarmViewSet, CattleViewSet, DashboardStatsView)

router = DefaultRouter()
router.register('list', FarmerViewSet, basename='farmer')
router.register('farms', FarmViewSet, basename='farm')
router.register('cattle', CattleViewSet, basename='cattle')

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('me/', MeView.as_view()),
    path('dashboard-stats/', DashboardStatsView.as_view()),
    path('', include(router.urls)),
]