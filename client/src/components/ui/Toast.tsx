// ============================================================
// Toast.tsx — Dumb notification toast (no hooks)
// Variants: error | success | info
// ============================================================

import React from "react";

interface ToastProps {
  /** The message to display */
  message: string;
  /** Visual variant */
  variant: "error" | "success" | "info";
  /** Whether the toast is visible */
  visible: boolean;
  /** Optional dismiss handler */
  onDismiss?: () => void;
}

const variantClasses: Record<string, string> = {
  error: "bg-red-900 border-red-600 text-red-200",
  success: "bg-green-900 border-green-600 text-green-200",
  info: "bg-blue-900 border-blue-600 text-blue-200",
};

const Toast: React.FC<ToastProps> = ({
  message,
  variant,
  visible,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-40 max-w-sm rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${variantClasses[variant]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm flex-1">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current opacity-60 hover:opacity-100 text-lg leading-none transition-opacity"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
