"""
auth.py — JWT authentication utilities.
Handles password hashing, token creation, and token verification.
"""

from datetime import datetime, timedelta, timezone

import hashlib
import hmac
import os
import json
import base64

import config

# ───────────────── Password hashing (bcrypt-like with hashlib) ──────────

def hash_password(password: str) -> str:
    """Hash a password with a random salt using PBKDF2-SHA256."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(dk).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a stored hash."""
    try:
        salt_b64, dk_b64 = hashed.split(":")
        salt = base64.b64decode(salt_b64)
        stored_dk = base64.b64decode(dk_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
        return hmac.compare_digest(dk, stored_dk)
    except Exception:
        return False


# ───────────────── JWT helpers ──────────────────────────────────────────

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def create_token(user_id: str, username: str) -> str:
    """Create a signed JWT token."""
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = datetime.now(timezone.utc)
    payload_dict = {
        "sub": user_id,
        "username": username,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=config.JWT_EXPIRE_MINUTES)).timestamp()),
    }
    payload = _b64url_encode(json.dumps(payload_dict).encode())
    signing_input = f"{header}.{payload}"
    sig = hmac.new(
        config.JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256
    ).digest()
    signature = _b64url_encode(sig)
    return f"{header}.{payload}.{signature}"


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns the payload dict or None."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b, payload_b, sig_b = parts
        signing_input = f"{header_b}.{payload_b}"
        expected_sig = hmac.new(
            config.JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b))
        # Check expiry
        if payload.get("exp", 0) < datetime.now(timezone.utc).timestamp():
            return None
        return payload
    except Exception:
        return None
