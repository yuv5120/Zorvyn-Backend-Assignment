"""
Seed the database with one user per role and 20+ financial records.
Usage: python manage.py seed
"""
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.users.models import User
from apps.records.models import FinancialRecord


def months_ago(n):
    now = timezone.now()
    return (now - relativedelta(months=n)).replace(day=15, hour=0, minute=0, second=0, microsecond=0)


class Command(BaseCommand):
    help = 'Seed the database with demo users and financial records (idempotent)'

    def handle(self, *args, **options):
        self.stdout.write('🌱  Seeding database...\n')

        # Idempotent: wipe existing seed data
        FinancialRecord.objects.all().delete()
        User.objects.all().delete()

        # ── Users ─────────────────────────────────────────────────────────────
        admin = User.objects.create_user(
            email='admin@finance.com',
            password='Admin@123',
            name='Alice Admin',
            role='ADMIN',
            status='ACTIVE',
        )
        analyst = User.objects.create_user(
            email='analyst@finance.com',
            password='Analyst@123',
            name='Bob Analyst',
            role='ANALYST',
            status='ACTIVE',
        )
        viewer = User.objects.create_user(
            email='viewer@finance.com',
            password='Viewer@123',
            name='Carol Viewer',
            role='VIEWER',
            status='ACTIVE',
        )

        # ── Financial Records ─────────────────────────────────────────────────
        now = timezone.now()
        records = [
            # Month 0
            dict(amount='85000.00', type='INCOME',  category='Salary',      date=months_ago(0), notes='Monthly salary — April',        user=admin),
            dict(amount='12000.00', type='INCOME',  category='Freelance',   date=months_ago(0), notes='UI design contract payment',    user=analyst),
            dict(amount='3200.00',  type='EXPENSE', category='Rent',        date=months_ago(0), notes='Office space — April',          user=admin),
            dict(amount='1500.00',  type='EXPENSE', category='Utilities',   date=months_ago(0), notes='Electricity + internet',        user=admin),
            dict(amount='4500.00',  type='EXPENSE', category='Software',    date=months_ago(0), notes='SaaS subscriptions',            user=analyst),
            # Month 1
            dict(amount='78000.00', type='INCOME',  category='Salary',      date=months_ago(1), notes='Monthly salary — March',       user=admin),
            dict(amount='9500.00',  type='INCOME',  category='Consultancy', date=months_ago(1), notes='Strategy consulting session',  user=analyst),
            dict(amount='3200.00',  type='EXPENSE', category='Rent',        date=months_ago(1), notes='Office space — March',         user=admin),
            dict(amount='2100.00',  type='EXPENSE', category='Marketing',   date=months_ago(1), notes='LinkedIn ads campaign',        user=admin),
            dict(amount='6800.00',  type='EXPENSE', category='Equipment',   date=months_ago(1), notes='New laptop',                   user=admin),
            # Month 2
            dict(amount='85000.00', type='INCOME',  category='Salary',      date=months_ago(2), notes='Monthly salary — February',   user=admin),
            dict(amount='15000.00', type='INCOME',  category='Investment',  date=months_ago(2), notes='Dividends received',           user=admin),
            dict(amount='3200.00',  type='EXPENSE', category='Rent',        date=months_ago(2), notes='Office space — February',      user=admin),
            dict(amount='890.00',   type='EXPENSE', category='Utilities',   date=months_ago(2), notes='Water + electricity',          user=admin),
            dict(amount='2500.00',  type='EXPENSE', category='Travel',      date=months_ago(2), notes='Client visit — Bangalore',     user=analyst),
            # Month 3
            dict(amount='70000.00', type='INCOME',  category='Salary',      date=months_ago(3), notes='Monthly salary — January',    user=admin),
            dict(amount='5000.00',  type='INCOME',  category='Freelance',   date=months_ago(3), notes='Logo design project',         user=analyst),
            dict(amount='3200.00',  type='EXPENSE', category='Rent',        date=months_ago(3), notes='Office space — January',      user=admin),
            dict(amount='1200.00',  type='EXPENSE', category='Software',    date=months_ago(3), notes='Annual license renewals',     user=analyst),
            dict(amount='3800.00',  type='EXPENSE', category='Marketing',   date=months_ago(3), notes='Google Ads — Q1',             user=admin),
            # Soft-deleted record to demo the feature
            dict(amount='500.00',   type='EXPENSE', category='Miscellaneous', date=months_ago(0), notes='Incorrectly entered — deleted', user=admin, deleted_at=now),
        ]

        for r in records:
            FinancialRecord.objects.create(**r)

        self.stdout.write(self.style.SUCCESS('\n✅  Seed complete!\n'))
        self.stdout.write('─' * 50)
        self.stdout.write('\n  Seeded accounts (use these to log in):\n')
        self.stdout.write('\n  Role     │ Email                    │ Password')
        self.stdout.write('\n  ─────────┼──────────────────────────┼──────────────')
        self.stdout.write('\n  ADMIN    │ admin@finance.com         │ Admin@123')
        self.stdout.write('\n  ANALYST  │ analyst@finance.com       │ Analyst@123')
        self.stdout.write('\n  VIEWER   │ viewer@finance.com        │ Viewer@123')
        self.stdout.write('\n' + '─' * 50)
        self.stdout.write('\n\n  Seeded 20 active + 1 soft-deleted financial records')
        self.stdout.write('\n  API Docs → http://localhost:8000/api/docs/\n')
