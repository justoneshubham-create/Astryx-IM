def test_stock_in(client, staff_headers, base_inventory_setup):
    prod = base_inventory_setup["prod"]
    wh = base_inventory_setup["wh1"]

    res = client.post(
        "/api/inventory/stock-in",
        json={
            "warehouse_id": wh.id,
            "product_id": prod.id,
            "quantity": 25,
            "reference_number": "IN-TEST-001",
            "notes": "Incoming test shipment"
        },
        headers=staff_headers,
    )
    assert res.status_code == 201
    tx = res.json()
    assert tx["transaction_type"] == "STOCK_IN"
    assert tx["before_quantity"] == 50
    assert tx["after_quantity"] == 75
    assert tx["quantity"] == 25

    # Check inventory reflected
    res_inv = client.get(f"/api/inventory/{prod.id}", headers=staff_headers)
    assert res_inv.status_code == 200
    inv = next(i for i in res_inv.json() if i["warehouse_id"] == wh.id)
    assert inv["quantity"] == 75

def test_stock_out_success_and_insufficient(client, staff_headers, base_inventory_setup):
    prod = base_inventory_setup["prod"]
    wh = base_inventory_setup["wh1"]  # starts with 50

    # Stock Out 20 -> should succeed
    res = client.post(
        "/api/inventory/stock-out",
        json={
            "warehouse_id": wh.id,
            "product_id": prod.id,
            "quantity": 20,
            "reason": "Order Fulfillment",
            "reference_number": "OUT-TEST-001"
        },
        headers=staff_headers,
    )
    assert res.status_code == 201
    tx = res.json()
    assert tx["transaction_type"] == "STOCK_OUT"
    assert tx["before_quantity"] == 50
    assert tx["after_quantity"] == 30

    # Stock Out 100 -> should fail with INSUFFICIENT_STOCK
    res_fail = client.post(
        "/api/inventory/stock-out",
        json={
            "warehouse_id": wh.id,
            "product_id": prod.id,
            "quantity": 100,
            "reason": "Large order",
        },
        headers=staff_headers,
    )
    assert res_fail.status_code == 400
    err = res_fail.json()
    assert err["success"] is False
    assert err["error_code"] == "INSUFFICIENT_STOCK"
    assert "Insufficient stock" in err["message"]

def test_stock_transfer(client, manager_headers, base_inventory_setup):
    prod = base_inventory_setup["prod"]
    wh1 = base_inventory_setup["wh1"]  # 50 units
    wh2 = base_inventory_setup["wh2"]  # 10 units

    # Transfer 15 units from WH1 to WH2
    res = client.post(
        "/api/inventory/transfer",
        json={
            "source_warehouse_id": wh1.id,
            "destination_warehouse_id": wh2.id,
            "product_id": prod.id,
            "quantity": 15,
            "reference_number": "TRF-TEST-001",
            "notes": "Balancing branch warehouse stock"
        },
        headers=manager_headers,
    )
    assert res.status_code == 201
    txs = res.json()
    assert len(txs) == 2
    tx_out = next(t for t in txs if t["transaction_type"] == "TRANSFER_OUT")
    tx_in = next(t for t in txs if t["transaction_type"] == "TRANSFER_IN")
    assert tx_out["before_quantity"] == 50
    assert tx_out["after_quantity"] == 35
    assert tx_in["before_quantity"] == 10
    assert tx_in["after_quantity"] == 25

    # Insufficient transfer fails
    res_fail = client.post(
        "/api/inventory/transfer",
        json={
            "source_warehouse_id": wh1.id,
            "destination_warehouse_id": wh2.id,
            "product_id": prod.id,
            "quantity": 999,
        },
        headers=manager_headers,
    )
    assert res_fail.status_code == 400
    assert res_fail.json()["error_code"] == "INSUFFICIENT_STOCK"

def test_stock_adjustment(client, manager_headers, base_inventory_setup):
    prod = base_inventory_setup["prod"]
    wh = base_inventory_setup["wh1"]  # starts with 50

    res = client.post(
        "/api/inventory/adjustment",
        json={
            "warehouse_id": wh.id,
            "product_id": prod.id,
            "physical_quantity": 48,
            "reason": "Cycle count audit discrepancy",
            "notes": "Found 2 damaged items disposed"
        },
        headers=manager_headers,
    )
    assert res.status_code == 201
    tx = res.json()
    assert tx["transaction_type"] == "ADJUSTMENT"
    assert tx["before_quantity"] == 50
    assert tx["after_quantity"] == 48
