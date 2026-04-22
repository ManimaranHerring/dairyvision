from django.urls import path
from .views import (FarmHealthMapView, FarmNDVITrendView,
                    RefreshNDVIView, WeatherView, ActiveAlertsView)

urlpatterns = [
    path('health-map/', FarmHealthMapView.as_view()),
    path('ndvi-trend/<int:farm_id>/', FarmNDVITrendView.as_view()),
    path('refresh-ndvi/', RefreshNDVIView.as_view()),
    path('weather/', WeatherView.as_view()),
    path('alerts/', ActiveAlertsView.as_view()),
]