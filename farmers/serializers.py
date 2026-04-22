from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Farmer, Farm, Cattle


class FarmerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    cattle_count = serializers.SerializerMethodField()
    farm_count = serializers.SerializerMethodField()

    class Meta:
        model = Farmer
        fields = ['id', 'full_name', 'phone', 'village', 'district',
                  'role', 'cattle_count', 'farm_count', 'created_at']

    def get_full_name(self, obj): return obj.user.get_full_name()
    def get_cattle_count(self, obj): return obj.cattle.count()
    def get_farm_count(self, obj): return obj.farms.count()


class FarmerRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField(required=False, default='')
    phone = serializers.CharField()
    village = serializers.CharField()
    district = serializers.CharField(default='Madurai')
    role = serializers.ChoiceField(choices=['farmer', 'manager', 'nabard'], default='farmer')
    password = serializers.CharField(write_only=True, default='demo1234')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['phone'],
            first_name=validated_data['first_name'],
            last_name=validated_data.get('last_name', ''),
            password=validated_data.get('password', 'demo1234'),
        )
        return Farmer.objects.create(
            user=user,
            phone=validated_data['phone'],
            village=validated_data['village'],
            district=validated_data.get('district', 'Madurai'),
            role=validated_data.get('role', 'farmer'),
        )


class FarmSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    crop_display = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = ['id', 'farmer', 'farmer_name', 'name', 'area_acres',
                  'crop_type', 'crop_display', 'sowing_date',
                  'latitude', 'longitude', 'created_at']
        read_only_fields = ['farmer']

    def get_farmer_name(self, obj): return obj.farmer.user.get_full_name()
    def get_crop_display(self, obj): return obj.get_crop_type_display()

    def create(self, validated_data):
        farmer = self.context['request'].user.farmer_profile
        return Farm.objects.create(farmer=farmer, **validated_data)


class CattleSerializer(serializers.ModelSerializer):
    breed_display = serializers.SerializerMethodField()

    class Meta:
        model = Cattle
        fields = ['id', 'farmer', 'tag_number', 'breed', 'breed_display',
                  'age_years', 'is_milking', 'expected_daily_yield_litres', 'created_at']
        read_only_fields = ['farmer']

    def get_breed_display(self, obj): return obj.get_breed_display()

    def create(self, validated_data):
        farmer = self.context['request'].user.farmer_profile
        return Cattle.objects.create(farmer=farmer, **validated_data)