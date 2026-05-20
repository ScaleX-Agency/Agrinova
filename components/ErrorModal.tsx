"use client";

import { AlertCircle, X } from "lucide-react";

type ErrorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
};

export default function ErrorModal({
  isOpen,
  onClose,
  title = "An Error Occurred",
  message,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 [font-family:var(--font-dmsans)]">
      <div 
        className="w-full max-w-[400px] overflow-hidden rounded-[13px] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={20} />
            </div>
            <div className="pt-1">
              <h3 className="text-[16px] font-semibold text-stone-900 leading-tight">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 -mr-1.5 -mt-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="px-5 pb-6 pl-14 text-[13px] text-stone-600 leading-relaxed">
          {message || "An unknown error has occurred. Please try again."}
        </div>

        <div className="flex items-center justify-end bg-stone-50 border-t border-stone-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] bg-white border border-stone-200 px-5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
