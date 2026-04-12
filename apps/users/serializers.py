from rest_framework import serializers
from .models import User, Role, UserStatus


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Role.choices, default=Role.VIEWER)

    class Meta:
        model = User
        fields = ['email', 'password', 'name', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'role', 'status']
        extra_kwargs = {
            'name': {'required': False},
            'role': {'required': False},
            'status': {'required': False},
        }
