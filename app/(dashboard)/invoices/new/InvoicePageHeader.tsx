import { FilePlus2 } from "lucide-react";
import BackNavigationLink from "@/components/ui/BackNavigationLink";

const InvoicePageHeader = () => {
  return (
    <header className="flex flex-col gap-3">
      <div>
        <div className="mb-2">
          <BackNavigationLink
            href="/invoices"
            label="Back to Invoices"
          />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">Sales</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c0c3f0] bg-[#eeeffe] text-[#2b2d7e]">
            <FilePlus2 size={16} />
          </span>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            New Invoice
          </h1>
        </div>
        <p className="text-[13px] text-stone-500 [font-family:var(--font-dmsans)]">
          Save invoice details. The system generates and links the Goods Issue Note automatically.
        </p>
      </div>
    </header>
  );
};

export default InvoicePageHeader;