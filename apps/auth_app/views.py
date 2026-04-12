from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from apps.core.response import success_response
from apps.users.serializers import UserSerializer
from . import services


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register — Create a new account (no auth required)."""
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    name = request.data.get('name', '').strip()

    if not email or not password or not name:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'message': 'email, password and name are required'})

    user = services.register(email, password, name)
    return success_response(UserSerializer(user).data, http_status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login — Login and receive tokens."""
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'message': 'email and password are required'})

    data = services.login(email, password)
    return success_response(data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh(request):
    """POST /api/auth/refresh — Rotate refresh token, issue new access token."""
    raw_refresh = request.data.get('refreshToken', '')
    if not raw_refresh:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'message': 'refreshToken is required'})

    data = services.refresh_tokens(raw_refresh)
    return success_response(data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    """POST /api/auth/logout — Invalidate refresh token (idempotent)."""
    raw_refresh = request.data.get('refreshToken', '')
    services.logout(raw_refresh)
    return success_response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me — Get current authenticated user."""
    return success_response(UserSerializer(request.user).data)
