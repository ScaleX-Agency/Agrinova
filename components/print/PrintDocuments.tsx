import type { ReactNode } from "react";

type PrintPageProps = {
  title: string;
  subtitle?: string;
  rightHeader?: ReactNode;
  children: ReactNode;
};

const PrintPage = ({ title, subtitle, rightHeader, children }: PrintPageProps) => {
  return (
    <div className="print-sheet [font-family:var(--font-dmsans)] text-stone-900">
      <header className="print-header">
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-stone-500">Agrinova IMS</p>
          <h1 className="mt-1 text-[26px] font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-stone-600">{subtitle}</p>}
        </div>
        <div className="text-right text-[12px] text-stone-600">{rightHeader}</div>
      </header>
      {children}
    </div>
  );
};

export { PrintPage };
