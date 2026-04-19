import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type BackNavigationLinkProps = {
  href: string;
  label: string;
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
};

const defaultClassName =
  "inline-flex w-fit items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 [font-family:var(--font-dmsans)]";

const BackNavigationLink = ({
  href,
  label,
  className,
  iconSize = 14,
  showIcon = true,
}: BackNavigationLinkProps) => {
  return (
    <Link href={href} className={className ?? defaultClassName}>
      {showIcon && <ArrowLeft size={iconSize} />}
      {label}
    </Link>
  );
};

export default BackNavigationLink;
