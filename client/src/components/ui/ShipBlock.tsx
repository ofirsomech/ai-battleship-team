// ============================================================
// ShipBlock.tsx — Ship segment block (riveted metal style)
// Used in ShipPalette (draggable) and on the own board (ship display)
// ============================================================

import React from "react";

interface ShipBlockProps {
  /** Whether this block has been hit */
  isHit?: boolean;
  /** Whether the ship this block belongs to is sunk */
  isSunk?: boolean;
  /** Block size variant */
  size?: "sm" | "md";
  /** Additional Tailwind classes */
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
};

const ShipBlock: React.FC<ShipBlockProps> = ({
  isHit = false,
  isSunk = false,
  size = "md",
  className = "",
}) => {
  let colorClasses = "border-[var(--color-sonar-blue-dim)] bg-gradient-to-br from-[#1a3a5c] to-[#0f2a44]";

  if (isSunk) {
    colorClasses = "border-[var(--color-brass)] bg-gradient-to-br from-[#2a1a0a] to-[#1a1005] animate-sunk-brass";
  } else if (isHit) {
    colorClasses = "border-[var(--color-radar-green)] bg-gradient-to-br from-[#2a4a1a] to-[#1a2a0a] animate-sonar-ping";
  }

  return (
    <div
      className={`border rounded-sm ${sizeClasses[size]} ${colorClasses} ${className}`}
      aria-label={
        isSunk ? "Sunk ship segment" : isHit ? "Hit ship segment" : "Ship segment"
      }
    />
  );
};

export default ShipBlock;
