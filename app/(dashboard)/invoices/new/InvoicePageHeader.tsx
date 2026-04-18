import Link from "next/link";
import { ArrowLeft, FilePlus2 } from "lucide-react";

const InvoicePageHeader = () => {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">Sales</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c0c3f0] bg-[#eeeffe] text-[#2b2d7e]">
            <FilePlus2 size={16} />
          </span>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            New Invoice
          </h1>
        </div>
        <p className="text-[13px] text-stone-500 [font-family:var(--font-dmsans)]">
          Save invoice details. The system generates and links the Goods Issue Note automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
      
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50 [font-family:var(--font-dmsans)]"
        >
          <ArrowLeft size={14} />
          Back to Invoices
        </Link>
      </div>
    </header>
  );
};

export default InvoicePageHeader;