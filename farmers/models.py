from django.db import models
from django.contrib.auth.models import User


class Farmer(models.Model):
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('manager', 'Cooperative Manager'),
        ('nabard', 'NABARD Officer'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    phone = models.CharField(max_length=15, unique=True)
    village = models.CharField(max_length=100)
    district = models.CharField(max_length=100, default='Madurai')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.village}"

    class Meta:
        ordering = ['-created_at']


class Farm(models.Model):
    CROP_CHOICES = [
        ('sorghum', 'Sorghum / Cholam'),
        ('maize', 'Maize / Makka Cholam'),
        ('napier', 'Napier Grass'),
        ('paddy', 'Paddy / Rice'),
        ('sugarcane', 'Sugarcane'),
        ('cotton', 'Cotton'),
        ('groundnut', 'Groundnut'),
        ('other', 'Other'),
    ]
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='farms')
    name = models.CharField(max_length=100)
    area_acres = models.DecimalField(max_digits=8, decimal_places=2)
    crop_type = models.CharField(max_length=50, choices=CROP_CHOICES, default='sorghum')
    sowing_date = models.DateField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer} - {self.name}"

    class Meta:
        ordering = ['-created_at']


class Cattle(models.Model):
    BREED_CHOICES = [
        ('hf', 'Holstein Friesian'),
        ('jersey', 'Jersey'),
        ('kangayam', 'Kangayam'),
        ('crossbred', 'Crossbred'),
        ('murrah', 'Murrah Buffalo'),
        ('other', 'Other'),
    ]
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='cattle')
    tag_number = models.CharField(max_length=50)
    breed = models.CharField(max_length=50, choices=BREED_CHOICES)
    age_years = models.PositiveIntegerField(default=2)
    is_milking = models.BooleanField(default=True)
    expected_daily_yield_litres = models.DecimalField(max_digits=5, decimal_places=1, default=10.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tag_number} - {self.breed}"