import React from "react";
import GraphViewer from "../components/GraphViewer";

export default function GraphExplorer({
  graphData,
  activeDataset,
  onRefreshGraph,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
          Neo4j Graph Explorer
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Visual representation of Dataset and CSVRow nodes linked via <code style={{ color: "#a78bfa" }}>:CONTAINS_ROW</code> relationships
        </p>
      </div>

      <GraphViewer
        graphData={graphData}
        activeDataset={activeDataset}
        onRefresh={onRefreshGraph}
      />
    </div>
  );
}
