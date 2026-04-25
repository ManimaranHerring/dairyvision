from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (FarmHealthMapView, FarmNDVITrendView,
                    RefreshNDVIView, WeatherView, ActiveAlertsView)
from .grazing_views import (GrazingLandViewSet, RefreshPastureView,
                             PastureHistoryView, CattleLocationViewSet,
                             LiveCattleMapView, LogCattleLocationView,
                             GeofenceViewSet, GrazingSessionViewSet)

router = DefaultRouter()
router.register('grazing-lands', GrazingLandViewSet, basename='grazingland')
router.register('cattle-locations', CattleLocationViewSet, basename='cattlelocation')
router.register('geofences', GeofenceViewSet, basename='geofence')
router.register('grazing-sessions', GrazingSessionViewSet, basename='grazingsession')

urlpatterns = [
    # Crop NDVI
    path('health-map/', FarmHealthMapView.as_view()),
    path('ndvi-trend/<int:farm_id>/', FarmNDVITrendView.as_view()),
    path('refresh-ndvi/', RefreshNDVIView.as_view()),
    path('weather/', WeatherView.as_view()),
    path('alerts/', ActiveAlertsView.as_view()),
    # Grazing
    path('refresh-pasture/', RefreshPastureView.as_view()),
    path('pasture-history/<int:land_id>/', PastureHistoryView.as_view()),
    path('cattle-live-map/', LiveCattleMapView.as_view()),
    path('log-location/', LogCattleLocationView.as_view()),
    path('', include(router.urls)),
]
