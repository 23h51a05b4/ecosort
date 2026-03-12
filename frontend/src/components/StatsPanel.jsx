import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import "./StatsPanel.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const PALETTE = [
  "#38bdf8",
  "#4ade80",
  "#facc15",
  "#f87171",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#f472b6",
  "#34d399",
];

export default function StatsPanel({ stats }) {
  const labels = Object.keys(stats.object_counts);
  const counts = Object.values(stats.object_counts);

  /* Bar chart — detection count per object */
  const barData = {
    labels,
    datasets: [
      {
        label: "Detections",
        data: counts,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 6,
      },
    ],
  };

  /* Doughnut — object share */
  const doughnutData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 0,
      },
    ],
  };

  /* Line chart — timeline */
  const timelineLabels = stats.timeline.map((t) => t.time);
  const timelineCounts = stats.timeline.map((t) => t.count);
  const lineData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Detections / hour",
        data: timelineCounts,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#94a3b8", maxTicksLimit: 10 }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
    },
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { color: "#f1f5f9", boxWidth: 14, padding: 12 } },
    },
  };

  return (
    <div className="stats-grid">
      <div className="stats-card card">
        <h2 className="card__title">Detection Count per Object</h2>
        <div className="stats-chart">
          <Bar data={barData} options={chartOpts} />
        </div>
      </div>

      <div className="stats-card card">
        <h2 className="card__title">Object Distribution</h2>
        <div className="stats-chart">
          <Doughnut data={doughnutData} options={doughnutOpts} />
        </div>
      </div>

      <div className="stats-card stats-card--wide card">
        <h2 className="card__title">Detection Timeline</h2>
        <div className="stats-chart">
          <Line data={lineData} options={chartOpts} />
        </div>
      </div>
    </div>
  );
}
