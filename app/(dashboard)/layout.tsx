// app/(dashboard)/layout.tsx

import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import "../globals.css";
import AppShell from "@/components/AppShell";
import QueryProvider from "@/components/QueryProvider";
import Providers from "@/app/providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dmsans",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Agrinova IMS", template: "%s — Agrinova IMS" },
  description:
    "Agrinova Inventory Management System — Your Partner in Lifesciences",
  icons: {
    icon: "/agrinova-logo.jpeg",
    shortcut: "/agrinova-logo.jpeg",
    apple: "/agrinova-logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="h-full bg-stone-50 text-stone-900 [font-family:var(--font-dmsans)]">
        <QueryProvider>
          <ClerkProvider>
            <Providers>
              <AppShell>
                <Suspense fallback={<PageContentSkeleton />}>
                  {children}
                </Suspense>
              </AppShell>
            </Providers>
          </ClerkProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

function PageContentSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Sk className="h-3 w-16 rounded" />
        <Sk className="h-7 w-48 rounded-lg" />
        <Sk className="h-3.5 w-72 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start h-[88px]"
          >
            <Sk className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Sk className="h-2.5 w-16 rounded" />
              <Sk className="h-6 w-10 rounded" />
              <Sk className="h-4 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <Sk className="h-4 w-24 rounded" />
          <Sk className="h-5 w-14 rounded-full" />
        </div>
        <div className="p-5 space-y-3">
          {[95, 75, 88, 60, 80, 70, 85, 55].map((w, i) => (
            <Sk
              key={i}
              className="h-10 rounded-lg"
              style={{ width: `${w}%` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Sk({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-stone-100 overflow-hidden relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent ${className}`}
    />
  );
}
