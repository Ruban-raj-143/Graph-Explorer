import React from "react";
import {
  FileSpreadsheet,
  Server,
  Layers,
  Cpu,
  Share2,
  BotMessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function Pipeline({
  currentStage = "READY",
  pipelineStatus = {
    csv: "Connected",
    api: "Connected",
    kafka: "Connected",
    loader: "Connected",
    neo4j: "Connected",
    chat: "Connected",
  },
}) {
  const stages = [
    {
      id: "csv",
      name: "CSV Upload",
      desc: "Input data",
      icon: FileSpreadsheet,
      color: "#0ea5e9",
    },
    {
      id: "api",
      name: "FastAPI",
      desc: "Accepts upload",
      icon: Server,
      color: "#38bdf8",
    },
    {
      id: "kafka",
      name: "Kafka",
      desc: "Streams rows",
      icon: Layers,
      color: "#3b82f6",
    },
    {
      id: "loader",
      name: "Loader",
      desc: "Processes rows",
      icon: Cpu,
      color: "#8b5cf6",
    },
    {
      id: "neo4j",
      name: "Neo4j",
      desc: "Stores graph",
      icon: Share2,
      color: "#10b981",
    },
    {
      id: "chat",
      name: "AI Chat",
      desc: "Answers questions",
      icon: BotMessageSquare,
      color: "#f59e0b",
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Connected":
      case "Complete":
      case "Ready":
        return {
          label: "Connected",
          icon: CheckCircle2,
          bg: "rgba(16, 185, 129, 0.12)",
          color: "#34d399",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "Processing":
      case "Loading":
        return {
          label: "Processing",
          icon: Clock,
          bg: "rgba(14, 165, 233, 0.12)",
          color: "#38bdf8",
          border: "rgba(14, 165, 233, 0.3)",
        };
      case "Waiting":
        return {
          label: "Waiting",
          icon: Clock,
          bg: "rgba(245, 158, 11, 0.12)",
          color: "#fbbf24",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "Error":
      case "Failed":
      default:
        return {
          label: "Error",
          icon: AlertTriangle,
          bg: "rgba(244, 63, 94, 0.12)",
          color: "#fb7185",
          border: "rgba(244, 63, 94, 0.3)",
        };
    }
  };

  return (
    <div className="glass-card" style={{ padding: "24px 28px", width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
            Live Pipeline Architecture
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            End-to-end streaming data pipeline from raw file ingestion to grounded answers
          </p>
        </div>
        <div className="badge badge-info">
          <span className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
          <span>Active Flow</span>
        </div>
      </div>

      {/* Horizontal Pipeline Grid */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          overflowX: "auto",
          padding: "10px 0",
        }}
      >
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const status = pipelineStatus[st.id] || "Connected";
          const badge = getStatusBadge(status);
          const StatusIcon = badge.icon;
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={st.id}>
              {/* Node Card */}
              <div
                style={{
                  flex: "1 1 140px",
                  minWidth: "135px",
                  backgroundColor: "var(--bg-card-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = st.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Node Icon */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: `${st.color}16`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                    boxShadow: `0 0 12px ${st.color}25`,
                  }}
                >
                  <Icon size={20} color={st.color} />
                </div>

                <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#ffffff" }}>
                  {st.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {st.desc}
                </div>

                {/* Status Indicator */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.68rem",
                    fontWeight: "600",
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                  }}
                >
                  <StatusIcon size={11} />
                  <span>{badge.label}</span>
                </div>
              </div>

              {/* Animated Connector Line */}
              {!isLast && (
                <div
                  style={{
                    flex: "0 0 30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="pipeline-connector flowing"
                    style={{ width: "100%", borderRadius: "2px" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
