import React from "react";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function HealthCard({
  serviceName,
  icon: Icon,
  connected = true,
  details = "",
  port = "",
  error = null,
  onRetry = null,
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderLeft: `4px solid ${connected ? "var(--emerald)" : "var(--rose)"}`,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {Icon && (
              <div
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  backgroundColor: connected ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                  color: connected ? "#34d399" : "#fb7185",
                }}
              >
                <Icon size={20} />
              </div>
            )}
            <h4 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
              {serviceName}
            </h4>
          </div>

          <span className={connected ? "badge badge-success" : "badge badge-danger"}>
            {connected ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{connected ? "Connected" : "Not Ready"}</span>
          </span>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>
          {details}
        </p>

        {port && (
          <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#38bdf8" }}>
            Port / Protocol: {port}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              color: "#fb7185",
              fontSize: "0.75rem",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {onRetry && (
        <div style={{ marginTop: "16px", textAlign: "right" }}>
          <button
            onClick={onRetry}
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
          >
            <RefreshCw size={13} />
            <span>Check Connectivity</span>
          </button>
        </div>
      )}
    </div>
  );
}
