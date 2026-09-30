from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_access_token
from app.utils.exceptions import AppException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Not authenticated. Bearer token missing.",
            error_code="UNAUTHORIZED"
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Invalid or expired token.",
            error_code="INVALID_TOKEN"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="User associated with token not found.",
            error_code="USER_NOT_FOUND"
        )
    if user.status != "active":
        raise AppException(
            status_code=status.HTTP_403_FORBIDDEN,
            message="User account is deactivated.",
            error_code="USER_INACTIVE"
        )
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}.",
                error_code="FORBIDDEN_ROLE"
            )
        return current_user
    return role_checker
