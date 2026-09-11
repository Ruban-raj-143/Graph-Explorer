import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function UploadZone({
  onFileSelected,
  onStartIngest,
  isIngesting = false,
  selectedFile = null,
  previewRows = [],
  detectedColumns = [],
  estimatedRows = 0,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a valid .csv file.");
      return;
    }
    if (onFileSelected) {
      onFileSelected(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Drag & Drop Card */}
      <div
        className="glass-card"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          border: isDragOver
            ? "2px dashed #0ea5e9"
            : "2px dashed var(--border)",
          backgroundColor: isDragOver
            ? "rgba(14, 165, 233, 0.06)"
            : "var(--bg-card-subtle)",
          transition: "all 0.2s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "16px",
            backgroundColor: "rgba(14, 165, 233, 0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            color: "#38bdf8",
            boxShadow: "0 0 20px rgba(14, 165, 233, 0.2)",
          }}
        >
          <UploadCloud size={30} />
        </div>

        <h3
          style={{
            fontSize: "1.2rem",
            fontWeight: "700",
            color: "#ffffff",
            marginBottom: "6px",
          }}
        >
          Drop your CSV here
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>
          or <span style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "underline" }}>browse files</span> from your computer
        </p>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          CSV files only (Auto-detected schema)
        </span>
      </div>

      {/* Selected File Details & Preview */}
      {selectedFile && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(14, 165, 233, 0.15)",
                  color: "#38bdf8",
                }}
              >
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "1rem", color: "#ffffff" }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • {estimatedRows ? `${estimatedRows.toLocaleString()} rows` : "Validating..."} • {detectedColumns.length} columns detected
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              disabled={isIngesting}
              onClick={(e) => {
                e.stopPropagation();
                if (onStartIngest) onStartIngest();
              }}
            >
              <span>{isIngesting ? "Ingesting to Pipeline..." : "Start Ingestion"}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Detected Columns Chips */}
          {detectedColumns.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "6px" }}>
                DETECTED SCHEMA COLUMNS:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {detectedColumns.map((col, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "#172138",
                      border: "1px solid #23314e",
                      fontSize: "0.78rem",
                      fontFamily: "monospace",
                      color: "#93c5fd",
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic 5-10 row preview table */}
          {previewRows.length > 0 && (
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "8px" }}>
                SAMPLE DATA PREVIEW (FIRST {previewRows.length} ROWS):
              </div>
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-main)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#0e1526" }}>
                      {Object.keys(previewRows[0]).map((header, idx) => (
                        <th
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "var(--text-muted)",
                            borderBottom: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom:
                            rIdx === previewRows.length - 1
                              ? "none"
                              : "1px solid rgba(30, 41, 59, 0.7)",
                        }}
                      >
                        {Object.values(row).map((val, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: "9px 14px",
                              color: "#cbd5e1",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {String(val !== undefined ? val : "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
