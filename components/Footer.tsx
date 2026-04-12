"use client";

import { motion } from "framer-motion";
import { Leaf, Wifi } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="border-t border-stone-200 bg-white px-6 py-3"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-green-50 border border-green-100 flex items-center justify-center">
            <Leaf size={11} className="text-green-700" />
          </div>
          <p className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
            © {year}{" "}
            <span className="font-semibold text-stone-700 [font-family:var(--font-playfair)]">
              Agrinova
            </span>{" "}
            — Your Partner in Lifesciences
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            <Wifi size={12} className="text-green-600" />
            <span>All systems operational</span>
          </div>
          <div className="h-3 w-px bg-stone-200" />
          <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)] font-mono">
            v1.0.0
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
