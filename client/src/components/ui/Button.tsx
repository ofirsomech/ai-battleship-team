// ============================================================
// Button.tsx — Dumb presentational button (no hooks)
// Variants: primary | secondary | danger
// ============================================================

import React from "react";

interface ButtonProps {
  /** Visual variant */
  variant?: "primary" | "secondary" | "danger";
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional Tailwind classes */
  className?: string;
  /** Button content */
  children: React.ReactNode;
  /** HTML button type */
  type?: "button" | "submit";
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed",
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  disabled = false,
  onClick,
  className = "",
  children,
  type = "button",
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded font-semibold transition-colors duration-150 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
