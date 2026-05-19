// ============================================================
// Button.tsx — Riveted metal plate button (no hooks)
// Variants: primary | secondary | danger | success
// ============================================================

import React from "react";

interface ButtonProps {
  /** Visual variant */
  variant?: "primary" | "secondary" | "danger" | "success";
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
    "border-[var(--color-brass)] text-[var(--color-brass)] bg-gradient-to-b from-[#2a2415] to-[#1a180a] hover:border-[var(--color-brass-glow)] hover:text-[var(--color-brass-glow)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_12px_rgba(201,168,76,0.3)]",
  secondary:
    "border-[var(--color-brass-dim)] text-[var(--color-warm-gray-bright)] hover:border-[var(--color-brass)] bg-gradient-to-b from-[#1e293b] to-[#0f172a]",
  danger:
    "border-[var(--color-copper-dim)] text-[var(--color-copper)] hover:border-[var(--color-copper)] bg-gradient-to-b from-[#2a1a15] to-[#1a0f0a] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_12px_rgba(184,115,51,0.25)]",
  success:
    "border-[var(--color-radar-green-dim)] text-[var(--color-radar-green)] hover:border-[var(--color-radar-green)] bg-gradient-to-b from-[#152a15] to-[#0a1a0a] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_12px_rgba(57,255,20,0.2)]",
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
      className={`px-4 py-2 font-['Crimson_Text'] uppercase tracking-[0.1em] font-semibold
                  border-2 bg-gradient-to-b from-[#1e293b] to-[#0f172a]
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]
                  transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(201,168,76,0.2)]
                  active:translate-y-[1px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_1px_2px_rgba(0,0,0,0.5)]
                  ${variantClasses[variant]}
                  ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
