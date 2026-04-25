from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from farmers.models import Farmer, Farm, Cattle
from dairy.models import MilkLog, VAPBatch
from agri.models import NDVIReading, CropAlert, GrazingLand, PastureReading
from market.models import ProductListing, Order
from datetime import date, timedelta
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Seed demo data for DairyVision'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing old data...')
        Order.objects.all().delete()
        ProductListing.objects.all().delete()
        PastureReading.objects.all().delete()
        GrazingLand.objects.all().delete()
        CropAlert.objects.all().delete()
        NDVIReading.objects.all().delete()
        MilkLog.objects.all().delete()
        VAPBatch.objects.all().delete()
        Cattle.objects.all().delete()
        Farm.objects.all().delete()
        Farmer.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # ── Farmers ──────────────────────────────────────────────
        farmers_data = [
            ('9876543201', 'Murugan Selvam',    'Vadipatti',    'farmer'),
            ('9876543202', 'Lakshmi Rajan',     'Usilampatti',  'farmer'),
            ('9876543203', 'Ravi Kumar',        'Peraiyur',     'farmer'),
            ('9876543204', 'Meenakshi Pandian', 'Melur',        'farmer'),
            ('9876543205', 'Senthil Arumugam',  'Thirumangalam','farmer'),
        ]
        farmers = []
        for phone, name, village, role in farmers_data:
            parts = name.split()
            u = User.objects.create_user(
                username=phone, password='demo1234',
                first_name=parts[0], last_name=' '.join(parts[1:]))
            f = Farmer.objects.create(
                user=u, phone=phone, village=village,
                district='Madurai', role=role)
            farmers.append(f)

        # Manager
        mu = User.objects.create_user(
            username='9000000001', password='manager1234',
            first_name='Cooperative', last_name='Manager')
        manager = Farmer.objects.create(
            user=mu, phone='9000000001', village='Madurai',
            district='Madurai', role='manager')

        # Admin
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', '', 'admin1234')

        # ── Cattle ───────────────────────────────────────────────
        breeds = ['hf', 'jersey', 'gir', 'sahiwal', 'murrah']
        cattle_map = {}
        tags = [
            ('MR-001','hf',4,True,12), ('MR-002','jersey',3,True,10),
            ('MR-003','gir',5,True,8), ('MR-004','sahiwal',2,True,7),
            ('MR-005','hf',6,False,0), ('MR-006','jersey',4,True,11),
            ('MR-007','murrah',3,True,9), ('MR-008','gir',2,True,8),
            ('MR-009','hf',5,True,13), ('MR-010','sahiwal',4,True,7),
            ('MR-011','jersey',3,True,10), ('MR-012','gir',6,False,0),
            ('MR-013','hf',2,True,12),
        ]
        for i, (tag, breed, age, milking, yield_) in enumerate(tags):
            f = farmers[i % 5]
            c = Cattle.objects.create(
                farmer=f, tag_number=tag, breed=breed,
                age_years=age, is_milking=milking,
                expected_daily_yield_litres=Decimal(str(yield_)))
            cattle_map.setdefault(f.id, []).append(c)

        # ── Farms ─────────────────────────────────────────────────
        farms_data = [
            (farmers[0], 'Main Field',    'paddy',     3.5, Decimal('9.9312'), Decimal('77.9731')),
            (farmers[0], 'East Block',    'maize',     2.0, Decimal('9.9280'), Decimal('77.9760')),
            (farmers[1], 'Home Field',    'sorghum',   4.0, Decimal('9.8640'), Decimal('77.5120')),
            (farmers[1], 'South Field',   'napier',    1.5, Decimal('9.8600'), Decimal('77.5090')),
            (farmers[2], 'River Side',    'sugarcane', 5.0, Decimal('9.7980'), Decimal('78.2100')),
            (farmers[3], 'North Plot',    'groundnut', 3.0, Decimal('9.9610'), Decimal('78.1020')),
            (farmers[4], 'West Field',    'cotton',    2.5, Decimal('9.8100'), Decimal('77.8350')),
        ]
        farms = []
        for farmer, name, crop, area, lat, lng in farms_data:
            fm = Farm.objects.create(
                farmer=farmer, name=name, crop_type=crop,
                area_acres=Decimal(str(area)),
                latitude=lat, longitude=lng,
                sowing_date=date.today() - timedelta(days=45))
            farms.append(fm)

        # ── Milk logs (30 days) ───────────────────────────────────
        for day_num in range(30):
            log_date = date.today() - timedelta(days=29 - day_num)
            for farmer in farmers:
                cattle_list = cattle_map.get(farmer.id, [])
                milking = [c for c in cattle_list if c.is_milking]
                if not milking:
                    continue
                for session in ['morning', 'evening']:
                    qty = sum(float(c.expected_daily_yield_litres) for c in milking)
                    qty = qty * (0.45 if session == 'morning' else 0.55)
                    qty += random.uniform(-1.5, 1.5)
                    MilkLog.objects.create(
                        farmer=farmer,
                        date=log_date,
                        session=session,
                        quantity_litres=Decimal(str(round(max(qty, 2), 1))),
                        fat_percentage=Decimal(str(round(random.uniform(4.2, 5.8), 1))),
                        snf_percentage=Decimal(str(round(random.uniform(8.2, 9.1), 1))),
                    )
        # ── VAP Batches ───────────────────────────────────────────
        batch_types = [
            ('ghee',   25.0, date.today() - timedelta(days=15), date.today() + timedelta(days=180)),
            ('paneer', 40.0, date.today() - timedelta(days=10), date.today() + timedelta(days=10)),
            ('curd',   60.0, date.today() - timedelta(days=5),  date.today() + timedelta(days=5)),
            ('butter', 20.0, date.today() - timedelta(days=8),  date.today() + timedelta(days=30)),
            ('ghee',   30.0, date.today() - timedelta(days=3),  date.today() + timedelta(days=180)),
        ]
        batches = []
        for ptype, qty, prod_date, exp_date in batch_types:
            b = VAPBatch.objects.create(
                product_type=ptype,
                quantity_kg=Decimal(str(qty)),
                production_date=prod_date,
                expiry_date=exp_date,
                total_milk_used_litres=Decimal(str(qty * 10)),
                
            )
            b.source_farmers.set(farmers[:3])
            batches.append(b)

        # ── NDVI Readings ─────────────────────────────────────────
        health_map = {
            'paddy': 0.58, 'maize': 0.48, 'sorghum': 0.42,
            'napier': 0.52, 'sugarcane': 0.62, 'groundnut': 0.35, 'cotton': 0.28,
        }
        for farm in farms:
            base = health_map.get(farm.crop_type, 0.40)
            for i in range(14):
                rdate = date.today() - timedelta(days=13 - i)
                ndvi = base + random.uniform(-0.08, 0.08)
                ndvi = round(max(0.05, min(0.80, ndvi)), 3)
                health = NDVIReading.get_health_from_ndvi(ndvi)
                NDVIReading.objects.create(
                    farm=farm, reading_date=rdate,
                    ndvi_value=Decimal(str(ndvi)),
                    health_status=health,
                    rainfall_mm=Decimal(str(round(random.uniform(0, 15), 1))),
                    temperature_c=Decimal(str(round(random.uniform(28, 38), 1))),
                )

        # Crop alert for cotton farm (stressed)
        CropAlert.objects.create(
            farm=farms[6],
            alert_type='stress',
            severity='high',
            message_en=f"Crop stress on '{farms[6].name}'. NDVI=0.28. Irrigate immediately.",
            message_ta=f"'{farms[6].name}' நிலத்தில் மன அழுத்தம். NDVI=0.28. உடனடியாக நீர்ப்பாசனம்.",
            is_resolved=False,
        )

        # ── Grazing Lands ─────────────────────────────────────────
        grazing_data = [
            (farmers[0], 'Village Common Ground', 'common',  8.0, Decimal('9.9290'), Decimal('77.9720'), 15),
            (farmers[1], 'River Bank Pasture',    'private', 5.0, Decimal('9.8620'), Decimal('77.5100'), 10),
            (farmers[2], 'Forest Fringe Land',    'forest',  6.0, Decimal('9.7960'), Decimal('78.2080'), 12),
            (farmers[3], 'Fallow Field Pasture',  'fallow',  4.0, Decimal('9.9590'), Decimal('78.1010'), 8),
        ]
        grazing_lands = []
        for farmer, name, ltype, area, lat, lng, cap in grazing_data:
            gl = GrazingLand.objects.create(
                farmer=farmer, name=name, land_type=ltype,
                area_acres=Decimal(str(area)),
                latitude=lat, longitude=lng,
                max_cattle_capacity=cap,
            )
            grazing_lands.append(gl)

        # Pasture readings
        pasture_ndvi = [0.42, 0.35, 0.28, 0.48]
        pasture_health = ['adequate', 'adequate', 'depleted', 'abundant']
        pasture_rec = [
            'Grass is adequate — monitor water availability',
            'Grass adequate — consider rotation in 5 days',
            'Grass depleting — move cattle to next pasture within 2 days',
            'Grass abundant — good grazing conditions',
        ]
        for i, gl in enumerate(grazing_lands):
            for d in range(7):
                rdate = date.today() - timedelta(days=6 - d)
                ndvi = pasture_ndvi[i] + random.uniform(-0.05, 0.05)
                PastureReading.objects.create(
                    grazing_land=gl,
                    reading_date=rdate,
                    ndvi_value=Decimal(str(round(ndvi, 3))),
                    pasture_health=pasture_health[i],
                    estimated_grazing_days=max(0, int((ndvi - 0.15) * gl.max_cattle_capacity * 8)),
                    rainfall_mm=Decimal(str(round(random.uniform(0, 10), 1))),
                    recommendation=pasture_rec[i],
                )

        # ── Market Listings ───────────────────────────────────────
        listings_data = [
            ('Pure Cow Ghee — Madurai Cooperative',
             'ghee', '100% pure cow ghee from grass-fed cows in Madurai district. Cold-pressed, no additives.',
             580, 'kg', 25, 1, batches[0], 'FSSAI certified'),
            ('Fresh Paneer — Daily Production',
             'paneer', 'Fresh paneer made daily from full-fat milk. Available in 250g and 500g blocks.',
             280, 'kg', 40, 2, batches[1], 'FSSAI certified'),
            ('Curd / Yogurt — Traditional Style',
             'curd', 'Set curd made from full-fat cow milk. No preservatives. Available in 500ml containers.',
             60, 'kg', 60, 5, batches[2], ''),
            ('White Butter — Unsalted',
             'butter', 'Traditional white butter made from cream. Ideal for hotels and restaurants.',
             320, 'kg', 20, 2, batches[3], 'FSSAI certified'),
            ('Premium Cow Ghee — Export Quality',
             'ghee', 'Premium ghee from HF and Jersey cattle. Suitable for export and institutional supply.',
             650, 'kg', 30, 5, batches[4], 'FSSAI, Organic certified'),
        ]
        listings = []
        for name, ptype, desc, price, unit, qty, min_ord, batch, cert in listings_data:
            l = ProductListing.objects.create(
                cooperative=manager,
                product_name=name,
                product_type=ptype,
                description=desc,
                price_per_unit=Decimal(str(price)),
                unit=unit,
                quantity_available=Decimal(str(qty)),
                minimum_order=Decimal(str(min_ord)),
                source_batch=batch,
                district='Madurai',
                status='active',
                certifications=cert,
            )
            listings.append(l)

        # Demo orders
        orders_data = [
            (listings[0], 'Hotel Madurai Residency', '9444111222', 'hotel', 'Madurai', 5),
            (listings[1], 'Star Supermarket Chennai', '9444333444', 'supermarket', 'Chennai', 20),
            (listings[2], 'Government School Madurai', '9444555666', 'school', 'Madurai', 30),
            (listings[4], 'Gulf Exports Pvt Ltd', '9444777888', 'export', 'Chennai', 15),
        ]
        statuses = ['confirmed', 'pending', 'confirmed', 'pending']
        for i, (listing, bname, bphone, btype, bcity, qty) in enumerate(orders_data):
            Order.objects.create(
                listing=listing,
                buyer_name=bname,
                buyer_phone=bphone,
                buyer_type=btype,
                buyer_city=bcity,
                quantity=Decimal(str(qty)),
                total_amount=listing.price_per_unit * Decimal(str(qty)),
                delivery_address=f'{bname}, {bcity}, Tamil Nadu',
                status=statuses[i],
            )

        self.stdout.write(self.style.SUCCESS('\nDone! Login credentials:'))
        self.stdout.write('Farmers (password: demo1234)')
        for phone, name, village, _ in farmers_data:
            self.stdout.write(f'  {phone} {name}')
        self.stdout.write('Manager: 9000000001 / manager1234')
        self.stdout.write('Admin:   admin / admin1234')
