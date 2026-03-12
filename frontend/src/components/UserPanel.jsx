import React from "react";
import { useAuth } from "../context/AuthContext";
import "./UserPanel.css";

/**
 * User Dashboard panel — shows user profile info, quick stats, and session info.
 */
export default function UserPanel({ stats, running, fps }) {
  const { user } = useAuth();

  return (
    <div className="user-panel">
      {/* Profile card */}
      <div className="up-profile card">
        <div className="up-avatar">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <h2 className="up-username">{user?.username || "User"}</h2>
        <p className="up-email">{user?.email || ""}</p>
        <span className={`up-badge ${running ? "up-badge--active" : ""}`}>
          {running ? "Detection Active" : "Idle"}
        </span>
      </div>

      {/* Quick stats */}
      <div className="up-stats-grid">
        <div className="up-stat card">
          <span className="up-stat__value">{stats.total_detections}</span>
          <span className="up-stat__label">Total Detections</span>
        </div>
        <div className="up-stat card">
          <span className="up-stat__value">
            {Object.keys(stats.object_counts).length}
          </span>
          <span className="up-stat__label">Unique Objects</span>
        </div>
        <div className="up-stat card">
          <span className="up-stat__value">{fps}</span>
          <span className="up-stat__label">Current FPS</span>
        </div>
        <div className="up-stat card">
          <span className="up-stat__value">
            {stats.timeline?.length || 0}
          </span>
          <span className="up-stat__label">Active Hours</span>
        </div>
      </div>

      {/* Top detected objects */}
      <div className="up-top card">
        <h3 className="card__title">Top Detected Objects</h3>
        {Object.keys(stats.object_counts).length === 0 ? (
          <p className="up-empty">No data yet. Start detection to see results.</p>
        ) : (
          <ul className="up-top-list">
            {Object.entries(stats.object_counts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([name, count]) => (
                <li key={name} className="up-top-item">
                  <span className="up-top-name">{name}</span>
                  <div className="up-top-bar-bg">
                    <div
                      className="up-top-bar"
                      style={{
                        width: `${Math.min(
                          100,
                          (count /
                            Math.max(
                              ...Object.values(stats.object_counts)
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="up-top-count">{count}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
