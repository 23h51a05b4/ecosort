"""
detector.py — YOLOv8 detection wrapper.
Provides single-frame inference for per-client WebSocket processing.
"""

import base64
import os
import time
from datetime import datetime, timezone

import cv2
import numpy as np
from ultralytics import YOLO

import config


class ObjectDetector:
    """Runs YOLOv8 inference on individual frames sent by clients."""

    SAVE_INTERVAL = 3  # seconds between DB/screenshot saves per user

    def __init__(self):
        self.model = YOLO(config.MODEL_PATH)
        self.class_names: dict = self.model.names
        self._last_save: dict[str, float] = {}  # user_id → timestamp

    # ─────────── single-frame inference ─────────────────────────────────

    def detect(self, frame: np.ndarray) -> list[dict]:
        results = self.model.predict(
            source=frame,
            conf=config.CONFIDENCE_THRESHOLD,
            iou=config.IOU_THRESHOLD,
            verbose=False,
        )
        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = self.class_names.get(cls_id, str(cls_id))
                detections.append({
                    "bbox": (x1, y1, x2, y2),
                    "label": label,
                    "confidence": conf,
                })
        return detections

    # ─────────── drawing helpers ────────────────────────────────────────

    @staticmethod
    def draw_detections(frame: np.ndarray, detections: list[dict]) -> np.ndarray:
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            label = det["label"]
            conf = det["confidence"]
            text = f"{label} {conf:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw, y1), (0, 0, 0), -1)
            cv2.putText(frame, text, (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        return frame

    # ─────────── screenshot ─────────────────────────────────────────────

    @staticmethod
    def save_screenshot(frame: np.ndarray, label: str) -> str:
        os.makedirs(config.SCREENSHOT_DIR, exist_ok=True)
        ts = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{label}_{ts}_{id(frame) % 10000}.jpg"
        filepath = os.path.join(config.SCREENSHOT_DIR, filename)
        cv2.imwrite(filepath, frame)
        return f"/static/screenshots/{filename}"

    # ─────────── decode base64 frame from client ────────────────────────

    @staticmethod
    def decode_frame(b64: str) -> np.ndarray | None:
        """Decode a base64-encoded JPEG into a numpy array."""
        try:
            # Strip data URL prefix if present
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            raw = base64.b64decode(b64)
            arr = np.frombuffer(raw, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return frame
        except Exception:
            return None

    # ─────────── process one client frame end-to-end ────────────────────

    def process_frame(self, b64_frame: str, user_id: str | None = None) -> dict | None:
        """Decode → detect → annotate → return result dict.  Saves to DB at most once per SAVE_INTERVAL."""
        frame = self.decode_frame(b64_frame)
        if frame is None:
            return None

        detections = self.detect(frame)
        if detections:
            print(f"[Detector] Detected: {', '.join([d['label'] for d in detections])}")
        annotated = self.draw_detections(frame.copy(), detections)

        # Encode annotated frame → base64 JPEG
        _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
        annotated_b64 = base64.b64encode(buf).decode("utf-8")

        # Throttle DB + screenshot saving (once per SAVE_INTERVAL per user)
        now = time.time()
        uid = user_id or "__anon__"
        should_save = detections and (now - self._last_save.get(uid, 0)) >= self.SAVE_INTERVAL

        stored: list[dict] = []
        if should_save:
            self._last_save[uid] = now
            try:
                from database import insert_detection
                db_available = True
            except Exception:
                db_available = False

            for det in detections:
                img_path = self.save_screenshot(annotated, det["label"])
                doc_id = ""
                if db_available:
                    try:
                        doc_id = insert_detection(
                            det["label"], det["confidence"], img_path,
                            user_id=user_id,
                        )
                    except Exception:
                        pass
                stored.append({
                    "_id": doc_id,
                    "object_name": det["label"],
                    "confidence": round(det["confidence"], 4),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "image_path": img_path,
                })

        return {
            "type": "detection",
            "frame": annotated_b64,
            "detections": stored,
        }


# Module-level singleton
detector = ObjectDetector()
