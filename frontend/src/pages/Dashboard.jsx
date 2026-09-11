import React from "react";
import {
  UploadCloud,
  MessageSquareQuote,
  Layers,
  Share2,
  Database,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import StatCard from "../components/StatCard";
import Pipeline from "../components/Pipeline";

export default function Dashboard({
  setActivePage,
  stats = {
    rowsReceived: 0,
    rowsLoaded: 0,
    rowsFailed: 0,
    status: "Ready",
  },
  datasets = [],
  pipelineStatus,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Hero Section */}
      <div
        className="glass-card"
        style={{
          padding: "36px 40px",
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(139, 92, 246, 0.05) 100%), var(--bg-card)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "650px", position: "relative", zIndex: 2 }}>
          <div className="badge badge-info" style={{ marginBottom: "14px" }}>
            <span>⚡ GraphFlow AI Streaming Engine</span>
          </div>

          <h1
            style={{
              fontSize: "2.3rem",
              fontWeight: "800",
              color: "#ffffff",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginBottom: "12px",
            }}
          >
            Data In. <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Answers Out.</span>
          </h1>

          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            Upload any CSV, transform it into an enterprise graph in Neo4j via Apache Kafka, and ask questions using natural language with zero hallucination.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => setActivePage("ingestion")}
            >
              <UploadCloud size={18} />
              <span>Upload CSV</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setActivePage("ask-data")}
            >
              <MessageSquareQuote size={18} />
              <span>Ask a Question</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Dynamic KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        <StatCard
          title="Rows Received"
          value={stats.rowsReceived}
          subtitle="Validated incoming CSV rows"
          icon={Layers}
          color="#0ea5e9"
        />
        <StatCard
          title="Rows Loaded"
          value={stats.rowsLoaded}
          subtitle="Merged into Neo4j graph"
          icon={Share2}
          color="#10b981"
          tag="+100%"
        />
        <StatCard
          title="Rows Failed"
          value={stats.rowsFailed}
          subtitle="Parsing or schema errors"
          icon={Activity}
          color={stats.rowsFailed > 0 ? "#f43f5e" : "#64748b"}
        />
        <StatCard
          title="Dataset Status"
          value={stats.status}
          subtitle="Pipeline processing stage"
          icon={Database}
          color="#8b5cf6"
        />
      </div>

      {/* Horizontal Pipeline Visualization */}
      <Pipeline
        currentStage={stats.status}
        pipelineStatus={pipelineStatus}
      />

      {/* Recent Datasets Quick View */}
      <div className="glass-card" style={{ padding: "24px 28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
              Active Datasets
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Manage streaming data sources loaded into your graph database
            </p>
          </div>
          <button
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            onClick={() => setActivePage("datasets")}
          >
            <span>View All Datasets</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: "600" }}>Dataset ID</th>
                <th style={{ padding: "10px 14px", fontWeight: "600" }}>Source Filename</th>
                <th style={{ padding: "10px 14px", fontWeight: "600" }}>Rows</th>
                <th style={{ padding: "10px 14px", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "10px 14px", fontWeight: "600", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>
                    No datasets uploaded yet. Click <strong>"Upload CSV"</strong> to ingest your first dataset.
                  </td>
                </tr>
              ) : (
                datasets.slice(0, 5).map((ds, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid rgba(30, 41, 59, 0.5)",
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#38bdf8", fontWeight: "600" }}>
                      {ds.upload_id || ds.job_id}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#ffffff", fontWeight: "500" }}>
                      {ds.filename}
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>
                      {(ds.total_rows || ds.rows_received || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className="badge badge-success">
                        {ds.status || "COMPLETED"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => setActivePage("ask-data")}
                      >
                        Ask Data
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
