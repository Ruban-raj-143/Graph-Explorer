import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import ChatMessage from "../components/ChatMessage";
import { askQuestion } from "../services/api";

export default function AskData({ activeDataset }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your GraphFlow AI Assistant. Ask any question about your uploaded dataset, and I will generate and execute grounded Cypher queries against the live Neo4j graph.",
      grounded: true,
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "How many rows are in this dataset?",
    "Which groups exist?",
    "Show all rows belonging to Billing.",
    "What is connected to this account?",
    "How many failed rows are there?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (qText = null) => {
    const questionToSend = qText || inputQuestion.trim();
    if (!questionToSend || isAsking) return;

    setInputQuestion("");

    // Add user message
    const userMsg = { role: "user", content: questionToSend };
    setMessages((prev) => [...prev, userMsg]);

    // Add thinking AI placeholder
    const thinkingMsg = {
      role: "assistant",
      content: "",
      isThinking: true,
    };
    setMessages((prev) => [...prev, thinkingMsg]);
    setIsAsking(true);

    try {
      const response = await askQuestion(questionToSend, activeDataset);
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => !m.isThinking);
        return [
          ...withoutThinking,
          {
            role: "assistant",
            content: response.answer,
            cypher: response.cypher,
            result: response.result,
            grounded: response.grounded,
            execution_time_ms: response.execution_time_ms,
          },
        ];
      });
    } catch (err) {
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => !m.isThinking);
        return [
          ...withoutThinking,
          {
            role: "assistant",
            content: `Error querying graph: ${err.message}`,
            grounded: false,
          },
        ];
      });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        gap: "14px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
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
            Ask your data
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Answers are grounded in your Neo4j graph.
          </p>
        </div>

        <div className="badge badge-success">
          <ShieldCheck size={14} />
          <span>Read-Only Guardrails Enforced</span>
        </div>
      </div>

      {/* Chat Container */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {/* Messages Stream */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Suggested Questions Area */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--bg-sidebar)",
          }}
        >
          {/* Suggested Questions Chips */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              marginBottom: "12px",
              paddingBottom: "4px",
            }}
          >
            {suggestedQuestions.map((sq, idx) => (
              <button
                key={idx}
                disabled={isAsking}
                onClick={() => handleSend(sq)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "16px",
                  backgroundColor: "var(--bg-card-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#0ea5e9";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.backgroundColor = "rgba(14, 165, 233, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.backgroundColor = "var(--bg-card-subtle)";
                }}
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: "flex", gap: "10px" }}
          >
            <input
              type="text"
              placeholder="Ask a question about your data..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isAsking}
              style={{
                flex: 1,
                backgroundColor: "var(--bg-main)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "0.92rem",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!inputQuestion.trim() || isAsking}
              style={{ padding: "0 22px" }}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
