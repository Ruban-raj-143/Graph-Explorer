import React from "react";
import { Database, ShieldCheck, UserCheck, RefreshCw } from "lucide-react";

export default function Topbar({
  pageTitle = "Dashboard",
  activeDataset = null,
  onRefresh = null,
}) {
  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Title */}
      <div>
        <h2
          style={{
            fontSize: "1.15rem",
            fontWeight: "700",
            color: "var(--text-main)",
            letterSpacing: "-0.01em",
          }}
        >
          {pageTitle}
        </h2>
      </div>

      {/* Meta Indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Active Dataset Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "20px",
            backgroundColor: activeDataset
              ? "rgba(14, 165, 233, 0.12)"
              : "rgba(100, 116, 139, 0.12)",
            border: activeDataset
              ? "1px solid rgba(14, 165, 233, 0.3)"
              : "1px solid rgba(100, 116, 139, 0.2)",
            fontSize: "0.78rem",
            color: activeDataset ? "#38bdf8" : "var(--text-muted)",
            fontWeight: "600",
          }}
        >
          <Database size={14} />
          <span>
            {activeDataset ? `Active: ${activeDataset}` : "No Dataset Selected"}
          </span>
        </div>

        {/* Guardrail Status */}
        <div className="badge badge-success">
          <ShieldCheck size={14} />
          <span>Cypher Guardrails Active</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh state"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "var(--border-focus)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <RefreshCw size={15} />
          </button>
        )}

        {/* User Profile avatar */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: "0.8rem",
            fontWeight: "700",
          }}
        >
          GF
        </div>
      </div>
    </header>
  );
}
