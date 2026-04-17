"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Badge, Avatar, Input, Tooltip, Skeleton } from "antd";
import {
  Bell,
  Search,
  Leaf,
  PanelLeftClose,
  X,
  AlertTriangle,
  CheckCircle2,
  Package,
  ChevronRight,
} from "lucide-react";

const { Search: AntSearch } = Input;

const NOTIFICATIONS = [
  {
    id: 1,
    type: "danger",
    icon: <AlertTriangle size={13} />,
    title: "Out of stock",
    body: "Glyphosate 480SL — Nuwara Eliya",
    time: "2m ago",
  },
  {
    id: 2,
    type: "warn",
    icon: <AlertTriangle size={13} />,
    title: "Low stock alert",
    body: "Mancozeb 80WP — Kuliyapitiya",
    time: "18m ago",
  },
  {
    id: 3,
    type: "ok",
    icon: <CheckCircle2 size={13} />,
    title: "Purchase received",
    body: "48 units added — Head Office",
    time: "1h ago",
  },
];

const TYPE_STYLE: Record<string, string> = {
  danger: "bg-red-50 text-red-700 border-red-100",
  warn: "bg-amber-50 text-amber-700 border-amber-100",
  ok: "bg-green-50 text-green-700 border-green-100",
};

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, isLoaded } = useUser();

  const userInitial = user?.firstName?.charAt(0) || user?.username?.charAt(0).toUpperCase() || "U";
  const userFullName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "System User";
  const userSubtitle = user?.username || "Staff";

  return (
    <>
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

          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center overflow-hidden bg-white">
              <img
                src="/agrinova-logo.jpeg"
                alt="Agrinova Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-6 w-px bg-stone-200" />
          </div>

          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-playfair)] leading-none">
              Agrinova IMS
            </h1>
            <p className="text-[11px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)] hidden sm:block">
              Inventory Management System
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="hidden md:block w-[240px]">
            <AntSearch
              placeholder="Search products, locations…"
              allowClear
              prefix={<Search size={13} className="text-stone-400" />}
              className="[&_.ant-input-affix-wrapper]:!rounded-xl [&_.ant-input-affix-wrapper]:!border-stone-200 [&_.ant-input-affix-wrapper]:!shadow-none [&_.ant-input-affix-wrapper]:!bg-stone-50 [&_.ant-input]:!text-[13px] [&_.ant-input]:!bg-stone-50"
            />
          </div>

          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11.5px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
              Live
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Tooltip title="Notifications" placement="bottom">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center transition-colors"
              >
                <Badge
                  count={NOTIFICATIONS.length}
                  size="small"
                  offset={[2, -2]}
                >
                  <Bell size={16} className="text-stone-600" />
                </Badge>
              </button>
            </Tooltip>

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
                      {NOTIFICATIONS.map((n) => (
                        <div
                          key={n.id}
                          className="flex gap-3 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          <div
                            className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${TYPE_STYLE[n.type]}`}
                          >
                            {n.icon}
                          </div>
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
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-stone-100">
                      <button className="w-full flex items-center justify-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 transition-colors py-0.5">
                        View all <ChevronRight size={12} />
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 pl-1 cursor-pointer group">
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
                  <Skeleton title={false} paragraph={{ rows: 2, width: [80, 50] }} active />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
}
