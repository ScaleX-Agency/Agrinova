"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
   
  LayoutDashboard,
  Boxes,
  Package,
  MapPin,
  ArrowLeftRight,
  Users,
  UserCog,
  Receipt,
  FileText,
  ClipboardList,
  UserCheck,
  BarChart3,
  PackageSearch,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        href: "/dashboard",
        icon: <LayoutDashboard size={15} />,
        label: "Dashboard",
      },
    ],
  },
  {
    title: "Inventory Operations",
    items: [
      {
        href: "/inventory",
        icon: <Boxes size={15} />,
        label: "Stock Overview",
      },
      {
        href: "/inventory/products",
        icon: <Package size={15} />,
        label: "Products",
      },
      {
        href: "/locations",
        icon: <MapPin size={15} />,
        label: "Locations",
      },
      {
        href: "/goods-receiving-notes",
        icon: <ClipboardList size={15} />,
        label: "Goods Receiving Notes",
      },
      {
        href: "/goods-issue-notes",
        icon: <ClipboardList size={15} />,
        label: "Goods Issue Notes",
      },
      {
        href: "/inventory/movements",
        icon: <ArrowLeftRight size={15} />,
        label: "Movements",
      },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/invoices", icon: <FileText size={15} />, label: "Invoices" },
      { href: "/receipts", icon: <Receipt size={15} />, label: "Receipts" },
      {
        href: "/customer-sales",
        icon: <BarChart3 size={15} />,
        label: "Customer Sales",
      },
      {
        href: "/product-performance",
        icon: <PackageSearch size={15} />,
        label: "Product Performance",
      },
      {
        href: "/commission",
        icon: <UserCheck size={15} />,
        label: "Sales Rep Sales",
      },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/customers", icon: <Users size={15} />, label: "Customers" },
      {
        href: "/sales-reps",
        icon: <UserCheck size={15} />,
        label: "Sales Reps",
      },
      {
        href: "/operators",
        icon: <UserCog size={15} />,
        label: "Operators",
      },
    ],
  },
];

const isPathActive = (pathname: string, href: string) => {
  const currentPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;

  // Treat Stock Overview as a specific route, not a broad parent matcher.
  if (href === "/inventory") {
    return (
      currentPath === "/inventory" || /^\/inventory\/\d+$/.test(currentPath)
    );
  }

  if (href.includes("?")) {
    const [basePath] = href.split("?");
    return currentPath === basePath;
  }

  if (currentPath === href) {
    return true;
  }

  return currentPath.startsWith(`${href}/`);
};

const SidebarContent = ({
  collapsed,
  pathname,
  signOut,
}: {
  collapsed: boolean;

  pathname: string;

  // eslint-disable-next-line
  signOut: any;
}) => (
  <motion.aside
    initial={{ x: -24, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={`h-full bg-white border-r border-stone-200 flex flex-col transition-all duration-300 ${
      collapsed ? "w-[72px]" : "w-[256px]"
    }`}
  >
    {/* Brand */}
    <div
      className={`h-[64px] border-b border-stone-200 flex items-center shrink-0 ${collapsed ? "justify-center px-3" : "gap-3 px-4"}`}
    >
      <div className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden bg-white relative">
        <Image
          src="/agrinova-logo.jpeg"
          alt="Agrinova Logo"
          fill
          className="object-cover"
        />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-dmsans)] leading-none">
            Agrinova
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5 tracking-[0.12em] [font-family:var(--font-dmsans)] truncate">
            Your Partner in Lifesciences
          </p>
        </div>
      )}
    </div>

    {/* Nav */}
    <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-stone-400 [font-family:var(--font-dmsans)]">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isPathActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all group [font-family:var(--font-dmsans)]
                      ${
                        active
                          ? "bg-blue-50 text-blue-800"
                          : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                      }
                      ${collapsed ? "justify-center" : ""}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-r-full" />
                    )}
                    <span
                      className={
                        active
                          ? "text-blue-700"
                          : "text-stone-400 group-hover:text-stone-600"
                      }
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && active && (
                      <ChevronRight
                        size={12}
                        className="ml-auto text-blue-400"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>

    {/* Bottom */}
    <div className="border-t border-stone-200 p-3 space-y-1 shrink-0">
      {/* <Link
        href="/settings"
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-all [font-family:var(--font-dmsans)] ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? "Settings" : undefined}
      >
        <Settings size={15} className="text-stone-400" />
        {!collapsed && <span>Settings</span>}
      </Link> */}
      <button
        onClick={() => signOut({ redirectUrl: "/login" })}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-stone-500 hover:bg-red-50 hover:text-red-700 transition-all [font-family:var(--font-dmsans)] ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? "Sign out" : undefined}
      >
        <LogOut size={15} className="text-stone-400" />
        {!collapsed && <span>Sign out</span>}
      </button>

      {!collapsed && (
        <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">
            Workspace
          </p>
          <p className="text-[12.5px] font-semibold text-stone-700 mt-0.5 [font-family:var(--font-dmsans)]">
            Agrinova IMS
          </p>
          <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
            Enterprise · v1.0
          </p>
        </div>
      )}
    </div>
  </motion.aside>
);

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <>
      <div className="hidden lg:block h-screen sticky top-0">
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          signOut={signOut}
        />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lg:hidden fixed left-0 top-0 h-screen z-50"
            >
              <SidebarContent
                collapsed={collapsed}
                pathname={pathname}
                signOut={signOut}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
