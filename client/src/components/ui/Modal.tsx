// ============================================================
// Modal.tsx — Brass-framed overlay modal (no hooks)
// ============================================================

import React from "react";

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Optional close button handler */
  onClose?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.75)_0%,rgba(5,13,26,0.9)_100%)] backdrop-blur-sm">
      <div className="p-8 max-w-md w-full text-center bg-gradient-to-b from-[var(--color-navy-panel)] to-[var(--color-navy-base)]
                      border-[3px] border-[var(--color-brass-dim)]
                      shadow-[0_0_0_2px_var(--color-navy-deep),0_0_0_5px_rgba(201,168,76,0.1),0_0_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)]
                      relative">
        {/* Inner brass line */}
        <div className="absolute inset-2 border border-[rgba(201,168,76,0.08)] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <h2 className="font-['Crimson_Text'] font-bold text-2xl text-[var(--color-brass)] uppercase tracking-[0.15em]"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(201,168,76,0.1)" }}>
            {title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--color-warm-gray)] hover:text-[var(--color-brass)] text-xl leading-none transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="text-[var(--color-warm-gray-bright)] relative">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
