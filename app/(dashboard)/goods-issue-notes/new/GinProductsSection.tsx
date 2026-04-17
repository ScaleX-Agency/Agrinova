import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import NumericStepperInput from "@/components/NumericStepperInput";
import type { GinLine } from "./gin-form.types";
import TanStackTable, { type TableColumnMeta } from "../../../../components/TanStackTable";

const columnHelper = createColumnHelper<GinLine>();

type GinProductsSectionProps = {
  lines: GinLine[];
  locationId: number | null;
  productOptions: SearchableSelectOption[];
  productStockById: Record<number, number>;
  isProductsLoading: boolean;
  productsError: string;
  lockPrefilledData?: boolean;
  onAddLine: () => void;
  onRemoveLine: (lineId: number) => void;
  onUpdateLine: (lineId: number, key: "productId" | "quantity", value: number | null) => void;
};

const GinProductsSection = ({
  lines,
  locationId,
  productOptions,
  productStockById,
  isProductsLoading,
  productsError,
  lockPrefilledData = false,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}: GinProductsSectionProps) => {
  const columns = useMemo(
    () => [
      columnHelper.accessor("productId", {
        id: "productId",
        header: "Product",
        meta: { align: "left" } satisfies TableColumnMeta,
        cell: (info) => (
          <div className=" max-w-full">
            <SearchableSelect
              value={info.row.original.productId}
              onChange={(value) => onUpdateLine(info.row.original.id, "productId", value)}
              options={productOptions}
              placeholder="Select product"
              searchPlaceholder="Search products"
              disabled={lockPrefilledData || !locationId || isProductsLoading}
              loading={isProductsLoading}
            />
          </div>
        ),
      }),
      columnHelper.accessor("quantity", {
        id: "quantity",
        header: "Qty",
        size: 160,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const selectedProductId = info.row.original.productId;
          const maxQty =
            typeof selectedProductId === "number" ? productStockById[selectedProductId] : undefined;

          return (
            <NumericStepperInput
              value={info.row.original.quantity}
              onChange={(value) => onUpdateLine(info.row.original.id, "quantity", value)}
              min={1}
              max={maxQty}
              step={1}
              precision={0}
              minChars={3}
              disabled={lockPrefilledData || selectedProductId === null}
              className="mx-auto"
            />
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        size: 110,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveLine(info.row.original.id)}
            disabled={lockPrefilledData}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700"
          >
            <Trash2 size={12} />
            Remove
          </button>
        ),
      }),
    ],
    [
      columnHelper,
      isProductsLoading,
      locationId,
      onRemoveLine,
      onUpdateLine,
      productOptions,
      productStockById,
    ],
  );

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Products</h2>
        <button
          type="button"
          onClick={onAddLine}
          disabled={lockPrefilledData || !locationId || isProductsLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] transition hover:bg-[#eeeffe] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
        >
          <Plus size={13} />
          Add Row
        </button>
      </div>

      {productsError && <p className="mb-2 text-[12px] text-red-700">{productsError}</p>}
      {!productsError && !locationId && (
        <p className="mb-2 text-[12px] text-stone-500">Select an inventory location to load products.</p>
      )}
      {!productsError && isProductsLoading && locationId && (
        <p className="mb-2 text-[12px] text-stone-500">Loading products for location...</p>
      )}
      {!productsError && locationId && !isProductsLoading && productOptions.length === 0 && (
        <p className="mb-2 text-[12px] text-amber-700">No available products in stock for this location.</p>
      )}
      {lockPrefilledData && (
        <p className="mb-2 text-[12px] text-stone-500">Prefilled invoice lines are locked and cannot be removed.</p>
      )}

      <TanStackTable data={lines} columns={columns} minWidthPx={560} align="center" />
    </section>
  );
};

export default GinProductsSection;