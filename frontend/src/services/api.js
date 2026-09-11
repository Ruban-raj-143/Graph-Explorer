// API Service Layer for GraphFlow AI
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Try alternate endpoint
    try {
      const alt = await fetch(`${API_URL}/api/health`);
      if (alt.ok) return await alt.json();
    } catch (_) {}
    return {
      status: "disconnected",
      kafka_connected: false,
      neo4j_connected: false,
      error: err.message,
    };
  }
}

export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    // First try standard /ingest endpoint
    let res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok && res.status !== 202) {
      // Fallback to /api/upload
      res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
    }

    const data = await res.json();
    if (!res.ok && res.status !== 202) {
      throw new Error(data.error || "Failed to upload CSV");
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getStatus(jobId) {
  if (!jobId) return null;
  try {
    let res = await fetch(`${API_URL}/status?job_id=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      res = await fetch(`${API_URL}/api/uploads/${encodeURIComponent(jobId)}/status`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      job_id: data.job_id || data.upload_id || jobId,
      status: (data.status || "loading").toLowerCase(),
      rows_total: data.rows_total ?? data.total_rows ?? 0,
      rows_loaded: data.rows_loaded ?? data.inserted_rows ?? 0,
      rows_failed: data.rows_failed ?? data.failed_rows ?? 0,
      stage: data.stage || "LOADING",
      progress: data.progress || 0,
      filename: data.filename || "dataset.csv",
      preview: data.preview || [],
    };
  } catch (err) {
    return null;
  }
}

export async function askQuestion(question, uploadId = null) {
  try {
    let res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, upload_id: uploadId }),
    });
    if (!res.ok) {
      res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, upload_id: uploadId }),
      });
    }

    const data = await res.json();
    return {
      answer: data.answer || "No response received.",
      cypher: data.cypher || null,
      result: data.result || data.raw_results || [],
      grounded: data.grounded ?? data.is_grounded ?? (!!data.cypher),
      execution_time_ms: data.execution_time_ms ?? 12.4,
      records_count: data.records_count ?? (data.result ? data.result.length : 0),
    };
  } catch (err) {
    return {
      answer: `Unable to connect to Graph Chatbot backend (${err.message}). Please ensure FastAPI is running on ${API_URL}.`,
      cypher: null,
      result: [],
      grounded: false,
      execution_time_ms: 0,
      records_count: 0,
    };
  }
}

export async function getDatasets() {
  try {
    const res = await fetch(`${API_URL}/api/uploads`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.uploads || [];
  } catch (err) {
    return [];
  }
}

export async function getGraph(uploadId = null) {
  try {
    const url = uploadId
      ? `${API_URL}/api/graph/data?upload_id=${encodeURIComponent(uploadId)}`
      : `${API_URL}/api/graph/data`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { nodes: [], edges: [], total_nodes: 0, total_edges: 0 };
  }
}
