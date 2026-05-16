// ============================================================
// Modal.tsx — Dumb overlay modal (no hooks)
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="text-gray-300">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
