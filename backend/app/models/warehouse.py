from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    address = Column(Text, nullable=True)
    manager = Column(String(100), nullable=True)
    contact_number = Column(String(50), nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    inventories = relationship("Inventory", back_populates="warehouse")
    transactions = relationship("InventoryTransaction", back_populates="warehouse")
    purchase_orders = relationship("PurchaseOrder", back_populates="warehouse")
