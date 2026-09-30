from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    unit = Column(String(50), default="pcs", nullable=False)
    cost_price = Column(Float, default=0.0, nullable=False)
    selling_price = Column(Float, default=0.0, nullable=False)
    min_stock_level = Column(Integer, default=10, nullable=False)
    max_stock_level = Column(Integer, default=100, nullable=False)
    barcode = Column(String(100), unique=True, index=True, nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    inventories = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")
    transactions = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")
    po_items = relationship("PurchaseOrderItem", back_populates="product")
