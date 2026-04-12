from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerUIView

urlpatterns = [
    # OpenAPI schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerUIView.as_view(url_name='schema'), name='swagger-ui'),

    # Health check
    path('health', include('apps.core.urls')),

    # API routes
    path('api/auth/', include('apps.auth_app.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/records/', include('apps.records.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]
