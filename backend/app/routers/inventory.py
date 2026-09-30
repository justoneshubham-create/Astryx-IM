from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.category import Category
from app.models.user import User
from app.schemas.inventory import (
    InventoryOut,
    StockInRequest,
    StockOutRequest,
    StockTransferRequest,
    StockAdjustmentRequest,
)
from app.schemas.transaction import TransactionOut
from app.schemas.common import PaginatedResponse
from app.services.inventory_service import InventoryService
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("", response_model=PaginatedResponse[InventoryOut])
def get_inventory(
    search: str | None = Query(None),
    warehouse_id: int | None = Query(None),
    category_id: int | None = Query(None),
    stock_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Inventory).join(Product).join(Warehouse)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.sku.ilike(s),
                Product.barcode.ilike(s),
                Warehouse.name.ilike(s),
            )
        )

    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    all_invs = query.order_by(Product.name.asc(), Warehouse.name.asc()).all()

    # In-memory filter for computed stock status if requested
    filtered = []
    for inv in all_invs:
        status_calc = inv.calculate_status()
        if stock_status and stock_status.lower() != status_calc.lower():
            continue
        filtered.append(
            InventoryOut(
                id=inv.id,
                product_id=inv.product_id,
                sku=inv.product.sku,
                product_name=inv.product.name,
                category_id=inv.product.category_id,
                category_name=inv.product.category.name if inv.product.category else "",
                warehouse_id=inv.warehouse_id,
                warehouse_name=inv.warehouse.name,
                quantity=inv.quantity,
                reserved_quantity=inv.reserved_quantity,
                available_quantity=inv.available_quantity,
                min_stock_level=inv.product.min_stock_level,
                max_stock_level=inv.product.max_stock_level,
                stock_status=status_calc,
                updated_at=inv.updated_at,
            )
        )

    total = len(filtered)
    start = (page - 1) * page_size
    items = filtered[start : start + page_size]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

@router.get("/{product_id}", response_model=list[InventoryOut])
def get_product_inventory(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invs = db.query(Inventory).filter(Inventory.product_id == product_id).all()
    return [
        InventoryOut(
            id=inv.id,
            product_id=inv.product_id,
            sku=inv.product.sku,
            product_name=inv.product.name,
            category_id=inv.product.category_id,
            category_name=inv.product.category.name if inv.product.category else "",
            warehouse_id=inv.warehouse_id,
            warehouse_name=inv.warehouse.name,
            quantity=inv.quantity,
            reserved_quantity=inv.reserved_quantity,
            available_quantity=inv.available_quantity,
            min_stock_level=inv.product.min_stock_level,
            max_stock_level=inv.product.max_stock_level,
            stock_status=inv.calculate_status(),
            updated_at=inv.updated_at,
        )
        for inv in invs
    ]

@router.post("/stock-in", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def stock_in(
    req: StockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager", "staff"])),
):
    tx = InventoryService.stock_in(db, req, current_user)
    return TransactionOut(
        id=tx.id,
        product_id=tx.product_id,
        product_name=tx.product.name,
        sku=tx.product.sku,
        warehouse_id=tx.warehouse_id,
        warehouse_name=tx.warehouse.name,
        transaction_type=tx.transaction_type,
        quantity=tx.quantity,
        before_quantity=tx.before_quantity,
        after_quantity=tx.after_quantity,
        reference_number=tx.reference_number,
        user_id=tx.user_id,
        user_name=tx.user_name,
        notes=tx.notes,
        created_at=tx.created_at,
    )

@router.post("/stock-out", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def stock_out(
    req: StockOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager", "staff"])),
):
    tx = InventoryService.stock_out(db, req, current_user)
    return TransactionOut(
        id=tx.id,
        product_id=tx.product_id,
        product_name=tx.product.name,
        sku=tx.product.sku,
        warehouse_id=tx.warehouse_id,
        warehouse_name=tx.warehouse.name,
        transaction_type=tx.transaction_type,
        quantity=tx.quantity,
        before_quantity=tx.before_quantity,
        after_quantity=tx.after_quantity,
        reference_number=tx.reference_number,
        user_id=tx.user_id,
        user_name=tx.user_name,
        notes=tx.notes,
        created_at=tx.created_at,
    )

@router.post("/transfer", response_model=list[TransactionOut], status_code=status.HTTP_201_CREATED)
def stock_transfer(
    req: StockTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    tx_out, tx_in = InventoryService.transfer(db, req, current_user)
    return [
        TransactionOut(
            id=tx.id,
            product_id=tx.product_id,
            product_name=tx.product.name,
            sku=tx.product.sku,
            warehouse_id=tx.warehouse_id,
            warehouse_name=tx.warehouse.name,
            transaction_type=tx.transaction_type,
            quantity=tx.quantity,
            before_quantity=tx.before_quantity,
            after_quantity=tx.after_quantity,
            reference_number=tx.reference_number,
            user_id=tx.user_id,
            user_name=tx.user_name,
            notes=tx.notes,
            created_at=tx.created_at,
        )
        for tx in [tx_out, tx_in]
    ]

@router.post("/adjustment", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def stock_adjustment(
    req: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    tx = InventoryService.stock_adjustment(db, req, current_user)
    return TransactionOut(
        id=tx.id,
        product_id=tx.product_id,
        product_name=tx.product.name,
        sku=tx.product.sku,
        warehouse_id=tx.warehouse_id,
        warehouse_name=tx.warehouse.name,
        transaction_type=tx.transaction_type,
        quantity=tx.quantity,
        before_quantity=tx.before_quantity,
        after_quantity=tx.after_quantity,
        reference_number=tx.reference_number,
        user_id=tx.user_id,
        user_name=tx.user_name,
        notes=tx.notes,
        created_at=tx.created_at,
    )
