from rest_framework import serializers
from .models import Farmer, Farm, Cattle


class FarmerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    cattle_count = serializers.SerializerMethodField()
    farm_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()

    class Meta:
        model = Farmer
        fields = ['id', 'full_name', 'phone', 'village', 'district',
                  'role', 'cattle_count', 'farm_count', 'joined']

    def get_full_name(self, obj): return obj.user.get_full_name()
    def get_cattle_count(self, obj): return obj.cattle.count()
    def get_farm_count(self, obj): return obj.farms.count()
    def get_joined(self, obj): return str(obj.created_at.date())


class FarmSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    crop_display = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = ['id', 'farmer', 'farmer_name', 'name', 'crop_type',
                  'crop_display', 'area_acres', 'latitude', 'longitude',
                  'sowing_date', 'created_at']
        read_only_fields = ['farmer']

    def get_farmer_name(self, obj): return obj.farmer.user.get_full_name()
    def get_crop_display(self, obj): return obj.get_crop_type_display()


class CattleSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    breed_display = serializers.SerializerMethodField()

    class Meta:
        model = Cattle
        fields = ['id', 'farmer', 'farmer_name', 'tag_number', 'breed',
                  'breed_display', 'age_years', 'is_milking',
                  'expected_daily_yield_litres', 'created_at']
        read_only_fields = ['farmer']

    def get_farmer_name(self, obj): return obj.farmer.user.get_full_name()
    def get_breed_display(self, obj): return obj.get_breed_display()
