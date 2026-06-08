import { useState, useRef, useEffect } from "react";
import { Send, FileText, Bot, ChevronDown, User } from "lucide-react";

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
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: "#eff6ff", border: "1px solid #bfdbfe",
      borderRadius: "6px", padding: "3px 9px", fontSize: "12px",
      color: "#1d4ed8", fontFamily: "'Inter', monospace",
    }}>
      <FileText size={11} />
      <span style={{ fontWeight: 500 }}>{source.title}</span>
      <span style={{ color: "#93c5fd" }}>·</span>
      <span style={{ color: "#60a5fa" }}>{source.chunk}</span>
      <span style={{
        background: "#2563eb", color: "#fff",
        borderRadius: "4px", padding: "0 5px", fontSize: "11px", fontWeight: 500,
      }}>{Math.round(source.score * 100)}%</span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: "12px",
      flexDirection: isUser ? "row-reverse" : "row",
      padding: "2px 0",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: isUser ? "#2563eb" : "#f7f7f8",
        border: isUser ? "none" : "1px solid #e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isUser
          ? <User size={15} color="#fff" />
          : <Bot size={15} color="#2563eb" />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "75%" }}>
        <div style={{
          background: isUser ? "#eff6ff" : "#f7f7f8",
          border: `1px solid ${isUser ? "#bfdbfe" : "#e5e5e5"}`,
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "11px 16px",
          fontSize: "15px", lineHeight: "1.65", color: "#0d0d0d",
        }}>
          {msg.text}
        </div>

        {msg.sources && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    setInput("");
    // wire to backend here
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#fff" }}>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: "57px", flexShrink: 0,
        borderBottom: "1px solid #e5e5e5",
        background: "#ffffff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: "#2563eb", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Bot size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 600, fontSize: "15px", color: "#0d0d0d", letterSpacing: "-0.2px" }}>
            RAG Chat
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "#8e8ea0" }}>Index:</span>
          <button style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: "#f7f7f8", border: "1px solid #e5e5e5",
            borderRadius: "8px", padding: "5px 11px",
            color: "#0d0d0d", fontSize: "13px", cursor: "pointer",
            fontWeight: 500,
          }}>
            docs-v2 <ChevronDown size={12} color="#8e8ea0" />
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "12px", color: "#16a34a",
          }}>
            <div style={{
              width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e",
            }} />
            Connected
          </div>
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "28px 24px",
        display: "flex", flexDirection: "column", gap: "22px",
        maxWidth: "760px", width: "100%", margin: "0 auto", alignSelf: "stretch",
      }}>
        {MOCK_MESSAGES.map(msg => <Message key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 24px 20px",
        borderTop: "1px solid #e5e5e5",
        background: "#ffffff",
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: "760px", margin: "0 auto",
          display: "flex", gap: "10px", alignItems: "flex-end",
          background: "#f7f7f8", border: "1px solid #e5e5e5",
          borderRadius: "14px", padding: "10px 14px",
        }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message RAG Chat…"
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", resize: "none", color: "#0d0d0d",
              fontSize: "15px", lineHeight: "1.5",
              fontFamily: "'Inter', sans-serif",
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width: "34px", height: "34px", borderRadius: "9px",
              background: input.trim() ? "#2563eb" : "#e5e5e5",
              border: "none", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s", flexShrink: 0,
            }}
          >
            <Send size={15} color={input.trim() ? "#fff" : "#a0a0a0"} />
          </button>
        </div>
        <p style={{
          textAlign: "center", fontSize: "12px", color: "#8e8ea0",
          marginTop: "8px",
        }}>
          RAG Chat can make mistakes. Results ranked by cosine similarity.
        </p>
      </div>
    </div>
  );
}