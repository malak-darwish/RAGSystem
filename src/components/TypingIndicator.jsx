import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "2px 0" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: "#f7f7f8", border: "1px solid #e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Bot size={15} color="#0f6e56" />
      </div>
      <div style={{
        background: "#f7f7f8", border: "1px solid #e5e5e5",
        borderRadius: "4px 18px 18px 18px",
        padding: "14px 18px", display: "flex", alignItems: "center", gap: "5px",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: "7px", height: "7px", borderRadius: "50%", background: "#9fe1cb",
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}