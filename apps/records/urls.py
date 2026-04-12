from django.urls import path
from .views import RecordListCreateView, RecordDetailView, RecordExportView

urlpatterns = [
    path('', RecordListCreateView.as_view(), name='record-list-create'),
    path('export', RecordExportView.as_view(), name='record-export'),
    path('<int:pk>/', RecordDetailView.as_view(), name='record-detail'),
]
