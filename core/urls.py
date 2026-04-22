from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/farmers/', include('farmers.urls')),
    path('api/dairy/', include('dairy.urls')),
    path('api/agri/', include('agri.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)