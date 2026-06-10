import { useState } from "react";
import { Bot, User, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SourceBadge from "./SourceBadge";

export default function Message({ msg, onFeedback }) {
  const isUser = msg.role === "user";
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      display: "flex", gap: "12px",
      flexDirection: isUser ? "row-reverse" : "row",
      padding: "2px 0",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: isUser ? "#0f6e56" : "#f7f7f8",
        border: isUser ? "none" : "1px solid #e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isUser ? <User size={15} color="#fff" /> : <Bot size={15} color="#0f6e56" />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "75%" }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: isUser ? "#e1f5ee" : "#f7f7f8",
            border: `1px solid ${isUser ? "#9fe1cb" : "#e5e5e5"}`,
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            padding: "11px 16px",
            fontSize: "15px", lineHeight: "1.65", color: "#0d0d0d",
            transform: hovered ? "translateY(-1px)" : "translateY(0)",
            transition: "transform 0.15s ease",
          }}>
          {msg.error
            ? <span style={{ color: "#dc2626" }}>{msg.text}</span>
            : <div className="markdown">
                <ReactMarkdown
                  components={{
                    code: ({ children }) => (
                      <code style={{
                        background: "#f1f5f9", padding: "2px 6px",
                        borderRadius: "4px", fontSize: "13px", fontFamily: "monospace",
                      }}>{children}</code>
                    ),
                    pre: ({ children }) => (
                      <pre style={{
                        background: "#f8fafc", border: "1px solid #e5e5e5",
                        borderRadius: "8px", padding: "12px", overflowX: "auto",
                        fontSize: "13px", margin: "8px 0",
                      }}>{children}</pre>
                    ),
                  }}
                >{msg.text}</ReactMarkdown>
              </div>
          }
        </div>

        {msg.createdAt && (
          <span style={{
            fontSize: "11px", color: "#b0b0b0",
            alignSelf: isUser ? "flex-end" : "flex-start",
            paddingLeft: isUser ? 0 : "4px",
            paddingRight: isUser ? "4px" : 0,
          }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {msg.sources?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}

        {!isUser && !msg.error && (
          <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
            {["up", "down"].map(dir => (
              <button key={dir} onClick={() => onFeedback(msg.id, dir)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: msg.feedback === dir ? (dir === "up" ? "#e1f5ee" : "#fef2f2") : "transparent",
                  border: `1px solid ${msg.feedback === dir ? (dir === "up" ? "#9fe1cb" : "#fecaca") : "#e5e5e5"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                {dir === "up"
                  ? <ThumbsUp size={13} color={msg.feedback === "up" ? "#0f6e56" : "#8e8ea0"} />
                  : <ThumbsDown size={13} color={msg.feedback === "down" ? "#dc2626" : "#8e8ea0"} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}