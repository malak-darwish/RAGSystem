import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import Message from "./components/Message";
import TypingIndicator from "./components/TypingIndicator";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/Sidebar";
import { useTour } from "./hooks/useTour";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const { startTour } = useTour();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const messageRefs = useRef({});
  const searchRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then(r => r.ok && setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(v => !v);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem("tour-seen");
    if (!seen) {
      setTimeout(startTour, 800);
      localStorage.setItem("tour-seen", "true");
    }
  }, []);

  const handleFeedback = async (id, direction, reason = null) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, feedback: direction } : m)
    );
    try {
      await fetch("http://localhost:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: id, value: direction, reason }),
      });
    } catch (_) {}
  };

  const getQuestionForMessage = (assistantId) => {
    const idx = messages.findIndex(m => m.id === assistantId);
    if (idx <= 0) return "";
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].text;
    }
    return "";
  };

  const handleRegenerate = async (assistantMsgId) => {
    if (!activeThreadId) return;
    const question = getQuestionForMessage(assistantMsgId);
    if (!question) return;

    const msg = messages.find(m => m.id === assistantMsgId);
    const dbId = msg?.dbId;
    if (!dbId) return;

    setMessages(prev => prev.map(m =>
      m.id === assistantMsgId ? { ...m, regenerating: true } : m
    ));

    try {
      const res = await fetch("http://localhost:8000/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: dbId,
          question,
          thread_id: activeThreadId,
        }),
      });

      if (!res.ok) throw new Error("Regenerate failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;

        if (firstChunk) {
          firstChunk = false;
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsgId) return m;
            const prevVersions = m.versions || [{ version: 1, content: m.text, sources: m.sources }];
            return {
              ...m,
              versions: [...prevVersions, { version: prevVersions.length + 1, content: "", sources: [] }],
            };
          }));
        } else {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsgId) return m;
            const versions = [...(m.versions || [])];
            versions[versions.length - 1] = {
              ...versions[versions.length - 1],
              content: fullText,
            };
            return { ...m, versions };
          }));
        }
      }

      // patch sources from header
      const sourcesHeader = res.headers.get("X-Sources-Regen");
      if (sourcesHeader) {
        const sources = JSON.parse(sourcesHeader);
        setMessages(prev => prev.map(m => {
          if (m.id !== assistantMsgId) return m;
          const versions = [...(m.versions || [])];
          versions[versions.length - 1] = { ...versions[versions.length - 1], sources };
          return { ...m, versions, regenerating: false };
        }));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, regenerating: false } : m
        ));
      }

      // re-fetch thread to persist dbId
      try {
        const msgsRes = await fetch(`http://localhost:8000/threads/${activeThreadId}/messages`);
        const msgsData = await msgsRes.json();
        const msgs = msgsData.messages || [];
        const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant");
        if (lastAssistant) {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, dbId: lastAssistant.id } : m
          ));
        }
      } catch (_) {}

    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, regenerating: false } : m
      ));
    }
  };

