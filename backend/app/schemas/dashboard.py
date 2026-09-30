from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DashboardKPIs(BaseModel):
    total_products: int
    total_categories: int
    total_stock_quantity: int
    low_stock_products_count: int
    out_of_stock_products_count: int
    total_warehouses: int
    stock_in_this_month: int
    stock_out_this_month: int

class StockMovementPoint(BaseModel):
    date: str
    stock_in: int
    stock_out: int
    transfers: int

class LowStockAlert(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_quantity: int
    min_stock_level: int
    max_stock_level: int
    is_out_of_stock: bool

class WarehouseDistribution(BaseModel):
    warehouse_id: int
    warehouse_name: str
    total_items: int
    total_quantity: int

class DashboardSummary(BaseModel):
    kpis: DashboardKPIs
    low_stock_alerts: List[LowStockAlert]
    stock_movements: List[StockMovementPoint]
    warehouse_distribution: List[WarehouseDistribution]
