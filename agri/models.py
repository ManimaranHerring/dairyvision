from django.db import models
from farmers.models import Farm


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


class CropAlert(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, default='stress')
    severity = models.CharField(max_length=10, default='medium')
    message_en = models.TextField()
    message_ta = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']