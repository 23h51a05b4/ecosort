"""
models.py — Pydantic schemas for API request / response validation.
"""

from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# ─────────────────── Auth schemas ───────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserProfile(BaseModel):
    username: str
    email: str
    created_at: datetime


# ─────────────────── Detection schemas ──────────────────────────────────

class DetectionRecord(BaseModel):
    id: str = Field(alias="_id", default="")
    object_name: str
    confidence: float
    timestamp: datetime
    image_path: str

    class Config:
        populate_by_name = True


class DetectionStats(BaseModel):
    total_detections: int
    object_counts: dict[str, int]
    timeline: list[dict]


class StatusResponse(BaseModel):
    status: str
    message: str
