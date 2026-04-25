from django.db import models
from farmers.models import Farm, Cattle


class NDVIReading(models.Model):
    HEALTH_CHOICES = [
        ('excellent', 'Excellent'), ('good', 'Good'),
        ('moderate', 'Moderate'), ('stressed', 'Stressed'),
        ('critical', 'Critical'),
    ]
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='ndvi_readings')
    reading_date = models.DateField()
    ndvi_value = models.DecimalField(max_digits=5, decimal_places=3)
    health_status = models.CharField(max_length=20, choices=HEALTH_CHOICES)
    rainfall_mm = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def get_health_from_ndvi(cls, ndvi):
        if ndvi >= 0.50: return 'excellent'
        if ndvi >= 0.35: return 'good'
        if ndvi >= 0.20: return 'moderate'
        if ndvi >= 0.10: return 'stressed'
        return 'critical'

    class Meta:
        ordering = ['-reading_date']
        unique_together = ['farm', 'reading_date']

    def __str__(self):
        return f"{self.farm.name} - {self.reading_date} - {self.ndvi_value}"


class CropAlert(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, default='stress')
    severity = models.CharField(max_length=10, default='medium')
    message_en = models.TextField()
    message_ta = models.TextField(blank=True)
    is_sms_sent = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.farm.name} - {self.alert_type}"


# ── GRAZING LAND ──────────────────────────────────────────────
class GrazingLand(models.Model):
    LAND_TYPE_CHOICES = [
        ('common',    'Common Grazing Land'),
        ('private',   'Private Pasture'),
        ('roadside',  'Roadside Grazing'),
        ('forest',    'Forest Fringe'),
        ('fallow',    'Fallow Field'),
    ]
    farmer = models.ForeignKey('farmers.Farmer', on_delete=models.CASCADE, related_name='grazing_lands')
    name = models.CharField(max_length=100)
    land_type = models.CharField(max_length=20, choices=LAND_TYPE_CHOICES, default='common')
    area_acres = models.DecimalField(max_digits=6, decimal_places=2)
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    max_cattle_capacity = models.PositiveIntegerField(default=5)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer} - {self.name}"

    class Meta:
        ordering = ['-created_at']


class PastureReading(models.Model):
    PASTURE_HEALTH_CHOICES = [
        ('abundant',  'Abundant'),
        ('adequate',  'Adequate'),
        ('depleted',  'Depleting'),
        ('exhausted', 'Exhausted'),
    ]
    grazing_land = models.ForeignKey(GrazingLand, on_delete=models.CASCADE, related_name='pasture_readings')
    reading_date = models.DateField()
    ndvi_value = models.DecimalField(max_digits=5, decimal_places=3)
    pasture_health = models.CharField(max_length=20, choices=PASTURE_HEALTH_CHOICES)
    estimated_grazing_days = models.PositiveIntegerField(default=0)
    rainfall_mm = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    recommendation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reading_date']
        unique_together = ['grazing_land', 'reading_date']

    def __str__(self):
        return f"{self.grazing_land.name} - {self.reading_date}"


# ── GPS COLLAR TRACKING ───────────────────────────────────────
class CattleLocation(models.Model):
    cattle = models.ForeignKey(Cattle, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    accuracy_metres = models.PositiveIntegerField(default=10)
    battery_percent = models.PositiveIntegerField(default=100)
    is_outside_geofence = models.BooleanField(default=False)
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.cattle.tag_number} - {self.recorded_at}"


class GrazingGeofence(models.Model):
    grazing_land = models.OneToOneField(GrazingLand, on_delete=models.CASCADE, related_name='geofence')
    center_lat = models.DecimalField(max_digits=10, decimal_places=7)
    center_lng = models.DecimalField(max_digits=10, decimal_places=7)
    radius_metres = models.PositiveIntegerField(default=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Geofence: {self.grazing_land.name}"


class GrazingSession(models.Model):
    cattle = models.ForeignKey(Cattle, on_delete=models.CASCADE, related_name='grazing_sessions')
    grazing_land = models.ForeignKey(GrazingLand, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.cattle.tag_number} grazing at {self.grazing_land.name}"
