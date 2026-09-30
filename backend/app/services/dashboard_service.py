from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from app.models.product import Product
from app.models.category import Category
from app.models.warehouse import Warehouse
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction
from app.schemas.dashboard import (
    DashboardSummary,
    DashboardKPIs,
    LowStockAlert,
    StockMovementPoint,
    WarehouseDistribution,
)

class DashboardService:
    @staticmethod
    def get_summary(db: Session, days: int = 30) -> DashboardSummary:
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        since_date = now - timedelta(days=days)

        # 1. Counts
        total_products = db.query(Product).filter(Product.status == "active").count()
        total_categories = db.query(Category).filter(Category.status == "active").count()
        total_warehouses = db.query(Warehouse).filter(Warehouse.status == "active").count()

        # 2. Stock sums
        total_stock = db.query(func.coalesce(func.sum(Inventory.quantity), 0)).scalar() or 0

        # Stock In / Out this month
        stock_in_month = (
            db.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0))
            .filter(
                InventoryTransaction.transaction_type == "STOCK_IN",
                InventoryTransaction.created_at >= start_of_month,
            )
            .scalar()
            or 0
        )

        stock_out_month = (
            db.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0))
            .filter(
                InventoryTransaction.transaction_type == "STOCK_OUT",
                InventoryTransaction.created_at >= start_of_month,
            )
            .scalar()
            or 0
        )

        # 3. Product-level stock for low/out-of-stock analysis
        products = db.query(Product).filter(Product.status == "active").all()
        low_stock_alerts: list[LowStockAlert] = []
        low_stock_count = 0
        out_of_stock_count = 0

        for p in products:
            qty = sum(inv.quantity for inv in p.inventories)
            if qty <= 0:
                out_of_stock_count += 1
                low_stock_alerts.append(
                    LowStockAlert(
                        product_id=p.id,
                        product_name=p.name,
                        sku=p.sku,
                        current_quantity=qty,
                        min_stock_level=p.min_stock_level,
                        max_stock_level=p.max_stock_level,
                        is_out_of_stock=True,
                    )
                )
            elif qty <= p.min_stock_level:
                low_stock_count += 1
                low_stock_alerts.append(
                    LowStockAlert(
                        product_id=p.id,
                        product_name=p.name,
                        sku=p.sku,
                        current_quantity=qty,
                        min_stock_level=p.min_stock_level,
                        max_stock_level=p.max_stock_level,
                        is_out_of_stock=False,
                    )
                )

        kpis = DashboardKPIs(
            total_products=total_products,
            total_categories=total_categories,
            total_stock_quantity=int(total_stock),
            low_stock_products_count=low_stock_count,
            out_of_stock_products_count=out_of_stock_count,
            total_warehouses=total_warehouses,
            stock_in_this_month=int(stock_in_month),
            stock_out_this_month=int(stock_out_month),
        )

        # 4. Stock Movement over last N days / intervals
        # Group transactions by date
        txs = (
            db.query(InventoryTransaction)
            .filter(InventoryTransaction.created_at >= since_date)
            .order_by(InventoryTransaction.created_at.asc())
            .all()
        )

        movement_map: dict[str, dict[str, int]] = {}
        # Prepopulate days
        for i in range(days):
            d_str = (since_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            movement_map[d_str] = {"stock_in": 0, "stock_out": 0, "transfers": 0}

        for tx in txs:
            d_str = tx.created_at.strftime("%Y-%m-%d")
            if d_str not in movement_map:
                movement_map[d_str] = {"stock_in": 0, "stock_out": 0, "transfers": 0}

            if tx.transaction_type == "STOCK_IN":
                movement_map[d_str]["stock_in"] += tx.quantity
            elif tx.transaction_type == "STOCK_OUT":
                movement_map[d_str]["stock_out"] += tx.quantity
            elif tx.transaction_type in ["TRANSFER_IN", "TRANSFER_OUT"]:
                movement_map[d_str]["transfers"] += tx.quantity // 2 or tx.quantity

        stock_movements = [
            StockMovementPoint(
                date=k,
                stock_in=v["stock_in"],
                stock_out=v["stock_out"],
                transfers=v["transfers"],
            )
            for k, v in sorted(movement_map.items())
        ]

        # 5. Warehouse distribution
        warehouses = db.query(Warehouse).all()
        wh_dist: list[WarehouseDistribution] = []
        for wh in warehouses:
            items_count = sum(1 for inv in wh.inventories if inv.quantity > 0)
            total_units = sum(inv.quantity for inv in wh.inventories)
            wh_dist.append(
                WarehouseDistribution(
                    warehouse_id=wh.id,
                    warehouse_name=wh.name,
                    total_items=items_count,
                    total_quantity=total_units,
                )
            )

        return DashboardSummary(
            kpis=kpis,
            low_stock_alerts=low_stock_alerts,
            stock_movements=stock_movements,
            warehouse_distribution=wh_dist,
        )
