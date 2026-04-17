"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-w-0 flex-1 flex flex-col">
        <Navbar onToggleSidebar={() => setMobileOpen(true)} />

        <main className="flex-1">
          <div className="px-4 md:px-6 py-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
