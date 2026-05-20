"use client";

import { useMemo } from "react";
import { Boxes, Plus, Trash2, Tag, Gift } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import NumericStepperInput from "@/components/NumericStepperInput";
import type { AvailableProduct, InvoiceLine, LinePromotionType } from "./invoice-form.types";
import { clamp, formatCurrency, canAddInvoiceLines } from "./invoice-form.utils";
import TanStackTable, { type TableColumnMeta } from "../../../../components/TanStackTable";

const columnHelper = createColumnHelper<InvoiceLine>();

const PROMO_OPTIONS: { value: LinePromotionType; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "DISCOUNT", label: "Discount %" },
  { value: "FREE_QTY", label: "Free Qty" },
];

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
  onChangePromoType: (lineId: number, promoType: LinePromotionType) => void;
  onChangeDiscount: (lineId: number, discount: number) => void;
  onChangeFreeQty: (lineId: number, freeQty: number) => void;
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
  onChangePromoType,
  onChangeDiscount,
  onChangeFreeQty,
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
  const selectedProductIdsSignature = useMemo(
    () =>
      lines
        .map((line) => line.productId)
        .filter((productId): productId is number => typeof productId === "number")
        .sort((a, b) => a - b)
        .join(","),
    [lines],
  );

  // Build a quick lookup of stock by product id
  const stockByProductId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of availableProducts) map[p.id] = p.quantityOnHand;
    return map;
  }, [availableProducts]);

  const columns = useMemo(
    () => [
      // ── Product ────────────────────────────────────────────────
      columnHelper.accessor("productId", {
        id: "product",
        header: "Product",
        meta: { align: "left" } satisfies TableColumnMeta,
        cell: (info) => (
          <div className="w-[240px] max-w-full">
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

      // ── Qty ────────────────────────────────────────────────────
      columnHelper.accessor("qty", {
        id: "qty",
        header: "Qty",
        size: 130,
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

      // ── Unit Price ─────────────────────────────────────────────
      columnHelper.accessor("unitPrice", {
        id: "unitPrice",
        header: "Unit Price (LKR)",
        size: 170,
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

      // ── Line Total (before promo) ──────────────────────────────
      columnHelper.display({
        id: "lineTotal",
        header: "Line Total",
        size: 160,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const { qty, unitPrice } = info.row.original;
          return (
            <span className="font-medium text-stone-700 tabular-nums">
              {formatCurrency(qty * unitPrice)}
            </span>
          );
        },
      }),

      // ── Promo Type selector ────────────────────────────────────
      columnHelper.accessor("promotionType", {
        id: "promotionType",
        header: "Promotion",
        size: 150,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const current = info.row.original.promotionType;
          return (
            <select
              value={current}
              onChange={(e) =>
                onChangePromoType(info.row.original.id, e.target.value as LinePromotionType)
              }
              className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[12px] text-stone-800 focus:border-[#1a5c2e] focus:outline-none [font-family:var(--font-dmsans)]"
            >
              {PROMO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        },
      }),

      // ── Promo Input (Discount % or Free Qty) ──────────────────
      columnHelper.display({
        id: "promoInput",
        header: "Promo Value",
        size: 175,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const line = info.row.original;
          const stock = line.productId ? (stockByProductId[line.productId] ?? 0) : 0;
          const maxFreeQty = Math.max(0, stock - line.qty);

          if (line.promotionType === "DISCOUNT") {
            return (
              <div className="flex items-center justify-center gap-1">
                <span className="inline-flex items-center justify-center rounded-md bg-amber-50 p-1 text-amber-600">
                  <Tag size={11} />
                </span>
                <NumericStepperInput
                  value={line.discount}
                  onChange={(value) =>
                    onChangeDiscount(line.id, clamp(Math.min(100, value), 0))
                  }
                  min={0}
                  max={100}
                  step={0.5}
                  precision={2}
                  minChars={5}
                  className="mx-auto"
                />
                <span className="text-[11px] text-stone-500">%</span>
              </div>
            );
          }

          if (line.promotionType === "FREE_QTY") {
            return (
              <div className="flex items-center justify-center gap-1">
                <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 p-1 text-emerald-600">
                  <Gift size={11} />
                </span>
                <NumericStepperInput
                  value={line.freeQty}
                  onChange={(value) =>
                    onChangeFreeQty(line.id, clamp(Math.min(maxFreeQty, value), 0))
                  }
                  min={0}
                  max={maxFreeQty}
                  step={1}
                  precision={0}
                  minChars={3}
                  className="mx-auto"
                />
                {maxFreeQty === 0 && (
                  <span className="text-[10px] text-red-500" title="No stock left for free qty">!</span>
                )}
              </div>
            );
          }

          // NONE — show dash
          return <span className="text-[12px] text-stone-400">—</span>;
        },
      }),

      // ── Net Line Total ─────────────────────────────────────────
      columnHelper.accessor("netLineTotal", {
        id: "netLineTotal",
        header: "Net Total",
        size: 160,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => {
          const line = info.row.original;
          const hasPromo = line.promotionType !== "NONE";
          return (
            <span className={`font-semibold tabular-nums ${hasPromo ? "text-[#1a5c2e]" : "text-stone-900"}`}>
              {formatCurrency(line.netLineTotal)}
            </span>
          );
        },
      }),

      // ── Remove ────────────────────────────────────────────────
      columnHelper.display({
        id: "actions",
        header: "Action",
        size: 100,
        meta: { align: "center", fixedWidth: true } satisfies TableColumnMeta,
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveLine(info.row.original.id)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700 transition hover:bg-red-100"
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
      isLoadingRelevantProducts,
      locationId,
      onChangeDiscount,
      onChangeFreeQty,
      onChangeProduct,
      onChangePromoType,
      onChangeQty,
      onChangeUnitPrice,
      onRemoveLine,
      productSelectOptions,
      selectedProductIdsSignature,
      stockByProductId,
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

      <TanStackTable data={lines} columns={columns} minWidthPx={1100} align="center" />

      <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
        <button
          type="button"
          onClick={onAddLine}
          disabled={!canAddInvoiceLines(locationId, availableProducts, isLoadingRelevantProducts)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] transition hover:bg-[#eeeffe] disabled:opacity-50 disabled:cursor-not-allowed [font-family:var(--font-dmsans)]"
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
