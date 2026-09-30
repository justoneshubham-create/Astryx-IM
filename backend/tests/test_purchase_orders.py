def test_purchase_order_lifecycle(client, manager_headers, base_inventory_setup):
    prod = base_inventory_setup["prod"]
    wh = base_inventory_setup["wh1"]
    sup = base_inventory_setup["sup"]

    # 1. Create PO
    res = client.post(
        "/api/purchase-orders",
        json={
            "po_number": "PO-TEST-999",
            "supplier_id": sup.id,
            "warehouse_id": wh.id,
            "status": "Approved",
            "notes": "Test PO order",
            "items": [
                {"product_id": prod.id, "quantity": 30, "unit_cost": 45.0}
            ]
        },
        headers=manager_headers,
    )
    assert res.status_code == 201
    po = res.json()
    po_id = po["id"]
    assert po["po_number"] == "PO-TEST-999"
    assert po["total_amount"] == 30 * 45.0
    assert po["status"] == "Approved"

    # 2. Receive PO items
    # Prior stock is 50
    res_rec = client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={"notes": "All items received in good condition"},
        headers=manager_headers,
    )
    assert res_rec.status_code == 200
    po_received = res_rec.json()
    assert po_received["status"] == "Received"
    assert po_received["items"][0]["received_quantity"] == 30

    # Verify inventory increased by 30 (50 + 30 = 80)
    res_inv = client.get(f"/api/inventory/{prod.id}", headers=manager_headers)
    assert res_inv.status_code == 200
    inv = next(i for i in res_inv.json() if i["warehouse_id"] == wh.id)
    assert inv["quantity"] == 80

    # 3. Already received PO cannot be received again
    res_rec2 = client.post(
        f"/api/purchase-orders/{po_id}/receive",
        json={},
        headers=manager_headers,
    )
    assert res_rec2.status_code == 400
    assert res_rec2.json()["error_code"] == "PO_ALREADY_RECEIVED"
