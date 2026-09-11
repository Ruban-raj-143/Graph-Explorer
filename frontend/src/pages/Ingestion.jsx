import React, { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import UploadZone from "../components/UploadZone";
import ProgressCard from "../components/ProgressCard";
import { uploadCSV, getStatus } from "../services/api";

export default function Ingestion({
  onIngestSuccess,
  setActivePage,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [estimatedRows, setEstimatedRows] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [jobProgress, setJobProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Client-side quick file parser for instant preview
  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setJobProgress(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length > 0) {
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        setDetectedColumns(headers);
        setEstimatedRows(lines.length - 1);

        const preview = lines.slice(1, 8).map((line) => {
          const vals = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] !== undefined ? vals[i] : "";
          });
          return obj;
        });
        setPreviewRows(preview);
      }
    };
    reader.readAsText(file);
  };

  const handleStartIngest = async () => {
    if (!selectedFile) return;
    setIsIngesting(true);
    setErrorMessage(null);

    try {
      const res = await uploadCSV(selectedFile);
      const jobId = res.job_id || res.upload_id;

      // Initialize progress card
      setJobProgress({
        jobId: jobId,
        status: "loading",
        rowsTotal: res.rows_received || estimatedRows,
        rowsLoaded: 0,
        rowsFailed: 0,
        stage: "VALIDATING",
        progress: 15,
        filename: selectedFile.name,
      });

      // Poll status
      const interval = setInterval(async () => {
        try {
          const statusData = await getStatus(jobId);
          if (statusData) {
            const currentProg = statusData.progress || 20;
            setJobProgress((prev) => ({
              ...prev,
              status: statusData.status,
              rowsTotal: statusData.rows_total || prev.rowsTotal,
              rowsLoaded: statusData.rows_loaded || Math.round((currentProg / 100) * prev.rowsTotal),
              rowsFailed: statusData.rows_failed || 0,
              stage: statusData.stage || "LOADING",
              progress: currentProg,
            }));

            if (statusData.status === "completed" || statusData.status === "complete" || currentProg >= 100) {
              clearInterval(interval);
              setIsIngesting(false);
              setJobProgress((prev) => ({
                ...prev,
                status: "completed",
                rowsLoaded: statusData.rows_total || prev.rowsTotal,
                progress: 100,
              }));
              if (onIngestSuccess) {
                onIngestSuccess({
                  upload_id: jobId,
                  filename: selectedFile.name,
                  total_rows: statusData.rows_total || estimatedRows,
                });
              }
            }
          }
        } catch (err) {
          clearInterval(interval);
          setIsIngesting(false);
        }
      }, 750);
    } catch (err) {
      setIsIngesting(false);
      setErrorMessage(`Upload failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
          Data Ingestion Pipeline
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Upload schema-agnostic CSV files to stream rows through Kafka and construct connected Neo4j graphs
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            backgroundColor: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#fb7185",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.88rem",
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Zone */}
      <UploadZone
        onFileSelected={handleFileSelected}
        onStartIngest={handleStartIngest}
        isIngesting={isIngesting}
        selectedFile={selectedFile}
        previewRows={previewRows}
        detectedColumns={detectedColumns}
        estimatedRows={estimatedRows}
      />

      {/* Real-Time Ingestion Progress Card */}
      {jobProgress && (
        <div>
          <ProgressCard
            jobId={jobProgress.jobId}
            status={jobProgress.status}
            rowsTotal={jobProgress.rowsTotal}
            rowsLoaded={jobProgress.rowsLoaded}
            rowsFailed={jobProgress.rowsFailed}
            stage={jobProgress.stage}
            progress={jobProgress.progress}
            filename={jobProgress.filename}
          />

          {jobProgress.progress >= 100 && (
            <div
              className="glass-card"
              style={{
                marginTop: "16px",
                padding: "18px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#34d399", fontWeight: "600" }}>
                <CheckCircle2 size={20} />
                <span>Dataset ready for graph queries and AI exploration!</span>
              </div>
              <button
                className="btn-primary"
                onClick={() => setActivePage("ask-data")}
              >
                <span>Ask Questions with AI</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
