"""
Dashboard analytics service — mirrors dashboard.service.ts exactly.
All queries exclude soft-deleted records (deleted_at IS NULL).
"""
from datetime import timedelta
from collections import defaultdict

from django.db.models import Sum, Count, Q
from django.utils import timezone

from apps.records.models import FinancialRecord


NOT_DELETED = {'deleted_at__isnull': True}


def get_summary() -> dict:
    """Total income, total expenses, net balance — all roles."""
    income = FinancialRecord.objects.filter(**NOT_DELETED, type='INCOME').aggregate(
        total=Sum('amount'), count=Count('id')
    )
    expense = FinancialRecord.objects.filter(**NOT_DELETED, type='EXPENSE').aggregate(
        total=Sum('amount'), count=Count('id')
    )

    total_income = float(income['total'] or 0)
    total_expenses = float(expense['total'] or 0)
    income_count = income['count'] or 0
    expense_count = expense['count'] or 0

    return {
        'totalIncome': total_income,
        'totalExpenses': total_expenses,
        'netBalance': total_income - total_expenses,
        'incomeCount': income_count,
        'expenseCount': expense_count,
        'totalTransactions': income_count + expense_count,
    }


def get_by_category() -> list:
    """Income and expense totals grouped by category — all roles."""
    records = (
        FinancialRecord.objects
        .filter(**NOT_DELETED)
        .values('category', 'type')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    cat_map = {}
    for r in records:
        cat = r['category']
        if cat not in cat_map:
            cat_map[cat] = {'category': cat, 'income': 0.0, 'expense': 0.0, 'net': 0.0, 'count': 0}

        amount = float(r['total'] or 0)
        if r['type'] == 'INCOME':
            cat_map[cat]['income'] += amount
        else:
            cat_map[cat]['expense'] += amount
        cat_map[cat]['count'] += r['count']
        cat_map[cat]['net'] = cat_map[cat]['income'] - cat_map[cat]['expense']

    return sorted(cat_map.values(), key=lambda x: abs(x['net']), reverse=True)


def get_monthly_trends(months: int = 6) -> list:
    """Monthly income/expense totals for the last N months — Analyst, Admin."""
    since = timezone.now()
    # Roll back to the 1st of the month, `months` months ago
    since = since.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year = since.year
    month = since.month - months
    while month <= 0:
        month += 12
        year -= 1
    since = since.replace(year=year, month=month)

    records = FinancialRecord.objects.filter(
        **NOT_DELETED, date__gte=since
    ).values('amount', 'type', 'date')

    # Group by YYYY-MM
    month_map = {}
    for r in records:
        key = r['date'].strftime('%Y-%m')
        if key not in month_map:
            month_map[key] = {'month': key, 'income': 0.0, 'expense': 0.0, 'net': 0.0}
        amount = float(r['amount'])
        if r['type'] == 'INCOME':
            month_map[key]['income'] += amount
        else:
            month_map[key]['expense'] += amount
        month_map[key]['net'] = month_map[key]['income'] - month_map[key]['expense']

    return sorted(month_map.values(), key=lambda x: x['month'])


def get_recent_activity(limit: int = 10) -> list:
    """N most recent non-deleted transactions — all roles."""
    limit = max(1, min(50, limit))
    records = (
        FinancialRecord.objects
        .filter(**NOT_DELETED)
        .select_related('user')
        .order_by('-date')[:limit]
    )

    return [
        {
            'id': r.id,
            'amount': float(r.amount),
            'type': r.type,
            'category': r.category,
            'date': r.date.isoformat(),
            'notes': r.notes,
            'user': {'id': r.user_id, 'name': r.user.name},
        }
        for r in records
    ]
