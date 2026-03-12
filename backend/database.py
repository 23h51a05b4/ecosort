"""
database.py — MongoDB connection and helper functions.
"""

from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient, DESCENDING
from bson import ObjectId

import config

_client: MongoClient | None = None
_db = None
_collection = None


def _ensure_client():
    global _client, _db
    if _client is None:
        _client = MongoClient(config.MONGO_URI)
        _db = _client[config.MONGO_DB_NAME]


def get_db():
    """Return the database instance."""
    _ensure_client()
    return _db


def get_collection():
    """Return the detections collection, connecting lazily."""
    global _collection
    _ensure_client()
    if _collection is None:
        _collection = _db[config.MONGO_COLLECTION]
        _collection.create_index([("timestamp", DESCENDING)])
    return _collection


def close_connection():
    global _client, _db, _collection
    if _client:
        _client.close()
        _client = None
        _db = None
        _collection = None


# ─────────────────── CRUD helpers ───────────────────────────────────────

def insert_detection(object_name: str, confidence: float, image_path: str, user_id: str | None = None) -> str:
    """Insert a detection record. Returns the inserted document ID as string."""
    col = get_collection()
    doc = {
        "object_name": object_name,
        "confidence": round(confidence, 4),
        "timestamp": datetime.now(timezone.utc),
        "image_path": image_path,
    }
    if user_id:
        doc["user_id"] = user_id
    result = col.insert_one(doc)
    return str(result.inserted_id)


def get_detections(limit: int = 50, skip: int = 0, user_id: str | None = None) -> list[dict[str, Any]]:
    """Return recent detections, newest first, optionally filtered by user."""
    col = get_collection()
    query = {"user_id": user_id} if user_id else {}
    cursor = col.find(query).sort("timestamp", DESCENDING).skip(skip).limit(limit)
    results = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


def get_detection_stats(user_id: str | None = None) -> dict[str, Any]:
    """Aggregate detection statistics, optionally filtered by user."""
    col = get_collection()
    match_stage = {"$match": {"user_id": user_id}} if user_id else {"$match": {}}

    total = col.count_documents({"user_id": user_id} if user_id else {})

    # Per-object counts
    pipeline_counts = [
        match_stage,
        {"$group": {"_id": "$object_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    object_counts = {
        doc["_id"]: doc["count"] for doc in col.aggregate(pipeline_counts)
    }

    # Detections per hour (last 24 h)
    pipeline_timeline = [
        match_stage,
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d %H:00", "date": "$timestamp"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    timeline = [
        {"time": doc["_id"], "count": doc["count"]}
        for doc in col.aggregate(pipeline_timeline)
    ]

    return {
        "total_detections": total,
        "object_counts": object_counts,
        "timeline": timeline,
    }


def delete_detection(detection_id: str, user_id: str | None = None) -> bool:
    """Delete a detection by ID. Returns True if deleted."""
    col = get_collection()
    query: dict = {"_id": ObjectId(detection_id)}
    if user_id:
        query["user_id"] = user_id
    result = col.delete_one(query)
    return result.deleted_count > 0
