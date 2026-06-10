import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function useTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "black",
      overlayOpacity: 0.5,
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: "rag-tour-popover",
      nextBtnText: "Next →",
      prevBtnText: "← Prev",
      doneBtnText: "Done ✓",
      steps: [
        {
          element: "#tour-header",
          popover: {
            title: "Welcome to RAG Chat",
            description: "Ask anything about CIS Controls. Answers are pulled directly from your document library.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-new-chat",
          popover: {
            title: "Start a new chat",
            description: "Click here to begin a fresh conversation. Each chat is saved automatically.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-threads",
          popover: {
            title: "Chat history",
            description: "All your past conversations appear here. Click any thread to resume it from where you left off.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-input",
          popover: {
            title: "Ask a question",
            description: "Type your question here and press Enter. Try asking about a specific CIS Control or safeguard.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-status",
          popover: {
            title: "Backend status",
            description: "Green means the backend is connected and ready. Red means the server is unreachable.",
            side: "bottom",
            align: "end",
          },
        },
      ],
    });

    driverObj.drive();
  };

  return { startTour };
}