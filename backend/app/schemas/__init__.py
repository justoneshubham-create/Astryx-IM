from app.schemas.common import GenericResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserUpdate, UserOut, LoginRequest, Token
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseOut
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetail
from app.schemas.inventory import (
    InventoryOut,
    StockInRequest,
    StockOutRequest,
    StockTransferRequest,
    StockAdjustmentRequest,
)
from app.schemas.transaction import TransactionOut
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderOut,
    ReceivePORequest,
)
from app.schemas.dashboard import DashboardSummary, DashboardKPIs

__all__ = [
    "GenericResponse",
    "PaginatedResponse",
    "UserCreate",
    "UserUpdate",
    "UserOut",
    "LoginRequest",
    "Token",
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryOut",
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierOut",
    "WarehouseCreate",
    "WarehouseUpdate",
    "WarehouseOut",
    "ProductCreate",
    "ProductUpdate",
    "ProductOut",
    "ProductDetail",
    "InventoryOut",
    "StockInRequest",
    "StockOutRequest",
    "StockTransferRequest",
    "StockAdjustmentRequest",
    "TransactionOut",
    "PurchaseOrderCreate",
    "PurchaseOrderUpdate",
    "PurchaseOrderOut",
    "ReceivePORequest",
    "DashboardSummary",
    "DashboardKPIs",
]
