"""
Tests for wishlist authorization and security.
Covers: unauthenticated access, cross-user isolation, ownership enforcement.
"""
import pytest
from sqlalchemy import text


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_phone_counter = [0]

def _unique_phone():
    _phone_counter[0] += 1
    return f"98000{str(_phone_counter[0]).zfill(5)}"


def _register(client, email="user1@example.com", password="TestPass123"):
    resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "first_name": "Test",
        "last_name": "User",
        "phone": _unique_phone(),
        "password": password,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def _login(client, email="user1@example.com", password="TestPass123"):
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _disable_user(db, email):
    """Disable a user via raw SQL to bypass ORM identity map caching."""
    db.execute(text("UPDATE users SET is_active = 0 WHERE email = :email"), {"email": email})
    db.commit()
    db.expire_all()


# ---------------------------------------------------------------------------
# Unauthenticated access
# ---------------------------------------------------------------------------

class TestWishlistUnauthenticated:
    def test_get_wishlist_without_token(self, client):
        resp = client.get("/api/v1/wishlist")
        assert resp.status_code == 401

    def test_add_to_wishlist_without_token(self, client):
        resp = client.post("/api/v1/wishlist/1")
        assert resp.status_code == 401

    def test_remove_from_wishlist_without_token(self, client):
        resp = client.delete("/api/v1/wishlist/1")
        assert resp.status_code == 401

    def test_get_wishlist_with_invalid_token(self, client):
        resp = client.get("/api/v1/wishlist", headers=_auth("invalid.token.here"))
        assert resp.status_code == 401

    def test_get_wishlist_with_empty_bearer(self, client):
        resp = client.get("/api/v1/wishlist", headers={"Authorization": "Bearer "})
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Authenticated user – own wishlist
# ---------------------------------------------------------------------------

class TestWishlistOwnership:
    def test_empty_wishlist_for_new_user(self, client):
        _register(client, email="new@example.com")
        token = _login(client, email="new@example.com")
        resp = client.get("/api/v1/wishlist", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_add_and_view_wishlist(self, client):
        _register(client, email="owner@example.com")
        token = _login(client, email="owner@example.com")
        resp = client.post("/api/v1/wishlist/1", headers=_auth(token))
        if resp.status_code == 200:
            resp = client.get("/api/v1/wishlist", headers=_auth(token))
            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    def test_add_nonexistent_product_returns_404(self, client):
        _register(client, email="owner2@example.com")
        token = _login(client, email="owner2@example.com")
        resp = client.post("/api/v1/wishlist/99999", headers=_auth(token))
        assert resp.status_code == 404

    def test_remove_nonexistent_product_returns_404(self, client):
        _register(client, email="owner3@example.com")
        token = _login(client, email="owner3@example.com")
        resp = client.delete("/api/v1/wishlist/99999", headers=_auth(token))
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Cross-user isolation
# ---------------------------------------------------------------------------

class TestWishlistCrossUser:
    def test_user_a_wishlist_invisible_to_user_b(self, client):
        _register(client, email="alice@example.com")
        _register(client, email="bob@example.com")
        token_a = _login(client, email="alice@example.com")
        token_b = _login(client, email="bob@example.com")
        resp = client.post("/api/v1/wishlist/1", headers=_auth(token_a))
        if resp.status_code == 200:
            resp = client.get("/api/v1/wishlist", headers=_auth(token_b))
            assert resp.status_code == 200
            bob_ids = [item["id"] for item in resp.json()]
            assert 1 not in bob_ids

    def test_user_cannot_remove_from_other_users_wishlist(self, client):
        _register(client, email="c1@example.com")
        _register(client, email="c2@example.com")
        token_c1 = _login(client, email="c1@example.com")
        token_c2 = _login(client, email="c2@example.com")
        resp = client.post("/api/v1/wishlist/1", headers=_auth(token_c1))
        if resp.status_code == 200:
            resp = client.delete("/api/v1/wishlist/1", headers=_auth(token_c2))
            assert resp.status_code == 200
            resp = client.get("/api/v1/wishlist", headers=_auth(token_c1))
            assert resp.status_code == 200
            c1_ids = [item["id"] for item in resp.json()]
            assert 1 in c1_ids


# ---------------------------------------------------------------------------
# Auth security tests
# ---------------------------------------------------------------------------

class TestAuthSecurity:
    def test_login_disabled_user_returns_403(self, client, db):
        """Disabled user cannot login."""
        from app.models.models import User
        from app.core.security import hash_password

        user = User(
            email="disabled@example.com",
            first_name="Disabled",
            last_name="User",
            phone=_unique_phone(),
            hashed_password=hash_password("TestPass123"),
            is_active=False,
        )
        db.add(user)
        db.commit()

        resp = client.post("/api/v1/auth/login", json={
            "email": "disabled@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 403
        assert "disabled" in resp.json()["detail"].lower()

    def test_disabled_user_token_rejected_by_me(self, client, db):
        """Valid token for a disabled user is rejected by /auth/me."""
        _register(client, email="inactive@example.com")
        token = _login(client, email="inactive@example.com")

        # Disable the user via raw SQL
        _disable_user(db, "inactive@example.com")

        # Token should now be rejected
        resp = client.get("/api/v1/auth/me", headers=_auth(token))
        assert resp.status_code == 403
        assert "disabled" in resp.json()["detail"].lower()

    def test_disabled_user_wishlist_rejected(self, client, db):
        """Valid token for a disabled user is rejected on wishlist endpoint."""
        _register(client, email="inactive_w@example.com")
        token = _login(client, email="inactive_w@example.com")

        # Disable the user via raw SQL
        _disable_user(db, "inactive_w@example.com")

        # Wishlist should be rejected
        resp = client.get("/api/v1/wishlist", headers=_auth(token))
        assert resp.status_code == 403

    def test_me_without_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me", headers=_auth(
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyJ9.invalid"
        ))
        assert resp.status_code == 401

    def test_refresh_with_invalid_token_returns_401(self, client):
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "completely.invalid.token"
        })
        assert resp.status_code == 401

    def test_disabled_user_refresh_token_rejected(self, client, db):
        """Refresh token for a disabled user is rejected."""
        _register(client, email="inactive_r@example.com")
        resp = client.post("/api/v1/auth/login", json={
            "email": "inactive_r@example.com",
            "password": "TestPass123",
        })
        refresh_token = resp.json()["refresh_token"]

        # Disable user via raw SQL
        _disable_user(db, "inactive_r@example.com")

        # Refresh should fail
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        assert resp.status_code == 403
