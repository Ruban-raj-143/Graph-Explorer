import React from "react";
import { Bot, User, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import CypherViewer from "./CypherViewer";
import RawResultViewer from "./RawResultViewer";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const {
    content,
    cypher,
    result,
    grounded = true,
    execution_time_ms = 0,
    isThinking = false,
  } = message;

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: isUser ? "80%" : "90%",
        marginBottom: "20px",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: isUser ? "#0284c7" : "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          flexShrink: 0,
          boxShadow: isUser
            ? "0 0 12px rgba(14, 165, 233, 0.3)"
            : "0 0 12px rgba(99, 102, 241, 0.3)",
        }}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Message Bubble */}
      <div
        style={{
          backgroundColor: isUser ? "#0369a1" : "var(--bg-card-subtle)",
          border: isUser ? "1px solid #0284c7" : "1px solid var(--border)",
          borderRadius: "14px",
          padding: "16px 20px",
          color: "#ffffff",
          fontSize: "0.92rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
        }}
      >
        {isThinking ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
            <span className="pulse-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
            <span>Querying Neo4j graph & generating grounded answer...</span>
          </div>
        ) : (
          <div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {content}
            </div>

            {/* AI Verification & Grounding Panel */}
            {!isUser && (
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                {/* Grounding Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  {grounded ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>✓ Grounded in Neo4j</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(244, 63, 94, 0.12)",
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                        color: "#fb7185",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                      }}
                    >
                      <AlertTriangle size={13} />
                      <span>⚠ I don’t have that information in the uploaded data</span>
                    </div>
                  )}

                  {execution_time_ms > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      <Clock size={12} />
                      <span>{execution_time_ms}ms</span>
                    </div>
                  )}
                </div>

                {/* Cypher and Raw Result Viewers */}
                {cypher && <CypherViewer cypher={cypher} />}
                {result && <RawResultViewer result={result} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
