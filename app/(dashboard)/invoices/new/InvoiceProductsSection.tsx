import { useMemo } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import NumericStepperInput from "@/components/NumericStepperInput";
import type { AvailableProduct, InvoiceLine } from "./invoice-form.types";
import { clamp, formatCurrency } from "./invoice-form.utils";
import TanStackTable, { type TableColumnMeta } from "../../../../components/TanStackTable";

const columnHelper = createColumnHelper<InvoiceLine>();

type InvoiceProductsSectionProps = {
  lines: InvoiceLine[];
  locationId: number | null;
  availableProducts: AvailableProduct[];
  productSelectOptions: SearchableSelectOption[];
  productsError: string;
  isLoadingRelevantProducts: boolean;
  fieldError?: string;
  productsActionError: string;
  onChangeProduct: (lineId: number, productId: number | null) => void;
  onChangeQty: (lineId: number, qty: number) => void;
  onChangeUnitPrice: (lineId: number, unitPrice: number) => void;
  onChangeDiscount: (lineId: number, discount: number) => void;
  onRemoveLine: (lineId: number) => void;
  onAddLine: () => void;
  onClearProducts: () => void;
};

const InvoiceProductsSection = ({
  lines,
  locationId,
  availableProducts,
  productSelectOptions,
  productsError,
  isLoadingRelevantProducts,
  fieldError,
  productsActionError,
  onChangeProduct,
  onChangeQty,
  onChangeUnitPrice,
  onChangeDiscount,
  onRemoveLine,
  onAddLine,
  onClearProducts,
}: InvoiceProductsSectionProps) => {
  const selectedProductIds = useMemo(
    () => new Set(
      lines
        .map((line) => line.productId)
        .filter((productId): productId is number => typeof productId === "number"),
    ),
    [lines],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("productId", {
        id: "product",
        header: "Product",
        meta: { align: "left" } satisfies TableColumnMeta,
        cell: (info) => (
          <div className="w-[280px] max-w-full">
            <SearchableSelect
              value={info.row.original.productId}
              onChange={(value) => onChangeProduct(info.row.original.id, value)}
              options={productSelectOptions.filter((option) => {
                const selectedProductId = info.row.original.productId;
                if (option.id === selectedProductId) return true;
                return !selectedProductIds.has(option.id);
              })}
              placeholder="Select product"
              searchPlaceholder="Search products"
              disabled={!locationId || availableProducts.length === 0}
              loading={isLoadingRelevantProducts}
              className="max-w-full"
            />
          </div>
        ),
      }),
      columnHelper.accessor("qty", {
        id: "qty",
        header: "Qty",
        size: 160,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <NumericStepperInput
            value={info.row.original.qty}
            onChange={(value) => onChangeQty(info.row.original.id, clamp(value, 1))}
            min={1}
            step={1}
            precision={0}
            minChars={3}
            className="mx-auto"
          />
        ),
      }),
      columnHelper.accessor("unitPrice", {
        id: "unitPrice",
        header: "Unit Price (LKR)",
        size: 190,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <NumericStepperInput
            value={info.row.original.unitPrice}
            onChange={(value) => onChangeUnitPrice(info.row.original.id, clamp(value, 0))}
            min={0}
            step={0.5}
            precision={2}
            minChars={6}
            className="mx-auto"
          />
        ),
      }),
      columnHelper.accessor("discount", {
        id: "discount",
        header: "Discount %",
        size: 170,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <NumericStepperInput
            value={info.row.original.discount}
            onChange={(value) => onChangeDiscount(info.row.original.id, clamp(value, 0))}
            min={0}
            max={100}
            step={0.5}
            precision={2}
            minChars={5}
            className="mx-auto"
          />
        ),
      }),
      columnHelper.display({
        id: "lineSubtotal",
        header: "Line Total (Before Discount)",
        size: 190,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const { qty, unitPrice } = info.row.original;
          const lineSubtotal = qty * unitPrice;
          return <span className="font-medium text-stone-800">{formatCurrency(lineSubtotal)}</span>;
        },
      }),
      columnHelper.accessor("lineTotal", {
        id: "lineTotal",
        header: "Line Total (After Discount)",
        size: 190,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => <span className="font-semibold text-stone-900">{formatCurrency(info.row.original.lineTotal)}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        size: 120,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <button
            type="button"
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
      availableProducts.length,
      columnHelper,
      formatCurrency,
      isLoadingRelevantProducts,
      locationId,
      onChangeDiscount,
      onChangeProduct,
      onChangeQty,
      onChangeUnitPrice,
      onRemoveLine,
      productSelectOptions,
      selectedProductIds,
    ],
  );

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
            <Boxes size={16} />
          </span>
          <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
            Products
          </h2>
        </div>
      </div>

      {productsError && <p className="mb-2 text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{productsError}</p>}
      {!productsError && !locationId && (
        <p className="mb-2 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">Select an inventory location to load products.</p>
      )}
      {!productsError && isLoadingRelevantProducts && locationId && (
        <p className="mb-2 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">Loading products for location...</p>
      )}
      {!productsError && locationId && !isLoadingRelevantProducts && availableProducts.length === 0 && (
        <p className="mb-2 text-[12px] text-amber-700 [font-family:var(--font-dmsans)]">No available products in stock for this location.</p>
      )}
      {fieldError && <p className="mb-2 text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{fieldError}</p>}
      {productsActionError && <p className="mb-2 text-[12px] text-red-700 [font-family:var(--font-dmsans)]">{productsActionError}</p>}

      <TanStackTable data={lines} columns={columns} minWidthPx={840} align="center" />

      <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
        <button
          type="button"
          onClick={onAddLine}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] transition hover:bg-[#eeeffe] [font-family:var(--font-dmsans)]"
        >
          <Plus size={13} />
          Add Row
        </button>
        <button
          type="button"
          onClick={onClearProducts}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12px] font-medium text-stone-700 transition hover:bg-stone-50 [font-family:var(--font-dmsans)]"
        >
          Clear Products
        </button>
      </div>
    </section>
  );
};

export default InvoiceProductsSection;
