from django.urls import path
from . import views

urlpatterns = [
    path('summary', views.summary, name='dashboard-summary'),
    path('by-category', views.by_category, name='dashboard-by-category'),
    path('trends', views.trends, name='dashboard-trends'),
    path('recent', views.recent_activity, name='dashboard-recent'),
]
