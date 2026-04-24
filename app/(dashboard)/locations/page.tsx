"use client";

import { useState } from "react";
import { Plus, Search, MapPin, Edit, Trash2 } from "lucide-react";
import { useLocations, useDeleteLocation, LocationData } from "@/hooks/useLocations";
import AddLocationModal from "./AddLocationModal";
import EditLocationModal from "./EditLocationModal";
import { AnimatePresence } from "framer-motion";
import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";

export default function LocationsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const { data: response, isLoading } = useLocations(undefined, page, pageSize, search);
  const locations = response?.items || response?.data || [];
  const pagination = response?.pagination;

  const { mutateAsync: deleteLocation } = useDeleteLocation();

  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);

  const filteredLocations = locations;

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this location? It might be soft-deleted if records are tied to it.")) {
      await deleteLocation(id);
    }
  };

  return (
    <div className="space-y-6">
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
          <Plus size={16} />
          <span>Add Location</span>
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
            <input
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [font-family:var(--font-dmsans)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-stone-500 [font-family:var(--font-dmsans)]">Code</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-stone-500 [font-family:var(--font-dmsans)]">Name</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-stone-500 [font-family:var(--font-dmsans)]">Status</th>
                <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-stone-500 [font-family:var(--font-dmsans)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-stone-400 text-[13px] [font-family:var(--font-dmsans)]">
                    Loading locations...
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-stone-400 [font-family:var(--font-dmsans)]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                        <MapPin size={24} className="text-stone-300" />
                      </div>
                      <p className="text-[14px] font-medium text-stone-600">No locations found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc: LocationData) => (
                  <tr key={loc.location_id} className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors last:border-0">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-medium bg-stone-100 text-stone-700 [font-family:var(--font-jetbrains)] border border-stone-200">
                        {loc.code}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13.5px] font-medium text-stone-800 [font-family:var(--font-dmsans)]">{loc.name}</p>
                      {loc.address && <p className="text-[12px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">{loc.address}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${
                        loc.status === "ACTIVE" ? "bg-green-50 text-green-700 border border-green-100" : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}>
                        {loc.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingLocation(loc)}
                          className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.location_id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          {pagination && pagination.total > 0 && (
            <Pagination
              current={page}
              total={pagination.total}
              pageSize={pageSize}
              onChange={(p) => setPage(p)}
              className="text-[13px] [font-family:var(--font-dmsans)]"
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && <AddLocationModal onClose={() => setShowAddModal(false)} />}
        {editingLocation && <EditLocationModal location={editingLocation} onClose={() => setEditingLocation(null)} />}
      </AnimatePresence>
    </div>
  );
}
