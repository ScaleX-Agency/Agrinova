// src/app/inventory/products/page.tsx
// Place at: app/(dashboard)/inventory/products/page.tsx in your Next.js project.

import ProductsPage from "@/components/ProductsPage";

export const metadata = { title: "Products — Agrinova IMS" };

export default function ProductsRoute() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Product catalogue and configuration</p>
        </div>
      </div>
      <ProductsPage />
    </div>
  );
}
