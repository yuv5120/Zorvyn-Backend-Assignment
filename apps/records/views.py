import csv
import io

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.exceptions import BadRequestError
from apps.core.pagination import StandardPagination
from apps.core.response import success_response
from apps.users.permissions import RequireRole
from .models import FinancialRecord
from .serializers import FinancialRecordSerializer, CreateRecordSerializer, UpdateRecordSerializer


# Allowed sort fields (whitelist to prevent arbitrary column injection)
SORT_FIELDS = {'date', 'amount', 'created_at', 'category'}


def _build_queryset(params):
    """
    Build a filtered, sorted queryset from request query parameters.
    Soft-deleted records are always excluded.
    """
    qs = FinancialRecord.objects.filter(deleted_at__isnull=True).select_related('user')

    record_type = params.get('type')
    category = params.get('category')
    date_from = params.get('dateFrom')
    date_to = params.get('dateTo')
    search = params.get('search')
    sort_by = params.get('sortBy', 'date')
    sort_order = params.get('sortOrder', 'desc')

    if record_type in ('INCOME', 'EXPENSE'):
        qs = qs.filter(type=record_type)
    if category:
        qs = qs.filter(category__icontains=category)
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    if search:
        qs = qs.filter(Q(category__icontains=search) | Q(notes__icontains=search))

    # Safe sort
    sort_col = sort_by if sort_by in SORT_FIELDS else 'date'
    if sort_order == 'asc':
        qs = qs.order_by(sort_col)
    else:
        qs = qs.order_by(f'-{sort_col}')

    return qs


class RecordListCreateView(APIView):
    """
    GET  /api/records/  — List financial records with filters, search, pagination
    POST /api/records/  — Create a new financial record (Analyst, Admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _build_queryset(request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = FinancialRecordSerializer(page, many=True)
        data, meta = paginator.get_paginated_response_data(serializer.data)
        return success_response(data, meta=meta)

    def post(self, request):
        # Require at least ANALYST
        req_perm = RequireRole.for_role('ANALYST')()
        if not req_perm.has_permission(request, self):
            raise PermissionDenied('Analyst or Admin role required')

        serializer = CreateRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(user=request.user)
        return success_response(
            FinancialRecordSerializer(record).data,
            http_status=201,
        )


class RecordExportView(APIView):
    """
    GET /api/records/export  — Export filtered records as CSV (Analyst, Admin)
    """
    permission_classes = [IsAuthenticated, RequireRole.for_role('ANALYST')]

    def get(self, request):
        qs = _build_queryset(request.query_params)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'amount', 'type', 'category', 'date', 'notes', 'user_id', 'created_at'])

        for r in qs:
            writer.writerow([
                r.id, r.amount, r.type, r.category,
                r.date.isoformat(), r.notes or '',
                r.user_id, r.created_at.isoformat(),
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="records.csv"'
        return response


class RecordDetailView(APIView):
    """
    GET    /api/records/<id>/  — Get a single record (all roles)
    PATCH  /api/records/<id>/  — Update a record (Analyst owns, Admin any)
    DELETE /api/records/<id>/  — Soft-delete a record (Admin only)
    """
    permission_classes = [IsAuthenticated]

    def _get_record(self, pk):
        try:
            return FinancialRecord.objects.select_related('user').get(pk=pk, deleted_at__isnull=True)
        except FinancialRecord.DoesNotExist:
            raise NotFound('Financial record not found')

    def get(self, request, pk):
        record = self._get_record(pk)
        return success_response(FinancialRecordSerializer(record).data)

    def patch(self, request, pk):
        # Require ANALYST minimum
        req_perm = RequireRole.for_role('ANALYST')()
        if not req_perm.has_permission(request, self):
            raise PermissionDenied('Analyst or Admin role required')

        record = self._get_record(pk)

        # Analysts can only update records they created
        if request.user.role == 'ANALYST' and record.user_id != request.user.pk:
            raise PermissionDenied('Analysts can only update records they created')

        serializer = UpdateRecordSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(FinancialRecordSerializer(record).data)

    def delete(self, request, pk):
        # Admin only
        req_perm = RequireRole.for_role('ADMIN')()
        if not req_perm.has_permission(request, self):
            raise PermissionDenied('Admin role required')

        record = self._get_record(pk)
        record.deleted_at = timezone.now()
        record.save()
        return success_response({
            'message': 'Record soft-deleted successfully',
            'id': record.id,
            'deleted_at': record.deleted_at.isoformat(),
        })
