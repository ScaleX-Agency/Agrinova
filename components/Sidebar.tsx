"use client";

import { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface AccountApiResponse {
  account: {
    role_name: string;
  };
}

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        icon: <LayoutDashboard size={16} />,
        label: "Dashboard",
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        href: "/inventory",
        icon: <Boxes size={16} />,
        label: "Stock Overview",
        shortLabel: "Stock",
      },
      {
        href: "/inventory/products",
        icon: <Package size={16} />,
        label: "Products",
      },
      {
        href: "/locations",
        icon: <MapPin size={16} />,
        label: "Locations",
      },
    ],
  },
  {
    title: "Documents",
    items: [
      {
        href: "/invoices",
        icon: <FileText size={16} />,
        label: "Invoices",
      },
      {
        href: "/receipts",
        icon: <Receipt size={16} />,
        label: "Receipts",
      },
      {
        href: "/goods-receiving-notes",
        icon: <ClipboardList size={16} />,
        label: "Goods Receiving Notes",
        shortLabel: "GRNs",
      },
      {
        href: "/goods-issue-notes",
        icon: <ClipboardList size={16} />,
        label: "Goods Issue Notes",
        shortLabel: "GINs",
      },
      {
        href: "/stock-transfers",
        icon: <ArrowLeftRight size={16} />,
        label: "Stock Transfers",
        shortLabel: "Transfers",
      },
      {
        href: "/sales-return-notes",
        icon: <RotateCcw size={16} />,
        label: "Sales Return Notes",
        shortLabel: "Returns",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        href: "/customer-sales",
        icon: <BarChart3 size={16} />,
        label: "Customer Sales",
      },
      {
        href: "/product-performance",
        icon: <PackageSearch size={16} />,
        label: "Product Performance",
        shortLabel: "Products",
      },
      {
        href: "/sales-rep-sales",
        icon: <UserCheck size={16} />,
        label: "Sales Rep Sales",
        shortLabel: "Rep Sales",
      },
      {
        href: "/commission",
        icon: <BarChart3 size={16} />,
        label: "Commission",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        href: "/customers",
        icon: <Users size={16} />,
        label: "Customers",
      },
      {
        href: "/sales-reps",
        icon: <UserCheck size={16} />,
        label: "Sales Reps",
      },
      {
        href: "/operators",
        icon: <UserCog size={16} />,
        label: "Operators",
        adminOnly: true,
      },
    ],
  },
];

const isPathActive = (pathname: string, href: string) => {
  const currentPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;

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

const filterGroupsForRole = (groups: NavGroup[], roleName: string | null) => {
  const isAdmin = roleName?.toLowerCase() === "admin";

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);
};

const SidebarContent = ({
  collapsed,
  pathname,
  roleName,
  signOut,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  roleName: string | null;
  signOut: ReturnType<typeof useClerk>["signOut"];
  onNavigate?: () => void;
}) => {
  const visibleGroups = useMemo(
    () => filterGroupsForRole(NAV_GROUPS, roleName),
    [roleName],
  );

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`h-full bg-white border-r border-stone-200 flex flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[256px]"
      }`}
    >
      <div
        className={`h-[64px] border-b border-stone-200 flex items-center shrink-0 ${
          collapsed ? "justify-center px-3" : "gap-3 px-4"
        }`}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-white">
          <Image
            src="/agrinova-logo.jpeg"
            alt="Agrinova Logo"
            fill
            className="object-cover"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-none text-stone-900 [font-family:var(--font-dmsans)]">
              Agrinova
            </p>
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">
              IMS Workspace
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isPathActive(pathname, item.href);
                  const visibleLabel = item.shortLabel ?? item.label;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`relative flex min-h-[36px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors group [font-family:var(--font-dmsans)] ${
                          active
                            ? "bg-[#eeeffe] text-[#2b2d7e]"
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                        } ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#2b2d7e]" />
                        )}
                        <span
                          className={
                            active
                              ? "text-[#2b2d7e]"
                              : "text-stone-400 group-hover:text-stone-600"
                          }
                        >
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate">
                              {visibleLabel}
                            </span>
                            {active && (
                              <ChevronRight
                                size={12}
                                className="text-[#2b2d7e]/55"
                              />
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-stone-200 p-3">
        {!collapsed && (
          <div className="mb-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">
              Workspace
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                Agrinova IMS
              </p>
              {roleName && (
                <span className="shrink-0 rounded-full bg-[#eeeffe] px-2 py-0.5 text-[10.5px] font-medium capitalize text-[#2b2d7e]">
                  {roleName.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ redirectUrl: "/login" })}
          className={`flex min-h-[36px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700 [font-family:var(--font-dmsans)] ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={16} className="text-stone-400" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [roleName, setRoleName] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadRole = async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as AccountApiResponse;
        if (!isCancelled) {
          setRoleName(data.account.role_name);
        }
      } catch {
        if (!isCancelled) {
          setRoleName(null);
        }
      }
    };

    void loadRole();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      <div className="hidden h-screen sticky top-0 lg:block">
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          roleName={roleName}
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
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed left-0 top-0 z-50 h-screen lg:hidden"
            >
              <SidebarContent
                collapsed={false}
                pathname={pathname}
                roleName={roleName}
                signOut={signOut}
                onNavigate={onClose}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
