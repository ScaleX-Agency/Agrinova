"use client";
// app/(dashboard)/dashboard/page.tsx  ← UPDATED FILE
//
// ─────────────────────────────────────────────────────────────────────────────
// DIFF SUMMARY — what changed vs the original:
//
//  1. Tab type expanded: "sales" | "inventory" | "finance" | "operations"
//  2. Tab switcher renders 4 tabs (was 2)
//  3. Sales KPI row: added <AovCard> + <CollectionRateCard> (grid → lg:grid-cols-7)
//  4. Sales tab row 1: added <GoalProgressBar> under the KPI row
//  5. Sales tab row 4: added <PendingInvoices> next to OverdueBalances
//  6. Sales tab row 5 (NEW): <SalesByLocation> full-width
//  7. Inventory tab KPI row: added <InventoryValuation> (grid → lg:grid-cols-5)
//  8. Inventory tab (NEW bottom section): <ReorderAlerts> + <InventoryInsights>
//  9. NEW tab: "Finance" renders <FinanceTab>
// 10. NEW tab: "Operations" renders <OperationsTab>
// 11. Header action area: shows date filter + export on "finance" tab too
//
// Everything else (RecordMovementModal, KpiCard, existing imports, etc.) is
// UNCHANGED from the original — do not re-paste those sections; this file
// shows only the parts that differ, marked with // ← NEW or // ← CHANGED.
// ─────────────────────────────────────────────────────────────────────────────
//
// To apply:
//   • Copy the new imports block below into your existing imports
//   • Replace the tab state type
//   • Replace the tab switcher JSX
//   • Drop in the new component calls where indicated by the comments
// ─────────────────────────────────────────────────────────────────────────────

// ── NEW imports to add at the top of page.tsx ────────────────────────────────

/*
import { AovCard, CollectionRateCard } from "@/components/dashboard/SalesKpiExtras";
import GoalProgressBar    from "@/components/dashboard/GoalProgressBar";
import ReorderAlerts      from "@/components/dashboard/ReorderAlerts";
import InventoryValuation from "@/components/dashboard/InventoryValuation";
import InventoryInsights  from "@/components/dashboard/InventoryInsights";
import PendingInvoices    from "@/components/dashboard/PendingInvoices";
import SalesByLocation    from "@/components/dashboard/SalesByLocation";
import FinanceTab         from "@/components/dashboard/FinanceTab";
import OperationsTab      from "@/components/dashboard/OperationsTab";
import type { DashboardTab } from "@/types/dashboard";
*/

// ── CHANGED: tab state type ──────────────────────────────────────────────────
/*
  Replace:
    const [activeTab, setActiveTab] = useState<"sales" | "inventory">("sales");
  With:
    const [activeTab, setActiveTab] = useState<DashboardTab>("sales");
*/

// ── CHANGED: Header action area — add "finance" to sales date filter ─────────
/*
  In the header <div className="hidden sm:flex items-center gap-2">, change:
    {activeTab === "sales" && ( ... )}
  to:
    {(activeTab === "sales" || activeTab === "finance") && ( ... )}
*/

// ── CHANGED: Tab switcher — expand to 4 tabs ─────────────────────────────────
/*
  Replace the tab switcher block with:

  <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
    {(["sales", "inventory", "finance", "operations"] as const).map((t) => (
      <button key={t} onClick={() => setActiveTab(t)}
        className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all [font-family:var(--font-dmsans)] ${
          activeTab === t
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-500 hover:text-stone-700"
        }`}>
        {t === "sales"       ? "Sales & Revenue"
        : t === "inventory"  ? "Inventory"
        : t === "finance"    ? "Finance"
        :                      "Operations"}
      </button>
    ))}
  </div>
*/

// ── CHANGED: Sales tab KPI row (was 5 cards, now 7) ──────────────────────────
/*
  Change the grid className:
    "grid grid-cols-2 lg:grid-cols-5 gap-3"
  →  "grid grid-cols-2 lg:grid-cols-7 gap-3"

  Then add after the last <KpiCard> (Overdue Customers):
    <AovCard kpis={salesData?.kpis} loading={salesLoading} />
    <CollectionRateCard kpis={salesData?.kpis} loading={salesLoading} />
*/

// ── NEW: Sales tab — Goal bar after KPI row ───────────────────────────────────
/*
  After the KPI row div, insert:
    <GoalProgressBar
      currentSales={salesData?.kpis?.totalSales}
      loading={salesLoading}
      periodLabel={dateRange === "this-month" ? "This Month"
        : dateRange === "last-month" ? "Last Month"
        : dateRange === "this-quarter" ? "This Quarter" : "This Year"}
    />
*/

// ── CHANGED: Sales tab Row 4 — add PendingInvoices beside OverdueBalances ────
/*
  Change Row 4 grid from lg:grid-cols-5 to lg:grid-cols-3, e.g.:
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <TopProducts dateRange={dateRange} />
      </div>
      <div className="lg:col-span-1">
        <OverdueBalances data={salesData?.overdueCustomers ?? []} loading={salesLoading} />
      </div>
      <div className="lg:col-span-1">
        <PendingInvoices invoices={salesData?.pendingInvoices} loading={salesLoading} />
      </div>
    </div>
*/

// ── NEW: Sales tab Row 5 — SalesByLocation full-width ────────────────────────
/*
  After Row 4, add:
    <SalesByLocation data={salesData?.salesByLocation} loading={salesLoading} />
*/

// ── CHANGED: Inventory tab KPI row (was 4 cards, now 5) ──────────────────────
/*
  Change grid: "grid grid-cols-2 lg:grid-cols-4 gap-3"
            → "grid grid-cols-2 lg:grid-cols-5 gap-3"

  After the last KpiCard (Out of Stock), add:
    <InventoryValuation />
*/

// ── NEW: Inventory tab — Reorder Alerts after movements section ───────────────
/*
  After the "grid grid-cols-1 lg:grid-cols-3" (movements + quick actions), add:
    <ReorderAlerts />
*/

// ── NEW: Inventory tab — Insights (dead stock + velocity) at bottom ───────────
/*
  After Location Health, add:
    <InventoryInsights />
*/

// ── NEW: Finance tab ──────────────────────────────────────────────────────────
/*
  After the Inventory tab block, add:
    {activeTab === "finance" && (
      <FinanceTab dateRange={dateRange} />
    )}
*/

// ── NEW: Operations tab ───────────────────────────────────────────────────────
/*
  After the Finance tab block, add:
    {activeTab === "operations" && (
      <OperationsTab />
    )}
*/

export {};
// This file is a migration guide only — no runtime code.
// The actual runtime code lives in the component files.
