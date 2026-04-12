from rest_framework import serializers
from .models import FinancialRecord
from apps.users.serializers import UserSerializer


class RecordUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('apps.users.models', fromlist=['User']).User
        fields = ['id', 'name', 'email']


class FinancialRecordSerializer(serializers.ModelSerializer):
    user = RecordUserSerializer(read_only=True)

    class Meta:
        model = FinancialRecord
        fields = [
            'id', 'amount', 'type', 'category', 'date',
            'notes', 'created_at', 'updated_at', 'user',
        ]


class CreateRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialRecord
        fields = ['amount', 'type', 'category', 'date', 'notes']
        extra_kwargs = {
            'amount': {'required': True},
            'type': {'required': True},
            'category': {'required': True},
            'date': {'required': True},
            'notes': {'required': False},
        }


class UpdateRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialRecord
        fields = ['amount', 'type', 'category', 'date', 'notes']
        extra_kwargs = {
            'amount': {'required': False},
            'type': {'required': False},
            'category': {'required': False},
            'date': {'required': False},
            'notes': {'required': False},
        }
