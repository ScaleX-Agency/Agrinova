"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToast";
import React from "react";
import QueryProvider from "./QueryProvider";

export const ToastContext = React.createContext<ReturnType<
  typeof useToast
> | null>(null);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toastControls = useToast();

  React.useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{
        msg: string;
        type: "success" | "error" | "warning";
      }>;
      toastControls.toast(customEvent.detail.msg, customEvent.detail.type);
    };
    window.addEventListener("toast", handleToast);
    return () => window.removeEventListener("toast", handleToast);
  }, [toastControls]);

  return (
    <QueryProvider>
      <div className="min-h-screen flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="min-w-0 flex-1 flex flex-col">
          {/* Global Demo Disclaimer Banner */}
          <div className="bg-red-600 text-white px-4 py-1.5 text-center text-xs font-medium select-none flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-red-700 shadow-sm">
            <span className="bg-white text-red-700 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded leading-none">
              Demo Sandbox
            </span>
            <span>
              Disclaimer: This is a public portfolio showcase. Login requirements are bypassed and all data is simulated for demo purposes.
            </span>
          </div>

          <Navbar onToggleSidebar={() => setMobileOpen(true)} />

          <main className="flex-1">
            <div className="px-4 md:px-6 py-6 max-w-screen-2xl mx-auto">
              <ToastContext.Provider value={toastControls}>
                {children}
              </ToastContext.Provider>
            </div>
          </main>

          <Footer />
        </div>
        <ToastContainer
          toasts={toastControls.toasts}
          onDismiss={toastControls.dismiss}
        />
      </div>
    </QueryProvider>
  );
}
