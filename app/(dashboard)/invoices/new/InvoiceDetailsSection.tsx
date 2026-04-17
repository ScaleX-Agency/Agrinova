import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";

type InvoiceDetailsSectionProps = {
  invoiceNo: string;
  invoiceDate: string;
  invoiceNoError?: string;
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
  onRepChange: (value: number | null) => void;
  onCustomerChange: (value: number | null) => void;
  onLocationChange: (value: number | null) => void;
};

const InvoiceDetailsSection = ({
  invoiceNo,
  invoiceDate,
  invoiceNoError,
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
  onRepChange,
  onCustomerChange,
  onLocationChange,
}: InvoiceDetailsSectionProps) => {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">
        Invoice Details
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Invoice No.</span>
          <input
            type="text"
            placeholder="Auto-generated if left blank"
            value={invoiceNo}
            onChange={(event) => onInvoiceNoChange(event.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
          />
          {invoiceNoError && <p className="text-[12px] text-red-700">{invoiceNoError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Date</span>
          <input
            type="date"
            value={invoiceDate}
            onChange={(event) => onInvoiceDateChange(event.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
          />
          {invoiceDateError && <p className="text-[12px] text-red-700">{invoiceDateError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Sales Rep</span>
          <SearchableSelect
            value={repId}
            onChange={onRepChange}
            options={salesRepSelectOptions}
            placeholder={salesRepLoading ? "Loading sales reps..." : "Select sales rep"}
            searchPlaceholder="Search sales reps"
            loading={salesRepLoading}
          />
          {salesRepError && <p className="text-[12px] text-red-700">{salesRepError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Customer</span>
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
          {customerError && <p className="text-[12px] text-red-700">{customerError}</p>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-stone-600">Inventory Location</span>
          <SearchableSelect
            value={locationId}
            onChange={onLocationChange}
            options={inventoryLocationSelectOptions}
            placeholder={locationsLoading ? "Loading locations..." : "Select location"}
            searchPlaceholder="Search locations"
            loading={locationsLoading}
          />
          {locationError && <p className="text-[12px] text-red-700">{locationError}</p>}
        </label>
      </div>
    </section>
  );
};

export default InvoiceDetailsSection;
