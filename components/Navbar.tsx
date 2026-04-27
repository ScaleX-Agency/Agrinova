"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Avatar, Skeleton } from "antd";
import { Bell, Search, PanelLeftClose, X, ChevronRight } from "lucide-react";
import { GlobalSearchPalette } from "./GlobalSearch";

// In a real app, these would come from an API or websocket
// eslint-disable-next-line
const notifications: any[] = [];

interface NavbarProps {
  onToggleSidebar?: () => void;
}

interface AccountApiResponse {
  account: {
    role_name: string;
  };
}

function formatRole(roleName: string) {
  return roleName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const { user, isLoaded } = useUser();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    let isCancelled = false;

    const loadRole = async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as AccountApiResponse;
        if (!isCancelled) {
          setRoleName(data.account.role_name);
        }
      } catch {
        // Keep fallback subtitle if role fetch fails
      }
    };

    void loadRole();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user]);

  const userInitial =
    user?.firstName?.charAt(0) ||
    user?.username?.charAt(0).toUpperCase() ||
    "U";
  const userFullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "System User";
  const userSubtitle = roleName ? formatRole(roleName) : "Staff";

  return (
    <>
      <GlobalSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="h-[64px] bg-white/95 backdrop-blur-sm border-b border-stone-200 px-5 md:px-6 flex items-center justify-between sticky top-0 z-30"
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center transition-colors"
          >
            <PanelLeftClose size={17} className="text-stone-600" />
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Search trigger — consistent with other icon buttons */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors group"
          >
            <Search
              size={14}
              className="text-stone-400 group-hover:text-stone-600 transition-colors"
            />
            <span className="text-[13px] text-stone-400 group-hover:text-stone-600 transition-colors [font-family:var(--font-dmsans)] w-[148px] text-left">
              Search…
            </span>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center transition-colors"
          >
            <Search size={16} className="text-stone-600" />
          </button>

          {/* Status pill */}
          <div 
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50"
            title={process.env.NEXT_PUBLIC_GITHUB_SHA ? `Deploy SHA: ${process.env.NEXT_PUBLIC_GITHUB_SHA}` : "Live"}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11.5px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
              {process.env.NEXT_PUBLIC_GITHUB_SHA ? `Live (${process.env.NEXT_PUBLIC_GITHUB_SHA.substring(0, 7)})` : "Live"}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            {/* <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center transition-colors"
              title="Notifications"
            >
              <Badge
                count={notifications.length}
                size="small"
                offset={[2, -2]}
              >
                <Bell size={16} className="text-stone-600" />
              </Badge>
            </button> */}

            <AnimatePresence>
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[320px] bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                      <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                        Notifications
                      </p>
                      <button onClick={() => setNotifOpen(false)}>
                        <X
                          size={14}
                          className="text-stone-400 hover:text-stone-600"
                        />
                      </button>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className="flex gap-3 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-semibold text-stone-800">
                                {n.title}
                              </p>
                              <p className="text-[12px] text-stone-500 truncate mt-0.5">
                                {n.body}
                              </p>
                            </div>
                            <p className="text-[11px] text-stone-400 shrink-0 mt-0.5">
                              {n.time}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-2">
                            <Bell size={18} className="text-stone-300" />
                          </div>
                          <p className="text-[13px] font-medium text-stone-900">
                            All caught up!
                          </p>
                          <p className="text-[11.5px] text-stone-500 mt-1 max-w-[180px]">
                            You don&apos;t have any new notifications at the
                            moment.
                          </p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-stone-100">
                        <button className="w-full flex items-center justify-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 transition-colors py-0.5">
                          View all <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          <Link href="/account" className="flex items-center gap-2 pl-1 group">
            {isLoaded ? (
              <>
                <Avatar
                  size={36}
                  className="!bg-blue-50 !text-blue-800 !text-[14px] !font-semibold"
                >
                  {userInitial}
                </Avatar>
                <div className="hidden md:block leading-tight">
                  <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                    {userFullName}
                  </p>
                  <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {userSubtitle}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Skeleton.Avatar active size={36} shape="circle" />
                <div className="hidden md:block">
                  <Skeleton
                    title={false}
                    paragraph={{ rows: 2, width: [80, 50] }}
                    active
                  />
                </div>
              </div>
            )}
          </Link>
        </div>
      </motion.header>
    </>
  );
}
