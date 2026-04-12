from rest_framework.permissions import BasePermission
from apps.users.models import ROLE_LEVELS


class RequireRole(BasePermission):
    """
    Factory-style RBAC permission.
    Usage: permission_classes = [IsAuthenticated, RequireRole.for_role('ANALYST')]

    Follows the same numeric level hierarchy as the original role.middleware.ts:
      VIEWER (0) < ANALYST (1) < ADMIN (2)
    """

    minimum_role = 'VIEWER'

    @classmethod
    def for_role(cls, role: str):
        return type(f'RequireRole_{role}', (cls,), {'minimum_role': role})

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.status == 'INACTIVE':
            return False
        user_level = ROLE_LEVELS.get(request.user.role, -1)
        required_level = ROLE_LEVELS.get(self.minimum_role, 999)
        return user_level >= required_level
