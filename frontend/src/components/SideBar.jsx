import { useEffect, useState, useRef } from "react";
import { PlusCircle, MessageSquare, Pencil, Trash2, X, Pin, PinOff, Check } from "lucide-react";

export default function Sidebar({ activeThreadId, onSelectThread, onNewThread, onClearThread, refreshKey })  {
  const [threads, setThreads] = useState([]);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const fetchThreads = () => {
    fetch("http://localhost:8000/threads")
      .then(res => res.json())
      .then(data => setThreads(data.threads || []))
      .catch(() => {});
  };

  useEffect(() => { fetchThreads(); }, []);
  useEffect(() => { if (refreshKey !== 0) fetchThreads(); }, [refreshKey]);

  const handleDelete = async (e, threadId) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`http://localhost:8000/threads/${threadId}`, { method: "DELETE" });
    if (activeThreadId === threadId) onClearThread();
    fetchThreads();
};

  const startRename = (e, thread) => {
    e.stopPropagation();
    setRenamingId(thread.id);
    setRenameValue(thread.title);
  };

  const submitRename = async (threadId) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    await fetch(`http://localhost:8000/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    setRenamingId(null);
    fetchThreads();
  };

  const handlePin = async (e, thread) => {
  e.stopPropagation();
  await fetch(`http://localhost:8000/threads/${thread.id}/pin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned: !thread.pinned }),
  });
  fetchThreads();
};

  return (
    <aside style={{
      width: "260px", height: "100dvh", background: "#f9f9f9",
      borderRight: "1px solid #e5e5e5", display: "flex", flexDirection: "column",
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
          const isHovered = hoveredId === thread.id;
          const isRenaming = renamingId === thread.id;

          return (
            <div
              key={thread.id}
              onClick={() => !isRenaming && onSelectThread(thread.id)}
              onMouseEnter={() => setHoveredId(thread.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: "8px", padding: "9px 12px", borderRadius: "9px",
                background: isActive ? "#0f6e56" : isHovered ? "#efefef" : "transparent",
                color: isActive ? "#fff" : "#3a3a3a",
                fontSize: "13px", cursor: "pointer", marginBottom: "2px",
                fontFamily: "'Inter', sans-serif", transition: "background 0.1s",
                boxSizing: "border-box",
              }}
            >
              <MessageSquare size={13} style={{ flexShrink: 0 }} />

              {isRenaming ? (
                /* ── rename mode ── */
                <>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitRename(thread.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      flex: 1, minWidth: 0, fontSize: "13px", padding: "1px 4px",
                      borderRadius: "4px", border: "1px solid #0f6e56",
                      outline: "none", fontFamily: "'Inter', sans-serif",
                      background: "#fff", color: "#1a1a1a",
                    }}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); submitRename(thread.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#999", flexShrink: 0 }}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingId(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#999", flexShrink: 0 }}
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                /* ── normal mode ── */
                <>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                    {!!thread.pinned && <Pin size={10} style={{ flexShrink: 0, opacity: 0.6 }} />}
                    {thread.title}
                  </span>
                  {(isActive || isHovered) && (
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      <button
                      onClick={e => handlePin(e, thread)}
                      title={thread.pinned ? "Unpin" : "Pin"}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: "2px",
                        color: thread.pinned ? (isActive ? "#fff" : "#0f6e56") : (isActive ? "rgba(255,255,255,0.7)" : "#999"),
                        borderRadius: "4px",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = isActive ? "#fff" : "#0f6e56"}
                      onMouseLeave={e => e.currentTarget.style.color = thread.pinned ? (isActive ? "#fff" : "#0f6e56") : (isActive ? "rgba(255,255,255,0.7)" : "#999")}
                    >
                      {thread.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                      <button
                        onClick={e => startRename(e, thread)}
                        title="Rename"
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: "2px",
                          color: isActive ? "rgba(255,255,255,0.7)" : "#999",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = isActive ? "#fff" : "#555"}
                        onMouseLeave={e => e.currentTarget.style.color = isActive ? "rgba(255,255,255,0.7)" : "#999"}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, thread.id)}
                        title="Delete"
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: "2px",
                          color: isActive ? "rgba(255,255,255,0.7)" : "#999",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = isActive ? "#fff" : "#e53e3e"}
                        onMouseLeave={e => e.currentTarget.style.color = isActive ? "rgba(255,255,255,0.7)" : "#999"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}