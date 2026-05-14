import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import NumericStepperInput from "@/components/NumericStepperInput";
import TanStackTable, { type TableColumnMeta } from "@/components/TanStackTable";
import type { StockEntryLine } from "./stock-entry-form.types";

const columnHelper = createColumnHelper<StockEntryLine>();

type StockEntryProductsSectionProps = {
  lines: StockEntryLine[];
  locationId: number | null;
  productOptions: SearchableSelectOption[];
  isProductsLoading: boolean;
  fieldError?: string;
  onAddLine: () => void;
  onRemoveLine: (lineId: number) => void;
  onChangeProduct: (lineId: number, productId: number | null) => void;
  onChangeQty: (lineId: number, qty: number) => void;
};

const StockEntryProductsSection = ({
  lines,
  locationId,
  productOptions,
  isProductsLoading,
  fieldError,
  onAddLine,
  onRemoveLine,
  onChangeProduct,
  onChangeQty,
}: StockEntryProductsSectionProps) => {
  // Get set of selected product IDs to prevent duplicates
  const selectedProductIds = useMemo(
    () =>
      new Set(
        lines
          .map((line) => line.productId)
          .filter((productId): productId is number => typeof productId === "number"),
      ),
    [lines],
  );
  const selectedProductIdsSignature = useMemo(
    () =>
      lines
        .map((line) => line.productId)
        .filter((productId): productId is number => typeof productId === "number")
        .sort((a, b) => a - b)
        .join(","),
    [lines],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("productId", {
        id: "productId",
        header: "Product",
        size: 400,
        meta: { align: "left" } satisfies TableColumnMeta,
        cell: (info) => (
          <div className="max-w-full">
            <SearchableSelect
              value={info.row.original.productId}
              onChange={(value) => onChangeProduct(info.row.original.id, value)}
              options={productOptions.filter((option) => {
                const selectedProductId = info.row.original.productId;
                if (option.id === selectedProductId) return true;
                return !selectedProductIds.has(option.id);
              })}
              placeholder="Select product"
              searchPlaceholder="Search by code or name"
              loading={isProductsLoading}
            />
          </div>
        ),
      }),
      columnHelper.accessor("qty", {
        id: "qty",
        header: "Qty",
        size: 150,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <NumericStepperInput
            value={info.row.original.qty}
            onChange={(value) => onChangeQty(info.row.original.id, value)}
            min={1}
            step={1}
            precision={0}
            minChars={3}
            className="mx-auto"
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        size: 100,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <button
            onClick={() => onRemoveLine(info.row.original.id)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700"
          >
            <Trash2 size={12} />
            Remove
          </button>
        ),
      }),
    ],
  // eslint-disable-next-line
    [
      productOptions,
      isProductsLoading,
      lines.length,
      selectedProductIdsSignature,
      locationId,
      onChangeProduct,
      onChangeQty,
      onRemoveLine,
    ],
  );

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
          Products Received
        </h2>
      </div>

      <>
        <TanStackTable data={lines} columns={columns} />

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onAddLine}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2d7a42]"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </>

      {fieldError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          {fieldError}
        </div>
      )}
    </section>
  );
};

export default StockEntryProductsSection;