const handleReask = async (userMsgId, newText) => {
  if (!activeThreadId) return;

  const idx = messages.findIndex(m => m.id === userMsgId);
  if (idx === -1) return;

  const msg = messages[idx];
  const dbId = msg?.dbId;
  if (!dbId) return;

  setMessages(prev => prev.slice(0, idx));

  try {
    await fetch("http://localhost:8000/messages/delete-after", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: activeThreadId, after_message_id: dbId }),
    });
  } catch (_) {}

  handleSend(newText);
};

  const handleNewThread = async () => {
    const res = await fetch("http://localhost:8000/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    const data = await res.json();
    setActiveThreadId(data.id);
    setMessages([]);
    setRefreshSidebar(n => n + 1);
  };

  const handleSelectThread = async (threadId) => {
    setActiveThreadId(threadId);
    const res = await fetch(`http://localhost:8000/threads/${threadId}/messages`);
    const data = await res.json();
    setMessages(
      (data.messages || []).map(m => ({
        id: m.id,
        dbId: m.id,
        role: m.role,
        text: m.content,
        sources: Array.isArray(m.sources)
          ? m.sources
          : m.sources
            ? JSON.parse(m.sources)
            : [],
        createdAt: new Date(m.created_at),
      }))
    );
  };

  const handleClearThread = () => {
    setActiveThreadId(null);
    setMessages([]);
  };

  const handleSend = async (overrideInput) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    let threadId = activeThreadId;

    if (!threadId) {
      const res = await fetch("http://localhost:8000/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.slice(0, 50) }),
      });
      const data = await res.json();
      threadId = data.id;
      setActiveThreadId(threadId);
      setRefreshSidebar(n => n + 1);
    }

    const userMsg = { id: Date.now(), role: "user", text, createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);

    if (!overrideInput) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.text, thread_id: threadId }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = Date.now() + 1;
      let fullText = "";
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;

        if (firstChunk) {
          firstChunk = false;
          setLoading(false);
          setMessages(prev => [...prev, {
            id: assistantId, role: "assistant", text: fullText,
            sources: [], createdAt: new Date(),
          }]);
        } else {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, text: fullText } : m
          ));
        }
      }

      // Read sources header
      const sourcesHeader = res.headers.get("X-Sources");
      if (sourcesHeader) {
        try {
          const sources = JSON.parse(sourcesHeader);
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, sources } : m
          ));
        } catch (_) {}
      }

      // Fetch real DB message id so regeneration works
      setRefreshSidebar(n => n + 1);
      try {
        const msgsRes = await fetch(`http://localhost:8000/threads/${threadId}/messages`);
        const msgsData = await msgsRes.json();
        const msgs = msgsData.messages || [];
        const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant");
        const lastUser = [...msgs].reverse().find(m => m.role === "user"); 
        if (lastAssistant) {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, dbId: lastAssistant.id } : m  // ← fixed
          ));
        }
        if (lastUser) {  
    setMessages(prev => prev.map(m =>
      m.id === userMsg.id ? { ...m, dbId: lastUser.id } : m
    ));
  }
      } catch (_) {}

    } catch (err) {
      setLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant",
        text: "Something went wrong. Make sure the backend is running.",
        error: true, createdAt: new Date(),
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");

    const messagesHTML = messages.map(msg => {
      const isUser = msg.role === "user";
      const time = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      const text = msg.versions?.length
        ? msg.versions[msg.versions.length - 1].content
        : msg.text;

      const cleanText = text?.replace(/\[(\d+)\]/g, "") || "";

      const sources = msg.versions?.length
        ? msg.versions[msg.versions.length - 1].sources
        : msg.sources;

      const sourcesHTML = sources?.length
        ? `<div class="sources">
            <div class="sources-title">Sources</div>
            ${sources.map(s => `<div class="source-item"><strong>${s.title}</strong> — ${s.chunk}</div>`).join("")}
          </div>`
        : "";

      return `
        <div class="message ${isUser ? "user" : "assistant"}">
          <div class="avatar">${isUser ? "You" : "AI"}</div>
          <div class="bubble-wrap">
            <div class="bubble">${cleanText}${sourcesHTML}</div>
            <div class="time">${time}</div>
          </div>
        </div>`;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>RAG Chat Export</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #fff; color: #0d0d0d; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 20px; font-weight: 600; color: #0f6e56; margin-bottom: 4px; }
          .meta { font-size: 12px; color: #8e8ea0; margin-bottom: 32px; }
          .message { display: flex; gap: 12px; margin-bottom: 24px; }
          .message.user { flex-direction: row-reverse; }
          .avatar {
            width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 600;
          }
          .message.user .avatar { background: #0f6e56; color: #fff; }
          .message.assistant .avatar { background: #f7f7f8; border: 1px solid #e5e5e5; color: #0f6e56; }
          .bubble-wrap { display: flex; flex-direction: column; gap: 4px; max-width: 75%; }
          .message.user .bubble-wrap { align-items: flex-end; }
          .bubble { padding: 11px 16px; font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
          .message.user .bubble { background: #e1f5ee; border: 1px solid #9fe1cb; border-radius: 18px 4px 18px 18px; }
          .message.assistant .bubble { background: #f7f7f8; border: 1px solid #e5e5e5; border-radius: 4px 18px 18px 18px; }
          .time { font-size: 11px; color: #b0b0b0; padding: 0 4px; }
          .sources { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e5e5; }
          .sources-title { font-size: 11px; font-weight: 600; color: #0f6e56; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
          .source-item { font-size: 12px; color: #555; margin-bottom: 4px; line-height: 1.5; }
          @media print {
            body { padding: 20px; }
            @page { margin: 20mm; }
          }
        </style>
      </head>
      <body>
        <h1>RAG Chat</h1>
        <div class="meta">Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        ${messagesHTML}
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const matchingIds = searchQuery.trim()
    ? messages
        .filter(m => (m.text ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
        .map(m => m.id)
    : [];

  const jumpToMatch = (newIdx) => {
    if (matchingIds.length === 0) return;
    const clamped = Math.max(0, Math.min(newIdx, matchingIds.length - 1));
    setMatchIndex(clamped);
    const targetId = matchingIds[clamped];
    if (messageRefs.current[targetId]) {
      messageRefs.current[targetId].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>

      {sidebarOpen && (
        <Sidebar
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onClearThread={handleClearThread}
          refreshKey={refreshSidebar}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, background: "#fff" }}>

        <header id="tour-header" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: "57px", flexShrink: 0,
          borderBottom: "1px solid #e5e5e5", background: "#ffffff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#8e8ea0" }}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              ☰
            </button>
            <div style={{
              width: "30px", height: "30px", borderRadius: "8px",
              background: "#0f6e56", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, fontSize: "15px", color: "#0d0d0d", letterSpacing: "-0.2px" }}>
              RAG Chat
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleExportPDF}
              style={{
                background: "none", border: "0.5px solid #e5e5e5",
                borderRadius: "8px", padding: "4px 10px",
                fontSize: "12px", color: "#8e8ea0", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              ↓ Export PDF
            </button>
            <button
              onClick={startTour}
              style={{
                background: "none", border: "0.5px solid #e5e5e5",
                borderRadius: "8px", padding: "4px 10px",
                fontSize: "12px", color: "#8e8ea0", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Tour
            </button>

            <div id="tour-status" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px",
              color: online ? "#0f6e56" : "#dc2626" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%",
                background: online ? "#1d9e75" : "#ef4444" }} />
              {online ? "Connected" : "Offline"}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div style={{
            padding: "8px 24px", borderBottom: "1px solid #e5e5e5",
            background: "#fff", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setMatchIndex(0);
                setTimeout(() => {
                  const first = messages.find(m => m.text?.toLowerCase().includes(e.target.value.toLowerCase()));
                  if (first && messageRefs.current[first.id]) {
                    messageRefs.current[first.id].scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }, 50);
              }}
              placeholder="Search messages…"
              onKeyDown={e => {
                if (e.key === "Enter") jumpToMatch(matchIndex + 1);
                if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
              }}
              style={{
                flex: 1, maxWidth: "400px", padding: "6px 12px",
                border: "1px solid #e5e5e5", borderRadius: "8px",
                fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && matchingIds.length > 0 && (
              <span style={{ fontSize: "12px", color: "#8e8ea0", whiteSpace: "nowrap" }}>
                {matchIndex + 1} / {matchingIds.length}
              </span>
            )}
            {searchQuery && matchingIds.length === 0 && (
              <span style={{ fontSize: "12px", color: "#e53e3e" }}>No matches</span>
            )}
            {searchQuery && matchingIds.length > 0 && (
              <>
                <button
                  onClick={() => jumpToMatch(matchIndex - 1)}
                  disabled={matchIndex === 0}
                  style={{
                    background: "none", border: "1px solid #e5e5e5", borderRadius: "6px",
                    padding: "3px 8px", cursor: matchIndex === 0 ? "default" : "pointer",
                    opacity: matchIndex === 0 ? 0.4 : 1, fontSize: "13px",
                  }}
                >↑</button>
                <button
                  onClick={() => jumpToMatch(matchIndex + 1)}
                  disabled={matchIndex === matchingIds.length - 1}
                  style={{
                    background: "none", border: "1px solid #e5e5e5", borderRadius: "6px",
                    padding: "3px 8px", cursor: matchIndex === matchingIds.length - 1 ? "default" : "pointer",
                    opacity: matchIndex === matchingIds.length - 1 ? 0.4 : 1, fontSize: "13px",
                  }}
                >↓</button>
              </>
            )}
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#8e8ea0", fontSize: "18px", lineHeight: 1 }}
            >×</button>
          </div>
        )}

        <div style={{
          flex: 1, overflowY: "auto", padding: "28px 24px",
          display: "flex", flexDirection: "column", gap: "22px",
          maxWidth: "760px", width: "100%", margin: "0 auto", alignSelf: "stretch",
        }}>
          {messages.length === 0 && (
            <EmptyState onSelect={(q) => {
              setInput(q);
              textareaRef.current?.focus();
            }} />
          )}

          {messages.map(msg => (
            <Message
              key={msg.id}
              msg={msg}
              onFeedback={handleFeedback}
              onRegenerate={handleRegenerate}
              onReask={handleReask}
              searchQuery={searchQuery}
              isCurrentMatch={matchingIds[matchIndex] === msg.id}
              setRef={el => { if (el) messageRefs.current[msg.id] = el; }}
            />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div style={{
          padding: "12px 24px 20px", borderTop: "1px solid #e5e5e5",
          background: "#ffffff", flexShrink: 0,
        }}>
          <div id="tour-input" style={{
            maxWidth: "760px", margin: "0 auto",
            display: "flex", gap: "10px", alignItems: "flex-end",
            background: "#f7f7f8", border: "1px solid #e5e5e5",
            borderRadius: "14px", padding: "10px 14px",
          }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              placeholder="Message RAG Chat…"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", resize: "none", color: "#0d0d0d",
                fontSize: "15px", lineHeight: "1.5",
                fontFamily: "'Inter', sans-serif",
                maxHeight: "160px", overflowY: "auto",
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{
                width: "34px", height: "34px", borderRadius: "9px",
                background: input.trim() && !loading ? "#0f6e56" : "#e5e5e5",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s", flexShrink: 0,
              }}>
              {loading
                ? <Loader2 size={15} color="#a0a0a0" style={{ animation: "spin 1s linear infinite" }} />
                : <Send size={15} color={input.trim() ? "#fff" : "#a0a0a0"} />}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ textAlign: "center", fontSize: "12px", color: "#8e8ea0", marginTop: "8px" }}>
            RAG Chat can make mistakes.
          </p>
        </div>
      </div>
    </div>
  );
}