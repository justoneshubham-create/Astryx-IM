from sqlalchemy.orm import Session
from fastapi import status
from app.models.user import User
from app.schemas.user import UserCreate, LoginRequest
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.utils.exceptions import AppException

class AuthService:
    @staticmethod
    def register(db: Session, user_in: UserCreate) -> User:
        existing = db.query(User).filter(User.email == user_in.email.lower()).first()
        if existing:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Email address already registered.",
                error_code="EMAIL_EXISTS"
            )
        user = User(
            email=user_in.email.lower(),
            full_name=user_in.full_name,
            hashed_password=get_password_hash(user_in.password),
            role=user_in.role if user_in.role in ["admin", "manager", "staff"] else "staff",
            status=user_in.status
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate(db: Session, login_data: LoginRequest) -> tuple[User, str]:
        user = db.query(User).filter(User.email == login_data.email.lower()).first()
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise AppException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Invalid email or password.",
                error_code="INVALID_CREDENTIALS"
            )
        if user.status != "active":
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Account has been disabled.",
                error_code="ACCOUNT_DISABLED"
            )
        token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
        return user, token
