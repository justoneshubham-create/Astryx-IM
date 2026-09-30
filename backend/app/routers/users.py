from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserCreate, UserUpdate
from app.dependencies.auth import require_role
from app.utils.security import get_password_hash
from app.utils.exceptions import AppException

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=list[UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    return db.query(User).order_by(User.id.asc()).all()

@router.post("", response_model=UserOut)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise AppException(status.HTTP_400_BAD_REQUEST, "Email already exists.", "EMAIL_EXISTS")
    user = User(
        email=req.email.lower(),
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        status=req.status
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{id}", response_model=UserOut)
def update_user(
    id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise AppException(status.HTTP_404_NOT_FOUND, "User not found", "USER_NOT_FOUND")

    if req.email and req.email.lower() != user.email:
        conflict = db.query(User).filter(User.email == req.email.lower(), User.id != id).first()
        if conflict:
            raise AppException(status.HTTP_400_BAD_REQUEST, "Email already in use.", "EMAIL_EXISTS")
        user.email = req.email.lower()

    if req.full_name:
        user.full_name = req.full_name
    if req.role:
        user.role = req.role
    if req.status:
        user.status = req.status
    if req.password:
        user.hashed_password = get_password_hash(req.password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{id}")
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if id == current_user.id:
        raise AppException(status.HTTP_400_BAD_REQUEST, "Cannot delete your own admin account.", "CANNOT_DELETE_SELF")
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise AppException(status.HTTP_404_NOT_FOUND, "User not found", "USER_NOT_FOUND")
    db.delete(user)
    db.commit()
    return {"success": True, "message": "User deleted successfully"}
