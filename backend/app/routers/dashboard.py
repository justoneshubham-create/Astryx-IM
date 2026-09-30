from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary, StockMovementPoint, LowStockAlert
from app.services.dashboard_service import DashboardService
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DashboardService.get_summary(db=db, days=days)

@router.get("/stock-movement", response_model=list[StockMovementPoint])
def get_stock_movement(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = DashboardService.get_summary(db=db, days=days)
    return summary.stock_movements

@router.get("/low-stock", response_model=list[LowStockAlert])
def get_low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = DashboardService.get_summary(db=db, days=30)
    return summary.low_stock_alerts
