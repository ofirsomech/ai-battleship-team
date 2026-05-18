// ============================================================
// IconHit.tsx — Red "V" icon with pulse animation for hit cells
// Per docs/game_spec.md §6: Hit = V on red background
// ============================================================

import React from "react";

interface IconHitProps {
  /** Additional Tailwind classes */
  className?: string;
}

const IconHit: React.FC<IconHitProps> = ({ className = "" }) => {
  return (
    <span
      className={`inline-flex items-center justify-center w-full h-full font-bold text-white select-none ${className}`}
      aria-label="Hit"
    >
      <span className="animate-pulse-hit">V</span>
    </span>
  );
};

export default IconHit;
