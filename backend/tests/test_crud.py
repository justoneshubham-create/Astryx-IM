def test_category_crud(client, admin_headers):
    # Create category
    res = client.post(
        "/api/categories",
        json={"name": "Tools", "description": "Hand and power tools"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    cat_id = res.json()["id"]
    assert res.json()["name"] == "Tools"

    # Duplicate category prevented
    res_dup = client.post(
        "/api/categories",
        json={"name": "Tools"},
        headers=admin_headers,
    )
    assert res_dup.status_code == 400
    assert res_dup.json()["error_code"] == "CATEGORY_EXISTS"

    # Update category
    res_up = client.put(
        f"/api/categories/{cat_id}",
        json={"description": "Updated tool description"},
        headers=admin_headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["description"] == "Updated tool description"

    # Delete category
    res_del = client.delete(f"/api/categories/{cat_id}", headers=admin_headers)
    assert res_del.status_code == 200

def test_warehouse_crud(client, admin_headers):
    # Create warehouse
    res = client.post(
        "/api/warehouses",
        json={"name": "North Hub", "code": "NH-01", "address": "123 North St"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    wh_id = res.json()["id"]
    assert res.json()["code"] == "NH-01"

    # Duplicate code prevented
    res_dup = client.post(
        "/api/warehouses",
        json={"name": "Another Hub", "code": "NH-01"},
        headers=admin_headers,
    )
    assert res_dup.status_code == 400
    assert res_dup.json()["error_code"] == "WAREHOUSE_CODE_EXISTS"

    # Update
    res_up = client.put(
        f"/api/warehouses/{wh_id}",
        json={"name": "North Hub Central"},
        headers=admin_headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["name"] == "North Hub Central"

def test_product_crud(client, admin_headers, base_inventory_setup):
    cat = base_inventory_setup["cat"]
    sup = base_inventory_setup["sup"]

    # Create product
    res = client.post(
        "/api/products",
        json={
            "sku": "PROD-NEW-01",
            "name": "Wireless Headset",
            "category_id": cat.id,
            "supplier_id": sup.id,
            "cost_price": 40.0,
            "selling_price": 89.99,
            "min_stock_level": 5,
            "max_stock_level": 50,
        },
        headers=admin_headers,
    )
    assert res.status_code == 201
    prod_id = res.json()["id"]
    assert res.json()["sku"] == "PROD-NEW-01"

    # Unique SKU check
    res_dup = client.post(
        "/api/products",
        json={
            "sku": "PROD-NEW-01",
            "name": "Duplicate Headset",
            "category_id": cat.id,
        },
        headers=admin_headers,
    )
    assert res_dup.status_code == 400
    assert res_dup.json()["error_code"] == "SKU_EXISTS"

    # Get product details with warehouse breakdown
    res_detail = client.get(f"/api/products/{prod_id}", headers=admin_headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["sku"] == "PROD-NEW-01"
    assert len(detail["warehouse_stocks"]) >= 2

def test_supplier_crud(client, admin_headers):
    # Create supplier
    res = client.post(
        "/api/suppliers",
        json={
            "name": "Global Tech Suppliers Ltd",
            "contact_person": "Alex Mercer",
            "email": "alex@globaltech.com",
            "phone": "+1-555-8822",
            "city": "Seattle",
            "country": "USA",
        },
        headers=admin_headers,
    )
    assert res.status_code == 200
    sup_id = res.json()["id"]
    assert res.json()["name"] == "Global Tech Suppliers Ltd"

    # Search suppliers
    res_search = client.get("/api/suppliers?search=Global", headers=admin_headers)
    assert res_search.status_code == 200
    assert any(s["id"] == sup_id for s in res_search.json())

    # Update supplier
    res_up = client.put(
        f"/api/suppliers/{sup_id}",
        json={"city": "Bellevue"},
        headers=admin_headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["city"] == "Bellevue"

    # Delete supplier
    res_del = client.delete(f"/api/suppliers/{sup_id}", headers=admin_headers)
    assert res_del.status_code == 200

def test_role_permissions(client, staff_headers):
    # Staff cannot manage users
    res_user = client.get("/api/users", headers=staff_headers)
    assert res_user.status_code == 403

    # Staff cannot perform warehouse stock transfer
    res_transfer = client.post(
        "/api/inventory/transfer",
        json={
            "source_warehouse_id": 1,
            "destination_warehouse_id": 2,
            "product_id": 1,
            "quantity": 5,
        },
        headers=staff_headers,
    )
    assert res_transfer.status_code == 403

    # Staff cannot delete products
    res_del_prod = client.delete("/api/products/1", headers=staff_headers)
    assert res_del_prod.status_code == 403

