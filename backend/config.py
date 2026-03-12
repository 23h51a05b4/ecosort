"""
config.py — Centralized configuration for the AI Object Detection App backend.
"""

import os

# ──────────────────────────── Model Settings ────────────────────────────
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.35"))
IOU_THRESHOLD = float(os.environ.get("IOU_THRESHOLD", "0.70"))

# ──────────────────────────── Camera Settings ───────────────────────────
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", "0"))
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720

# ──────────────────────────── MongoDB Settings ──────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "object_detection_db")
MONGO_COLLECTION = "detections"
USERS_COLLECTION = "users"

# ──────────────────────────── Auth / JWT Settings ───────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-to-a-real-secret-key-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))  # 24 h

# ──────────────────────────── Output Settings ───────────────────────────
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "static", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# ──────────────────────────── Server Settings ───────────────────────────
BACKEND_HOST = "0.0.0.0"
BACKEND_PORT = int(os.environ.get("PORT", "8000"))
CORS_ORIGINS = [
    "*",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://frontend-olive-eight-16.vercel.app",
    "https://convergent-defencelessly-jolene.ngrok-free.dev",
]
