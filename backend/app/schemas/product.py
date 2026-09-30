from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: int
    supplier_id: Optional[int] = None
    unit: str = "pcs"
    cost_price: float = 0.0
    selling_price: float = 0.0
    min_stock_level: int = 10
    max_stock_level: int = 100
    barcode: Optional[str] = None
    status: str = "active"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    min_stock_level: Optional[int] = None
    max_stock_level: Optional[int] = None
    barcode: Optional[str] = None
    status: Optional[str] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    supplier_name: Optional[str] = None
    total_quantity: int = 0
    stock_status: str = "In Stock"

    model_config = ConfigDict(from_attributes=True)

class WarehouseStockDetail(BaseModel):
    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    quantity: int
    reserved_quantity: int
    available_quantity: int
    stock_status: str

class ProductDetail(ProductOut):
    warehouse_stocks: List[WarehouseStockDetail] = []
