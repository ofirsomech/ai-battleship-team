// ============================================================
// IconMiss.tsx — Gray "x" icon for miss cells
// Per docs/game_spec.md §6: Miss = x (gray)
// ============================================================

import React from "react";

interface IconMissProps {
  /** Additional Tailwind classes */
  className?: string;
}

const IconMiss: React.FC<IconMissProps> = ({ className = "" }) => {
  return (
    <span
      className={`inline-flex items-center justify-center w-full h-full text-gray-400 font-bold select-none ${className}`}
      aria-label="Miss"
    >
      x
    </span>
  );
};

export default IconMiss;
