from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import status
from datetime import datetime, timezone
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.user import User
from app.schemas.inventory import (
    StockInRequest,
    StockOutRequest,
    StockTransferRequest,
    StockAdjustmentRequest,
)
from app.utils.exceptions import AppException

def utc_now():
    return datetime.now(timezone.utc)

class InventoryService:
    @staticmethod
    def get_or_create_inventory(db: Session, product_id: int, warehouse_id: int) -> Inventory:
        inv = db.query(Inventory).filter(
            Inventory.product_id == product_id,
            Inventory.warehouse_id == warehouse_id
        ).first()
        if not inv:
            inv = Inventory(
                product_id=product_id,
                warehouse_id=warehouse_id,
                quantity=0,
                reserved_quantity=0
            )
            db.add(inv)
            db.flush()
        return inv

    @classmethod
    def stock_in(cls, db: Session, req: StockInRequest, user: User) -> InventoryTransaction:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        warehouse = db.query(Warehouse).filter(Warehouse.id == req.warehouse_id).first()
        if not warehouse:
            raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

        try:
            inv = cls.get_or_create_inventory(db, req.product_id, req.warehouse_id)
            before_qty = inv.quantity
            inv.quantity += req.quantity
            after_qty = inv.quantity

            tx = InventoryTransaction(
                product_id=req.product_id,
                warehouse_id=req.warehouse_id,
                transaction_type="STOCK_IN",
                quantity=req.quantity,
                before_quantity=before_qty,
                after_quantity=after_qty,
                reference_number=req.reference_number,
                user_id=user.id if user else None,
                user_name=user.full_name if user else "System",
                notes=req.notes or f"Received {req.quantity} {product.unit}",
                created_at=req.date or utc_now()
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
            return tx
        except Exception as e:
            db.rollback()
            if isinstance(e, AppException):
                raise e
            raise AppException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Failed to record Stock In: {str(e)}", "DATABASE_ERROR")

    @classmethod
    def stock_out(cls, db: Session, req: StockOutRequest, user: User) -> InventoryTransaction:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        warehouse = db.query(Warehouse).filter(Warehouse.id == req.warehouse_id).first()
        if not warehouse:
            raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

        try:
            inv = cls.get_or_create_inventory(db, req.product_id, req.warehouse_id)
            if inv.quantity < req.quantity:
                raise AppException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Insufficient stock for {product.name} in warehouse '{warehouse.name}'. Available: {inv.quantity}, Requested: {req.quantity}",
                    "INSUFFICIENT_STOCK"
                )

            before_qty = inv.quantity
            inv.quantity -= req.quantity
            after_qty = inv.quantity

            tx = InventoryTransaction(
                product_id=req.product_id,
                warehouse_id=req.warehouse_id,
                transaction_type="STOCK_OUT",
                quantity=req.quantity,
                before_quantity=before_qty,
                after_quantity=after_qty,
                reference_number=req.reference_number,
                user_id=user.id if user else None,
                user_name=user.full_name if user else "System",
                notes=f"Reason: {req.reason}. {req.notes or ''}".strip(),
                created_at=req.date or utc_now()
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
            return tx
        except Exception as e:
            db.rollback()
            if isinstance(e, AppException):
                raise e
            raise AppException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Failed to record Stock Out: {str(e)}", "DATABASE_ERROR")

    @classmethod
    def transfer(cls, db: Session, req: StockTransferRequest, user: User) -> tuple[InventoryTransaction, InventoryTransaction]:
        if req.source_warehouse_id == req.destination_warehouse_id:
            raise AppException(
                status.HTTP_400_BAD_REQUEST,
                "Source and Destination warehouse cannot be the same.",
                "INVALID_TRANSFER_DESTINATION"
            )

        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        src_wh = db.query(Warehouse).filter(Warehouse.id == req.source_warehouse_id).first()
        dest_wh = db.query(Warehouse).filter(Warehouse.id == req.destination_warehouse_id).first()
        if not src_wh or not dest_wh:
            raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

        try:
            # Atomic database transaction
            src_inv = cls.get_or_create_inventory(db, req.product_id, req.source_warehouse_id)
            if src_inv.quantity < req.quantity:
                raise AppException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Insufficient stock in source warehouse '{src_wh.name}'. Available: {src_inv.quantity}, Requested: {req.quantity}",
                    "INSUFFICIENT_STOCK"
                )

            dest_inv = cls.get_or_create_inventory(db, req.product_id, req.destination_warehouse_id)

            # Update Source
            src_before = src_inv.quantity
            src_inv.quantity -= req.quantity
            src_after = src_inv.quantity

            # Update Destination
            dest_before = dest_inv.quantity
            dest_inv.quantity += req.quantity
            dest_after = dest_inv.quantity

            timestamp = req.date or utc_now()
            ref = req.reference_number or f"TRF-{int(timestamp.timestamp())}"

            # Audit record: Transfer Out
            tx_out = InventoryTransaction(
                product_id=req.product_id,
                warehouse_id=req.source_warehouse_id,
                transaction_type="TRANSFER_OUT",
                quantity=req.quantity,
                before_quantity=src_before,
                after_quantity=src_after,
                reference_number=ref,
                user_id=user.id if user else None,
                user_name=user.full_name if user else "System",
                notes=f"Transfer to {dest_wh.name}. {req.notes or ''}".strip(),
                created_at=timestamp
            )
            db.add(tx_out)

            # Audit record: Transfer In
            tx_in = InventoryTransaction(
                product_id=req.product_id,
                warehouse_id=req.destination_warehouse_id,
                transaction_type="TRANSFER_IN",
                quantity=req.quantity,
                before_quantity=dest_before,
                after_quantity=dest_after,
                reference_number=ref,
                user_id=user.id if user else None,
                user_name=user.full_name if user else "System",
                notes=f"Transfer from {src_wh.name}. {req.notes or ''}".strip(),
                created_at=timestamp
            )
            db.add(tx_in)

            db.commit()
            db.refresh(tx_out)
            db.refresh(tx_in)
            return tx_out, tx_in
        except Exception as e:
            db.rollback()
            if isinstance(e, AppException):
                raise e
            raise AppException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Transfer failed: {str(e)}", "DATABASE_ERROR")

    @classmethod
    def stock_adjustment(cls, db: Session, req: StockAdjustmentRequest, user: User) -> InventoryTransaction:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not product:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        warehouse = db.query(Warehouse).filter(Warehouse.id == req.warehouse_id).first()
        if not warehouse:
            raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

        try:
            inv = cls.get_or_create_inventory(db, req.product_id, req.warehouse_id)
            before_qty = inv.quantity
            after_qty = req.physical_quantity
            diff = after_qty - before_qty

            inv.quantity = after_qty

            tx = InventoryTransaction(
                product_id=req.product_id,
                warehouse_id=req.warehouse_id,
                transaction_type="ADJUSTMENT",
                quantity=abs(diff),
                before_quantity=before_qty,
                after_quantity=after_qty,
                reference_number=f"ADJ-{int(utc_now().timestamp())}",
                user_id=user.id if user else None,
                user_name=user.full_name if user else "System",
                notes=f"Physical reconciliation: {diff:+d} units. Reason: {req.reason}. {req.notes or ''}".strip(),
                created_at=utc_now()
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
            return tx
        except Exception as e:
            db.rollback()
            if isinstance(e, AppException):
                raise e
            raise AppException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Stock adjustment failed: {str(e)}", "DATABASE_ERROR")
