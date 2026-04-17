import type { SearchableSelectOption } from "@/components/SearchableSelect";
import type { InventoryLocationOptionDto } from "@/types/api";
import type { GinLine, ProductOption } from "./gin-form.types";

export const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

export const clamp = (value: number, min = 1, max?: number) => {
  if (Number.isNaN(value)) return min;
  let next = Math.max(min, value);
  if (typeof max === "number") next = Math.min(max, next);
  return next;
};

export const hasValidLineItems = (lines: GinLine[]) => {
  return lines.length > 0 && lines.every((line) => {
    const hasProduct = typeof line.productId === "number" && line.productId > 0;
    const hasQuantity = Number.isFinite(line.quantity) && line.quantity > 0;
    return hasProduct && hasQuantity;
  });
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