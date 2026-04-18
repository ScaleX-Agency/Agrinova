import type { SearchableSelectOption } from "@/components/SearchableSelect";
import type {
  CustomerOptionDto,
  InventoryLocationOptionDto,
  SalesRepOptionDto,
} from "@/types/api";
import type { AvailableProduct, InvoiceLine } from "./invoice-form.types";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const clamp = (value: number, min = 0) => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, value);
};

export const calculateLineTotal = (line: InvoiceLine) => {
  const lineSubtotal = line.qty * line.unitPrice;
  return Math.max(0, lineSubtotal - ((line.discount / 100) * lineSubtotal));
};

export const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

export const calculateInvoiceTotal = (lines: InvoiceLine[]) => {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
};

export const calculateInvoiceSubtotal = (lines: InvoiceLine[]) => {
  return lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
}


export const toSalesRepSelectOptions = (
  salesRepOptions: SalesRepOptionDto[],
): SearchableSelectOption[] => {
  return salesRepOptions.map((rep) => ({
    id: rep.id,
    label: rep.label,
  }));
};

export const toCustomerSelectOptions = (
  customerOptions: CustomerOptionDto[],
): SearchableSelectOption[] => {
  return customerOptions.map((customer) => ({
    id: customer.id,
    label: customer.label,
  }));
};

export const toInventoryLocationSelectOptions = (
  inventoryLocationOptions: InventoryLocationOptionDto[],
): SearchableSelectOption[] => {
  return inventoryLocationOptions.map((location) => ({
    id: location.id,
    label: `${location.label}`,
    description: location.code,
    searchText: `${location.code} ${location.label}`,
  }));
};

export const toProductSelectOptions = (
  availableProducts: AvailableProduct[],
): SearchableSelectOption[] => {
  return availableProducts.map((product) => ({
    id: product.id,
    label: `${product.name} [${product.packSize}]`,
    description: `Available: ${product.quantityOnHand}`,
    searchText: `${product.name} ${product.packSize}`,
  }));
};

export const hasValidLineItems = (lines: InvoiceLine[]) => {
  return lines.length > 0 && lines.every((line) => {
    const hasProduct = typeof line.productId === "number" && line.productId > 0;
    const hasValidQty = Number.isFinite(line.qty) && line.qty >= 1;
    const hasValidUnitPrice = Number.isFinite(line.unitPrice) && line.unitPrice >= 0;
    const hasValidDiscount = Number.isFinite(line.discount) && line.discount >= 0 && line.discount <= 100;
    const hasValidLineTotal = Number.isFinite(line.lineTotal) && line.lineTotal >= 0;

    return hasProduct && hasValidQty && hasValidUnitPrice && hasValidDiscount && hasValidLineTotal;
  });
};

export const canAddInvoiceLines = (
  locationId: number | null,
  availableProducts: AvailableProduct[],
  isLoadingRelevantProducts: boolean,
) => {
  return Boolean(locationId && availableProducts.length > 0 && !isLoadingRelevantProducts);
};

export const canSaveInvoice = (input: {
  invoiceNo: string;
  repId: number | null;
  customerId: number | null;
  locationId: number | null;
  invoiceDate: string;
  hasValidLineItems: boolean;
  isPending: boolean;
}) => {
  return (
    input.invoiceNo.trim().length > 0 &&
    Boolean(input.repId) &&
    Boolean(input.customerId) &&
    Boolean(input.locationId) &&
    Boolean(input.invoiceDate) &&
    input.hasValidLineItems &&
    !input.isPending
  );
};

export const buildInventorySignature = (
  locationId: number | null,
  availableProducts: AvailableProduct[],
) => {
  if (!locationId) return null;

  return availableProducts
    .map((product) => `${product.id}:${product.quantityOnHand}`)
    .join("|");
};
