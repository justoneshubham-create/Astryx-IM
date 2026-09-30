from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from app.database import get_db
from app.models.transaction import InventoryTransaction
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.user import User
from app.schemas.transaction import TransactionOut
from app.schemas.common import PaginatedResponse
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=PaginatedResponse[TransactionOut])
def get_transactions(
    search: str | None = Query(None),
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    transaction_type: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(InventoryTransaction).join(Product).join(Warehouse)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.sku.ilike(s),
                Warehouse.name.ilike(s),
                InventoryTransaction.reference_number.ilike(s),
                InventoryTransaction.user_name.ilike(s),
                InventoryTransaction.notes.ilike(s),
            )
        )

    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)

    if warehouse_id:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)

    if transaction_type:
        query = query.filter(InventoryTransaction.transaction_type == transaction_type)

    if start_date:
        query = query.filter(InventoryTransaction.created_at >= start_date)

    if end_date:
        query = query.filter(InventoryTransaction.created_at <= end_date)

    total = query.count()
    txs = query.order_by(InventoryTransaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
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
        for tx in txs
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
