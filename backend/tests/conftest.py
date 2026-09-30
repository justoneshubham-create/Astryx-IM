import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse
from app.models.product import Product
from app.models.inventory import Inventory
from app.utils.security import get_password_hash, create_access_token

# In-memory SQLite for high-speed, isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db_session):
    user = User(
        email="admin@test.com",
        full_name="Admin Test",
        hashed_password=get_password_hash("pass123"),
        role="admin",
        status="active",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def manager_user(db_session):
    user = User(
        email="manager@test.com",
        full_name="Manager Test",
        hashed_password=get_password_hash("pass123"),
        role="manager",
        status="active",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def staff_user(db_session):
    user = User(
        email="staff@test.com",
        full_name="Staff Test",
        hashed_password=get_password_hash("pass123"),
        role="staff",
        status="active",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token({"sub": str(admin_user.id), "role": admin_user.role, "email": admin_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def manager_headers(manager_user):
    token = create_access_token({"sub": str(manager_user.id), "role": manager_user.role, "email": manager_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def staff_headers(staff_user):
    token = create_access_token({"sub": str(staff_user.id), "role": staff_user.role, "email": staff_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def base_inventory_setup(db_session):
    cat = Category(name="Electronics", description="Tech gear", status="active")
    sup = Supplier(name="Test Supplier", contact_person="John", email="john@sup.com", status="active")
    wh1 = Warehouse(name="Main WH", code="WH-01", status="active")
    wh2 = Warehouse(name="Branch WH", code="WH-02", status="active")
    db_session.add_all([cat, sup, wh1, wh2])
    db_session.commit()

    prod = Product(
        sku="TEST-SKU-1",
        name="Test Gadget",
        category_id=cat.id,
        supplier_id=sup.id,
        unit="pcs",
        cost_price=50.0,
        selling_price=100.0,
        min_stock_level=10,
        max_stock_level=100,
        status="active",
    )
    db_session.add(prod)
    db_session.commit()

    inv1 = Inventory(product_id=prod.id, warehouse_id=wh1.id, quantity=50)
    inv2 = Inventory(product_id=prod.id, warehouse_id=wh2.id, quantity=10)
    db_session.add_all([inv1, inv2])
    db_session.commit()

    return {"cat": cat, "sup": sup, "wh1": wh1, "wh2": wh2, "prod": prod, "inv1": inv1, "inv2": inv2}
