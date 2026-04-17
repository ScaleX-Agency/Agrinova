import { formatCurrency } from "./invoice-form.utils";

type InvoiceTotalsSectionProps = {
  subtotal: number;
  discountTotal: number;
  total: number;
  submitError: string;
  successMessage: string;
  isSaving: boolean;
};

const InvoiceTotalsSection = ({
  subtotal,
  discountTotal,
  total,
  submitError,
  successMessage,
  isSaving,
}: InvoiceTotalsSectionProps) => {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">
        Totals
      </h2>

      <div className="mt-3 ml-auto w-full max-w-sm space-y-2 text-[13px]">
        <div className="flex items-center justify-between text-stone-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-stone-600">
          <span>Discount</span>
          <span>- {formatCurrency(discountTotal)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-[16px]">
          <span className="font-semibold text-stone-900">Grand Total</span>
          <span className="font-semibold text-[#1a5c2e]">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-[12px]">
        {submitError && <p className="text-red-700">{submitError}</p>}
        {successMessage && <p className="text-green-700">{successMessage}</p>}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </section>
  );
};

export default InvoiceTotalsSection;
