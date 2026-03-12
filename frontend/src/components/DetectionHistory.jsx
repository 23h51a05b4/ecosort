import React, { useEffect, useState } from "react";
import api from "../services/api";
import "./DetectionHistory.css";

/**
 * Fetches an image via axios (which includes the ngrok-skip-browser-warning
 * header) and returns a blob URL.  Falls back gracefully on error.
 */
function Thumb({ src, alt }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) { setFailed(true); return; }
    let revoke;
    api
      .get(src, { responseType: "blob" })
      .then((r) => {
        // Verify we got an image, not an HTML page
        if (r.data && r.data.type && r.data.type.startsWith("image")) {
          const url = URL.createObjectURL(r.data);
          revoke = url;
          setBlobUrl(url);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  if (failed || !blobUrl) {
    return (
      <div className="history__thumb history__thumb--fallback">
        {alt ? alt.charAt(0).toUpperCase() : "?"}
      </div>
    );
  }
  return <img className="history__thumb" src={blobUrl} alt={alt} onError={() => setFailed(true)} />;
}

/**
 * Scrollable sidebar listing recent detection events.
 */
export default function DetectionHistory({ history, onDelete }) {
  return (
    <div className="history card">
      <h2 className="card__title">Detection History</h2>
      <div className="history__list">
        {history.length === 0 && (
          <p className="history__empty">No detections yet.</p>
        )}
        {history.map((d, i) => (
          <div className="history__item" key={d._id || i}>
            <div className="history__thumb-wrap">
              {d.image_path ? (
                <Thumb src={d.image_path} alt={d.object_name} />
              ) : (
                <div className="history__thumb history__thumb--empty" />
              )}
            </div>
            <div className="history__info">
              <span className="history__label">{d.object_name}</span>
              <span className="history__conf">
                {(d.confidence * 100).toFixed(1)}%
              </span>
              <span className="history__time">
                {new Date(d.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {d._id && onDelete && (
              <button
                className="history__delete"
                onClick={() => onDelete(d._id)}
                title="Delete detection"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
