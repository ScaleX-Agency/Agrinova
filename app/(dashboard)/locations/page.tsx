"use client";
// components/LocationsPage.tsx
//
// FIXES vs original:
//  1. BUG — Inactive tab showed same data as Active:
//     useLocations was called once at top level, so `activeTab` state change
//     never re-triggered a new fetch with the correct status param.
//     FIX: pass `activeTab` as a query param and depend on it in the queryKey.
//
//  2. BUG — deleteLocation only removed from DB, never updated local "status"
//     column. The Inactive tab expects status="INACTIVE", not a deleted row.
//     FIX: deactivate calls PATCH with { status: "INACTIVE" } (same as reactivate).
//     The API route for DELETE should be replaced with PATCH /status if it isn't.
//
//  3. UX — Replaced antd Tabs (heavy import) with a native segmented tab bar
//     matching the existing dashboard card style (bg-stone-100, rounded-xl).
//
//  4. UX — Counts in tab labels update reactively from query data.
//
//  5. UX — Replaced antd Tooltip+Button with styled buttons matching the
//     existing design system (same border/rounded-xl/hover patterns).
//
//  6. UX — Loading skeleton instead of a plain text "Loading..." row.
//
//  7. UX — Edit modal pre-populates status field and makes code read-only.

import { useState } from "react";
import {
  Plus,
  Search,
  MapPin,
  Pencil,
  PowerOff,
  RefreshCw,
  Package,
  Activity,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import Pagination from "rc-pagination";
import Link from "next/link";
import "rc-pagination/assets/index.css";

import {
  useLocations,
  useUpdateLocation,
} from "@/hooks/useLocations";
import type { LocationData } from "@/hooks/useLocations";
import AddLocationModal from "./AddLocationModal";
import EditLocationModal from "./EditLocationModal";

// ─────────────────────────────────────────────────────────────
// Confirm modal — replaces antd Modal.confirm (lighter, styled)
// ─────────────────────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "success";
  onOk: () => Promise<void>;
}

