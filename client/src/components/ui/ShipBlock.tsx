// ============================================================
// ShipBlock.tsx — Dumb ship segment block for palette & board
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
  let colorClasses = "bg-blue-600 border-blue-400";

  if (isSunk) {
    colorClasses = "bg-red-900 border-red-500 animate-sunk-reveal";
  } else if (isHit) {
    colorClasses = "bg-red-600 border-red-400";
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
