"use client";

import { useEffect, useState } from "react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";

type StockEntryDetailsSectionProps = {
  entryType: "LOCAL_PURCHASE" | "FOREIGN_IMPORT";
  date: string;
  grnNumber: string;
  reference: string;
  locationId: number | null;
  locationOptions: SearchableSelectOption[];
  dateError?: string;
  locationError?: string;
  locationsLoading: boolean;
  onEntryTypeChange: (value: "LOCAL_PURCHASE" | "FOREIGN_IMPORT") => void;
  onDateChange: (value: string) => void;
  onGrnNumberChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onLocationChange: (value: number) => void;
  grnNumberError?: string;
};


const StockEntryDetailsSection = ({
  entryType,
  date,
  grnNumber,
  reference,
  locationId,
  locationOptions,
  dateError,
  locationError,
  locationsLoading,
  onEntryTypeChange,
  onDateChange,
  onGrnNumberChange,
  onReferenceChange,
  onLocationChange,
  grnNumberError,
}: StockEntryDetailsSectionProps) => {
  const [grnNumberDraft, setGrnNumberDraft] = useState(grnNumber);
  const [isGrnFocused, setIsGrnFocused] = useState(false);

  useEffect(() => {
    if (!isGrnFocused) {
      setGrnNumberDraft(grnNumber);
    }
  }, [grnNumber, isGrnFocused]);

  const editableInputClassName =
    "rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
        Entry Details
      </h2>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-stone-600">Entry Type *</span>
            <div className="flex gap-2">
              <button
                onClick={() => onEntryTypeChange("LOCAL_PURCHASE")}
                className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                  entryType === "LOCAL_PURCHASE"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}
              >
                Local Purchase
              </button>
              <button
                onClick={() => onEntryTypeChange("FOREIGN_IMPORT")}
                className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                  entryType === "FOREIGN_IMPORT"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}
              >
                Foreign Import
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-stone-600">Date *</span>
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className={editableInputClassName}
            />
            {dateError && <p className="text-[12px] text-red-700">{dateError}</p>}
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-stone-600">GRN Number *</span>
            <input
              type="text"
              value={grnNumberDraft}
              onFocus={() => setIsGrnFocused(true)}
              onBlur={() => setIsGrnFocused(false)}
              onChange={(event) => {
                const next = event.target.value;
                setGrnNumberDraft(next);
                onGrnNumberChange(next);
              }}
              className={editableInputClassName}
              placeholder="e.g., GRN-202604-001"
            />
            {grnNumberError && <p className="text-[12px] text-red-700">{grnNumberError}</p>}
            {!grnNumberError && <p className="text-[11px] text-stone-500">Enter a unique GRN number for this entry.</p>}
          </label>


          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-stone-600">Reference No.</span>
            <input
              type="text"
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              className={editableInputClassName}
              placeholder="Optional reference number"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-stone-600">Location *</span>
            <SearchableSelect
              value={locationId}
              onChange={onLocationChange}
              options={locationOptions}
              placeholder={locationsLoading ? "Loading locations..." : "Select location"}
              searchPlaceholder="Search locations"
              loading={locationsLoading}
            />
            {locationError && <p className="text-[12px] text-red-700">{locationError}</p>}
          </label>
        </div>
      </div>
    </section>
  );
};

export default StockEntryDetailsSection;
