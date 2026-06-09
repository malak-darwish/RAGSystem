import { Bot } from "lucide-react";

const STARTER_QUESTIONS = [
  "What are the CIS Critical Security Controls?",
  "How should administrator accounts be managed?",
  "What does CIS say about data recovery?",
  "How does CIS define asset inventory?",
];

export default function EmptyState({ onSelect }) {
  return (
    <div style={{ textAlign: "center", marginTop: "60px" }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px",
        background: "#e1f5ee", border: "1px solid #9fe1cb",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Bot size={24} color="#0f6e56" />
      </div>
      <p style={{ fontSize: "17px", fontWeight: 600, color: "#0d0d0d", marginBottom: "6px" }}>
        Ask anything related to CIS Controls!
      </p>
      <p style={{ fontSize: "14px", color: "#8e8ea0", marginBottom: "28px" }}>
        Answers are grounded in your indexed knowledge base
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
        {STARTER_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            style={{
              background: "#fff", border: "1px solid #e5e5e5",
              borderRadius: "10px", padding: "10px 18px",
              fontSize: "13px", color: "#0d0d0d", cursor: "pointer",
              transition: "all 0.15s", maxWidth: "380px", width: "100%",
              textAlign: "left", fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#9fe1cb";
              e.currentTarget.style.background = "#e1f5ee";
              e.currentTarget.style.color = "#085041";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#e5e5e5";
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#0d0d0d";
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}