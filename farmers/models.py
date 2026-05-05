from django.db import models
from django.contrib.auth.models import User
import random
import string


def generate_cooperative_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Cooperative(models.Model):
    PLAN_CHOICES = [
        ('starter',    'Starter — Free'),
        ('growth',     'Growth — Rs 999/month'),
        ('enterprise', 'Enterprise — Rs 2499/month'),
        ('nabard',     'NABARD District Licence'),
    ]
    name         = models.CharField(max_length=200)
    code         = models.CharField(max_length=20, unique=True, default=generate_cooperative_code)
    district     = models.CharField(max_length=100)
    state        = models.CharField(max_length=100, default='Tamil Nadu')
    address      = models.TextField(blank=True)
    phone        = models.CharField(max_length=15, blank=True)
    email        = models.EmailField(blank=True)
    plan         = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    is_active    = models.BooleanField(default=True)
    is_verified  = models.BooleanField(default=False)
    max_farmers  = models.PositiveIntegerField(default=10)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        ordering = ['-created_at']

    @property
    def farmer_count(self):
        return self.farmers.count()

    @property
    def can_add_farmer(self):
        return self.farmers.count() < self.max_farmers


class Farmer(models.Model):
    ROLE_CHOICES = [
        ('farmer',  'Farmer'),
        ('manager', 'Cooperative Manager'),
        ('nabard',  'NABARD Officer'),
    ]
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
    cooperative = models.ForeignKey(Cooperative, on_delete=models.SET_NULL, null=True, blank=True, related_name='farmers')
    phone       = models.CharField(max_length=15, unique=True)
    village     = models.CharField(max_length=100, blank=True)
    district    = models.CharField(max_length=100, default='Madurai')
    role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')
    is_approved = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.phone})"

    @property
    def full_name(self):
        return self.user.get_full_name()

    class Meta:
        ordering = ['-created_at']


class Farm(models.Model):
    CROP_CHOICES = [
        ('paddy',     'Paddy / Rice'),
        ('maize',     'Maize / Corn'),
        ('sorghum',   'Sorghum / Jowar'),
        ('napier',    'Napier Grass'),
        ('sugarcane', 'Sugarcane'),
        ('cotton',    'Cotton'),
        ('groundnut', 'Groundnut'),
        ('other',     'Other'),
    ]
    farmer      = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='farms')
    name        = models.CharField(max_length=100)
    crop_type   = models.CharField(max_length=20, choices=CROP_CHOICES, default='other')
    area_acres  = models.DecimalField(max_digits=6, decimal_places=2, default=1.0)
    latitude    = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude   = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    sowing_date = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer} — {self.name}"


class Cattle(models.Model):
    BREED_CHOICES = [
        ('hf',      'Holstein Friesian'),
        ('jersey',  'Jersey'),
        ('gir',     'Gir'),
        ('sahiwal', 'Sahiwal'),
        ('murrah',  'Murrah Buffalo'),
        ('surti',   'Surti Buffalo'),
        ('mixed',   'Mixed Breed'),
        ('other',   'Other'),
    ]
    farmer                  = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='cattle')
    tag_number              = models.CharField(max_length=20, unique=True)
    breed                   = models.CharField(max_length=20, choices=BREED_CHOICES)
    age_years               = models.PositiveIntegerField(default=3)
    is_milking              = models.BooleanField(default=True)
    expected_daily_yield_litres = models.DecimalField(max_digits=5, decimal_places=1, default=5.0)
    created_at              = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tag_number} — {self.farmer}"

    def get_breed_display(self):
        return dict(self.BREED_CHOICES).get(self.breed, self.breed)
