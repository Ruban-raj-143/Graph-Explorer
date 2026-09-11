import React from "react";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "#0ea5e9",
  tag = null,
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "125px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background soft glow */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              padding: "8px",
              borderRadius: "8px",
              backgroundColor: `${color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color={color} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <div
          style={{
            fontSize: "1.8rem",
            fontWeight: "800",
            color: "#ffffff",
            letterSpacing: "-0.03em",
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {tag && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: color,
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {subtitle && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-dim)",
            marginTop: "6px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
