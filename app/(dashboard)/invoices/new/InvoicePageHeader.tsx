import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const InvoicePageHeader = () => {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
        <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
          New Invoice
        </h1>
        <p className="text-[13px] text-stone-500">
          Save invoice details. The system generates and links the Goods Issue Note automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
      
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
        >
          <ArrowLeft size={14} />
          Back to Invoices
        </Link>
      </div>
    </header>
  );
};

export default InvoicePageHeader;