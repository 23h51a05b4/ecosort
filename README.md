# AI Object Detection Dashboard

A **production-ready, real-time object detection web application** powered by YOLOv8, FastAPI, React, MongoDB, and WebSockets.

---

## Architecture

```
AI-Object-Detection-App/
│
├── backend/
│   ├── main.py                 # FastAPI app entry-point
│   ├── config.py               # Centralised settings
│   ├── detector.py             # YOLOv8 wrapper + async detection loop
│   ├── database.py             # MongoDB helpers (CRUD + aggregation)
│   ├── models.py               # Pydantic schemas
│   ├── websocket_manager.py    # WebSocket connection manager
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   ├── detection_routes.py # POST /start-detection, /stop-detection
│   │   └── history_routes.py   # GET /detections, /stats
│   └── static/screenshots/     # Saved detection screenshots
│
├── frontend/
│   ├── public/index.html
│   ├── package.json
│   └── src/
│       ├── index.js / index.css
│       ├── App.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   └── Dashboard.css
│       ├── components/
│       │   ├── LiveFeed.jsx / LiveFeed.css
│       │   ├── DetectionHistory.jsx / DetectionHistory.css
│       │   └── StatsPanel.jsx / StatsPanel.css
│       └── services/
│           └── api.js
│
└── README.md
```

---

## Features

| Feature | Description |
|---|---|
| **Live Feed** | Webcam frames processed through YOLOv8 and streamed to the browser in real time via WebSocket |
| **Detection History** | Scrollable sidebar updated live with object name, confidence, timestamp, and thumbnail |
| **Statistics Charts** | Bar chart (per-object count), doughnut chart (distribution), line chart (timeline) |
| **KPI Cards** | Total detections, unique objects, FPS, recent event count |
| **REST API** | Start/stop detection, fetch history, fetch stats |
| **Screenshot Capture** | A JPEG screenshot is saved for every detected object |
| **MongoDB Storage** | Every detection is persisted with object_name, confidence, timestamp, image_path |

---

## Database Schema

**Collection: `detections`**

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `object_name` | string | COCO class label |
| `confidence` | float | 0 – 1 |
| `timestamp` | datetime | UTC time of detection |
| `image_path` | string | Relative URL to the saved screenshot |

---

## REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check / status |
| `POST` | `/start-detection` | Start the webcam + detection loop |
| `POST` | `/stop-detection` | Stop detection |
| `GET` | `/detection-status` | Check if detection is running |
| `GET` | `/detections?limit=50&skip=0` | Fetch recent detections |
| `GET` | `/stats` | Aggregated detection statistics |
| `WS` | `/ws` | WebSocket for real-time frame + detection push |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **MongoDB** running on `localhost:27017` (default)
- A **webcam** connected to the machine

---

## Installation & Running

### 1. Clone / navigate to the project

```bash
cd AI-Object-Detection-App
```

### 2. Start MongoDB

Make sure MongoDB is running locally:

```bash
mongod
```

Or use Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 3. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at **http://localhost:8000**.

### 4. Frontend

```bash
cd frontend
npm install
npm start
```

The React dev server will open at **http://localhost:3000**.

### 5. Use the Dashboard

1. Open **http://localhost:3000** in your browser.
2. Click **Start Detection** — the webcam activates and YOLOv8 begins processing.
3. The live feed, detection history, and statistics update in real time.
4. Click **Stop Detection** to end the session.

---

## UI Layout Description

```
┌─────────────────────────────────────────────────────────┐
│  🔍  AI Object Detection Dashboard    [● Active] [Stop] │
├──────────┬──────────┬──────────┬────────────────────────┤
│  Total   │  Unique  │   FPS    │   Recent Events        │
│   235    │    8     │   14.2   │       47               │
├──────────┴──────────┴──────────┴────────────────────────┤
│                              │  Detection History       │
│   Live Detection Feed        │  ┌─────────────────────┐ │
│   ┌────────────────────┐     │  │ 🖼 person  93.2%    │ │
│   │                    │     │  │    10:42:15 AM      │ │
│   │  [webcam + boxes]  │     │  ├─────────────────────┤ │
│   │                    │     │  │ 🖼 car     87.1%    │ │
│   └────────────────────┘     │  │    10:42:14 AM      │ │
│                              │  └─────────────────────┘ │
├──────────────────────────────┴──────────────────────────┤
│  Detection Count / Object  │  Object Distribution       │
│  ┌─ Bar Chart ───────────┐ │  ┌─ Doughnut ───────────┐  │
│  │ ████ person           │ │  │                      │  │
│  │ ███  car              │ │  │                      │  │
│  └───────────────────────┘ │  └──────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Detection Timeline (Line Chart)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ╱╲    ╱╲                                        │   │
│  │ ╱  ╲──╱  ╲──────                                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Variables (optional)

| Variable | Default | Description |
|---|---|---|
| `YOLO_MODEL_PATH` | `yolov8n.pt` | Path to YOLOv8 weights |
| `CONFIDENCE_THRESHOLD` | `0.35` | Min detection confidence |
| `CAMERA_INDEX` | `0` | Webcam device index |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB_NAME` | `object_detection_db` | Database name |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend URL for the frontend |

---

## Tech Stack

- **YOLOv8** (Ultralytics) — real-time object detection
- **FastAPI** — async Python web framework
- **OpenCV** — webcam capture + frame processing
- **MongoDB** — persistent detection storage
- **WebSocket** — real-time push to browser
- **React 18** — dashboard SPA
- **Chart.js / react-chartjs-2** — statistics visualisation
- **Axios** — HTTP client

---

## License

MIT
