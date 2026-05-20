"use client";

import { useEffect, useState } from "react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import { ClipboardList } from "lucide-react";

type InvoiceDetailsSectionProps = {
  invoiceNo: string;
  invoiceDate: string;
  notes: string;
  invoiceNoError?: string;
  invoiceNoStatus?: string;
  invoiceDateError?: string;
  salesRepError?: string;
  customerError?: string;
  locationError?: string;
  repId: number | null;
  customerId: number | null;
  locationId: number | null;
  salesRepSelectOptions: SearchableSelectOption[];
  customerSelectOptions: SearchableSelectOption[];
  inventoryLocationSelectOptions: SearchableSelectOption[];
  salesRepLoading: boolean;
  customersLoading: boolean;
  locationsLoading: boolean;
  hasRepSelected: boolean;
  onInvoiceNoChange: (value: string) => void;
  onInvoiceDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRepChange: (value: number | null) => void;
  onCustomerChange: (value: number | null) => void;
  onLocationChange: (value: number | null) => void;
};

const InvoiceDetailsSection = ({
  invoiceNo,
  invoiceDate,
  notes,
  invoiceNoError,
  invoiceNoStatus,
  invoiceDateError,
  salesRepError,
  customerError,
  locationError,
  repId,
  customerId,
  locationId,
  salesRepSelectOptions,
  customerSelectOptions,
  inventoryLocationSelectOptions,
  salesRepLoading,
  customersLoading,
  locationsLoading,
  hasRepSelected,
  onInvoiceNoChange,
  onInvoiceDateChange,
  onNotesChange,
  onRepChange,
  onCustomerChange,
  onLocationChange,
}: InvoiceDetailsSectionProps) => {
  const [invoiceNoDraft, setInvoiceNoDraft] = useState(invoiceNo);
  const [isInvoiceNoFocused, setIsInvoiceNoFocused] = useState(false);

  useEffect(() => {
    if (!isInvoiceNoFocused) {
      setInvoiceNoDraft(invoiceNo);
    }
  }, [invoiceNo, isInvoiceNoFocused]);

  const editableInputClassName =
    "rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] outline-none focus:border-[#1a5c2e]";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700">
          <ClipboardList size={16} />
        </span>
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
          Invoice Details
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Invoice No.</span>
          <input
            type="text"
            placeholder="fill"
            value={invoiceNoDraft}
            onFocus={() => setIsInvoiceNoFocused(true)}
            onBlur={() => setIsInvoiceNoFocused(false)}
            onChange={(event) => {
              const next = event.target.value;
              setInvoiceNoDraft(next);
              onInvoiceNoChange(next);
            }}
            className={editableInputClassName}
          />
          {invoiceNoError && <p className="text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{invoiceNoError}</p>}
          {!invoiceNoError && invoiceNoStatus && (
            <p className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">{invoiceNoStatus}</p>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Date</span>
          <input
            type="date"
            value={invoiceDate}
            onChange={(event) => onInvoiceDateChange(event.target.value)}
            className={editableInputClassName}
          />
          {invoiceDateError && <p className="text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{invoiceDateError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Sales Rep</span>
          <SearchableSelect
            value={repId}
            onChange={onRepChange}
            options={salesRepSelectOptions}
            placeholder={salesRepLoading ? "Loading sales reps..." : "Select sales rep"}
            searchPlaceholder="Search sales reps"
            loading={salesRepLoading}
          />
          {salesRepError && <p className="text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{salesRepError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Customer</span>
          <SearchableSelect
            value={customerId}
            onChange={onCustomerChange}
            options={customerSelectOptions}
            placeholder={
              hasRepSelected
                ? customersLoading
                  ? "Loading customers..."
                  : "Select customer"
                : "Select sales rep first"
            }
            searchPlaceholder="Search customers"
            emptyMessage={hasRepSelected ? "No customers found for this sales rep." : "Select a sales rep first."}
            disabled={!hasRepSelected}
            loading={customersLoading}
          />
          {customerError && <p className="text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{customerError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Inventory Location</span>
          <SearchableSelect
            value={locationId}
            onChange={onLocationChange}
            options={inventoryLocationSelectOptions}
            placeholder={locationsLoading ? "Loading locations..." : "Select location"}
            searchPlaceholder="Search locations"
            loading={locationsLoading}
          />
          {locationError && <p className="text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{locationError}</p>}
        </label>

        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">Notes</span>
          <input
            type="text"
            placeholder="Optional notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className={editableInputClassName}
          />
        </label>
      </div>
    </section>
  );
};

export default InvoiceDetailsSection;
