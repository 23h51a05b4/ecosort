/**
 * api.js — Axios client + API helpers for the backend.
 */
import axios from "axios";

const RENDER_URL = "https://ai-detection-fpp2.onrender.com";
let defaultBase = RENDER_URL;

if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  // If running locally, you can still use the local backend if desired.
  // Set REACT_APP_USE_LOCAL=true in your .env to use localhost:8000
  if (process.env.REACT_APP_USE_LOCAL === "true") {
    defaultBase = "http://localhost:8000";
  }
}

const BASE = process.env.REACT_APP_API_URL || defaultBase;

const api = axios.create({ baseURL: BASE });

/* Request interceptor — attach ngrok header and JWT token */
api.interceptors.request.use((cfg) => {
  cfg.headers["ngrok-skip-browser-warning"] = "true";
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

/* ── Auth ─────────────────────────────────────────────────────────── */
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/auth/me");

/* ── Detection control ────────────────────────────────────────────── */
export const startDetection = () => api.post("/start-detection");
export const stopDetection = () => api.post("/stop-detection");
export const getDetectionStatus = () => api.get("/detection-status");

/* ── History & stats ──────────────────────────────────────────────── */
export const getDetections = (limit = 50, skip = 0) =>
  api.get("/detections", { params: { limit, skip } });
export const getStats = () => api.get("/stats");
export const deleteDetection = (id) => api.delete(`/detections/${id}`);

/** Build an absolute URL for screenshot images served by the backend. */
export const screenshotUrl = (path) => `${BASE}${path}`;

/** WebSocket URL */
export const WS_URL = BASE.replace(/^http/, "ws") + "/ws";

export default api;
