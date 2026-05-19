// ============================================================
// Toast.tsx — Notification toast with naval theme (no hooks)
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
  error: "toast-error",
  success: "toast-success",
  info: "toast-info",
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
      className={`fixed top-4 right-4 z-40 max-w-sm border px-4 py-3 shadow-lg transition-all duration-300 font-['Crimson_Text'] ${variantClasses[variant]}`}
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
