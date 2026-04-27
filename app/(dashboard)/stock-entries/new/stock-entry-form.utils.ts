import type { StockEntryLine } from "./stock-entry-form.types";
import type { SearchableSelectOption } from "@/components/SearchableSelect";
import type { InventoryLocationOptionDto } from "@/types/api";

export const getTodayDateInputValue = (() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
})();

export const hasValidLineItems = (lines: StockEntryLine[]): boolean => {
  return lines.some((line) => line.productId !== null && line.productId !== 0 && line.qty > 0);
};

export const normalizeStockEntryLines = (lines: StockEntryLine[]): StockEntryLine[] => {
  return lines.filter((line) => line.productId !== null && line.productId !== 0 && line.qty > 0);
};

export const toLocationSelectOptions = (
  locations: InventoryLocationOptionDto[],
): SearchableSelectOption[] => {
  return locations.map((loc) => ({
    id: loc.id,
    label: loc.label,
    searchText: `${loc.code} ${loc.label}`,
  }));
};
