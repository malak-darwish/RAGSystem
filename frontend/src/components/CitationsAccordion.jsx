import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

export default function CitationsAccordion({ sources, activeCitations = [], highlightedIndex = null }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const cited   = sources.filter(s => activeCitations.includes(s.index));
  const uncited = sources.filter(s => !activeCitations.includes(s.index));

  // Auto-open when user clicks a superscript
  const effectiveOpen = open || highlightedIndex !== null;

  return (
    <div style={{ marginTop: "10px", borderTop: "1px solid #e1f5ee", paddingTop: "8px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "#0f6e56", fontSize: "12px", fontWeight: 500,
          padding: "2px 0", fontFamily: "'Inter', sans-serif",
        }}
      >
        <BookOpen size={13} />
        {cited.length} source{cited.length !== 1 ? "s" : ""} cited
        {effectiveOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {effectiveOpen && (
        <div style={{ marginTop: "10px" }}>
          {cited.length > 0 && (
            <div style={{ marginBottom: uncited.length > 0 ? "12px" : 0 }}>
              <div style={{
                fontSize: "11px", fontWeight: 600, color: "#9fe1cb",
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px",
              }}>
                Cited in response
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {cited.map(s => (
                  <SourceRow key={s.index} source={s} highlighted={highlightedIndex === s.index} />
                ))}
              </div>
            </div>
          )}

          {uncited.length > 0 && (
            <div>
              <div style={{
                fontSize: "11px", fontWeight: 600, color: "#9fe1cb",
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px",
              }}>
                Also retrieved
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {uncited.map(s => (
                  <SourceRow key={s.index} source={s} highlighted={highlightedIndex === s.index} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceRow({ source, highlighted = false }) {
  return (
    <div style={{
      background: highlighted ? "#f0faf6" : "#fafafa",
      border: `1px solid ${highlighted ? "#0f6e56" : "#e8e8e8"}`,
      borderRadius: "8px",
      padding: "9px 12px",
      transition: "border-color 0.2s, background 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
        <span style={{
          background: highlighted ? "#0f6e56" : "#ccc",
          color: "#fff", borderRadius: "4px",
          padding: "1px 6px", fontSize: "11px", fontWeight: 700,
          transition: "background 0.2s",
        }}>
          [{source.index}]
        </span>
        <span style={{ fontWeight: 600, fontSize: "12px", color: highlighted ? "#085041" : "#555" }}>
          {source.title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "12px", color: "#444", lineHeight: "1.5" }}>
        {source.text?.slice(0, 300)}{source.text?.length > 300 ? "…" : ""}
      </p>
    </div>
  );
}