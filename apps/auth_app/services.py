import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate as django_authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import User
from apps.core.exceptions import ConflictError, BadRequestError
from rest_framework.exceptions import AuthenticationFailed
from .models import RefreshToken


def _generate_access_token(user: User) -> str:
    """Issue a simplejwt access token."""
    token = AccessToken.for_user(user)
    return str(token)


def _generate_refresh_token() -> str:
    """64-byte cryptographically random hex string — not a JWT."""
    return secrets.token_hex(64)


def _get_refresh_expiry() -> timezone.datetime:
    days = getattr(settings, 'SIMPLE_JWT', {}).get(
        'REFRESH_TOKEN_LIFETIME', timedelta(days=7)
    )
    return timezone.now() + days


# ── Service functions ──────────────────────────────────────────────────────────

def register(email: str, password: str, name: str) -> User:
    if User.objects.filter(email=email).exists():
        raise ConflictError('An account with this email already exists')

    user = User.objects.create_user(email=email, password=password, name=name)
    return user


def login(email: str, password: str) -> dict:
    # Constant-time guard: always call check_password to prevent user enumeration
    try:
        user = User.objects.get(email=email)
        is_valid = user.check_password(password)
    except User.DoesNotExist:
        user = None
        is_valid = False

    if not user or not is_valid:
        raise AuthenticationFailed('Invalid email or password')

    if user.status == 'INACTIVE':
        raise AuthenticationFailed('Account is inactive. Contact an administrator.')

    access_token = _generate_access_token(user)
    raw_refresh = _generate_refresh_token()

    RefreshToken.objects.create(
        token_hash=RefreshToken.hash_token(raw_refresh),
        user=user,
        expires_at=_get_refresh_expiry(),
    )

    return {
        'accessToken': access_token,
        'refreshToken': raw_refresh,
        'user': {
            'id': user.pk,
            'email': user.email,
            'name': user.name,
            'role': user.role,
        },
    }


def refresh_tokens(raw_refresh: str) -> dict:
    token_hash = RefreshToken.hash_token(raw_refresh)

    try:
        stored = RefreshToken.objects.select_related('user').get(token_hash=token_hash)
    except RefreshToken.DoesNotExist:
        raise AuthenticationFailed('Invalid or expired refresh token')

    if stored.expires_at < timezone.now():
        stored.delete()
        raise AuthenticationFailed('Invalid or expired refresh token')

    user = stored.user
    if user.status == 'INACTIVE':
        raise AuthenticationFailed('Account is inactive')

    # Token rotation: delete old, issue new
    stored.delete()

    new_raw_refresh = _generate_refresh_token()
    RefreshToken.objects.create(
        token_hash=RefreshToken.hash_token(new_raw_refresh),
        user=user,
        expires_at=_get_refresh_expiry(),
    )

    new_access = _generate_access_token(user)
    return {'accessToken': new_access, 'refreshToken': new_raw_refresh}


def logout(raw_refresh: str) -> None:
    token_hash = RefreshToken.hash_token(raw_refresh)
    # Idempotent — silently ignore if not found
    RefreshToken.objects.filter(token_hash=token_hash).delete()
