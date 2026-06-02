"""
Tests for authentication endpoints
"""

import pytest


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
