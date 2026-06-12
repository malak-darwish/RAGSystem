import { useState, useEffect } from "react";
import { Bot, User, ThumbsUp, ThumbsDown, RefreshCw, ChevronLeft, ChevronRight, Copy, Check, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CitationsAccordion from "./CitationsAccordion";
import FeedbackModal from "./FeedbackModal";
import { parseCitations, extractCitedIndices } from "../utils/parseCitations";

export default function Message({ msg, onFeedback, onRegenerate, onReask, searchQuery, isCurrentMatch, setRef }) {
  const isUser = msg.role === "user";
  const [hovered, setHovered] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState(null);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const versions = msg.versions || null;

  useEffect(() => {
    if (versions && versions.length > 0) {
      setCurrentVersionIdx(versions.length - 1);
    }
  }, [versions?.length]);

  const displayedText = versions?.[currentVersionIdx]?.content ?? msg.text;
  const displayedSources = versions?.[currentVersionIdx]?.sources ?? msg.sources;

  const handleVersionNav = (dir) => {
    if (!versions) return;
    const newIdx = currentVersionIdx + dir;
    if (newIdx < 0 || newIdx >= versions.length) return;
    setCurrentVersionIdx(newIdx);
    setHighlightedCitation(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCitations = displayedSources?.length
    ? extractCitedIndices(displayedText)
    : [];

  function handleThumbsUp() {
    onFeedback(msg.id, "up", null);
  }

  function handleThumbsDown() {
    if (msg.feedback === "down") {
      onFeedback(msg.id, "down", null);
      return;
    }
    setShowFeedbackModal(true);
  }

  function handleModalSubmit(reason) {
    setShowFeedbackModal(false);
    onFeedback(msg.id, "down", reason);
  }

  function highlightText(text, query) {
    if (!query?.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ background: "#fef08a", borderRadius: "2px", padding: "0 1px" }}>{part}</mark>
        : part
    );
  }

  const isMatch = searchQuery?.trim()
    ? [msg.text, displayedText].some(t => t?.toLowerCase().includes(searchQuery.toLowerCase()))
    : false;

  function renderContent(text) {
    if (!text) return null;
    const segments = parseCitations(text);

    return segments.map((seg, i) => {
      if (seg.type === "text") {
        return (
          <ReactMarkdown
            key={i}
            components={{
              p: ({ children }) => <span style={{ display: "inline" }}>{children}</span>,
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
          >
            {seg.content}
          </ReactMarkdown>
        );
      }

      const source = displayedSources?.find(s => s.index === seg.index);
      const isActive = activeCitations.includes(seg.index);
      const isHighlighted = highlightedCitation === seg.index;

      return (
        <span key={i} style={{ position: "relative", display: "inline" }}>
          <sup
            onClick={() => setHighlightedCitation(isHighlighted ? null : seg.index)}
            onMouseEnter={e => { const tt = e.currentTarget.nextSibling; if (tt) tt.style.display = "block"; }}
            onMouseLeave={e => { const tt = e.currentTarget.nextSibling; if (tt) tt.style.display = "none"; }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: isHighlighted ? "#085041" : "#0f6e56",
              color: "#fff", borderRadius: "4px", padding: "0 5px",
              fontSize: "10px", fontWeight: 700, cursor: "pointer",
              margin: "0 2px", lineHeight: "1.6", userSelect: "none",
              transition: "background 0.15s", opacity: isActive ? 1 : 0.45,
              verticalAlign: "super",
            }}
          >
            {seg.index}
          </sup>
          {source && (
            <span style={{
              display: "none", position: "absolute",
              bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
              zIndex: 50, background: "#1a1a1a", color: "#f0f0f0",
              borderRadius: "8px", padding: "10px 13px", fontSize: "12px",
              lineHeight: "1.6", maxWidth: "300px", minWidth: "200px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)", pointerEvents: "none", whiteSpace: "normal",
            }}>
              <div style={{ fontWeight: 600, marginBottom: "5px", color: "#5dcaa5" }}>
                [{source.index}] {source.title}
              </div>
              <div style={{ opacity: 0.85 }}>
                {source.text?.slice(0, 220)}{source.text?.length > 220 ? "…" : ""}
              </div>
            </span>
          )}
        </span>
      );
    });
  }

  return (
    <>
      {showFeedbackModal && (
        <FeedbackModal
          onSubmit={handleModalSubmit}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      <div ref={setRef} style={{
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

        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "75%" }}
        >
          <div style={{
            background: isUser ? "#e1f5ee" : "#f7f7f8",
            border: isCurrentMatch && searchQuery
              ? "2px solid #0f6e56"
              : isMatch
                ? "1px solid #fbbf24"
                : `1px solid ${isUser ? "#9fe1cb" : "#e5e5e5"}`,
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            padding: "11px 16px",
            fontSize: "15px", lineHeight: "1.65", color: "#0d0d0d",
            transform: hovered ? "translateY(-1px)" : "translateY(0)",
            transition: "transform 0.15s ease",
          }}>
            {msg.error ? (
              <span style={{ color: "#dc2626" }}>{msg.text}</span>
            ) : isUser ? (
              editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onReask(msg.id, editValue); setEditing(false); }
                      if (e.key === "Escape") setEditing(false);
                    }}
                    style={{
                      width: "100%", background: "#fff", border: "1px solid #9fe1cb",
                      borderRadius: "8px", padding: "8px", fontSize: "14px",
                      lineHeight: "1.5", fontFamily: "'Inter', sans-serif",
                      outline: "none", resize: "none", minHeight: "60px", color: "#0d0d0d",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setEditing(false)}
                      style={{
                        padding: "4px 12px", borderRadius: "7px", border: "1px solid #e5e5e5",
                        background: "transparent", fontSize: "12px", cursor: "pointer", color: "#8e8ea0",
                      }}
                    >Cancel</button>
                    <button
                      onClick={() => { onReask(msg.id, editValue); setEditing(false); }}
                      style={{
                        padding: "4px 12px", borderRadius: "7px", border: "none",
                        background: "#0f6e56", fontSize: "12px", cursor: "pointer", color: "#fff",
                      }}
                    >Send</button>
                  </div>
                </div>
              ) : (
                <span>{searchQuery ? highlightText(msg.text, searchQuery) : msg.text}</span>
              )
            ) : (
              <div className="markdown" style={{ lineHeight: "1.65" }}>
                {msg.regenerating
                  ? <span style={{ color: "#8e8ea0", fontStyle: "italic" }}>Regenerating…</span>
                  : renderContent(displayedText)
                }
              </div>
            )}

            {!isUser && !msg.error && displayedSources?.length > 0 && !msg.regenerating && (
              <CitationsAccordion
                sources={displayedSources}
                activeCitations={activeCitations}
                highlightedIndex={highlightedCitation}
              />
            )}
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

          {isUser && !msg.error && hovered && !editing && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
              <button
                onClick={() => { setEditValue(msg.text); setEditing(true); }}
                title="Edit & resend"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: "transparent", border: "1px solid #e5e5e5",
                  cursor: "pointer",
                }}
              >
                <Pencil size={13} color="#8e8ea0" />
              </button>
            </div>
          )}

          {!isUser && !msg.error && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <button
                onClick={handleThumbsUp}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: msg.feedback === "up" ? "#e1f5ee" : "transparent",
                  border: `1px solid ${msg.feedback === "up" ? "#9fe1cb" : "#e5e5e5"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <ThumbsUp size={13} color={msg.feedback === "up" ? "#0f6e56" : "#8e8ea0"} />
              </button>
              <button
                onClick={handleThumbsDown}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: msg.feedback === "down" ? "#fef2f2" : "transparent",
                  border: `1px solid ${msg.feedback === "down" ? "#fecaca" : "#e5e5e5"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <ThumbsDown size={13} color={msg.feedback === "down" ? "#dc2626" : "#8e8ea0"} />
              </button>
              <button
                onClick={() => onRegenerate(msg.id)}
                disabled={msg.regenerating}
                title="Regenerate response"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: "transparent", border: "1px solid #e5e5e5",
                  cursor: msg.regenerating ? "default" : "pointer",
                  opacity: msg.regenerating ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                <RefreshCw
                  size={13} color="#8e8ea0"
                  style={msg.regenerating ? { animation: "spin 1s linear infinite" } : {}}
                />
              </button>
              <button
                onClick={handleCopy}
                title="Copy message"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "7px",
                  background: "transparent", border: "1px solid #e5e5e5",
                  cursor: "pointer",
                }}
              >
                {copied ? <Check size={14} color="#0f6e56" /> : <Copy size={14} color="#8e8ea0" />}
              </button>

              {versions && versions.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
                  <button
                    onClick={() => handleVersionNav(-1)}
                    disabled={currentVersionIdx === 0}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "22px", height: "22px", borderRadius: "5px",
                      background: "transparent", border: "1px solid #e5e5e5",
                      cursor: currentVersionIdx === 0 ? "default" : "pointer",
                      opacity: currentVersionIdx === 0 ? 0.3 : 1,
                    }}
                  >
                    <ChevronLeft size={12} color="#8e8ea0" />
                  </button>
                  <span style={{ fontSize: "11px", color: "#8e8ea0", minWidth: "32px", textAlign: "center" }}>
                    {currentVersionIdx + 1}/{versions.length}
                  </span>
                  <button
                    onClick={() => handleVersionNav(1)}
                    disabled={currentVersionIdx === versions.length - 1}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "22px", height: "22px", borderRadius: "5px",
                      background: "transparent", border: "1px solid #e5e5e5",
                      cursor: currentVersionIdx === versions.length - 1 ? "default" : "pointer",
                      opacity: currentVersionIdx === versions.length - 1 ? 0.3 : 1,
                    }}
                  >
                    <ChevronRight size={12} color="#8e8ea0" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}