import type { SearchableSelectOption } from "@/components/SearchableSelect";
import type { InventoryLocationOptionDto } from "@/types/api";
import type { GinLine, ProductOption } from "./gin-form.types";

export const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

type QuantityByProduct = Record<number, number>;

const getAllocationLimit = (
  productId: number,
  productStockById: QuantityByProduct,
  remainingInvoiceQtyByProduct: QuantityByProduct,
) => {
  const stockLimit = productStockById[productId] ?? 0;
  const invoiceLimit = remainingInvoiceQtyByProduct[productId] ?? 0;
  return Math.min(stockLimit, invoiceLimit);
};

export const clamp = (value: number, min = 1, max?: number) => {
  if (Number.isNaN(value)) return min;
  let next = Math.max(min, value);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
};

export const hasValidLineItems = (lines: GinLine[]) => {
  return lines.length > 0 && lines.every((line) => {
    const hasProduct = typeof line.productId === "number" && line.productId > 0;
    const hasQuantity = Number.isFinite(line.quantity) && line.quantity >= 0;
    return hasProduct && hasQuantity;
  });
};

export const getLineAvailableQuantity = (
  lineId: number,
  productId: number | null,
  lines: GinLine[],
  productStockById: QuantityByProduct,
  remainingInvoiceQtyByProduct: QuantityByProduct,
) => {
  if (typeof productId !== "number") return undefined;

  const allocationLimit = getAllocationLimit(productId, productStockById, remainingInvoiceQtyByProduct);
  const usedByOtherRows = lines
    .filter((line) => line.id !== lineId && line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);

  return Math.max(0, allocationLimit - usedByOtherRows);
};

export const clampLinesToAvailability = (
  lines: GinLine[],
  productStockById: QuantityByProduct,
  remainingInvoiceQtyByProduct: QuantityByProduct,
) => {
  const usedByProduct = new Map<number, number>();

  return lines.map((line) => {
    if (typeof line.productId !== "number") return line;

    const allocationLimit = getAllocationLimit(line.productId, productStockById, remainingInvoiceQtyByProduct);
    const alreadyUsed = usedByProduct.get(line.productId) ?? 0;
    const maxQuantity = Math.max(0, allocationLimit - alreadyUsed);
    const nextQuantity = Math.min(line.quantity, maxQuantity);

    usedByProduct.set(line.productId, alreadyUsed + nextQuantity);

    if (nextQuantity === line.quantity) {
      return line;
    }

    return {
      ...line,
      quantity: nextQuantity,
    };
  });
};

export const normalizeGinLines = (
  lines: GinLine[],
  productStockById: QuantityByProduct,
  remainingInvoiceQtyByProduct: QuantityByProduct,
) => {
  return clampLinesToAvailability(lines, productStockById, remainingInvoiceQtyByProduct);
};

export const toLocationSelectOptions = (
  locations: InventoryLocationOptionDto[],
): SearchableSelectOption[] => {
  return locations.map((location) => ({
    id: location.id,
    label: `${location.code} - ${location.label}`,
    description: location.label,
    searchText: `${location.code} ${location.label}`,
  }));
};

export const toProductSelectOptions = (products: ProductOption[]): SearchableSelectOption[] => {
  return products.map((product) => ({
    id: product.id,
    label: product.label,
    description: `Available: ${product.stock}`,
    searchText: product.label,
  }));
};