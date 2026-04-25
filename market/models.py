from django.db import models
from farmers.models import Farmer
from dairy.models import VAPBatch
import uuid


class Buyer(models.Model):
    BUYER_TYPE_CHOICES = [
        ('hotel',       'Hotel / Restaurant'),
        ('supermarket', 'Supermarket / Retail'),
        ('school',      'School / Institution'),
        ('export',      'Export Aggregator'),
        ('individual',  'Individual Buyer'),
        ('government',  'Government / AAVIN'),
    ]
    name = models.CharField(max_length=200)
    buyer_type = models.CharField(max_length=20, choices=BUYER_TYPE_CHOICES)
    contact_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default='Tamil Nadu')
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_buyer_type_display()})"

    class Meta:
        ordering = ['-created_at']


class ProductListing(models.Model):
    UNIT_CHOICES = [
        ('kg', 'Kilogram'), ('litre', 'Litre'),
        ('piece', 'Piece'), ('box', 'Box'),
    ]
    STATUS_CHOICES = [
        ('active',   'Active'),
        ('sold_out', 'Sold Out'),
        ('inactive', 'Inactive'),
    ]
    cooperative = models.ForeignKey(
        Farmer, on_delete=models.CASCADE, related_name='listings',
        limit_choices_to={'role': 'manager'}
    )
    product_name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=50)
    description = models.TextField()
    price_per_unit = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg')
    quantity_available = models.DecimalField(max_digits=8, decimal_places=2)
    minimum_order = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    source_batch = models.ForeignKey(
        VAPBatch, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='listings'
    )
    district = models.CharField(max_length=100, default='Madurai')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    certifications = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def traceability_url(self):
        if self.source_batch:
            return f"/trace/{self.source_batch.batch_id}"
        return None

    def __str__(self):
        return f"{self.product_name} — {self.cooperative}"

    class Meta:
        ordering = ['-created_at']


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('confirmed',  'Confirmed'),
        ('dispatched', 'Dispatched'),
        ('delivered',  'Delivered'),
        ('cancelled',  'Cancelled'),
    ]
    order_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    listing = models.ForeignKey(ProductListing, on_delete=models.CASCADE, related_name='orders')
    buyer_name = models.CharField(max_length=200)
    buyer_phone = models.CharField(max_length=15)
    buyer_email = models.EmailField(blank=True)
    buyer_type = models.CharField(max_length=30, default='individual')
    buyer_city = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=8, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_address = models.TextField()
    special_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    ordered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def order_short_id(self):
        return str(self.order_id)[:8].upper()

    def __str__(self):
        return f"Order {self.order_short_id} — {self.buyer_name}"

    class Meta:
        ordering = ['-ordered_at']


class BuyerEnquiry(models.Model):
    listing = models.ForeignKey(ProductListing, on_delete=models.CASCADE, related_name='enquiries')
    buyer_name = models.CharField(max_length=200)
    buyer_phone = models.CharField(max_length=15)
    buyer_city = models.CharField(max_length=100)
    message = models.TextField()
    is_responded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Enquiry from {self.buyer_name} for {self.listing}"

    class Meta:
        ordering = ['-created_at']
