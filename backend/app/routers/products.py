from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetail
from app.schemas.common import PaginatedResponse
from app.services.product_service import ProductService
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=PaginatedResponse[ProductOut])
def get_products(
    search: str | None = Query(None),
    category_id: int | None = Query(None),
    supplier_id: int | None = Query(None),
    status: str | None = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = ProductService.get_all(
        db=db,
        search=search,
        category_id=category_id,
        supplier_id=supplier_id,
        status_filter=status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    prod = ProductService.create(db, req)
    detail = ProductService.get_by_id(db, prod.id)
    return detail

@router.get("/{id}", response_model=ProductDetail)
def get_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProductService.get_by_id(db, id)

@router.put("/{id}", response_model=ProductDetail)
def update_product(
    id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    prod = ProductService.update(db, id, req)
    return ProductService.get_by_id(db, prod.id)

@router.delete("/{id}")
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"])),
):
    ProductService.delete(db, id)
    return {"success": True, "message": "Product deleted successfully"}
