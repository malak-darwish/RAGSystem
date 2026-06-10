import { FileText } from "lucide-react";

export default function SourceBadge({ source }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: "#e1f5ee", border: "1px solid #9fe1cb",
      borderRadius: "6px", padding: "3px 9px", fontSize: "12px",
      color: "#085041", fontFamily: "'Inter', monospace",
    }}>
      <FileText size={11} />
      <span style={{ fontWeight: 500 }}>{source.title}</span>
      <span style={{ color: "#9fe1cb" }}>·</span>
      <span style={{ color: "#5dcaa5" }}>{source.chunk}</span>
      <span style={{
        background: "#0f6e56", color: "#fff",
        borderRadius: "4px", padding: "0 5px", fontSize: "11px", fontWeight: 500,
      }}>{Math.round(source.score * 100)}%</span>
    </div>
  );
}