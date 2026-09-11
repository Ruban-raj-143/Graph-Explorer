import React, { useState } from "react";
import { Database, Search, Share2, MessageSquareQuote, Eye, Plus } from "lucide-react";

export default function Datasets({
  datasets = [],
  setActivePage,
  onSelectDataset,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = datasets.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.filename || "").toLowerCase().includes(term) ||
      (d.upload_id || d.job_id || "").toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
            Dataset Management
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Explore and query datasets ingested into the Neo4j graph cluster
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setActivePage("ingestion")}
        >
          <Plus size={16} />
          <span>Upload Dataset</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search datasets by filename or upload ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: "0.9rem",
            }}
          />
        </div>
      </div>

      {/* Datasets Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "12px 14px", fontWeight: "600" }}>Dataset ID</th>
                <th style={{ padding: "12px 14px", fontWeight: "600" }}>Source Filename</th>
                <th style={{ padding: "12px 14px", fontWeight: "600" }}>Total Rows</th>
                <th style={{ padding: "12px 14px", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px 14px", fontWeight: "600", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "36px", color: "var(--text-dim)" }}>
                    {searchTerm ? "No datasets match your search." : "No datasets uploaded yet. Ingest your first CSV to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((ds, idx) => {
                  const id = ds.upload_id || ds.job_id;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid rgba(30, 41, 59, 0.5)",
                      }}
                    >
                      <td style={{ padding: "14px", fontFamily: "monospace", color: "#38bdf8", fontWeight: "600" }}>
                        {id}
                      </td>
                      <td style={{ padding: "14px", color: "#ffffff", fontWeight: "600" }}>
                        {ds.filename}
                      </td>
                      <td style={{ padding: "14px", color: "var(--text-muted)" }}>
                        {(ds.total_rows || ds.rows_received || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span className="badge badge-success">
                          {ds.status || "COMPLETED"}
                        </span>
                      </td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            onClick={() => {
                              if (onSelectDataset) onSelectDataset(id);
                              setActivePage("explorer");
                            }}
                          >
                            <Share2 size={13} />
                            <span>Explore Graph</span>
                          </button>
                          <button
                            className="btn-primary"
                            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            onClick={() => {
                              if (onSelectDataset) onSelectDataset(id);
                              setActivePage("ask-data");
                            }}
                          >
                            <MessageSquareQuote size={13} />
                            <span>Ask Data</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
