from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from farmers.models import Farmer, Farm, Cattle
from dairy.models import MilkLog, VAPBatch
from agri.models import NDVIReading, CropAlert
from datetime import date, timedelta
from decimal import Decimal
import random

DEMO = [
    {'first': 'Murugan', 'last': 'Selvam', 'phone': '9876543201', 'village': 'Vadipatti',
     'cattle': [('MU-001','jersey',14.0),('MU-002','hf',18.0),('MU-003','crossbred',10.0)],
     'farms': [('Main Field',2.5,'sorghum',9.9312,77.9731),('River Side',1.5,'napier',9.9350,77.9750)]},
    {'first': 'Lakshmi', 'last': 'Rajan', 'phone': '9876543202', 'village': 'Usilampatti',
     'cattle': [('LR-001','murrah',12.0),('LR-002','jersey',15.0)],
     'farms': [('North Plot',3.0,'maize',9.9680,77.8200)]},
    {'first': 'Ravi', 'last': 'Kumar', 'phone': '9876543203', 'village': 'Thirumangalam',
     'cattle': [('RK-001','kangayam',8.0),('RK-002','hf',20.0),('RK-003','jersey',14.0)],
     'farms': [('South Field',4.0,'sugarcane',9.8250,77.9870)]},
    {'first': 'Meenakshi', 'last': 'Pandian', 'phone': '9876543204', 'village': 'Melur',
     'cattle': [('MP-001','jersey',16.0),('MP-002','murrah',10.0)],
     'farms': [('Home Field',1.5,'napier',10.0450,78.3370)]},
    {'first': 'Senthil', 'last': 'Arumugam', 'phone': '9876543205', 'village': 'Peraiyur',
     'cattle': [('SA-001','hf',22.0),('SA-002','hf',19.0),('SA-003','jersey',13.0)],
     'farms': [('East Block',5.0,'paddy',9.7850,77.9680)]},
]


class Command(BaseCommand):
    help = 'Load demo data'

    def handle(self, *args, **options):
        self.stdout.write('Clearing old data...')
        for M in [NDVIReading, CropAlert, MilkLog, VAPBatch, Cattle, Farm, Farmer]:
            M.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        created = []
        for fd in DEMO:
            user = User.objects.create_user(
                username=fd['phone'], first_name=fd['first'],
                last_name=fd['last'], password='demo1234')
            farmer = Farmer.objects.create(
                user=user, phone=fd['phone'],
                village=fd['village'], district='Madurai')

            for tag, breed, yld in fd['cattle']:
                Cattle.objects.create(
                    farmer=farmer, tag_number=tag, breed=breed,
                    is_milking=True, expected_daily_yield_litres=yld,
                    age_years=random.randint(2, 6))

            for fname, acres, crop, lat, lng in fd['farms']:
                farm = Farm.objects.create(
                    farmer=farmer, name=fname, area_acres=acres,
                    crop_type=crop, latitude=lat, longitude=lng,
                    sowing_date=date.today() - timedelta(days=random.randint(30, 90)))
                base = random.uniform(0.30, 0.55)
                for i in range(13, -1, -1):
                    rdate = date.today() - timedelta(days=i * 3)
                    noise = random.uniform(-0.05, 0.05)
                    if 5 <= i <= 8:
                        noise -= 0.12
                    ndvi = max(0.05, min(0.75, base + noise))
                    health = NDVIReading.get_health_from_ndvi(ndvi)
                    NDVIReading.objects.create(
                        farm=farm, reading_date=rdate,
                        ndvi_value=Decimal(str(round(ndvi, 3))),
                        health_status=health,
                        rainfall_mm=random.uniform(0, 20) if health in ['good', 'excellent'] else 0,
                        temperature_c=random.uniform(28, 38))
                    if health in ['stressed', 'critical']:
                        CropAlert.objects.get_or_create(
                            farm=farm, is_resolved=False,
                            defaults={
                                'severity': 'high' if health == 'critical' else 'medium',
                                'message_en': f"Stress on '{fname}'. NDVI={ndvi:.2f}. Irrigate.",
                                'message_ta': f"'{fname}' நிலத்தில் மன அழுத்தம். நீர்ப்பாசனம் தேவை.",
                            })

            total = sum(y for _, _, y in fd['cattle'])
            for i in range(30, -1, -1):
                d = date.today() - timedelta(days=i)
                for sess in ['morning', 'evening']:
                    qty = (total / 2) * random.uniform(0.85, 1.10)
                    MilkLog.objects.get_or_create(
                        farmer=farmer, date=d, session=sess,
                        defaults={
                            'quantity_litres': Decimal(str(round(qty, 1))),
                            'fat_percentage': Decimal(str(round(random.uniform(3.5, 5.0), 1))),
                            'snf_percentage': Decimal(str(round(random.uniform(8.0, 9.0), 1))),
                        })
            created.append(farmer)

        mgr = User.objects.create_user(
            username='9000000001', first_name='Cooperative',
            last_name='Manager', password='manager1234')
        Farmer.objects.create(user=mgr, phone='9000000001',
                              village='Madurai', district='Madurai', role='manager')

        User.objects.create_superuser('admin', 'admin@dv.com', 'admin1234')

        b1 = VAPBatch.objects.create(
            product_type='ghee', quantity_kg=Decimal('12.5'),
            production_date=date.today() - timedelta(days=2),
            expiry_date=date.today() + timedelta(days=90),
            status='packaged', total_milk_used_litres=Decimal('125.0'),
            processed_by=created[0])
        b1.source_farmers.set(created[:3])

        b2 = VAPBatch.objects.create(
            product_type='paneer', quantity_kg=Decimal('8.0'),
            production_date=date.today() - timedelta(days=1),
            expiry_date=date.today() + timedelta(days=7),
            status='produced', total_milk_used_litres=Decimal('64.0'),
            processed_by=created[1])
        b2.source_farmers.set(created[1:4])

        self.stdout.write(self.style.SUCCESS(
            '\nDone! Login credentials:\n'
            'Farmers (password: demo1234)\n'
            '  9876543201 Murugan Selvam\n'
            '  9876543202 Lakshmi Rajan\n'
            '  9876543203 Ravi Kumar\n'
            '  9876543204 Meenakshi Pandian\n'
            '  9876543205 Senthil Arumugam\n'
            'Manager: 9000000001 / manager1234\n'
            'Admin:   admin / admin1234\n'
        ))