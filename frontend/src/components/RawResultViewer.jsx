import React, { useState } from "react";
import { Table, ChevronDown, ChevronUp, Braces } from "lucide-react";

export default function RawResultViewer({ result }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("json"); // 'json' | 'table'

  if (!result || (Array.isArray(result) && result.length === 0)) return null;

  return (
    <div
      style={{
        marginTop: "8px",
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", fontWeight: "700", color: "#a78bfa" }}>
          <Braces size={14} />
          <span>RAW NEO4J RESULT ({Array.isArray(result) ? `${result.length} record(s)` : "1 record"})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isOpen ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </div>
      </div>

      {isOpen && (
        <pre
          style={{
            padding: "12px 14px",
            fontSize: "0.8rem",
            color: "#e2e8f0",
            maxHeight: "220px",
            overflowY: "auto",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
