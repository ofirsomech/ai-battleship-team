// ============================================================
// AIThinkingPanel.tsx — Terminal-style AI reasoning display
// ============================================================

import React, { useEffect, useRef, useState } from "react";

interface AIThinkingPanelProps {
  thinking: string | null;
}

const TYPING_SPEED_MS = 30;

const AIThinkingPanel: React.FC<AIThinkingPanelProps> = ({ thinking }) => {
  const [displayedThinking, setDisplayedThinking] = useState("");
  const charIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const text = thinking || "Analyzing board patterns...";

  useEffect(() => {
    // Reset on new thinking text
    setDisplayedThinking("");
    charIndexRef.current = 0;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      charIndexRef.current += 1;
      setDisplayedThinking(text.slice(0, charIndexRef.current));

      if (charIndexRef.current >= text.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, TYPING_SPEED_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text]);

  return (
    <div className="bg-gray-950 border border-emerald-800 rounded-lg p-3 my-3 max-w-md w-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-emerald-500 text-xs font-mono">▸ AI COMMANDER</span>
        <span className="text-emerald-700 text-xs font-mono animate-pulse">
          {displayedThinking.length < text.length ? "●" : "✓"}
        </span>
      </div>
      <p className="text-emerald-400 text-sm font-mono whitespace-pre-wrap break-words">
        {displayedThinking}
        {displayedThinking.length < text.length && (
          <span className="inline-block w-2 h-4 bg-emerald-500 ml-0.5 animate-pulse align-middle" />
        )}
      </p>
    </div>
  );
};

export default AIThinkingPanel;
