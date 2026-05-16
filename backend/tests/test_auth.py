"""Tests for local Supabase JWT verification (app.auth.decode_supabase_jwt).

These cover the load-time fix: verifying tokens locally with the project JWT
secret instead of a per-request call to Supabase Auth. Includes the
anonymous-sign-in case (no email, is_anonymous=True).

Run:  cd backend && .venv/bin/pytest -q
"""

import time
import uuid

import jwt
import pytest
from fastapi import HTTPException

from app import auth
from app.config import settings

TEST_SECRET = "test-jwt-secret-not-a-real-one-min-32-bytes-long"


@pytest.fixture(autouse=True)
def _use_test_secret(monkeypatch):
    """Point local verification at a known secret for every test."""
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)


def _make_token(secret: str = TEST_SECRET, **overrides) -> str:
    """Build a Supabase-shaped HS256 JWT; override any claim via kwargs."""
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "user@example.com",
        "iat": now,
        "exp": now + 3600,
    }
    payload.update(overrides)
    return jwt.encode(payload, secret, algorithm="HS256")


def test_valid_token_returns_normalized_user():
    sub = str(uuid.uuid4())
    user = auth.decode_supabase_jwt(_make_token(sub=sub))
    assert user["id"] == sub
    assert user["email"] == "user@example.com"
    assert user["is_anonymous"] is False


def test_anonymous_user_token():
    """Anonymous sign-in: real user + JWT, but no email."""
    user = auth.decode_supabase_jwt(_make_token(email=None, is_anonymous=True))
    assert user["email"] is None
    assert user["is_anonymous"] is True
    # id must still be a usable UUID string.
    uuid.UUID(user["id"])


def test_expired_token_rejected():
    now = int(time.time())
    token = _make_token(iat=now - 7200, exp=now - 3600)
    with pytest.raises(HTTPException) as exc:
        auth.decode_supabase_jwt(token)
    assert exc.value.status_code == 401


def test_wrong_secret_rejected():
    with pytest.raises(HTTPException) as exc:
        auth.decode_supabase_jwt(_make_token(secret="a-different-secret"))
    assert exc.value.status_code == 401


def test_wrong_audience_rejected():
    with pytest.raises(HTTPException) as exc:
        auth.decode_supabase_jwt(_make_token(aud="not-authenticated"))
    assert exc.value.status_code == 401


def test_garbage_token_rejected():
    with pytest.raises(HTTPException):
        auth.decode_supabase_jwt("this.is.not-a-jwt")


def test_missing_subject_rejected():
    now = int(time.time())
    token = jwt.encode(
        {"aud": "authenticated", "iat": now, "exp": now + 3600},
        TEST_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        auth.decode_supabase_jwt(token)
    assert exc.value.status_code == 401
