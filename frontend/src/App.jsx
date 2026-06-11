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

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then(r => r.ok && setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const seen = localStorage.getItem("tour-seen");
    if (!seen) {
      setTimeout(startTour, 800);
      localStorage.setItem("tour-seen", "true");
    }
  }, []);

  const handleFeedback = async (id, direction) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, feedback: direction } : m)
    );
    try {
      await fetch("http://localhost:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: id, feedback: direction }),
      });
    } catch (_) {}
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
        role: m.role,
        text: m.content,
        // sources may be a JSON string (from DB) or already parsed array
        sources: Array.isArray(m.sources)
          ? m.sources
          : m.sources
            ? JSON.parse(m.sources)
            : [],
        createdAt: new Date(m.created_at),
      }))
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let threadId = activeThreadId;

    if (!threadId) {
      const res = await fetch("http://localhost:8000/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 50) }),
      });
      const data = await res.json();
      threadId = data.id;
      setActiveThreadId(threadId);
      setRefreshSidebar(n => n + 1);
    }

    const userMsg = { id: Date.now(), role: "user", text: input.trim(), createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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

      // After stream closes, read sources from response header
      const sourcesHeader = res.headers.get("X-Sources");
      if (sourcesHeader) {
        try {
          const sources = JSON.parse(sourcesHeader);
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, sources } : m
          ));
        } catch (_) {
          // malformed header — sources just won't show, not fatal
        }
      }

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

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          refreshKey={refreshSidebar}
        />
      )}

      {/* Main chat area */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, background: "#fff" }}>

        {/* Header */}
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
              onClick={startTour}
              title="Take the tour"
              style={{
                background: "none", border: "0.5px solid #e5e5e5",
                borderRadius: "8px", padding: "4px 10px",
                fontSize: "12px", color: "#8e8ea0", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              ? Tour
            </button>

            <div id="tour-status" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px",
              color: online ? "#0f6e56" : "#dc2626" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%",
                background: online ? "#1d9e75" : "#ef4444" }} />
              {online ? "Connected" : "Offline"}
            </div>
          </div>
        </header>

        {/* Messages */}
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
            <Message key={msg.id} msg={msg} onFeedback={handleFeedback} />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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