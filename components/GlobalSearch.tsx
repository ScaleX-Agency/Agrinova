"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Boxes,
  Package,
  ClipboardList,
  FileText,
  Receipt,
  Users,
  UserCog,
  UserCheck,
  Bell,
  Settings,
  TrendingUp,
  ChevronRight,
  X,
} from "lucide-react";

interface SearchItem {
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  keywords?: string[];
}

const SEARCH_INDEX: SearchItem[] = [
  // Inventory
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={15} />,
    group: "Inventory",
    keywords: ["home", "overview", "stats"],
  },
  {
    label: "Stock Overview",
    description: "View all inventory by location",
    href: "/inventory",
    icon: <Boxes size={15} />,
    group: "Inventory",
    keywords: ["stock", "inventory", "igrn", "quantity"],
  },
  {
    label: "Products",
    description: "Manage product catalog",
    href: "/inventory/products",
    icon: <Package size={15} />,
    group: "Inventory",
    keywords: ["product", "catalog", "item", "pack size"],
  },
  {
    label: "Goods Receiving Notes",
    description: "Record incoming stock",
    href: "/goods-receiving-notes",
    icon: <ClipboardList size={15} />,
    group: "Inventory",
    keywords: ["grn", "goods receiving", "incoming", "purchase", "import"],
  },
  // Operations
  {
    label: "Goods Issue Notes",
    description: "Record dispatched stock",
    href: "/goods-issue-notes",
    icon: <ClipboardList size={15} />,
    group: "Operations",
    keywords: ["gin", "goods issue", "dispatch", "outgoing"],
  },
  {
    label: "Invoices",
    description: "Create and manage sales invoices",
    href: "/invoices",
    icon: <FileText size={15} />,
    group: "Operations",
    keywords: ["invoice", "bill", "sale", "inv"],
  },
  {
    label: "Receipts",
    description: "Record payments received",
    href: "/receipts",
    icon: <Receipt size={15} />,
    group: "Operations",
    keywords: ["receipt", "payment", "cash", "rcp"],
  },
  {
    label: "Customers",
    description: "View and manage customer accounts",
    href: "/customers",
    icon: <Users size={15} />,
    group: "Operations",
    keywords: ["customer", "client", "account", "outstanding"],
  },
  {
    label: "Operators",
    description: "Manage operator accounts",
    href: "/operators",
    icon: <UserCog size={15} />,
    group: "Operations",
    keywords: ["operator", "user", "staff", "login"],
  },
  {
    label: "Sales Reps",
    description: "View sales representatives",
    href: "/sales-reps",
    icon: <UserCheck size={15} />,
    group: "Operations",
    keywords: ["sales rep", "representative", "rep"],
  },
  {
    label: "Product Sale",
    description: "Invoice-line product sale details",
    href: "/sales-rep-sales",
    icon: <TrendingUp size={15} />,
    group: "Operations",
    keywords: ["product sale", "item sales", "sales report"],
  },
  {
    label: "Commission",
    description: "View commission calculations",
    href: "/commission",
    icon: <TrendingUp size={15} />,
    group: "Operations",
    keywords: ["commission", "earnings", "percentage"],
  },
  // Other
  {
    label: "Reminders",
    description: "Outstanding balance reminders",
    href: "/reminders",
    icon: <Bell size={15} />,
    group: "Other",
    keywords: ["reminder", "overdue", "follow up", "whatsapp"],
  },
  {
    label: "Settings",
    description: "System and company settings",
    href: "/settings",
    icon: <Settings size={15} />,
    group: "Other",
    keywords: ["settings", "config", "company", "backup"],
  },
];

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const label = item.label.toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const kws = (item.keywords || []).join(" ").toLowerCase();

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (kws.includes(q)) return 40;
  if (desc.includes(q)) return 20;
  return 0;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = SEARCH_INDEX.map((item) => ({
    item,
    score: scoreItem(item, query),
  }))
    .filter(({ score }) => (query.trim() ? score > 0 : true))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // Group results
  const grouped: Record<string, SearchItem[]> = {};
  results.forEach((item) => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });
  const flatResults = results;

  useEffect(() => {
    if (open) {
  // eslint-disable-next-line
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
  // eslint-disable-next-line
    setSelectedIndex(0);
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        navigate(flatResults[selectedIndex].href);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-[560px] px-4"
          >
            <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden">
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
                <Search size={16} className="text-stone-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, products, customers…"
                  className="flex-1 bg-transparent text-[14px] text-stone-800 placeholder:text-stone-400 outline-none [font-family:var(--font-dmsans)]"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
                  >
                    <X size={11} className="text-stone-500" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[380px] overflow-y-auto py-2">
                {flatResults.length === 0 && query.trim() ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-[13px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-[12px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                      Try searching for a page name or feature
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([groupName, items]) => (
                    <div key={groupName} className="mb-1">
                      <p className="px-4 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)]">
                        {groupName}
                      </p>
                      {items.map((item) => {
                        const globalIdx = flatResults.indexOf(item);
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <button
                            key={item.href}
                            onClick={() => navigate(item.href)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                              isSelected
                                ? "bg-stone-50"
                                : "hover:bg-stone-50"
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-stone-100 bg-stone-50 text-stone-500"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[13px] font-medium text-stone-800 [font-family:var(--font-dmsans)]">
                                {item.label}
                              </span>
                              {item.description && (
                                <span className="block text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)] truncate">
                                  {item.description}
                                </span>
                              )}
                            </span>
                            {isSelected && (
                              <ChevronRight
                                size={13}
                                className="text-stone-400 shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
