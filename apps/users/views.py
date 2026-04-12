from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.exceptions import ConflictError, BadRequestError
from apps.core.response import success_response
from apps.core.pagination import StandardPagination
from apps.users.permissions import RequireRole
from .models import User
from .serializers import UserSerializer, CreateUserSerializer, UpdateUserSerializer


class UserListCreateView(APIView):
    """
    GET  /api/users/  — List all users with optional role/status filters (Admin)
    POST /api/users/  — Create a new user (Admin)
    """
    permission_classes = [IsAuthenticated, RequireRole.for_role('ADMIN')]

    def get(self, request):
        qs = User.objects.all()

        role = request.query_params.get('role')
        usr_status = request.query_params.get('status')
        if role:
            qs = qs.filter(role=role)
        if usr_status:
            qs = qs.filter(status=usr_status)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserSerializer(page, many=True)
        data, meta = paginator.get_paginated_response_data(serializer.data)
        return success_response(data, meta=meta)

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        if User.objects.filter(email=email).exists():
            raise ConflictError('An account with this email already exists')

        user = serializer.save()
        return success_response(UserSerializer(user).data, http_status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """
    GET    /api/users/<id>/  — Get a single user (Admin)
    PATCH  /api/users/<id>/  — Update name/role/status (Admin)
    DELETE /api/users/<id>/  — Deactivate a user (Admin)
    """
    permission_classes = [IsAuthenticated, RequireRole.for_role('ADMIN')]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound('User not found')

    def get(self, request, pk):
        user = self._get_user(pk)
        return success_response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)

        # Prevent admin from deactivating themselves
        if str(pk) == str(request.user.pk) and request.data.get('status') == 'INACTIVE':
            raise BadRequestError('You cannot deactivate your own account')

        serializer = UpdateUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(UserSerializer(user).data)

    def delete(self, request, pk):
        user = self._get_user(pk)

        if str(pk) == str(request.user.pk):
            raise BadRequestError('You cannot deactivate your own account')

        user.status = 'INACTIVE'
        user.save()
        return success_response(UserSerializer(user).data)
