from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi import status
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.warehouse import Warehouse
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetail, WarehouseStockDetail
from app.utils.exceptions import AppException

class ProductService:
    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
        category_id: int | None = None,
        supplier_id: int | None = None,
        status_filter: str | None = None,
        sort_by: str = "name",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ProductOut], int]:
        query = db.query(Product)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term),
                    Product.description.ilike(search_term),
                )
            )

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if supplier_id:
            query = query.filter(Product.supplier_id == supplier_id)

        if status_filter:
            query = query.filter(Product.status == status_filter)

        total = query.count()

        # Sorting
        sort_column = getattr(Product, sort_by, Product.name)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        products = query.offset((page - 1) * page_size).limit(page_size).all()

        results = []
        for p in products:
            total_qty = sum(inv.quantity for inv in p.inventories)
            # Determine overall stock status
            if total_qty <= 0:
                s_status = "Out of Stock"
            elif total_qty <= p.min_stock_level:
                s_status = "Low Stock"
            elif p.max_stock_level and total_qty > p.max_stock_level:
                s_status = "Over Stock"
            else:
                s_status = "In Stock"

            results.append(
                ProductOut(
                    id=p.id,
                    sku=p.sku,
                    name=p.name,
                    description=p.description,
                    category_id=p.category_id,
                    category_name=p.category.name if p.category else None,
                    supplier_id=p.supplier_id,
                    supplier_name=p.supplier.name if p.supplier else None,
                    unit=p.unit,
                    cost_price=p.cost_price,
                    selling_price=p.selling_price,
                    min_stock_level=p.min_stock_level,
                    max_stock_level=p.max_stock_level,
                    barcode=p.barcode,
                    status=p.status,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    total_quantity=total_qty,
                    stock_status=s_status,
                )
            )

        return results, total

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> ProductDetail:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        warehouses = db.query(Warehouse).all()
        wh_stocks: list[WarehouseStockDetail] = []
        inv_map = {inv.warehouse_id: inv for inv in p.inventories}

        total_qty = 0
        for wh in warehouses:
            inv = inv_map.get(wh.id)
            qty = inv.quantity if inv else 0
            reserved = inv.reserved_quantity if inv else 0
            avail = max(0, qty - reserved)
            total_qty += qty

            if qty <= 0:
                s_stat = "Out of Stock"
            elif qty <= p.min_stock_level:
                s_stat = "Low Stock"
            elif p.max_stock_level and qty > p.max_stock_level:
                s_stat = "Over Stock"
            else:
                s_stat = "In Stock"

            wh_stocks.append(
                WarehouseStockDetail(
                    warehouse_id=wh.id,
                    warehouse_name=wh.name,
                    warehouse_code=wh.code,
                    quantity=qty,
                    reserved_quantity=reserved,
                    available_quantity=avail,
                    stock_status=s_stat,
                )
            )

        if total_qty <= 0:
            overall_status = "Out of Stock"
        elif total_qty <= p.min_stock_level:
            overall_status = "Low Stock"
        elif p.max_stock_level and total_qty > p.max_stock_level:
            overall_status = "Over Stock"
        else:
            overall_status = "In Stock"

        return ProductDetail(
            id=p.id,
            sku=p.sku,
            name=p.name,
            description=p.description,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            supplier_id=p.supplier_id,
            supplier_name=p.supplier.name if p.supplier else None,
            unit=p.unit,
            cost_price=p.cost_price,
            selling_price=p.selling_price,
            min_stock_level=p.min_stock_level,
            max_stock_level=p.max_stock_level,
            barcode=p.barcode,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
            total_quantity=total_qty,
            stock_status=overall_status,
            warehouse_stocks=wh_stocks,
        )

    @staticmethod
    def create(db: Session, req: ProductCreate) -> Product:
        existing_sku = db.query(Product).filter(Product.sku == req.sku.strip()).first()
        if existing_sku:
            raise AppException(status.HTTP_400_BAD_REQUEST, f"Product SKU '{req.sku}' is already taken.", "SKU_EXISTS")

        if req.barcode:
            existing_barcode = db.query(Product).filter(Product.barcode == req.barcode.strip()).first()
            if existing_barcode:
                raise AppException(status.HTTP_400_BAD_REQUEST, f"Product barcode '{req.barcode}' is already in use.", "BARCODE_EXISTS")

        prod = Product(
            sku=req.sku.strip(),
            name=req.name.strip(),
            description=req.description,
            category_id=req.category_id,
            supplier_id=req.supplier_id,
            unit=req.unit,
            cost_price=req.cost_price,
            selling_price=req.selling_price,
            min_stock_level=req.min_stock_level,
            max_stock_level=req.max_stock_level,
            barcode=req.barcode.strip() if req.barcode else None,
            status=req.status,
        )
        db.add(prod)
        db.commit()
        db.refresh(prod)
        return prod

    @staticmethod
    def update(db: Session, product_id: int, req: ProductUpdate) -> Product:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        if req.sku and req.sku.strip() != p.sku:
            conflict = db.query(Product).filter(Product.sku == req.sku.strip(), Product.id != product_id).first()
            if conflict:
                raise AppException(status.HTTP_400_BAD_REQUEST, f"SKU '{req.sku}' is already taken.", "SKU_EXISTS")
            p.sku = req.sku.strip()

        if req.barcode and req.barcode.strip() != p.barcode:
            conflict = db.query(Product).filter(Product.barcode == req.barcode.strip(), Product.id != product_id).first()
            if conflict:
                raise AppException(status.HTTP_400_BAD_REQUEST, f"Barcode '{req.barcode}' is already in use.", "BARCODE_EXISTS")
            p.barcode = req.barcode.strip()

        for field in ["name", "description", "category_id", "supplier_id", "unit", "cost_price", "selling_price", "min_stock_level", "max_stock_level", "status"]:
            val = getattr(req, field)
            if val is not None:
                setattr(p, field, val)

        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def delete(db: Session, product_id: int):
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            raise AppException(status.HTTP_404_NOT_FOUND, "Product not found", "PRODUCT_NOT_FOUND")

        # Check if product has non-zero stock
        total_stock = sum(inv.quantity for inv in p.inventories)
        if total_stock > 0:
            raise AppException(
                status.HTTP_400_BAD_REQUEST,
                f"Cannot delete product with existing inventory stock ({total_stock} {p.unit} remaining). Adjust or stock out first.",
                "PRODUCT_HAS_STOCK"
            )

        db.delete(p)
        db.commit()
