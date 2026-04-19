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
  "inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]";

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
