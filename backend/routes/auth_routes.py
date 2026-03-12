"""
auth_routes.py — Register, login, and user profile endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

import config
from auth import hash_password, verify_password, create_token, verify_token
from models import RegisterRequest, LoginRequest, AuthResponse
from database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _users_col():
    """Return the users MongoDB collection."""
    return get_db()[config.USERS_COLLECTION]


# ─────────────────── Dependency: current user ───────────────────────────

from fastapi import Request

async def get_current_user(request: Request) -> dict:
    """Extract and verify the JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header[7:]
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# ─────────────────── Routes ─────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    col = _users_col()
    if col.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    if col.find_one({"username": body.username}):
        raise HTTPException(status_code=409, detail="Username already taken")

    user_doc = {
        "username": body.username,
        "email": body.email,
        "password": hash_password(body.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = col.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_token(user_id, body.username)
    return AuthResponse(
        token=token,
        user={"id": user_id, "username": body.username, "email": body.email},
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    col = _users_col()
    user = col.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_token(user_id, user["username"])
    return AuthResponse(
        token=token,
        user={"id": user_id, "username": user["username"], "email": user["email"]},
    )


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    col = _users_col()
    from bson import ObjectId
    user = col.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "created_at": user.get("created_at", ""),
    }
