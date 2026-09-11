import React, { useState, useRef, useEffect } from "react";
import { Share2, Search, ZoomIn, ZoomOut, RefreshCw, X, Database, Layers } from "lucide-react";

export default function GraphViewer({
  graphData = { nodes: [], edges: [] },
  onRefresh = null,
  activeDataset = null,
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);

  const { nodes = [], edges = [] } = graphData;

  const filteredNodes = nodes.filter((n) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (n.name || "").toLowerCase().includes(term);
    const labelMatch = (n.label || "").toLowerCase().includes(term);
    const propMatch = JSON.stringify(n.properties || {}).toLowerCase().includes(term);
    return nameMatch || labelMatch || propMatch;
  });

  // Calculate node positions in radial layout
  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodePositions = {};
  filteredNodes.forEach((node, idx) => {
    const isDataset = node.label === "Dataset";
    if (isDataset) {
      nodePositions[node.id] = { x: centerX, y: centerY };
    } else {
      const angle = (idx / Math.max(filteredNodes.length - 1, 1)) * 2 * Math.PI;
      const radius = 170 + (idx % 3) * 35;
      nodePositions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }
  });

  const validEdges = edges.filter(
    (e) => nodePositions[e.source] && nodePositions[e.target]
  );

  return (
    <div
      className="glass-card"
      style={{
        position: "relative",
        height: "600px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Graph Toolbar */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "#0d1424",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 10px",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search node or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: "0.82rem",
                width: "180px",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Showing <strong style={{ color: "#38bdf8" }}>{filteredNodes.length}</strong> nodes • <strong style={{ color: "#a78bfa" }}>{validEdges.length}</strong> edges
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
            className="btn-secondary"
            style={{ padding: "6px 10px" }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
            className="btn-secondary"
            style={{ padding: "6px 10px" }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.78rem" }}
          >
            Reset View
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-secondary"
              style={{ padding: "6px 10px" }}
              title="Refresh Graph"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas / Empty State */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#060a12" }}>
        {nodes.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "14px",
                backgroundColor: "rgba(14, 165, 233, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
                marginBottom: "12px",
              }}
            >
              <Share2 size={28} />
            </div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
              Graph Visualization Waiting for Data
            </h4>
            <p style={{ fontSize: "0.85rem", maxWidth: "380px" }}>
              Graph visualization will appear once your dataset is loaded via the Data Ingestion pipeline.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.2s ease",
            }}
          >
            {/* Draw Relationship Edges */}
            {validEdges.map((e, idx) => {
              const src = nodePositions[e.source];
              const tgt = nodePositions[e.target];
              return (
                <g key={idx}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="#1e293b"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </g>
              );
            })}

            {/* Draw Nodes */}
            {filteredNodes.map((n) => {
              const pos = nodePositions[n.id];
              if (!pos) return null;
              const isDataset = n.label === "Dataset";
              const isSelected = selectedNode && selectedNode.id === n.id;

              return (
                <g
                  key={n.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedNode(n)}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isDataset ? 22 : 12}
                    fill={isDataset ? "#8b5cf6" : isSelected ? "#38bdf8" : "#0ea5e9"}
                    stroke={isSelected ? "#ffffff" : isDataset ? "#a78bfa" : "#0369a1"}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ transition: "all 0.15s ease" }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + (isDataset ? 34 : 24)}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11px"
                    fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {n.name || n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Node Properties Drawer */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "320px",
              height: "100%",
              backgroundColor: "var(--bg-sidebar)",
              borderLeft: "1px solid var(--border)",
              padding: "20px",
              overflowY: "auto",
              boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.4)",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge badge-purple">{selectedNode.label}</span>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff" }}>
                  Node Details
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Node ID: <code style={{ color: "#38bdf8" }}>{selectedNode.id}</code>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: "var(--bg-main)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    {key}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "500", wordBreak: "break-all" }}>
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
