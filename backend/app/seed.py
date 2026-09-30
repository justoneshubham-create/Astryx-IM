from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.utils.security import get_password_hash

def utc_now():
    return datetime.now(timezone.utc)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Users
        users_data = [
            {"email": "admin@example.com", "full_name": "System Administrator", "password": "admin123", "role": "admin"},
            {"email": "manager@example.com", "full_name": "Inventory Operations Manager", "password": "manager123", "role": "manager"},
            {"email": "staff@example.com", "full_name": "Warehouse Associate Staff", "password": "staff123", "role": "staff"},
        ]

        admin_user = None
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    status="active",
                )
                db.add(user)
                if u["role"] == "admin":
                    admin_user = user
            elif u["role"] == "admin":
                admin_user = existing
        db.commit()

        # 2. Categories
        cat_names = [
            ("Electronics", "Computer peripherals, smart devices, components and cables"),
            ("Office Supplies", "Stationery, paper, toner, organizers and essentials"),
            ("Tools", "Hand tools, power tools, safety equipment and hardware"),
            ("Furniture", "Desks, ergonomic chairs, cabinets and display units"),
            ("Consumables", "Packaging tape, bubble wrap, labels and boxes"),
        ]
        categories = {}
        for name, desc in cat_names:
            c = db.query(Category).filter(Category.name == name).first()
            if not c:
                c = Category(name=name, description=desc, status="active")
                db.add(c)
                db.flush()
            categories[name] = c
        db.commit()

        # 3. Suppliers
        sup_data = [
            {"name": "Apex Global Electronics", "contact_person": "David Miller", "email": "david@apextech.com", "phone": "+1-555-0101", "city": "San Jose", "country": "USA"},
            {"name": "LogiCorp Logistics & Supplies", "contact_person": "Sarah Jenkins", "email": "s.jenkins@logicorp.com", "phone": "+1-555-0102", "city": "Chicago", "country": "USA"},
            {"name": "Nordic Industrial Tools", "contact_person": "Erik Lindqvist", "email": "erik@nordictools.se", "phone": "+46-8-555-0103", "city": "Stockholm", "country": "Sweden"},
            {"name": "Workspace Ergonomics Ltd", "contact_person": "Elena Rostova", "email": "elena@workergonomics.com", "phone": "+44-20-7946-0104", "city": "London", "country": "UK"},
            {"name": "Pacific Packaging Products", "contact_person": "Kenji Sato", "email": "kenji@pacificpack.jp", "phone": "+81-3-5555-0105", "city": "Tokyo", "country": "Japan"},
        ]
        suppliers = {}
        for s in sup_data:
            sup = db.query(Supplier).filter(Supplier.name == s["name"]).first()
            if not sup:
                sup = Supplier(**s, status="active")
                db.add(sup)
                db.flush()
            suppliers[s["name"]] = sup
        db.commit()

        # 4. Warehouses
        wh_data = [
            {"name": "Main Distribution Center", "code": "MWH-01", "address": "100 Logistics Blvd, Dock 4", "manager": "Robert Vance", "contact_number": "+1-555-4001"},
            {"name": "Secondary Regional Warehouse", "code": "SWH-02", "address": "500 Harbor Way, Bay 12", "manager": "Alice Cooper", "contact_number": "+1-555-4002"},
        ]
        warehouses = {}
        for w in wh_data:
            wh = db.query(Warehouse).filter(Warehouse.code == w["code"]).first()
            if not wh:
                wh = Warehouse(**w, status="active")
                db.add(wh)
                db.flush()
            warehouses[w["code"]] = wh
        db.commit()

        # 5. Products (16 realistic items covering all categories)
        prod_data = [
            {"sku": "ELEC-KEY-001", "name": "Mechanical USB Keyboard", "category": "Electronics", "supplier": "Apex Global Electronics", "unit": "pcs", "cost": 45.0, "price": 79.99, "min": 20, "max": 150, "barcode": "789012340001", "mwh_qty": 8, "swh_qty": 0},  # Low/Out of stock demo
            {"sku": "ELEC-MOU-002", "name": "Wireless Ergonomic Mouse", "category": "Electronics", "supplier": "Apex Global Electronics", "unit": "pcs", "cost": 22.5, "price": 49.99, "min": 15, "max": 200, "barcode": "789012340002", "mwh_qty": 65, "swh_qty": 30},
            {"sku": "ELEC-MON-003", "name": "27-inch 4K UHD Monitor", "category": "Electronics", "supplier": "Apex Global Electronics", "unit": "pcs", "cost": 210.0, "price": 349.99, "min": 5, "max": 40, "barcode": "789012340003", "mwh_qty": 18, "swh_qty": 12},
            {"sku": "ELEC-CAB-004", "name": "Braided USB-C Cable 2m", "category": "Electronics", "supplier": "Apex Global Electronics", "unit": "pcs", "cost": 3.2, "price": 12.99, "min": 50, "max": 500, "barcode": "789012340004", "mwh_qty": 320, "swh_qty": 110},
            {"sku": "OFF-PPR-005", "name": "Recycled Copy Paper A4 (500s)", "category": "Office Supplies", "supplier": "LogiCorp Logistics & Supplies", "unit": "ream", "cost": 4.5, "price": 8.99, "min": 40, "max": 300, "barcode": "789012340005", "mwh_qty": 140, "swh_qty": 80},
            {"sku": "OFF-PEN-006", "name": "Gel Ink Rollerball Pens (Pack of 12)", "category": "Office Supplies", "supplier": "LogiCorp Logistics & Supplies", "unit": "box", "cost": 6.0, "price": 14.50, "min": 25, "max": 200, "barcode": "789012340006", "mwh_qty": 90, "swh_qty": 45},
            {"sku": "OFF-NOT-007", "name": "Hardcover Executive Notebook", "category": "Office Supplies", "supplier": "LogiCorp Logistics & Supplies", "unit": "pcs", "cost": 5.5, "price": 16.00, "min": 20, "max": 100, "barcode": "789012340007", "mwh_qty": 12, "swh_qty": 5},  # Low stock
            {"sku": "TOOL-DRI-008", "name": "20V Cordless Brushless Drill Kit", "category": "Tools", "supplier": "Nordic Industrial Tools", "unit": "set", "cost": 85.0, "price": 159.00, "min": 10, "max": 60, "barcode": "789012340008", "mwh_qty": 24, "swh_qty": 10},
            {"sku": "TOOL-SET-009", "name": "108-Piece Mechanics Tool Set", "category": "Tools", "supplier": "Nordic Industrial Tools", "unit": "set", "cost": 65.0, "price": 129.99, "min": 8, "max": 50, "barcode": "789012340009", "mwh_qty": 0, "swh_qty": 0},  # Out of stock demo!
            {"sku": "TOOL-MES-010", "name": "Digital Laser Distance Measurer", "category": "Tools", "supplier": "Nordic Industrial Tools", "unit": "pcs", "cost": 28.0, "price": 54.99, "min": 15, "max": 80, "barcode": "789012340010", "mwh_qty": 35, "swh_qty": 20},
            {"sku": "FURN-CHR-011", "name": "Ergonomic Mesh Office Chair", "category": "Furniture", "supplier": "Workspace Ergonomics Ltd", "unit": "pcs", "cost": 140.0, "price": 289.00, "min": 6, "max": 30, "barcode": "789012340011", "mwh_qty": 14, "swh_qty": 6},
            {"sku": "FURN-DSK-012", "name": "Electric Motorized Standing Desk", "category": "Furniture", "supplier": "Workspace Ergonomics Ltd", "unit": "pcs", "cost": 230.0, "price": 450.00, "min": 4, "max": 20, "barcode": "789012340012", "mwh_qty": 8, "swh_qty": 4},
            {"sku": "FURN-MAT-013", "name": "Anti-Fatigue Desk Floor Mat", "category": "Furniture", "supplier": "Workspace Ergonomics Ltd", "unit": "pcs", "cost": 18.0, "price": 39.99, "min": 12, "max": 60, "barcode": "789012340013", "mwh_qty": 22, "swh_qty": 18},
            {"sku": "PACK-BOX-014", "name": "Corrugated Shipping Boxes (L)", "category": "Consumables", "supplier": "Pacific Packaging Products", "unit": "bundle", "cost": 12.0, "price": 24.00, "min": 30, "max": 250, "barcode": "789012340014", "mwh_qty": 115, "swh_qty": 50},
            {"sku": "PACK-TAP-015", "name": "Heavy Duty Packaging Tape (6 Rolls)", "category": "Consumables", "supplier": "Pacific Packaging Products", "unit": "pack", "cost": 7.5, "price": 18.00, "min": 25, "max": 200, "barcode": "789012340015", "mwh_qty": 85, "swh_qty": 40},
            {"sku": "PACK-BUB-016", "name": "Bubble Wrap Roll (50m x 50cm)", "category": "Consumables", "supplier": "Pacific Packaging Products", "unit": "roll", "cost": 14.0, "price": 29.50, "min": 15, "max": 100, "barcode": "789012340016", "mwh_qty": 40, "swh_qty": 20},
        ]

        mwh = warehouses["MWH-01"]
        swh = warehouses["SWH-02"]

        for item in prod_data:
            p = db.query(Product).filter(Product.sku == item["sku"]).first()
            if not p:
                p = Product(
                    sku=item["sku"],
                    name=item["name"],
                    category_id=categories[item["category"]].id,
                    supplier_id=suppliers[item["supplier"]].id,
                    unit=item["unit"],
                    cost_price=item["cost"],
                    selling_price=item["price"],
                    min_stock_level=item["min"],
                    max_stock_level=item["max"],
                    barcode=item["barcode"],
                    status="active",
                )
                db.add(p)
                db.flush()

                # Inventories
                inv_m = Inventory(product_id=p.id, warehouse_id=mwh.id, quantity=item["mwh_qty"])
                inv_s = Inventory(product_id=p.id, warehouse_id=swh.id, quantity=item["swh_qty"])
                db.add_all([inv_m, inv_s])
                db.flush()

                # Initial Stock In transaction records
                if item["mwh_qty"] > 0:
                    tx1 = InventoryTransaction(
                        product_id=p.id,
                        warehouse_id=mwh.id,
                        transaction_type="STOCK_IN",
                        quantity=item["mwh_qty"],
                        before_quantity=0,
                        after_quantity=item["mwh_qty"],
                        reference_number=f"INIT-STOCK-{p.id}",
                        user_name="System Initializer",
                        notes="Initial inventory baseline load",
                        created_at=utc_now() - timedelta(days=14),
                    )
                    db.add(tx1)

                if item["swh_qty"] > 0:
                    tx2 = InventoryTransaction(
                        product_id=p.id,
                        warehouse_id=swh.id,
                        transaction_type="STOCK_IN",
                        quantity=item["swh_qty"],
                        before_quantity=0,
                        after_quantity=item["swh_qty"],
                        reference_number=f"INIT-STOCK-{p.id}",
                        user_name="System Initializer",
                        notes="Initial inventory baseline load",
                        created_at=utc_now() - timedelta(days=12),
                    )
                    db.add(tx2)

        db.commit()

        # 6. Sample Purchase Orders
        po1 = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == "PO-2026-001").first()
        if not po1:
            p1 = db.query(Product).filter(Product.sku == "ELEC-KEY-001").first()
            p2 = db.query(Product).filter(Product.sku == "ELEC-MOU-002").first()
            po1 = PurchaseOrder(
                po_number="PO-2026-001",
                supplier_id=suppliers["Apex Global Electronics"].id,
                warehouse_id=mwh.id,
                order_date=utc_now() - timedelta(days=5),
                expected_delivery_date=utc_now() + timedelta(days=2),
                status="Approved",
                total_amount=50 * p1.cost_price + 40 * p2.cost_price,
                notes="Urgent replenishment for low stock keyboard and mouse units.",
            )
            db.add(po1)
            db.flush()

            poi1 = PurchaseOrderItem(purchase_order_id=po1.id, product_id=p1.id, quantity=50, received_quantity=0, unit_cost=p1.cost_price, total=50 * p1.cost_price)
            poi2 = PurchaseOrderItem(purchase_order_id=po1.id, product_id=p2.id, quantity=40, received_quantity=0, unit_cost=p2.cost_price, total=40 * p2.cost_price)
            db.add_all([poi1, poi2])

        po2 = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == "PO-2026-002").first()
        if not po2:
            p3 = db.query(Product).filter(Product.sku == "OFF-PPR-005").first()
            po2 = PurchaseOrder(
                po_number="PO-2026-002",
                supplier_id=suppliers["LogiCorp Logistics & Supplies"].id,
                warehouse_id=mwh.id,
                order_date=utc_now() - timedelta(days=1),
                expected_delivery_date=utc_now() + timedelta(days=7),
                status="Pending",
                total_amount=100 * p3.cost_price,
                notes="Monthly copy paper reorder.",
            )
            db.add(po2)
            db.flush()
            poi3 = PurchaseOrderItem(purchase_order_id=po2.id, product_id=p3.id, quantity=100, received_quantity=0, unit_cost=p3.cost_price, total=100 * p3.cost_price)
            db.add(poi3)

        db.commit()
        print("[OK] Database successfully seeded with demo users, categories, suppliers, warehouses, products, and POs.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
