from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.dependencies.auth import get_current_user, require_role
from app.utils.exceptions import AppException

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=list[SupplierOut])
def get_suppliers(
    search: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Supplier)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Supplier.name.ilike(s),
                Supplier.contact_person.ilike(s),
                Supplier.email.ilike(s),
                Supplier.phone.ilike(s),
                Supplier.city.ilike(s),
                Supplier.country.ilike(s)
            )
        )
    if status:
        query = query.filter(Supplier.status == status)

    return query.order_by(Supplier.name.asc()).all()

@router.post("", response_model=SupplierOut)
def create_supplier(
    req: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    sup = Supplier(
        name=req.name.strip(),
        contact_person=req.contact_person,
        email=req.email,
        phone=req.phone,
        address=req.address,
        city=req.city,
        country=req.country,
        status=req.status
    )
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup

@router.put("/{id}", response_model=SupplierOut)
def update_supplier(
    id: int,
    req: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    sup = db.query(Supplier).filter(Supplier.id == id).first()
    if not sup:
        raise AppException(status.HTTP_404_NOT_FOUND, "Supplier not found", "SUPPLIER_NOT_FOUND")

    for field in ["name", "contact_person", "email", "phone", "address", "city", "country", "status"]:
        val = getattr(req, field)
        if val is not None:
            setattr(sup, field, val)

    db.commit()
    db.refresh(sup)
    return sup

@router.delete("/{id}")
def delete_supplier(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    sup = db.query(Supplier).filter(Supplier.id == id).first()
    if not sup:
        raise AppException(status.HTTP_404_NOT_FOUND, "Supplier not found", "SUPPLIER_NOT_FOUND")

    prod_count = db.query(Product).filter(Product.supplier_id == id).count()
    if prod_count > 0:
        raise AppException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot delete supplier '{sup.name}'. It is linked to {prod_count} products.",
            "SUPPLIER_IN_USE"
        )

    db.delete(sup)
    db.commit()
    return {"success": True, "message": "Supplier deleted successfully"}
