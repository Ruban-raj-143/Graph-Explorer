import React from "react";
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Share2,
  MessageSquareQuote,
  Activity,
  Settings,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function Sidebar({ activePage, setActivePage, isConnected = true }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "ingestion", label: "Data Ingestion", icon: UploadCloud },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "explorer", label: "Graph Explorer", icon: Share2 },
    { id: "ask-data", label: "Ask Data", icon: MessageSquareQuote },
    { id: "health", label: "System Health", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      style={{
        width: "260px",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100vh",
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(14, 165, 233, 0.4)",
          }}
        >
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <h1
            style={{
              fontSize: "1.15rem",
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            GraphFlow <span style={{ color: "#38bdf8" }}>AI</span>
          </h1>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.02em",
            }}
          >
            Data In, Answers Out
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        <div
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-dim)",
            padding: "8px 12px",
            fontWeight: "700",
          }}
        >
          Platform Modules
        </div>
        <ul style={{ listStyle: "none" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <li key={item.id} style={{ marginBottom: "4px" }}>
                <button
                  onClick={() => setActivePage(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? "600" : "500",
                    color: isActive ? "#38bdf8" : "var(--text-muted)",
                    backgroundColor: isActive ? "rgba(14, 165, 233, 0.12)" : "transparent",
                    border: isActive ? "1px solid rgba(14, 165, 233, 0.25)" : "1px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                      e.currentTarget.style.color = "var(--text-main)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }
                  }}
                >
                  <Icon
                    size={18}
                    color={isActive ? "#38bdf8" : "currentColor"}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Operational Status */}
      <div
        style={{
          padding: "16px 18px",
          borderTop: "1px solid var(--border)",
          backgroundColor: "rgba(13, 19, 34, 0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className="pulse-dot"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isConnected ? "var(--emerald)" : "var(--rose)",
                boxShadow: isConnected
                  ? "0 0 10px var(--emerald)"
                  : "0 0 10px var(--rose)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#e2e8f0" }}>
              {isConnected ? "All Systems Operational" : "System Degraded"}
            </span>
          </div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
          Kafka • Neo4j • GraphFlow API
        </div>
      </div>
    </aside>
  );
}
