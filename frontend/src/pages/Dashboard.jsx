import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import UserPanel from "../components/UserPanel";
import LiveFeed from "../components/LiveFeed";
import DetectionHistory from "../components/DetectionHistory";
import StatsPanel from "../components/StatsPanel";
import {
  getDetections,
  getStats,
  deleteDetection,
  WS_URL,
} from "../services/api";
import "./Dashboard.css";

const TABS = [
  { id: "user", label: "User Dashboard", icon: "👤" },
  { id: "feed", label: "Live Detection", icon: "📹" },
  { id: "history", label: "History Panel", icon: "📋" },
  { id: "stats", label: "Statistics", icon: "📊" },
];

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("user");
  const [running, setRunning] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [frame, setFrame] = useState(null);
  const [fps, setFps] = useState(0);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    total_detections: 0,
    object_counts: {},
    timeline: [],
  });

  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureTimer = useRef(null);
  const fpsTracker = useRef({ lastTime: 0, count: 0 });
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected, connecting, connected, error
  const [streamVersion, setStreamVersion] = useState(0);

  /* ── Fetch initial data ──────────────────────────────────────────── */
  useEffect(() => {
    getDetections(50)
      .then((r) => {
        if (Array.isArray(r.data?.detections)) setHistory(r.data.detections);
      })
      .catch(() => {});
    getStats()
      .then((r) => {
        if (r.data && typeof r.data === "object" && "object_counts" in r.data)
          setStats(r.data);
      })
      .catch(() => {});
  }, []);

  /* ── WebSocket connection (authenticated, per-user) ──────────────── */
  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    setWsStatus("connecting");
    const wsUrl = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] connected");
      setWsStatus("connected");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "detection") {
          setFrame(msg.frame);
          // ...
          const now = performance.now();
          fpsTracker.current.count++;
          if (now - fpsTracker.current.lastTime >= 1000) {
            setFps(fpsTracker.current.count);
            fpsTracker.current = { lastTime: now, count: 0 };
          }

          if (msg.detections?.length) {
            setHistory((prev) => [...msg.detections, ...prev].slice(0, 200));
            setStats((prev) => {
              const newCounts = { ...prev.object_counts };
              msg.detections.forEach((d) => {
                newCounts[d.object_name] = (newCounts[d.object_name] || 0) + 1;
              });
              return {
                ...prev,
                total_detections: prev.total_detections + msg.detections.length,
                object_counts: newCounts,
              };
            });
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      console.log("[WS] disconnected");
      wsRef.current = null;
      setWsStatus("disconnected");
    };
    ws.onerror = (err) => {
      console.error("[WS] connection error. Check if your backend/ngrok is running.", err);
      setWsStatus("error");
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  /* ── Capture frames from device camera and send via WS ───────────── */
  const startCapture = useCallback(() => {
    clearInterval(captureTimer.current);
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    captureTimer.current = setInterval(() => {
      if (
        video.readyState < 2 ||
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      )
        return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const b64 = canvas.toDataURL("image/jpeg", 0.6);
      wsRef.current.send(JSON.stringify({ type: "frame", frame: b64 }));
    }, 120); // ~8 FPS capture rate
  }, []);

  /* Attach camera stream to video element AFTER React renders it */
  useEffect(() => {
    if (!running || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    const onPlaying = () => startCapture();
    video.addEventListener("playing", onPlaying);
    video.play().catch(() => {});
    return () => video.removeEventListener("playing", onPlaying);
    // streamVersion ensures this re-fires when camera flips
  }, [running, activeTab, streamVersion, startCapture]);

  /**
   * Directly attach and play the stream on the video element.
   * Called inside the user-gesture call stack (handleStart / handleFlipCamera)
   * via requestAnimationFrame so React has committed the <video> to the DOM.
   */
  const playVideoDirectly = useCallback((stream) => {
    const attempt = (tries = 0) => {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play()
          .then(() => startCapture())
          .catch(() => {
            if (tries < 5) setTimeout(() => attempt(tries + 1), 200);
          });
      } else if (tries < 10) {
        // Video element not in DOM yet, wait for React render
        requestAnimationFrame(() => attempt(tries + 1));
      }
    };
    // Two rAFs: first waits for React commit, second for browser paint
    requestAnimationFrame(() => requestAnimationFrame(() => attempt()));
  }, [startCapture]);

  const handleStart = async (mode) => {
    const useFacing = mode || facingMode;
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: useFacing, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        // Fallback: some phones don't support facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setStreamVersion((v) => v + 1);
      // Ensure WS is connected
      if (!wsRef.current || wsRef.current.readyState > 1) {
        connectWs();
      }
      // Set state — this triggers a re-render that creates the <video> element
      setRunning(true);
      setActiveTab("feed");
      // Directly play in user-gesture context (critical for mobile)
      playVideoDirectly(stream);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Cannot access camera. Please allow camera permissions.");
    }
  };

  const handleFlipCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    if (running) {
      // Stop current camera
      clearInterval(captureTimer.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setFrame(null);
      // Start new camera directly (keeps user gesture context)
      await handleStart(newMode);
    }
  };

  const handleDeleteDetection = async (id) => {
    try {
      await deleteDetection(id);
      setHistory((prev) => prev.filter((d) => d._id !== id));
    } catch {}
  };

  const handleStop = () => {
    clearInterval(captureTimer.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRunning(false);
    setFrame(null);
    setFps(0);
  };

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      clearInterval(captureTimer.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* Refresh stats periodically */
  useEffect(() => {
    const id = setInterval(() => {
      getStats()
        .then((r) => {
          if (r.data && typeof r.data === "object" && "object_counts" in r.data)
            setStats(r.data);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  /* ── Render active panel ─────────────────────────────────────────── */
  const renderPanel = () => {
    switch (activeTab) {
      case "user":
        return <UserPanel stats={stats} running={running} fps={fps} />;
      case "feed":
        return (
          <LiveFeed
            frame={frame}
            running={running}
            videoRef={videoRef}
            facingMode={facingMode}
            onFlipCamera={handleFlipCamera}
          />
        );
      case "history":
        return <DetectionHistory history={history} onDelete={handleDeleteDetection} />;
      case "stats":
        return <StatsPanel stats={stats} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">&#128065;</span>
          <span className="sidebar__name">AI Detection</span>
        </div>

        <nav className="sidebar__nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar__link ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar__icon">{tab.icon}</span>
              <span className="sidebar__text">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.username}</span>
              <span className="sidebar__user-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar__logout" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="main-content">
        {/* Header */}
        <header className="topbar">
          <div className="topbar__left">
            <h1 className="topbar__title">
              {TABS.find((t) => t.id === activeTab)?.icon}{" "}
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="topbar__right">
            <span className={`status-dot ${running ? "active" : ""}`} />
            <span className="status-label">
              {running ? "Detection Active" : "Idle"}
            </span>
            {running ? (
              <button className="btn btn--red" onClick={handleStop}>
                Stop Detection
              </button>
            ) : (
              <button className="btn btn--green" onClick={() => handleStart()}>
                Start Detection
              </button>
            )}
          </div>
        </header>

        {/* Connection Status & ngrok Tips */}
        <div className="status-banner">
          {wsStatus === "connected" && (
            <div className="status-msg status-msg--success">
              ✅ Connected to AI Backend.
            </div>
          )}
          {wsStatus === "connecting" && (
            <div className="status-msg status-msg--info">
              🟡 Connecting to AI Backend...
            </div>
          )}
          {wsStatus === "error" && (
            <div className="status-msg status-msg--error">
              ❌ Connection to Backend Failed. 
              <br />
              <strong>Troubleshoot:</strong> Please wait a moment for the cloud server to "wake up" and refresh the page.
            </div>
          )}
        </div>

        {/* Panel */}
        <section className="panel-area">{renderPanel()}</section>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
