"use client";

import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import type { RefObject } from "react";

type PrintButtonProps = {
  contentRef: RefObject<HTMLDivElement | null>;
  documentTitle: string;
  label?: string;
  className?: string;
};

const PrintButton = ({
  contentRef,
  documentTitle,
  label = "Print",
  className,
}: PrintButtonProps) => {
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
  });

  return (
    <button
      type="button"
      onClick={() => handlePrint()}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
      }
    >
      <Printer size={14} />
      {label}
    </button>
  );
};

export default PrintButton;
