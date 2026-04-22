from django.db import models
from farmers.models import Farmer
import uuid


class MilkLog(models.Model):
    SESSION_CHOICES = [('morning', 'Morning'), ('evening', 'Evening')]
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='milk_logs')
    date = models.DateField()
    session = models.CharField(max_length=10, choices=SESSION_CHOICES)
    quantity_litres = models.DecimalField(max_digits=6, decimal_places=1)
    fat_percentage = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    snf_percentage = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-session']
        unique_together = ['farmer', 'date', 'session']

    def __str__(self):
        return f"{self.farmer} - {self.date} {self.session}"


class VAPBatch(models.Model):
    PRODUCT_CHOICES = [
        ('ghee', 'Ghee'), ('paneer', 'Paneer'),
        ('curd', 'Curd / Yogurt'), ('butter', 'Butter'),
        ('buttermilk', 'Buttermilk'), ('khoya', 'Khoya'),
    ]
    STATUS_CHOICES = [
        ('produced', 'Produced'), ('packaged', 'Packaged'),
        ('dispatched', 'Dispatched'), ('sold', 'Sold'),
    ]
    batch_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    product_type = models.CharField(max_length=30, choices=PRODUCT_CHOICES)
    quantity_kg = models.DecimalField(max_digits=8, decimal_places=2)
    production_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='produced')
    source_farmers = models.ManyToManyField(Farmer, related_name='vap_batches', blank=True)
    total_milk_used_litres = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    processed_by = models.ForeignKey(Farmer, on_delete=models.SET_NULL, null=True,
                                     related_name='processed_batches')
    notes = models.TextField(blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def batch_short_id(self):
        return str(self.batch_id)[:8].upper()

    def __str__(self):
        return f"{self.get_product_type_display()} - {self.batch_short_id}"

    class Meta:
        ordering = ['-production_date']