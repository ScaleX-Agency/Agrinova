import { Calculator } from "lucide-react";
import { formatCurrency } from "./invoice-form.utils";

type InvoiceTotalsSectionProps = {
  subtotal: number;
  discountTotal: number;
  vatPercentage: number;
  vatAmount: number;
  total: number;
  submitError: string;
  successMessage: string;
  isSaving: boolean;
};

const InvoiceTotalsSection = ({
  subtotal,
  discountTotal,
  vatPercentage,
  vatAmount,
  total,
  submitError,
  successMessage,
  isSaving,
}: InvoiceTotalsSectionProps) => {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
          <Calculator size={16} />
        </span>
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
          Totals
        </h2>
      </div>

      <div className="mt-3 ml-auto w-full max-w-sm space-y-2 text-[13px] [font-family:var(--font-dmsans)]">
        <div className="flex items-center justify-between text-stone-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-stone-600">
          <span>Discount</span>
          <span>- {formatCurrency(discountTotal)}</span>
        </div>
        {vatPercentage > 0 && (
          <div className="flex items-center justify-between text-stone-600">
            <span>VAT ({vatPercentage}%)</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-[16px]">
          <span className="font-semibold text-stone-900">Grand Total</span>
          <span className="font-semibold text-[#1a5c2e]">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-[12px] [font-family:var(--font-dmsans)]">
        {submitError && <p className="text-red-700">{submitError}</p>}
        {successMessage && <p className="text-green-700">{successMessage}</p>}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--font-dmsans)]"
        >
          {isSaving ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </section>
  );
};

export default InvoiceTotalsSection;
