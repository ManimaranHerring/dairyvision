from rest_framework import serializers
from .models import MilkLog, VAPBatch


class MilkLogSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    session_display = serializers.SerializerMethodField()

    class Meta:
        model = MilkLog
        fields = ['id', 'farmer', 'farmer_name', 'date', 'session',
                  'session_display', 'quantity_litres', 'fat_percentage',
                  'snf_percentage', 'notes', 'created_at']
        read_only_fields = ['farmer']

    def get_farmer_name(self, obj): return obj.farmer.user.get_full_name()
    def get_session_display(self, obj): return obj.get_session_display()

    def create(self, validated_data):
        farmer = self.context['request'].user.farmer_profile
        return MilkLog.objects.create(farmer=farmer, **validated_data)


class VAPBatchSerializer(serializers.ModelSerializer):
    product_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    batch_short_id = serializers.ReadOnlyField()
    source_farmer_names = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = VAPBatch
        fields = ['id', 'batch_id', 'batch_short_id', 'product_type',
                  'product_display', 'quantity_kg', 'production_date',
                  'expiry_date', 'status', 'status_display', 'source_farmers',
                  'source_farmer_names', 'total_milk_used_litres',
                  'processed_by', 'notes', 'qr_code_url', 'created_at']

    def get_product_display(self, obj): return obj.get_product_type_display()
    def get_status_display(self, obj): return obj.get_status_display()
    def get_source_farmer_names(self, obj):
        return [f.user.get_full_name() for f in obj.source_farmers.all()]

    def get_qr_code_url(self, obj):
        req = self.context.get('request')
        if obj.qr_code and req:
            return req.build_absolute_uri(obj.qr_code.url)
        return None