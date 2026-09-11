import React, { useState } from "react";
import { Code, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export default function CypherViewer({ cypher }) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!cypher) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(cypher);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        marginTop: "12px",
        backgroundColor: "#070b13",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          backgroundColor: "#0d1424",
          borderBottom: isOpen ? "1px solid #1e293b" : "none",
          cursor: "pointer",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", fontWeight: "700", color: "#38bdf8" }}>
          <Code size={14} />
          <span>CYPHER QUERY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: copied ? "#34d399" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.72rem",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          {isOpen ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </div>
      </div>

      {isOpen && (
        <pre
          style={{
            padding: "12px 14px",
            fontSize: "0.82rem",
            color: "#7dd3fc",
            overflowX: "auto",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {cypher}
        </pre>
      )}
    </div>
  );
}
