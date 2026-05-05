from django.urls import path
from .views import (
    MeView, FarmerListView, DashboardStatsView,
    FarmListCreateView, CattleListCreateView,
    RegisterCooperativeView, RegisterFarmerView,
)

urlpatterns = [
    path('me/', MeView.as_view()),
    path('list/', FarmerListView.as_view()),
    path('dashboard-stats/', DashboardStatsView.as_view()),
    path('farms/', FarmListCreateView.as_view()),
    path('cattle/', CattleListCreateView.as_view()),
    # Public registration
    path('register-cooperative/', RegisterCooperativeView.as_view()),
    path('join/<str:code>/', RegisterFarmerView.as_view()),
]
