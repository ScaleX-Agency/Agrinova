"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { useCreateLocation } from "@/hooks/useLocations";

export default function AddLocationModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [error, setError] = useState("");

  const { mutateAsync: createLocation, isPending } = useCreateLocation();

  const handleSave = async () => {
    if (!code || !name) {
      setError("Code and Name are required");
      return;
    }
    setError("");
    try {
      await createLocation({ code, name, address, status });
      onClose();
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      setError(err.message || "Failed to create location");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.18 }} className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-[460px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <MapPin size={14} className="text-blue-700" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-none">Add Location</p>
              <p className="text-[11.5px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">Create a new inventory location</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50">
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Location Code</p>
              <input type="text" className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)]" placeholder="e.g. IGRN5" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Status</p>
              <select className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)]" value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Location Name</p>
            <input type="text" className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)]" placeholder="e.g. Colombo Branch" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Address <span className="text-stone-300 normal-case tracking-normal">(Optional)</span></p>
            <textarea className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)] resize-none" placeholder="Location address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-100 bg-stone-50/50">
          <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-[12.5px] font-medium text-stone-600 hover:text-stone-900 transition-colors [font-family:var(--font-dmsans)]">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-[12.5px] font-medium bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors [font-family:var(--font-dmsans)] disabled:opacity-50">
            {isPending ? "Saving..." : "Create Location"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
