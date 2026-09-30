from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.warehouse import Warehouse
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseOut
from app.dependencies.auth import get_current_user, require_role
from app.utils.exceptions import AppException

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])

@router.get("", response_model=list[WarehouseOut])
def get_warehouses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    warehouses = db.query(Warehouse).order_by(Warehouse.name.asc()).all()
    results = []
    for w in warehouses:
        total_prods = sum(1 for inv in w.inventories if inv.quantity > 0)
        total_units = sum(inv.quantity for inv in w.inventories)
        results.append(
            WarehouseOut(
                id=w.id,
                name=w.name,
                code=w.code,
                address=w.address,
                manager=w.manager,
                contact_number=w.contact_number,
                status=w.status,
                created_at=w.created_at,
                updated_at=w.updated_at,
                total_products=total_prods,
                total_quantity=total_units,
            )
        )
    return results

@router.post("", response_model=WarehouseOut)
def create_warehouse(
    req: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    existing = db.query(Warehouse).filter(Warehouse.code.ilike(req.code.strip())).first()
    if existing:
        raise AppException(status.HTTP_400_BAD_REQUEST, f"Warehouse code '{req.code}' already exists.", "WAREHOUSE_CODE_EXISTS")

    wh = Warehouse(
        name=req.name.strip(),
        code=req.code.strip().upper(),
        address=req.address,
        manager=req.manager,
        contact_number=req.contact_number,
        status=req.status
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return WarehouseOut(
        id=wh.id,
        name=wh.name,
        code=wh.code,
        address=wh.address,
        manager=wh.manager,
        contact_number=wh.contact_number,
        status=wh.status,
        created_at=wh.created_at,
        updated_at=wh.updated_at,
        total_products=0,
        total_quantity=0,
    )

@router.put("/{id}", response_model=WarehouseOut)
def update_warehouse(
    id: int,
    req: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

    if req.code and req.code.strip().upper() != wh.code:
        conflict = db.query(Warehouse).filter(Warehouse.code == req.code.strip().upper(), Warehouse.id != id).first()
        if conflict:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"Warehouse code '{req.code}' already exists.", "WAREHOUSE_CODE_EXISTS")
        wh.code = req.code.strip().upper()

    for field in ["name", "address", "manager", "contact_number", "status"]:
        val = getattr(req, field)
        if val is not None:
            setattr(wh, field, val)

    db.commit()
    db.refresh(wh)

    total_prods = sum(1 for inv in wh.inventories if inv.quantity > 0)
    total_units = sum(inv.quantity for inv in wh.inventories)
    return WarehouseOut(
        id=wh.id,
        name=wh.name,
        code=wh.code,
        address=wh.address,
        manager=wh.manager,
        contact_number=wh.contact_number,
        status=wh.status,
        created_at=wh.created_at,
        updated_at=wh.updated_at,
        total_products=total_prods,
        total_quantity=total_units,
    )

@router.delete("/{id}")
def delete_warehouse(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    wh = db.query(Warehouse).filter(Warehouse.id == id).first()
    if not wh:
        raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

    stock_count = sum(inv.quantity for inv in wh.inventories)
    if stock_count > 0:
        raise AppException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot delete warehouse '{wh.name}'. It contains {stock_count} units of inventory. Transfer stock first.",
            "WAREHOUSE_HAS_STOCK"
        )

    db.delete(wh)
    db.commit()
    return {"success": True, "message": "Warehouse deleted successfully"}
