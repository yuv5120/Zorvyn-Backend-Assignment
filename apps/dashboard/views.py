from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from apps.core.response import success_response
from apps.users.permissions import RequireRole
from . import services


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary(request):
    """GET /api/dashboard/summary — Total income, expenses, net balance. All roles."""
    data = services.get_summary()
    return success_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def by_category(request):
    """GET /api/dashboard/by-category — Category-wise breakdown. All roles."""
    data = services.get_by_category()
    return success_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, RequireRole.for_role('ANALYST')])
def trends(request):
    """GET /api/dashboard/trends — Monthly income/expense trends. Analyst, Admin."""
    try:
        months = int(request.query_params.get('months', 6))
        months = max(1, min(24, months))
    except (TypeError, ValueError):
        months = 6

    data = services.get_monthly_trends(months)
    return success_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """GET /api/dashboard/recent — Recent transactions. All roles."""
    try:
        limit = int(request.query_params.get('limit', 10))
        limit = max(1, min(50, limit))
    except (TypeError, ValueError):
        limit = 10

    data = services.get_recent_activity(limit)
    return success_response(data)
