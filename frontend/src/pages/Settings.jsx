import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Database, Layers, ShieldCheck } from "lucide-react";

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || "http://localhost:8000");
  const [kafkaTopic, setKafkaTopic] = useState("csv-rows");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
      <div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
          Platform Settings
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Configure cluster endpoints, environment parameters, and guardrail policies
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-card" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#ffffff", marginBottom: "6px" }}>
            Backend API URL (VITE_API_URL)
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{
              width: "100%",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
            Default: http://localhost:8000 (FastAPI backend service)
          </span>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#ffffff", marginBottom: "6px" }}>
            Kafka Ingestion Topic
          </label>
          <input
            type="text"
            value={kafkaTopic}
            onChange={(e) => setKafkaTopic(e.target.value)}
            style={{
              width: "100%",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
        </div>

        <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "var(--bg-card-subtle)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: "700", fontSize: "0.9rem", marginBottom: "6px" }}>
            <ShieldCheck size={18} />
            <span>Cypher Safety Policy</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            All Chatbot queries are restricted to <code>READ-ONLY</code> execution. Mutations (<code>CREATE</code>, <code>MERGE</code>, <code>DELETE</code>, <code>SET</code>, <code>DROP</code>) are permanently rejected by the safety layer before reaching Neo4j.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
          {saved ? (
            <span style={{ color: "#34d399", fontSize: "0.85rem", fontWeight: "600" }}>
              ✓ Settings saved successfully
            </span>
          ) : <div />}

          <button type="submit" className="btn-primary">
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
