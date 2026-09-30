from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

class PurchaseOrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0.0)

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemOut(PurchaseOrderItemBase):
    id: int
    product_name: str
    product_sku: str
    received_quantity: int
    total: float

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    warehouse_id: int
    order_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    status: str = "Draft"
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    expected_delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None

class PurchaseOrderOut(PurchaseOrderBase):
    id: int
    supplier_name: str
    warehouse_name: str
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)

class ReceivePOItem(BaseModel):
    item_id: int
    quantity_to_receive: int = Field(..., gt=0)

class ReceivePORequest(BaseModel):
    items: Optional[List[ReceivePOItem]] = None  # None means receive all remaining
    notes: Optional[str] = None
