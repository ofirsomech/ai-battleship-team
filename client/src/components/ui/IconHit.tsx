// ============================================================
// IconHit.tsx — Radar-green "V" with sonar ping for hit cells
// Per docs/game_spec.md §6: Hit = V on radar-green
// ============================================================

import React from "react";

interface IconHitProps {
  /** Additional Tailwind classes */
  className?: string;
}

const IconHit: React.FC<IconHitProps> = ({ className = "" }) => {
  return (
    <span
      className={`inline-flex items-center justify-center w-full h-full font-bold select-none font-['Crimson_Text'] text-[var(--color-radar-green)] ${className}`}
      style={{ textShadow: "0 0 6px var(--color-radar-green-dim)" }}
      aria-label="Hit"
    >
      V
    </span>
  );
};

export default IconHit;
