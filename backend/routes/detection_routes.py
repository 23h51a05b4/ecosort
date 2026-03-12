"""
detection_routes.py — Detection status endpoint.
Camera is now on the client side; these are kept for compatibility.
"""

from fastapi import APIRouter
from models import StatusResponse

router = APIRouter(tags=["Detection Control"])


@router.post("/start-detection", response_model=StatusResponse)
async def start_detection():
    return StatusResponse(status="ok", message="Detection started on client.")


@router.post("/stop-detection", response_model=StatusResponse)
async def stop_detection():
    return StatusResponse(status="ok", message="Detection stopped on client.")


@router.get("/detection-status")
async def detection_status():
    return {"running": False}
