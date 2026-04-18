"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Toast } from "@/hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          let accent = "";
          let icon = null;
          if (t.type === "success") {
            accent = "border-l-2 border-l-[#4ade80]";
            icon = <CheckCircle2 size={16} className="text-[#4ade80]" />;
          } else if (t.type === "error") {
            accent = "border-l-2 border-l-[#f87171]";
            icon = <XCircle size={16} className="text-[#f87171]" />;
          } else {
            accent = "border-l-2 border-l-[#fbbf24]";
            icon = <AlertTriangle size={16} className="text-[#fbbf24]" />;
          }

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={`bg-[#181c27] border border-[#2a2f45] ${accent} rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px] shadow-lg shadow-black/40 cursor-pointer`}
              onClick={() => onDismiss(t.id)}
            >
              {icon}
              <p className="text-[13px] font-medium text-[#e8eaf0]">{t.msg}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
