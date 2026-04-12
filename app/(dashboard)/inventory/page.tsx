import StockOverview from "@/components/StockOverview"; 
import { getAllStock, getLocationSummaries, getAllMovements } from "@/lib/inventoryService"; 
import type { Metadata } from "next"; 
 
export const metadata: Metadata = { title: "Stock Overview" }; 
 
export default async function InventoryPage() { 
const [stock, summaries, movements] = await Promise.all([ 
getAllStock(), 
getLocationSummaries(), 
getAllMovements(), 
]); 
 
return ( 
<div>
  <div className="page-header">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
          Inventory
        </p>
        <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
          Stock Overview
        </h1>
        <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
          Manage stock levels across all inventory locations
        </p>
      </div>
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
