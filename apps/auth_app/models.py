import hashlib
from django.db import models
from apps.users.models import User


class RefreshToken(models.Model):
    """
    Hashed refresh token store — mirrors the original Prisma RefreshToken model.
    The raw token is never persisted; only its SHA-256 hash is stored.
    """
    token_hash = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'refresh_tokens'

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()