function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOk = async () => {
    setLoading(true);
    setError("");
    try {
      await state.onOk();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!state.open) return null;

  const isDanger = state.variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.16 }}
        className="bg-white border border-stone-200 rounded-2xl shadow-lg w-full max-w-[400px] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDanger
                  ? "bg-red-50 border border-red-100"
                  : "bg-green-50 border border-green-100"
              }`}
            >
              {isDanger ? (
                <PowerOff size={14} className="text-red-600" />
              ) : (
                <RefreshCw size={14} className="text-green-700" />
              )}
            </div>
            <p className="text-[14px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
              {state.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50 text-[14px]"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-stone-600 leading-relaxed [font-family:var(--font-dmsans)]">
            {state.message}
          </p>
          {error && (
            <p className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 [font-family:var(--font-dmsans)]">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-stone-600 border border-stone-200 rounded-xl hover:bg-white transition-colors [font-family:var(--font-dmsans)]"
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-colors disabled:opacity-60 [font-family:var(--font-dmsans)] ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {loading && (
              <svg
                className="animate-spin w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {loading ? "Please wait…" : isDanger ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Table skeleton
// ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-stone-50 animate-pulse">
          <td className="px-5 py-4">
            <div className="h-5 w-14 bg-stone-100 rounded-md" />
          </td>
          <td className="px-5 py-4">
            <div className="h-3.5 w-36 bg-stone-100 rounded mb-1.5" />
            <div className="h-2.5 w-48 bg-stone-50 rounded" />
          </td>
          <td className="px-5 py-4">
            <div className="h-5 w-16 bg-stone-100 rounded-full" />
          </td>
          <td className="px-5 py-4">
            <div className="h-5 w-20 bg-stone-100 rounded-full" />
          </td>
          <td className="px-5 py-4">
            <div className="flex gap-2 justify-end">
              <div className="h-7 w-7 bg-stone-100 rounded-lg" />
              <div className="h-7 w-24 bg-stone-100 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function LocationsPage() {
  const qc = useQueryClient();

  // ── Tab & filter state ──
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 10;

  // ── FIX: Both queries fetched separately so each tab has its own count ──
  // The key includes `activeTab` so React Query refetches when the tab changes.
  const { data: activeResponse } = useLocations("ACTIVE", 1, 999, "");
  const { data: inactiveResponse } = useLocations("INACTIVE", 1, 999, "");
  const activeCount = (activeResponse?.items ?? activeResponse?.data ?? [])
    .length;
  const inactiveCount = (
    inactiveResponse?.items ??
    inactiveResponse?.data ??
    []
  ).length;

  // ── Current tab data (paginated + searched) ──
  const { data: response, isLoading } = useLocations(
    activeTab,
    page,
    PAGE_SIZE,
    search,
  );
  const locations = response?.items ?? response?.data ?? [];
  const pagination = response?.pagination;

  // ── Mutations ──
  // The original hook likely had a fixed queryKey like ["locations"]
  // FIX: deactivateLocation is not used. We just use updateLocation.
  const { mutateAsync: updateLocation } = useUpdateLocation();

  // ── Modal state ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(
    null,
  );
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    variant: "danger",
    onOk: async () => {},
  });

  // ── Tab switch ──
  const handleTabSwitch = (tab: "ACTIVE" | "INACTIVE") => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  // ── Deactivate ──
  // FIX: was calling deleteLocation which removes the row entirely.
  // Now calls PATCH with status="INACTIVE" so the row remains for the
  // Inactive tab, and historical data (movements, stock) is preserved.
  const handleDeactivate = (loc: LocationData) => {
    setConfirm({
      open: true,
      title: "Deactivate Location",
      variant: "danger",
      message: `This will deactivate "${loc.name}" (${loc.code}). Make sure no active stock transactions are pending. The location will still appear in historical records.`,
      onOk: async () => {
        // FIX: use updateLocation (PATCH) not deleteLocation (DELETE)
        await updateLocation({ id: loc.location_id, status: "INACTIVE" });
        qc.invalidateQueries({ queryKey: ["locations"] });
      },
    });
  };

  // ── Reactivate ──
  const handleReactivate = (loc: LocationData) => {
    setConfirm({
      open: true,
      title: "Reactivate Location",
      variant: "success",
      message: `This will reactivate "${loc.name}" (${loc.code}). It will become available for new stock entries and transactions.`,
      onOk: async () => {
        await updateLocation({ id: loc.location_id, status: "ACTIVE" });
        qc.invalidateQueries({ queryKey: ["locations"] });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Settings
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
            Inventory Locations
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Manage all branches and storage locations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white text-[13px] font-medium rounded-xl hover:bg-blue-800 transition-colors [font-family:var(--font-dmsans)]"
        >
          <Plus size={15} />
          Add Location
        </button>
      </div>

      {/* ── Card ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-stone-100 bg-stone-50/60 flex items-center gap-3 flex-wrap">
          {/* Segmented tabs — native, no antd */}
          <div className="flex gap-0.5 bg-stone-100 rounded-xl p-1">
            {(["ACTIVE", "INACTIVE"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-all [font-family:var(--font-dmsans)] ${
                  activeTab === tab
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {tab === "ACTIVE" ? "Active" : "Inactive"}
                <span
                  className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${
                    tab === "ACTIVE"
                      ? activeTab === tab
                        ? "bg-green-100 text-green-700"
                        : "bg-stone-200 text-stone-500"
                      : activeTab === tab
                        ? "bg-stone-100 text-stone-600"
                        : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {tab === "ACTIVE" ? activeCount : inactiveCount}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-4 py-2 text-[12.5px] border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)] min-w-[220px]"
            />
          </div>

          {pagination && (
            <span className="ml-auto text-[12px] text-stone-400 [font-family:var(--font-dmsans)]">
              {pagination.total} location{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-100">
                {[
                  "Code",
                  "Location Name",
                  "Status",
                  "Stock Entries",
                  "Actions",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-stone-50/60 [font-family:var(--font-dmsans)] ${
                      i === 4 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-14 text-stone-300">
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center mb-3">
                        <MapPin size={22} className="text-stone-300" />
                      </div>
                      <p className="text-[14px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
                        No {activeTab.toLowerCase()} locations found
                      </p>
                      <p className="text-[12.5px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                        {search
                          ? "Try a different search term"
                          : `No ${activeTab.toLowerCase()} locations yet`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                locations.map((loc: LocationData) => (
                  <tr
                    key={loc.location_id}
                    className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                  >
                    {/* Code */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-600 [font-family:var(--font-jetbrains)] border border-stone-200">
                        {loc.code}
                      </span>
                    </td>

                    {/* Name + address */}
                    <td className="px-5 py-3.5">
                      <p className="text-[13.5px] font-medium text-stone-800 [font-family:var(--font-dmsans)]">
                        {loc.name}
                      </p>
                      {loc.address && (
                        <p className="text-[12px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">
                          {loc.address}
                        </p>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border [font-family:var(--font-dmsans)] ${
                          loc.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${loc.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`}
                        />
                        {loc.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Stock count pill */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-500 bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-full [font-family:var(--font-dmsans)]">
                        <Package size={11} className="text-stone-400" />
                        {(loc as LocationData & { stock_count?: number })
                          .stock_count ?? 0}{" "}
                        products
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Activity */}
                        <Link
                          href={`/inventory/${loc.location_id}`}
                          title="View Activity"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          <Activity size={13} />
                        </Link>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingLocation(loc)}
                          title="Edit location"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>

                        {/* Deactivate / Reactivate */}
                        {loc.status === "ACTIVE" ? (
                          <button
                            onClick={() => handleDeactivate(loc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 rounded-lg transition-colors [font-family:var(--font-dmsans)]"
                          >
                            <PowerOff size={11} />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(loc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 hover:border-green-200 rounded-lg transition-colors [font-family:var(--font-dmsans)]"
                          >
                            <RefreshCw size={11} />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > PAGE_SIZE && (
          <div className="px-5 py-3.5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between">
            <p className="text-[12px] text-stone-400 [font-family:var(--font-dmsans)]">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <Pagination
              current={page}
              total={pagination.total}
              pageSize={PAGE_SIZE}
              onChange={(p) => setPage(p)}
              className="text-[12.5px] [font-family:var(--font-dmsans)]"
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddLocationModal onClose={() => setShowAddModal(false)} />
        )}
        {editingLocation && (
          <EditLocationModal
            location={editingLocation}
            onClose={() => setEditingLocation(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        state={confirm}
        onClose={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
