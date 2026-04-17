import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";

type GinDetailsSectionProps = {
  ginNumber: string;
  ginDate: string;
  invoiceId: number | null;
  invoiceCustomerName: string;
  invoiceRepName: string;
  locationId: number | null;
  preparedBy: string;
  receivedBy: string;
  lockInvoiceSelection?: boolean;
  lockLocationSelection?: boolean;
  lockGinDate?: boolean;
  ginNumberError?: string;
  ginDateError?: string;
  invoiceError?: string;
  locationError?: string;
  preparedByError?: string;
  receivedByError?: string;
  invoiceOptions: SearchableSelectOption[];
  locationOptions: SearchableSelectOption[];
  invoicesLoading: boolean;
  locationsLoading: boolean;
  onGinNumberChange: (value: string) => void;
  onGinDateChange: (value: string) => void;
  onInvoiceChange: (value: number | null) => void;
  onLocationChange: (value: number | null) => void;
  onPreparedByChange: (value: string) => void;
  onReceivedByChange: (value: string) => void;
};

const GinDetailsSection = ({
  ginNumber,
  ginDate,
  invoiceId,
  invoiceCustomerName,
  invoiceRepName,
  locationId,
  preparedBy,
  receivedBy,
  lockInvoiceSelection = false,
  lockLocationSelection = false,
  lockGinDate = false,
  ginNumberError,
  ginDateError,
  invoiceError,
  locationError,
  preparedByError,
  receivedByError,
  invoiceOptions,
  locationOptions,
  invoicesLoading,
  locationsLoading,
  onGinNumberChange,
  onGinDateChange,
  onInvoiceChange,
  onLocationChange,
  onPreparedByChange,
  onReceivedByChange,
}: GinDetailsSectionProps) => {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">
        Note Details
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Note Number</span>
          <input
            type="text"
            value={ginNumber}
            onChange={(event) => onGinNumberChange(event.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            placeholder="GIN-202604-001"
          />
          {ginNumberError && <p className="text-[12px] text-red-700">{ginNumberError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Date</span>
          <input
            type="date"
            value={ginDate}
            onChange={(event) => onGinDateChange(event.target.value)}
            disabled={lockGinDate}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
          />
          {ginDateError && <p className="text-[12px] text-red-700">{ginDateError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Invoice</span>
          <SearchableSelect
            value={invoiceId}
            onChange={onInvoiceChange}
            options={invoiceOptions}
            placeholder={invoicesLoading ? "Loading invoices..." : "Select invoice"}
            searchPlaceholder="Search invoices"
            loading={invoicesLoading}
            disabled={lockInvoiceSelection}
          />
          {invoiceError && <p className="text-[12px] text-red-700">{invoiceError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Location</span>
          <SearchableSelect
            value={locationId}
            onChange={onLocationChange}
            options={locationOptions}
            placeholder={locationsLoading ? "Loading locations..." : "Select location"}
            searchPlaceholder="Search locations"
            loading={locationsLoading}
            disabled={lockLocationSelection}
          />
          {locationError && <p className="text-[12px] text-red-700">{locationError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Customer</span>
          <input
            type="text"
            value={invoiceCustomerName}
            readOnly
            className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-[13px] text-stone-700"
            placeholder="Select an invoice"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Sales Rep</span>
          <input
            type="text"
            value={invoiceRepName}
            readOnly
            className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-[13px] text-stone-700"
            placeholder="Select an invoice"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Prepared By</span>
          <input
            type="text"
            value={preparedBy}
            onChange={(event) => onPreparedByChange(event.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
          />
          {preparedByError && <p className="text-[12px] text-red-700">{preparedByError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Received By</span>
          <input
            type="text"
            value={receivedBy}
            onChange={(event) => onReceivedByChange(event.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
          />
          {receivedByError && <p className="text-[12px] text-red-700">{receivedByError}</p>}
        </label>
      </div>
    </section>
  );
};

export default GinDetailsSection;