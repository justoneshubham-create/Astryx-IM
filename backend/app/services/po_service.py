from sqlalchemy.orm import Session
from fastapi import status
from datetime import datetime, timezone
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction
from app.models.user import User
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, ReceivePORequest
from app.utils.exceptions import AppException

def utc_now():
    return datetime.now(timezone.utc)

class PurchaseOrderService:
    @staticmethod
    def get_all(
        db: Session,
        status_filter: str | None = None,
        supplier_id: int | None = None,
        warehouse_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[PurchaseOrder], int]:
        query = db.query(PurchaseOrder)
        if status_filter:
            query = query.filter(PurchaseOrder.status == status_filter)
        if supplier_id:
            query = query.filter(PurchaseOrder.supplier_id == supplier_id)
        if warehouse_id:
            query = query.filter(PurchaseOrder.warehouse_id == warehouse_id)

        total = query.count()
        orders = query.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return orders, total

    @staticmethod
    def get_by_id(db: Session, po_id: int) -> PurchaseOrder:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise AppException(status.HTTP_404_NOT_FOUND, "Purchase order not found", "PO_NOT_FOUND")
        return po

    @staticmethod
    def create(db: Session, req: PurchaseOrderCreate, user: User) -> PurchaseOrder:
        existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == req.po_number.strip()).first()
        if existing_po:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"PO Number '{req.po_number}' already exists.", "PO_EXISTS")

        supplier = db.query(Supplier).filter(Supplier.id == req.supplier_id).first()
        if not supplier:
            raise AppException(status.HTTP_404_NOT_FOUND, "Supplier not found", "SUPPLIER_NOT_FOUND")

        warehouse = db.query(Warehouse).filter(Warehouse.id == req.warehouse_id).first()
        if not warehouse:
            raise AppException(status.HTTP_404_NOT_FOUND, "Warehouse not found", "WAREHOUSE_NOT_FOUND")

        total_amount = sum(item.quantity * item.unit_cost for item in req.items)

        po = PurchaseOrder(
            po_number=req.po_number.strip(),
            supplier_id=req.supplier_id,
            warehouse_id=req.warehouse_id,
            order_date=req.order_date or utc_now(),
            expected_delivery_date=req.expected_delivery_date,
            status=req.status,
            total_amount=total_amount,
            notes=req.notes,
            created_by_id=user.id if user else None,
        )
        db.add(po)
        db.flush()

        for item_in in req.items:
            prod = db.query(Product).filter(Product.id == item_in.product_id).first()
            if not prod:
                raise AppException(status.HTTP_404_NOT_FOUND, f"Product ID {item_in.product_id} not found", "PRODUCT_NOT_FOUND")

            item_total = item_in.quantity * item_in.unit_cost
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item_in.product_id,
                quantity=item_in.quantity,
                received_quantity=0,
                unit_cost=item_in.unit_cost,
                total=item_total,
            )
            db.add(po_item)

        db.commit()
        db.refresh(po)
        return po

    @staticmethod
    def update(db: Session, po_id: int, req: PurchaseOrderUpdate) -> PurchaseOrder:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise AppException(status.HTTP_404_NOT_FOUND, "Purchase order not found", "PO_NOT_FOUND")

        if po.status in ["Received", "Cancelled"]:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"Cannot edit purchase order in '{po.status}' status.", "PO_IMMUTABLE")

        if req.supplier_id:
            po.supplier_id = req.supplier_id
        if req.warehouse_id:
            po.warehouse_id = req.warehouse_id
        if req.expected_delivery_date:
            po.expected_delivery_date = req.expected_delivery_date
        if req.status:
            po.status = req.status
        if req.notes is not None:
            po.notes = req.notes

        db.commit()
        db.refresh(po)
        return po

    @staticmethod
    def receive(db: Session, po_id: int, req: ReceivePORequest, user: User) -> PurchaseOrder:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise AppException(status.HTTP_404_NOT_FOUND, "Purchase order not found", "PO_NOT_FOUND")

        if po.status in ["Draft", "Cancelled"]:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"Cannot receive items for PO in '{po.status}' status. Approve order first.", "PO_NOT_APPROVED")

        if po.status == "Received":
            raise AppException(status.HTTP_400_BAD_REQUEST, "Purchase order is already completely received.", "PO_ALREADY_RECEIVED")

        try:
            items_to_receive = {}
            if req.items:
                for item_req in req.items:
                    items_to_receive[item_req.item_id] = item_req.quantity_to_receive
            else:
                # Receive all remaining unreceived quantities
                for item in po.items:
                    rem = item.quantity - item.received_quantity
                    if rem > 0:
                        items_to_receive[item.id] = rem

            if not items_to_receive:
                raise AppException(status.HTTP_400_BAD_REQUEST, "No items remaining to receive.", "NO_ITEMS_TO_RECEIVE")

            for item in po.items:
                if item.id in items_to_receive:
                    qty_to_add = items_to_receive[item.id]
                    if qty_to_add <= 0:
                        continue

                    rem = item.quantity - item.received_quantity
                    if qty_to_add > rem:
                        raise AppException(
                            status.HTTP_400_BAD_REQUEST,
                            f"Cannot receive {qty_to_add} units for {item.product.name}. Only {rem} units pending.",
                            "OVER_RECEIVING"
                        )

                    item.received_quantity += qty_to_add

                    # Update Inventory in PO warehouse
                    inv = db.query(Inventory).filter(
                        Inventory.product_id == item.product_id,
                        Inventory.warehouse_id == po.warehouse_id
                    ).first()
                    if not inv:
                        inv = Inventory(
                            product_id=item.product_id,
                            warehouse_id=po.warehouse_id,
                            quantity=0,
                            reserved_quantity=0
                        )
                        db.add(inv)
                        db.flush()

                    before_qty = inv.quantity
                    inv.quantity += qty_to_add
                    after_qty = inv.quantity

                    # Audit Transaction
                    tx = InventoryTransaction(
                        product_id=item.product_id,
                        warehouse_id=po.warehouse_id,
                        transaction_type="STOCK_IN",
                        quantity=qty_to_add,
                        before_quantity=before_qty,
                        after_quantity=after_qty,
                        reference_number=po.po_number,
                        user_id=user.id if user else None,
                        user_name=user.full_name if user else "System",
                        notes=f"PO {po.po_number} Receipt. {req.notes or ''}".strip(),
                        created_at=utc_now()
                    )
                    db.add(tx)

            # Check if all items are fully received
            all_received = all(item.received_quantity >= item.quantity for item in po.items)
            po.status = "Received" if all_received else "Partially Received"

            db.commit()
            db.refresh(po)
            return po
        except Exception as e:
            db.rollback()
            if isinstance(e, AppException):
                raise e
            raise AppException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error receiving purchase order: {str(e)}", "DATABASE_ERROR")
