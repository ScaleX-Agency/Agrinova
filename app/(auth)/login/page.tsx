"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, LayoutDashboard, Database, ShieldAlert } from "lucide-react";

export default function DemoLoginPage() {
  const router = useRouter();

  const handleEnterDemo = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-white border border-[#e4e2db] rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8f5ec] text-[#1a5c2e] mb-2 border border-[#b6d9be]">
            <Database size={28} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-[#2b2d7e] font-serif tracking-tight">
              AGRINOVA
            </h1>
            <span className="rounded bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700 tracking-wider uppercase scale-90">
              Demo
            </span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-stone-500 font-sans">
            Inventory Management System
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-[#eeeffe] border border-[#c0c3f0] rounded-xl p-4 text-[#2b2d7e] text-xs leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[13px]">
            <ShieldAlert size={14} className="text-[#2b2d7e]" />
            <span>Interactive Portfolio Demo</span>
          </div>
          <p>
            Welcome! This is a public demo deployment of the Agrinova IMS tailored for CV/portfolio review. 
            All login constraints, user authentication gates, and administrator authorization walls have been bypassed.
          </p>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={handleEnterDemo}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#1a5c2e] hover:bg-[#2d7a42] text-white font-medium text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          <span>Enter Demo System</span>
          <ArrowRight size={16} />
        </button>

        {/* Features Preview */}
        <div className="border-t border-[#e4e2db] pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-3 text-center">
            Key Modules Enabled
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c2e]" />
              <span>Full Admin Panel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c2e]" />
              <span>Stock Overview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c2e]" />
              <span>Invoices & Receipts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a5c2e]" />
              <span>Commission Calc</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-[#e4e2db] pt-4 text-[10px] text-stone-400 text-center space-y-1">
          <p className="font-semibold text-stone-500">Agrinova — Your Partner in Lifesciences</p>
          <p>205D, Kalapaluwawa Road, Koswatta, Battaramulla</p>
          <p>Tel: 011 207 3603/4 · info.agrinova@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
