import React, { useState, useEffect } from "react";
import {
  Server,
  Layers,
  Share2,
  Cpu,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import HealthCard from "../components/HealthCard";
import { getHealth } from "../services/api";

export default function Health({ onRefreshSystem }) {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const data = await getHealth();
      setHealthData(data);
    } catch (err) {
      setHealthData({ status: "error", error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const comps = healthData?.components || {};
  const isAllConnected =
    healthData?.status === "ok" ||
    (comps.backend?.healthy && comps.kafka?.healthy && comps.neo4j?.healthy);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            System Health & Pipeline Topology
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Real-time diagnostics and connectivity status for all backend cluster services
          </p>
        </div>

        <button
          className="btn-secondary"
          disabled={isLoading}
          onClick={() => {
            fetchHealth();
            if (onRefreshSystem) onRefreshSystem();
          }}
        >
          <RefreshCw size={15} className={isLoading ? "pulse-dot" : ""} />
          <span>{isLoading ? "Pinging Services..." : "Re-Check All Services"}</span>
        </button>
      </div>

      {/* Services Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "18px",
        }}
      >
        <HealthCard
          serviceName="FastAPI Backend"
          icon={Server}
          connected={comps.backend?.healthy ?? (healthData?.status !== "disconnected")}
          details="Receives CSV uploads, performs streaming orchestration, and executes chat queries."
          port="8000 / HTTP"
          onRetry={fetchHealth}
        />

        <HealthCard
          serviceName="Apache Kafka"
          icon={Layers}
          connected={comps.kafka?.healthy ?? healthData?.kafka_connected ?? false}
          details="Distributed streaming broker publishing validated row messages to topic 'csv-rows'."
          port="9092 / PLAINTEXT"
          onRetry={fetchHealth}
        />

        <HealthCard
          serviceName="Neo4j Graph Database"
          icon={Share2}
          connected={comps.neo4j?.healthy ?? healthData?.neo4j_connected ?? false}
          details="Graph storage engine maintaining Dataset and CSVRow nodes with Cypher queries."
          port="7687 / Bolt"
          error={comps.neo4j?.error}
          onRetry={fetchHealth}
        />

        <HealthCard
          serviceName="Kafka Consumer (Loader)"
          icon={Cpu}
          connected={comps.consumer?.healthy ?? true}
          details="Asynchronous consumer group processing messages and merging graph nodes."
          port="neo4j-csv-consumer"
          onRetry={fetchHealth}
        />
      </div>

      {/* Raw Health API Response */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff" }}>
            Diagnostic Endpoint Response: <code style={{ color: "#38bdf8" }}>GET /health</code>
          </div>
          <span className={isAllConnected ? "badge badge-success" : "badge badge-warning"}>
            Status: {healthData?.status || "Unknown"}
          </span>
        </div>

        <pre
          style={{
            backgroundColor: "#070b13",
            padding: "16px 20px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            fontSize: "0.82rem",
            color: "#7dd3fc",
            overflowX: "auto",
            margin: 0,
          }}
        >
          {JSON.stringify(healthData || { status: "fetching..." }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
