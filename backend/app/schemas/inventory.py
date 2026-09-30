from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class InventoryOut(BaseModel):
    id: int
    product_id: int
    sku: str
    product_name: str
    category_id: int
    category_name: str
    warehouse_id: int
    warehouse_name: str
    quantity: int
    reserved_quantity: int
    available_quantity: int
    min_stock_level: int
    max_stock_level: int
    stock_status: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StockInRequest(BaseModel):
    warehouse_id: int
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity to receive")
    supplier_id: Optional[int] = None
    unit_cost: Optional[float] = 0.0
    reference_number: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

class StockOutRequest(BaseModel):
    warehouse_id: int
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity to issue")
    reason: str
    reference_number: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

class StockTransferRequest(BaseModel):
    source_warehouse_id: int
    destination_warehouse_id: int
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity to transfer")
    reference_number: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

class StockAdjustmentRequest(BaseModel):
    warehouse_id: int
    product_id: int
    physical_quantity: int = Field(..., ge=0, description="New physical counted quantity")
    reason: str
    notes: Optional[str] = None
