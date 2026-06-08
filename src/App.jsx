import { useState, useRef, useEffect } from "react";
import { Send, FileText, Cpu, ChevronDown } from "lucide-react";

const MOCK_MESSAGES = [
  {
    id: 1, role: "user",
    text: "What does the documentation say about rate limiting?",
  },
  {
    id: 2, role: "assistant",
    text: "Based on the retrieved documents, rate limiting is applied per API key with a default of 60 requests per minute. Exceeding this returns a 429 status with a Retry-After header.",
    sources: [
      { title: "api-reference.md", chunk: "§ Rate Limits", score: 0.97 },
      { title: "errors.md", chunk: "§ HTTP 429", score: 0.91 },
    ],
  },
  {
    id: 3, role: "user",
    text: "How do I authenticate requests?",
  },
  {
    id: 4, role: "assistant",
    text: "Authentication uses Bearer tokens passed in the Authorization header. Tokens are scoped per workspace and expire after 30 days unless refreshed.",
    sources: [
      { title: "auth-guide.md", chunk: "§ Bearer Tokens", score: 0.99 },
    ],
  },
];

function SourceBadge({ source }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: "var(--accent-dim)", border: "1px solid var(--accent)30",
      borderRadius: "4px", padding: "3px 8px", fontSize: "11px",
      color: "var(--accent)", fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <FileText size={10} />
      <span>{source.title}</span>
      <span style={{ color: "var(--muted)" }}>{source.chunk}</span>
      <span style={{
        background: "var(--accent)", color: "#fff",
        borderRadius: "3px", padding: "0 4px", fontSize: "10px",
      }}>{Math.round(source.score * 100)}%</span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: "8px", padding: "4px 0",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "11px", color: "var(--muted)",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {!isUser && <Cpu size={11} style={{ color: "var(--accent)" }} />}
        <span>{isUser ? "you" : "rag·system"}</span>
      </div>

      <div style={{
        maxWidth: "72%",
        background: isUser ? "var(--accent-dim)" : "var(--surface)",
        border: `1px solid ${isUser ? "var(--accent)40" : "var(--border)"}`,
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
        fontSize: "14px", lineHeight: "1.6", color: "var(--text)",
      }}>
        {msg.text}
      </div>

      {msg.sources && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxWidth: "72%" }}>
          {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: "56px", flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Cpu size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>
            RAG Chat
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
            color: "var(--muted)", background: "var(--border)",
            padding: "2px 7px", borderRadius: "3px",
          }}>v0.1</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Index:</span>
          <button style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "5px 10px",
            color: "var(--text)", fontSize: "12px", cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            docs-v2 <ChevronDown size={12} />
          </button>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#4ade80", boxShadow: "0 0 6px #4ade8099",
          }} />
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px",
        display: "flex", flexDirection: "column", gap: "20px",
      }}>
        {MOCK_MESSAGES.map(msg => <Message key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: "16px 24px 20px",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: "10px", alignItems: "flex-end",
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "10px 14px",
          transition: "border-color 0.2s",
        }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your documents…"
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", resize: "none", color: "var(--text)",
              fontSize: "14px", lineHeight: "1.5",
              fontFamily: "'Syne', sans-serif",
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setInput("");
              }
            }}
          />
          <button
            onClick={() => setInput("")}
            style={{
              width: "34px", height: "34px", borderRadius: "8px",
              background: input.trim() ? "var(--accent)" : "var(--border)",
              border: "none", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <Send size={15} color={input.trim() ? "#fff" : "var(--muted)"} />
          </button>
        </div>
        <p style={{
          textAlign: "center", fontSize: "11px", color: "var(--muted)",
          marginTop: "8px", fontFamily: "'IBM Plex Mono', monospace",
        }}>
          shift+enter for newline · results ranked by cosine similarity
        </p>
      </div>
    </div>
  );
}