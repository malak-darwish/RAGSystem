import { useState } from "react";
import { FileText } from "lucide-react";

export default function SourceBadge({ source, highlighted = false }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {/* Badge */}
      <div
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: highlighted ? "#0f6e56" : "#e1f5ee",
          border: `1px solid ${highlighted ? "#085041" : "#9fe1cb"}`,
          borderRadius: "6px",
          padding: "3px 9px",
          fontSize: "12px",
          color: highlighted ? "#fff" : "#085041",
          fontFamily: "'Inter', monospace",
          cursor: "default",
          transition: "all 0.15s ease",
          userSelect: "none",
        }}
      >
        <FileText size={11} />
        <span style={{
          background: highlighted ? "rgba(255,255,255,0.25)" : "#0f6e56",
          color: "#fff",
          borderRadius: "4px",
          padding: "0 5px",
          fontSize: "11px",
          fontWeight: 600,
          minWidth: "18px",
          textAlign: "center",
        }}>
          {source.index}
        </span>
        <span style={{ fontWeight: 500 }}>{source.title}</span>
      </div>

      {/* Tooltip */}
      {tooltipVisible && source.text && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          zIndex: 50,
          background: "#1a1a1a",
          color: "#f0f0f0",
          borderRadius: "8px",
          padding: "10px 13px",
          fontSize: "12px",
          lineHeight: "1.6",
          maxWidth: "320px",
          minWidth: "220px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          pointerEvents: "none",
          whiteSpace: "normal",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "5px", color: "#5dcaa5" }}>
            [{source.index}] {source.title}
          </div>
          <div style={{ opacity: 0.85 }}>
            {source.text?.slice(0, 260)}{source.text?.length > 260 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}