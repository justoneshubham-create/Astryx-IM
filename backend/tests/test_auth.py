import importlib


def test_register_and_login(client):
    # Register
    res = client.post(
        "/api/auth/register",
        json={"email": "newuser@example.com", "full_name": "New User", "password": "password123", "role": "staff"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "staff"

    # Duplicate registration
    res2 = client.post(
        "/api/auth/register",
        json={"email": "newuser@example.com", "full_name": "New User", "password": "password123"}
    )
    assert res2.status_code == 400
    assert res2.json()["error_code"] == "EMAIL_EXISTS"

    # Login
    res3 = client.post(
        "/api/auth/login",
        json={"email": "newuser@example.com", "password": "password123"}
    )
    assert res3.status_code == 200
    token_data = res3.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # /api/auth/me
    res4 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res4.status_code == 200
    assert res4.json()["email"] == "newuser@example.com"

def test_startup_seed_initializer_is_registered(tmp_path, monkeypatch):
    db_path = tmp_path / "inventory.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    import app.config
    import app.database
    import app.main

    importlib.reload(app.config)
    importlib.reload(app.database)
    importlib.reload(app.main)

    assert any(getattr(fn, "__name__", "") == "initialize_database" for fn in app.main.app.router.on_startup)


def test_login_invalid_password(client, admin_user):
    res = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "wrongpassword"}
    )
    assert res.status_code == 401
    assert res.json()["error_code"] == "INVALID_CREDENTIALS"

def test_role_permissions(client, staff_headers, admin_headers):
    # Staff cannot view user list
    res = client.get("/api/users", headers=staff_headers)
    assert res.status_code == 403
    assert res.json()["error_code"] == "FORBIDDEN_ROLE"

    # Admin can view user list
    res_admin = client.get("/api/users", headers=admin_headers)
    assert res_admin.status_code == 200
    assert len(res_admin.json()) >= 1
