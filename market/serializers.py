from rest_framework import serializers
from .models import ProductListing, Order, Buyer, BuyerEnquiry


class ProductListingSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.SerializerMethodField()
    unit_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    traceability_url = serializers.ReadOnlyField()
    batch_short_id = serializers.SerializerMethodField()
    order_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductListing
        fields = ['id', 'cooperative', 'cooperative_name', 'product_name',
                  'product_type', 'description', 'price_per_unit', 'unit',
                  'unit_display', 'quantity_available', 'minimum_order',
                  'source_batch', 'batch_short_id', 'traceability_url',
                  'district', 'status', 'status_display', 'certifications',
                  'order_count', 'created_at']
        read_only_fields = ['cooperative']

    def get_cooperative_name(self, obj):
        return obj.cooperative.user.get_full_name()

    def get_unit_display(self, obj):
        return obj.get_unit_display()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_batch_short_id(self, obj):
        return obj.source_batch.batch_short_id if obj.source_batch else None

    def get_order_count(self, obj):
        return obj.orders.filter(status__in=['pending','confirmed','dispatched']).count()

    def create(self, validated_data):
        cooperative = self.context['request'].user.farmer_profile
        return ProductListing.objects.create(cooperative=cooperative, **validated_data)


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    order_short_id = serializers.ReadOnlyField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'order_short_id', 'listing', 'product_name',
                  'buyer_name', 'buyer_phone', 'buyer_email', 'buyer_type',
                  'buyer_city', 'quantity', 'total_amount', 'delivery_address',
                  'special_instructions', 'status', 'status_display',
                  'ordered_at', 'updated_at']

    def get_product_name(self, obj): return obj.listing.product_name
    def get_status_display(self, obj): return obj.get_status_display()

    def create(self, validated_data):
        listing = validated_data['listing']
        qty = validated_data['quantity']
        validated_data['total_amount'] = listing.price_per_unit * qty
        return Order.objects.create(**validated_data)


class BuyerEnquirySerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = BuyerEnquiry
        fields = ['id', 'listing', 'product_name', 'buyer_name',
                  'buyer_phone', 'buyer_city', 'message',
                  'is_responded', 'created_at']

    def get_product_name(self, obj): return obj.listing.product_name
