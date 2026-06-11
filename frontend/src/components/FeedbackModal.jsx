import { useState } from "react";
import { X } from "lucide-react";

const REASONS = [
  "Incorrect information",
  "Incomplete answer",
  "Cited wrong sources",
  "Too vague",
  "Not relevant to my question",
  "Other",
];

export default function FeedbackModal({ onSubmit, onClose }) {
  const [selected, setSelected] = useState(null);
  const [other, setOther] = useState("");

  const canSubmit = selected !== null && (selected !== "Other" || other.trim());

  function handleSubmit() {
    if (!canSubmit) return;
    const reason = selected === "Other" ? other.trim() : selected;
    onSubmit(reason);
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "14px",
          padding: "24px", width: "360px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontWeight: 600, fontSize: "15px", color: "#0d0d0d" }}>
            What went wrong?
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8e8ea0", padding: "2px" }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "#8e8ea0", marginBottom: "14px", marginTop: 0 }}>
          Select a reason — this helps improve future responses.
        </p>

        {/* Reason chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              style={{
                textAlign: "left", padding: "9px 13px",
                borderRadius: "8px", fontSize: "13px",
                border: `1.5px solid ${selected === reason ? "#0f6e56" : "#e5e5e5"}`,
                background: selected === reason ? "#f0faf6" : "#fff",
                color: selected === reason ? "#085041" : "#3a3a3a",
                cursor: "pointer", fontWeight: selected === reason ? 500 : 400,
                transition: "all 0.12s",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Other text input */}
        {selected === "Other" && (
          <textarea
            autoFocus
            value={other}
            onChange={e => setOther(e.target.value)}
            placeholder="Describe the issue…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #0f6e56", borderRadius: "8px",
              padding: "9px 12px", fontSize: "13px", resize: "none",
              fontFamily: "'Inter', sans-serif", outline: "none",
              marginBottom: "16px", color: "#0d0d0d",
            }}
          />
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px",
              border: "1px solid #e5e5e5", background: "transparent",
              color: "#8e8ea0", cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px",
              border: "none",
              background: canSubmit ? "#0f6e56" : "#e5e5e5",
              color: canSubmit ? "#fff" : "#a0a0a0",
              cursor: canSubmit ? "pointer" : "default",
              fontWeight: 500, fontFamily: "'Inter', sans-serif",
              transition: "background 0.15s",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}