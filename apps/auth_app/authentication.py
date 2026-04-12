"""
Custom JWT authentication backend.
Verifies the Bearer access token and re-fetches the user from DB on every request
so that role/status changes take effect immediately — matching the original auth.middleware.ts.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.users.models import User


class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None  # Let other authenticators or permission classes handle it

        raw_token = auth_header[7:]

        try:
            token = AccessToken(raw_token)
        except TokenError:
            raise AuthenticationFailed('Invalid or expired access token')

        user_id = token.get('user_id')
        if not user_id:
            raise AuthenticationFailed('Invalid token payload')

        try:
            # Re-fetch from DB each request — respects role/status changes immediately
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')

        if user.status == 'INACTIVE':
            raise AuthenticationFailed('Account is inactive')

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'
