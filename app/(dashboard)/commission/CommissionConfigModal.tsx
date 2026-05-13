"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Settings, Loader2 } from "lucide-react";
import type { CommissionConfigResponse } from "@/types/api";

type CommissionConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CommissionConfigModal({ isOpen, onClose }: CommissionConfigModalProps) {
  const queryClient = useQueryClient();

  const [sameDayRate, setSameDayRate] = useState<string>("");
  const [rangeMinDays, setRangeMinDays] = useState<string>("");
  const [rangeMaxDays, setRangeMaxDays] = useState<string>("");
  const [rangeRate, setRangeRate] = useState<string>("");
  const [overRangeRate, setOverRangeRate] = useState<string>("");

  const configQuery = useQuery({
    queryKey: ["commission-config"],
    queryFn: async () => {
      const response = await fetch("/api/commission/config");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load config");
      return data as CommissionConfigResponse;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (configQuery.data?.data) {
      const c = configQuery.data.data;
      setSameDayRate(c.sameDayRate.toString());
      setRangeMinDays(c.rangeMinDays.toString());
      setRangeMaxDays(c.rangeMaxDays.toString());
      setRangeRate(c.rangeRate.toString());
      setOverRangeRate(c.overRangeRate.toString());
    }
  }, [configQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/commission/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sameDayRate: Number(sameDayRate),
          rangeMinDays: Number(rangeMinDays),
          rangeMaxDays: Number(rangeMaxDays),
          rangeRate: Number(rangeRate),
          overRangeRate: Number(overRangeRate),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to update config");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-config"] });
      queryClient.invalidateQueries({ queryKey: ["commission-dashboard"] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-[13px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Settings size={15} className="text-emerald-700" />
            </div>
            <h2 className="text-[16px] font-semibold text-stone-900 font-display">Commission Configuration</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-md hover:bg-stone-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {configQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-stone-400" size={24} />
            </div>
          ) : configQuery.isError ? (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              Failed to load configuration.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-[12px] font-semibold text-stone-900 uppercase tracking-wider">Same Day Collection</h3>
                <label className="block">
                  <span className="block text-[13px] text-stone-600 mb-1">Commission Rate (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={sameDayRate}
                    onChange={(e) => setSameDayRate(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </label>
              </div>

              <div className="w-full h-px bg-stone-100 my-4" />

              <div className="space-y-3">
                <h3 className="text-[12px] font-semibold text-stone-900 uppercase tracking-wider">Range Collection</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[13px] text-stone-600 mb-1">Min Days</span>
                    <input
                      type="number"
                      value={rangeMinDays}
                      onChange={(e) => setRangeMinDays(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[13px] text-stone-600 mb-1">Max Days</span>
                    <input
                      type="number"
                      value={rangeMaxDays}
                      onChange={(e) => setRangeMaxDays(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="block text-[13px] text-stone-600 mb-1">Range Commission Rate (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={rangeRate}
                    onChange={(e) => setRangeRate(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </label>
              </div>

              <div className="w-full h-px bg-stone-100 my-4" />

              <div className="space-y-3">
                <h3 className="text-[12px] font-semibold text-stone-900 uppercase tracking-wider">Overdue Collection</h3>
                <label className="block">
                  <span className="block text-[13px] text-stone-600 mb-1">Over Range Rate (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={overRangeRate}
                    onChange={(e) => setOverRangeRate(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </label>
                <p className="text-[11px] text-stone-500 mt-1">Applies to collections taking more than {rangeMaxDays || 0} days.</p>
              </div>

              {updateMutation.isError && (
                <div className="p-3 bg-red-50 text-red-600 text-[13px] rounded-lg border border-red-100">
                  {updateMutation.error instanceof Error ? updateMutation.error.message : "Failed to save."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || configQuery.isLoading}
            className="px-4 py-2 text-[13px] font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
