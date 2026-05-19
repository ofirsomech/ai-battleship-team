// ============================================================
// IconMiss.tsx — Warm gray "x" with cross-fade for miss cells
// Per docs/game_spec.md §6: Miss = x (warm gray)
// ============================================================

import React from "react";

interface IconMissProps {
  /** Additional Tailwind classes */
  className?: string;
}

const IconMiss: React.FC<IconMissProps> = ({ className = "" }) => {
  return (
    <span
      className={`inline-flex items-center justify-center w-full h-full font-bold select-none font-['DM_Mono'] text-[var(--color-warm-gray)] animate-miss-fade ${className}`}
      aria-label="Miss"
    >
      ✕
    </span>
  );
};

export default IconMiss;
