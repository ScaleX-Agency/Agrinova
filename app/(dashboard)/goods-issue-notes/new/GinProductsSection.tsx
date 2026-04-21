import { useCallback, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import NumericStepperInput from "@/components/NumericStepperInput";
import LoadingState from "@/components/LoadingState";
import type { GinLine } from "./gin-form.types";
import TanStackTable, { type TableColumnMeta } from "../../../../components/TanStackTable";
import { getLineAvailableQuantity } from "./gin-form.utils";

const columnHelper = createColumnHelper<GinLine>();

type GinProductsSectionProps = {
  lines: GinLine[];
  locationId: number | null;
  productOptions: SearchableSelectOption[];
  productStockById: Record<number, number>;
  invoiceQtyByProduct: Record<number, number>;
  issuedQtyByProduct: Record<number, number>;
  remainingInvoiceQtyByProduct: Record<number, number>;
  isProductsLoading: boolean;
  productsError: string;
  onUpdateLine: (lineId: number, key: "productId" | "quantity", value: number | null) => void;
};

const GinProductsSection = ({
  lines,
  locationId,
  productOptions,
  productStockById,
  invoiceQtyByProduct,
  issuedQtyByProduct,
  remainingInvoiceQtyByProduct,
  isProductsLoading,
  productsError,
  onUpdateLine,
}: GinProductsSectionProps) => {
  const getMaxQtyForLine = useCallback((lineId: number, productId: number | null) => {
    return getLineAvailableQuantity(lineId, productId, lines, productStockById, remainingInvoiceQtyByProduct);
  }, [lines, productStockById, remainingInvoiceQtyByProduct]);

  const getIssueStatusMeta = useCallback((line: GinLine, requiredQty: number, issuedQty: number, maxQty: number) => {
    const isAlreadyFullyIssued = requiredQty > 0 && issuedQty >= requiredQty;
    const isFullByRow = maxQty > 0 ? line.quantity >= maxQty : line.quantity > 0;
    const isUnavailable = !isAlreadyFullyIssued && maxQty === 0 && line.quantity === 0;

    if (isAlreadyFullyIssued || isFullByRow) {
      return {
        label: "Issued",
        tone: "border-green-100 bg-green-50 text-green-700",
      };
    }

    if (isUnavailable) {
      return {
        label: "Unavailable",
        tone: "border-red-100 bg-red-50 text-red-700",
      };
    }

    return {
      label: "Pending",
      tone: "border-amber-100 bg-amber-50 text-amber-800",
    };
  }, []);

  const getStockMeta = useCallback((remainingQty: number) => {
    if (remainingQty === 0) {
      return {
        label: "Out",
        tone: "border-red-100 bg-red-50 text-red-700",
      };
    }

    if (remainingQty <= 5) {
      return {
        label: "Low",
        tone: "border-amber-100 bg-amber-50 text-amber-800",
      };
    }

    return {
      label: "Available",
      tone: "border-green-100 bg-green-50 text-green-700",
    };
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("productId", {
        id: "productId",
        header: "Product",
        meta: { align: "left" } satisfies TableColumnMeta,
        cell: (info) => {
          const line = info.row.original;
          const selectedProductId = line.productId;
          if (typeof selectedProductId !== "number") {
            return (
              <div className="max-w-full">
                <SearchableSelect
                  value={selectedProductId}
                  onChange={(value) => onUpdateLine(line.id, "productId", value)}
                  options={productOptions}
                  placeholder="Select product"
                  searchPlaceholder="Search products"
                  loading={isProductsLoading}
                />
              </div>
            );
          }

          const requiredQty = invoiceQtyByProduct[selectedProductId] ?? 0;
          const issuedQty = issuedQtyByProduct[selectedProductId] ?? 0;
          const maxQty = getMaxQtyForLine(line.id, selectedProductId) ?? 0;
          const issueStatus = getIssueStatusMeta(line, requiredQty, issuedQty, maxQty);
          const isDisabled = issueStatus.label === "Issued";

          return (
            <div className="max-w-full">
              <SearchableSelect
                value={selectedProductId}
                onChange={(value) => onUpdateLine(line.id, "productId", value)}
                options={productOptions}
                placeholder="Select product"
                searchPlaceholder="Search products"
                loading={isProductsLoading}
                disabled={isDisabled}
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("quantity", {
        id: "quantity",
        header: "Qty",
        size: 160,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const selectedProductId = info.row.original.productId;
          const maxQty = getMaxQtyForLine(info.row.original.id, selectedProductId);

          return (
            <div className="flex flex-col items-center gap-1">
              <NumericStepperInput
                value={info.row.original.quantity}
                onChange={(value) => onUpdateLine(info.row.original.id, "quantity", value)}
                min={0}
                max={maxQty}
                step={1}
                precision={0}
                minChars={3}
                className="mx-auto"
              />
              <span className="text-[11px] text-stone-500">Max {typeof maxQty === "number" ? maxQty : 0}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "issueStatus",
        header: "Issue Status",
        size: 180,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const line = info.row.original;
          const selectedProductId = line.productId;
          if (typeof selectedProductId !== "number") {
            return <span className="text-[12px] text-stone-400">-</span>;
          }

          const requiredQty = invoiceQtyByProduct[selectedProductId] ?? 0;
          const issuedQty = issuedQtyByProduct[selectedProductId] ?? 0;
          const maxQty = getMaxQtyForLine(line.id, selectedProductId) ?? 0;
          const issueStatus = getIssueStatusMeta(line, requiredQty, issuedQty, maxQty);

          return (
            <div className="flex flex-col items-center gap-1">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${issueStatus.tone}`}>
                {issueStatus.label}
              </span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "stockAvailability",
        header: "Stock Availability",
        size: 170,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const selectedProductId = info.row.original.productId;
          if (typeof selectedProductId !== "number") {
            return <span className="text-[12px] text-stone-400">-</span>;
          }

          const stockQty = productStockById[selectedProductId] ?? 0;
          const invoiceRemainingQty = remainingInvoiceQtyByProduct[selectedProductId] ?? 0;
          const remainingQty = Math.min(stockQty, invoiceRemainingQty);
          const stock = getStockMeta(remainingQty);

          return (
            <div className="flex flex-col items-center gap-1">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${stock.tone}`}>
                {stockQty} units available
              </span>
            </div>
          );
        },
      }),
    ],
    [
      invoiceQtyByProduct,
      issuedQtyByProduct,
      isProductsLoading,
      onUpdateLine,
      productOptions,
      productStockById,
      remainingInvoiceQtyByProduct,
      getMaxQtyForLine,
      getIssueStatusMeta,
      getStockMeta,
    ],
  );

  const visibleLines = useMemo(
    () => lines.filter((line) => {
      if (typeof line.productId !== "number") return false;
      const maxQty = getMaxQtyForLine(line.id, line.productId) ?? 0;
      return maxQty > 0;
    }),
    [lines, getMaxQtyForLine],
  );

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">Products</h2>
        </div>
      </div>

      {productsError && <p className="mb-2 text-[12px] text-red-700">{productsError}</p>}
      {!productsError && !locationId && (
        <p className="mb-2 text-[12px] text-stone-500">Select an inventory location to load products.</p>
      )}
      {!productsError && isProductsLoading && locationId && (
        <LoadingState message="Loading products for location..." />
      )}
      {!productsError && locationId && !isProductsLoading && productOptions.length === 0 && (
        <p className="mb-2 text-[12px] text-amber-700">No available products in stock for this location.</p>
      )}
      {!productsError && locationId && !isProductsLoading && productOptions.length > 0 && visibleLines.length === 0 && (
        <p className="mb-2 text-[12px] text-amber-700">No products with issueable quantity are available for this invoice.</p>
      )}

      <TanStackTable data={visibleLines} columns={columns} minWidthPx={560} align="center" />
    </section>
  );
};

export default GinProductsSection;