import React, { useState } from "react";
import "./LiveFeed.css";

/**
 * Shows the device camera preview and overlays annotated frames from the server.
 */
export default function LiveFeed({ frame, running, videoRef, facingMode, onFlipCamera }) {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="livefeed card">
      <div className="livefeed__header">
        <h2 className="card__title">Live Detection Feed</h2>
        {running && onFlipCamera && (
          <button className="livefeed__flip-btn" onClick={onFlipCamera} title="Switch camera">
            🔄 {facingMode === "environment" ? "Front" : "Back"}
          </button>
        )}
      </div>
      <div className="livefeed__viewport">
        {running ? (
          <div className="livefeed__stack">
            {/* Loading indicator while camera initializes */}
            {!videoReady && !frame && (
              <div className="livefeed__loading">Starting camera…</div>
            )}
            {/* Raw camera preview (hidden when annotated frames arrive) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline=""
              className="livefeed__video"
              onLoadedMetadata={() => setVideoReady(true)}
              style={{ display: frame ? "none" : "block" }}
            />
            {/* Annotated frame from server */}
            {frame && (
              <img
                className="livefeed__img"
                src={`data:image/jpeg;base64,${frame}`}
                alt="Live detection"
              />
            )}
          </div>
        ) : (
          <div className="livefeed__placeholder">
            <span className="livefeed__icon">&#127909;</span>
            <p>Click <strong>Start Detection</strong> to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
