from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class TransactionOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    warehouse_id: int
    warehouse_name: str
    transaction_type: str
    quantity: int
    before_quantity: int
    after_quantity: int
    reference_number: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
