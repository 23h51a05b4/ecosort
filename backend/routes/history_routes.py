"""
history_routes.py — Endpoints for detection history and statistics.
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from database import get_detections, get_detection_stats, delete_detection
from routes.auth_routes import get_current_user

router = APIRouter(tags=["History & Stats"])


@router.get("/detections")
async def fetch_detections(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    records = get_detections(limit=limit, skip=skip, user_id=current_user["sub"])
    return {"detections": records}


@router.get("/stats")
async def fetch_stats(current_user: dict = Depends(get_current_user)):
    stats = get_detection_stats(user_id=current_user["sub"])
    return stats


@router.delete("/detections/{detection_id}")
async def remove_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user),
):
    deleted = delete_detection(detection_id, user_id=current_user["sub"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Detection not found")
    return {"deleted": True}
