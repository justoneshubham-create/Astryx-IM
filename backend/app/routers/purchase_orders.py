from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.purchase_order import PurchaseOrder
from app.models.user import User
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderOut,
    PurchaseOrderItemOut,
    ReceivePORequest,
)
from app.schemas.common import PaginatedResponse
from app.services.po_service import PurchaseOrderService
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

def format_po(po: PurchaseOrder) -> PurchaseOrderOut:
    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name if po.supplier else "",
        warehouse_id=po.warehouse_id,
        warehouse_name=po.warehouse.name if po.warehouse else "",
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        status=po.status,
        total_amount=po.total_amount,
        notes=po.notes,
        created_at=po.created_at,
        updated_at=po.updated_at,
        items=[
            PurchaseOrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "",
                product_sku=item.product.sku if item.product else "",
                quantity=item.quantity,
                received_quantity=item.received_quantity,
                unit_cost=item.unit_cost,
                total=item.total,
            )
            for item in po.items
        ],
    )

@router.get("", response_model=PaginatedResponse[PurchaseOrderOut])
def get_purchase_orders(
    status: str | None = Query(None),
    supplier_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders, total = PurchaseOrderService.get_all(
        db=db,
        status_filter=status,
        supplier_id=supplier_id,
        warehouse_id=warehouse_id,
        page=page,
        page_size=page_size,
    )
    items = [format_po(po) for po in orders]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    req: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    po = PurchaseOrderService.create(db, req, current_user)
    return format_po(po)

@router.get("/{id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = PurchaseOrderService.get_by_id(db, id)
    return format_po(po)

@router.put("/{id}", response_model=PurchaseOrderOut)
def update_purchase_order(
    id: int,
    req: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    po = PurchaseOrderService.update(db, id, req)
    return format_po(po)

@router.post("/{id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(
    id: int,
    req: ReceivePORequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    po = PurchaseOrderService.receive(db, id, req, current_user)
    return format_po(po)
