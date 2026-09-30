from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class WarehouseBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    manager: Optional[str] = None
    contact_number: Optional[str] = None
    status: str = "active"

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    manager: Optional[str] = None
    contact_number: Optional[str] = None
    status: Optional[str] = None

class WarehouseOut(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_products: Optional[int] = 0
    total_quantity: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
