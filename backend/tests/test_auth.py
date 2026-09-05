"""
Tests for authentication endpoints
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.models import User


def _register_user(client, email="test@example.com", password="TestPassword123"):
    return client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "first_name": "Test",
            "last_name": "User",
            "phone": "9876543210",
            "password": password,
        },
    )


def _login(client, email="test@example.com", password="TestPassword123"):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone": "9876543210",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["first_name"] == "Test"


def test_register_duplicate_email(client, db):
    """Test registering with duplicate email"""
    # Register first user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone": "9876543210",
            "password": "TestPassword123",
        },
    )

    # Try to register with same email
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Another",
            "last_name": "User",
            "phone": "1234567890",
            "password": "AnotherPassword123",
        },
    )
    assert response.status_code == 400


def test_login_user(client):
    """Test user login"""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone": "9876543210",
            "password": "TestPassword123",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword",
        },
    )
    assert response.status_code == 401


def test_get_current_user(client):
    """Test getting current user info"""
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone": "9876543210",
            "password": "TestPassword123",
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123",
        },
    )

    token = login_response.json()["access_token"]

    # Get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


def test_failed_login_increments_failed_attempts(client, db):
    """Test that a failed login increments failed_login_attempts"""
    _register_user(client)

    response = _login(client, password="WrongPassword1")
    assert response.status_code == 401

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 1
    assert user.locked_until is None


def test_failed_attempts_only_count_for_existing_users(client, db):
    """Test that an unknown email does not create or mutate any user record"""
    response = _login(client, email="unknown@example.com", password="WrongPassword1")
    assert response.status_code == 401

    user = db.query(User).filter(User.email == "unknown@example.com").first()
    assert user is None


def test_fifth_failed_attempt_locks_account(client, db):
    """Test that the 5th consecutive failed attempt locks the account"""
    _register_user(client)

    for _ in range(4):
        response = _login(client, password="WrongPassword1")
        assert response.status_code == 401

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 4
    assert user.locked_until is None

    response = _login(client, password="WrongPassword1")
    assert response.status_code == 401

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 5
    assert user.locked_until is not None


def test_locked_account_cannot_login_with_correct_password(client, db):
    """Test that a locked account fails even with the correct password"""
    _register_user(client)

    for _ in range(5):
        _login(client, password="WrongPassword1")

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.locked_until is not None

    response = _login(client)
    assert response.status_code == 401


def test_successful_login_resets_lockout_fields(client, db):
    """Test that a successful login resets failed attempts and lockout"""
    _register_user(client)

    for _ in range(2):
        _login(client, password="WrongPassword1")

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 2

    response = _login(client)
    assert response.status_code == 200

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_login_after_lockout_expiry(client, db):
    """Test that a correct password works again once the lockout has expired"""
    _register_user(client)

    for _ in range(5):
        _login(client, password="WrongPassword1")

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.locked_until is not None

    # Deterministic expiry: backdate locked_until into the past.
    user.locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.add(user)
    db.commit()

    response = _login(client)
    assert response.status_code == 200

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_expired_lockout_retries_with_fresh_attempt_count(client, db):
    """Test that a failed attempt after an expired lockout starts a fresh window"""
    _register_user(client)

    for _ in range(5):
        _login(client, password="WrongPassword1")

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.locked_until is not None

    user.locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.add(user)
    db.commit()

    response = _login(client, password="WrongPassword1")
    assert response.status_code == 401

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 1
    assert user.locked_until is None


def test_disabled_user_login_returns_403(client, db):
    """Test that a disabled user still gets 403 Forbidden"""
    _register_user(client)

    user = db.query(User).filter(User.email == "test@example.com").first()
    user.is_active = False
    db.add(user)
    db.commit()

    response = _login(client)
    assert response.status_code == 403


def test_failed_attempts_are_consecutive(client, db):
    """Test that a successful login resets the failed attempt counter"""
    _register_user(client)

    for _ in range(2):
        _login(client, password="WrongPassword1")

    _login(client)

    response = _login(client, password="WrongPassword1")
    assert response.status_code == 401

    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.failed_login_attempts == 1
