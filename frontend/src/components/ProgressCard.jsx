import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Cpu, Layers, Share2 } from "lucide-react";

export default function ProgressCard({
  jobId,
  status = "loading",
  rowsTotal = 0,
  rowsLoaded = 0,
  rowsFailed = 0,
  stage = "LOADING",
  progress = 0,
  filename = "dataset.csv",
}) {
  const isComplete = status === "complete" || status === "completed" || progress >= 100;
  const isFailed = status === "failed" || status === "error";

  const getStageName = () => {
    if (isComplete) return "Complete";
    if (isFailed) return "Failed";
    if (progress < 30) return "Queued";
    if (progress < 65) return "Streaming to Kafka";
    return "Loading into Neo4j Graph";
  };

  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
              Ingestion Lifecycle Progress
            </h3>
            <span
              className={
                isComplete
                  ? "badge badge-success"
                  : isFailed
                  ? "badge badge-danger"
                  : "badge badge-info"
              }
            >
              {isComplete ? "Complete" : isFailed ? "Failed" : "Loading"}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Job ID: <code style={{ color: "#38bdf8" }}>{jobId}</code> • File: {filename}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#38bdf8" }}>
            {progress}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
            Stage: {getStageName()}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: "10px",
          backgroundColor: "#0e1626",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(progress, 100)}%`,
            background: isFailed
              ? "linear-gradient(90deg, #f43f5e, #e11d48)"
              : isComplete
              ? "linear-gradient(90deg, #10b981, #059669)"
              : "linear-gradient(90deg, #0ea5e9, #38bdf8, #8b5cf6)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "12px",
          backgroundColor: "var(--bg-card-subtle)",
          padding: "14px 18px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
            Rows Received
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff" }}>
            {rowsTotal.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
            Rows Loaded
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "#34d399" }}>
            {rowsLoaded.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
            Rows Failed
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: "700", color: rowsFailed > 0 ? "#fb7185" : "var(--text-muted)" }}>
            {rowsFailed}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
            Target Graph
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#a78bfa" }}>
            Neo4j (Bolt)
          </div>
        </div>
      </div>
    </div>
  );
}
