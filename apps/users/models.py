from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Role(models.TextChoices):
    VIEWER = 'VIEWER', 'Viewer'
    ANALYST = 'ANALYST', 'Analyst'
    ADMIN = 'ADMIN', 'Admin'


class UserStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'


class UserManager(BaseUserManager):
    def create_user(self, email, password, name, role=Role.VIEWER, status=UserStatus.ACTIVE, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, role=role, status=status, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, name='Admin', **extra):
        extra.setdefault('role', Role.ADMIN)
        extra.setdefault('status', UserStatus.ACTIVE)
        return self.create_user(email, password, name, **extra)


class User(AbstractBaseUser):
    """
    Custom user model.
    Roles: VIEWER | ANALYST | ADMIN
    Status: ACTIVE | INACTIVE (soft-deactivation — never hard-delete)
    """
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    status = models.CharField(max_length=10, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} ({self.role})'


# Role level mapping for RBAC comparison
ROLE_LEVELS = {
    Role.VIEWER: 0,
    Role.ANALYST: 1,
    Role.ADMIN: 2,
}
