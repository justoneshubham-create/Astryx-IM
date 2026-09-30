from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.dependencies.auth import get_current_user, require_role
from app.utils.exceptions import AppException

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=list[CategoryOut])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categories = db.query(Category).order_by(Category.name.asc()).all()
    results = []
    for c in categories:
        count = db.query(Product).filter(Product.category_id == c.id).count()
        results.append(
            CategoryOut(
                id=c.id,
                name=c.name,
                description=c.description,
                status=c.status,
                created_at=c.created_at,
                updated_at=c.updated_at,
                product_count=count
            )
        )
    return results

@router.post("", response_model=CategoryOut)
def create_category(
    req: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    existing = db.query(Category).filter(Category.name.ilike(req.name.strip())).first()
    if existing:
        raise AppException(status.HTTP_400_BAD_REQUEST, f"Category '{req.name}' already exists.", "CATEGORY_EXISTS")

    cat = Category(
        name=req.name.strip(),
        description=req.description,
        status=req.status
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryOut(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        status=cat.status,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
        product_count=0
    )

@router.put("/{id}", response_model=CategoryOut)
def update_category(
    id: int,
    req: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise AppException(status.HTTP_404_NOT_FOUND, "Category not found", "CATEGORY_NOT_FOUND")

    if req.name and req.name.strip().lower() != cat.name.lower():
        existing = db.query(Category).filter(Category.name.ilike(req.name.strip()), Category.id != id).first()
        if existing:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"Category '{req.name}' already exists.", "CATEGORY_EXISTS")
        cat.name = req.name.strip()

    if req.description is not None:
        cat.description = req.description
    if req.status is not None:
        cat.status = req.status

    db.commit()
    db.refresh(cat)
    count = db.query(Product).filter(Product.category_id == cat.id).count()
    return CategoryOut(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        status=cat.status,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
        product_count=count
    )

@router.delete("/{id}")
def delete_category(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    cat = db.query(Category).filter(Category.id == id).first()
    if not cat:
        raise AppException(status.HTTP_404_NOT_FOUND, "Category not found", "CATEGORY_NOT_FOUND")

    prod_count = db.query(Product).filter(Product.category_id == id).count()
    if prod_count > 0:
        raise AppException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot delete category '{cat.name}'. It contains {prod_count} products. Reassign products first.",
            "CATEGORY_HAS_PRODUCTS"
        )

    db.delete(cat)
    db.commit()
    return {"success": True, "message": "Category deleted successfully"}
