import { useEffect, useState } from "react";
import { PlusCircle, MessageSquare } from "lucide-react";

export default function Sidebar({ activeThreadId, onSelectThread, onNewThread, refreshKey }) {
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/threads")
      .then(res => res.json())
      .then(data => setThreads(data.threads || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (refreshKey === 0) return;
    fetch("http://localhost:8000/threads")
      .then(res => res.json())
      .then(data => setThreads(data.threads || []))
      .catch(() => {});
  }, [refreshKey]);

  return (
    <aside style={{
      width: "260px", height: "100dvh", background: "#f9f9f9",
      borderRight: "1px solid #e5e5e5", display: 
      "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* New Chat button */}
      <div style={{ padding: "12px", borderBottom: "1px solid #e5e5e5" }}>
        <button
          id="tour-new-chat"
          onClick={onNewThread}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 14px", borderRadius: "10px", border: "none",
            background: "#0f6e56", color: "#fff", fontSize: "14px",
            fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}
        >
          <PlusCircle size={15} />
          New Chat
        </button>
      </div>

      {/* Thread list */}
      <div id="tour-threads" style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {threads.length === 0 && (
          <p style={{ fontSize: "12px", color: "#a0a0a0", textAlign: "center", marginTop: "16px" }}>
            No conversations yet
          </p>
        )}
        {threads.map(thread => {
          const isActive = activeThreadId === thread.id;
          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center",
                gap: "8px", padding: "9px 12px", borderRadius: "9px", border: "none",
                background: isActive ? "#0f6e56" : "transparent",
                color: isActive ? "#fff" : "#3a3a3a",
                fontSize: "13px", cursor: "pointer", marginBottom: "2px",
                fontFamily: "'Inter', sans-serif",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#efefef"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <MessageSquare size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {thread.title}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
