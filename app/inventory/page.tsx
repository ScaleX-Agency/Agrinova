// src/app/inventory/page.tsx
// Next.js page — fetches data server-side and passes to client component.
// Place at: app/(dashboard)/inventory/page.tsx in your Next.js project.

import StockOverview from "../../components/StockOverview";
// import { getAllStock, getLocationSummaries, getAllMovements } from "../../lib/inventoryService";

export const metadata = { title: "Stock Overview — Agrinova IMS" };

export default async function InventoryPage() {
  // ── Fetch server-side (uncomment when DB is connected) ──
  // const [stock, summaries, movements] = await Promise.all([
  //   getAllStock(),
  //   getLocationSummaries(),
  //   getAllMovements(),
  // ]);

  // ── Mock data for development ──
  const stock: any[] = [];
  const summaries: any[] = [];
  const movements: any[] = [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Overview</h1>
          <p className="page-subtitle">Manage stock levels across all inventory locations</p>
        </div>
      </div>
      <StockOverview
        initialStock={stock}
        initialSummaries={summaries}
        initialMovements={movements}
      />
    </div>
  );
}
