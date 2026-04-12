// app/(dashboard)/inventory/products/page.tsx

import { Plus } from "lucide-react";
import ProductsPageClient from "@/components/ProductsPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Products" };

export default function ProductsRoute() {
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Inventory
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            Products
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Manage your full product catalogue and category configuration
          </p>
        </div>

        {/* New Product button lives inside ProductsPage (client),
            but you can surface a duplicate shortcut here if desired */}
      </div>

      {/* ── Client page ── */}
      <ProductsPageClient />
    </div>
  );
}
