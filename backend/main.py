"""
main.py — FastAPI entry-point for the AI Object Detection Dashboard backend.

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from auth import verify_token
from database import close_connection
from detector import detector
from routes.auth_routes import router as auth_router
from routes.detection_routes import router as detection_router
from routes.history_routes import router as history_router


# ─────────────────── Lifespan (startup / shutdown) ──────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Backend starting …")
    yield
    # Shutdown
    print("[INFO] Shutting down …")
    close_connection()


# ─────────────────── App factory ────────────────────────────────────────

app = FastAPI(
    title="AI Object Detection Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS if "*" not in config.CORS_ORIGINS else [],
    allow_origin_regex=".*" if "*" in config.CORS_ORIGINS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve screenshots as static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# REST routes
app.include_router(auth_router)
app.include_router(detection_router)
app.include_router(history_router)


# ─────────────────── WebSocket endpoint ─────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(default="")):
    """
    Per-client WebSocket:
    - Client authenticates via ?token=JWT query param
    - Client sends base64 JPEG frames
    - Server runs YOLO and sends annotated frames back to that client only
    """
    # Authenticate
    user_id = None
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")

    await ws.accept()
    print(f"[WS] Client connected. user_id: {user_id}")
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
                continue

            # Client sent a frame for detection
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "frame" and msg.get("frame"):
                # print(f"[WS] Received frame from {user_id}")
                # Process frame in a thread to avoid blocking
                result = await asyncio.to_thread(
                    detector.process_frame, msg["frame"], user_id
                )
                if result:
                    # print(f"[WS] Sending detection back to {user_id}")
                    await ws.send_text(json.dumps(result, default=str))
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {user_id}")
    except Exception as e:
        print(f"[WS] Error: {e}")


# ─────────────────── Health check ───────────────────────────────────────

@app.get("/")
async def root():
    return {
        "app": "AI Object Detection Dashboard",
        "status": "running",
    }
