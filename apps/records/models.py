from django.db import models
from apps.users.models import User


class RecordType(models.TextChoices):
    INCOME = 'INCOME', 'Income'
    EXPENSE = 'EXPENSE', 'Expense'


class FinancialRecord(models.Model):
    """
    Financial record with soft-delete.
    Deleted records are filtered with WHERE deleted_at IS NULL in all queries.
    Amount stored as Decimal(12,2) — no float precision loss.
    """
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=RecordType.choices)
    category = models.CharField(max_length=255, db_index=True)
    date = models.DateTimeField(db_index=True)
    notes = models.TextField(blank=True, null=True)

    # Soft delete — never hard-delete
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='financial_records')

    class Meta:
        db_table = 'financial_records'
        indexes = [
            models.Index(fields=['type']),
            models.Index(fields=['category']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f'{self.type} {self.amount} ({self.category})'
