"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
};

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 [font-family:var(--font-dmsans)]">
      <div 
        className="w-full max-w-[420px] overflow-hidden rounded-[13px] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div className="pt-1">
              <h3 className="text-[16px] font-semibold text-stone-900 leading-tight">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 -mr-1.5 -mt-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50 transition"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="px-5 pb-5 pl-14 text-[13px] text-stone-600 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-2 bg-stone-50 border-t border-stone-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-[9px] px-4 py-2 text-[13px] font-semibold text-stone-600 hover:bg-stone-200 disabled:opacity-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-[9px] bg-[#1a5c2e] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42] disabled:opacity-70 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
