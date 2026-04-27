"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  CustomersByRepResponse,
  CreateInvoiceRequestDto,
  CreateInvoiceResponse,
  InventoryLocationsResponse,
  StockByLocationResponse,
  SalesRepOptionDto,
  SalesRepsResponse,
} from "@/types/api";
import InvoiceProductsSection from "./InvoiceProductsSection";
import InvoiceDetailsSection from "./InvoiceDetailsSection";
import InvoicePageHeader from "./InvoicePageHeader";
import InvoiceTotalsSection from "./InvoiceTotalsSection";
import type { AvailableProduct, FieldErrors, InvoiceLine, LinePromotionType } from "./invoice-form.types";
import {
  calculateInvoiceTotal,
  calculateLineTotal,
  calculateNetLineTotal,
  getTodayDateInputValue,
  toCustomerSelectOptions,
  toInventoryLocationSelectOptions,
  toSalesRepSelectOptions,
  toProductSelectOptions,
  calculateInvoiceSubtotal,
} from "./invoice-form.utils";
import ConfirmationModal from "@/components/ConfirmationModal";

import { getInvoiceFieldErrors } from "./invoice-form.validation";

type SalesRepListResponse = {
  salesReps?: Array<{
    rep_id: number;
    full_name: string;
  }>;
  error?: string;
};

type CustomersByRepLegacyResponse = {
  customers?: Array<{
    customer_id: number;
    name: string;
  }>;
  error?: string;
};

const NewInvoicePage = () => {
  const router = useRouter();
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateInputValue);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [repId, setRepId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const nextLineIdRef = useRef(1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [productsActionError, setProductsActionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submitPayload, setSubmitPayload] = useState<CreateInvoiceRequestDto | null>(null);

  const clearFieldErrors = useCallback((keys: (keyof FieldErrors)[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
  }, []);

  const handleInvoiceNoChange = useCallback((value: string) => {
    setInvoiceNo(value);
    clearFieldErrors(["invoiceNo"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleInvoiceDateChange = useCallback((value: string) => {
    setInvoiceDate(value);
    clearFieldErrors(["invoiceDate"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleRepChange = useCallback((value: number | null) => {
    setRepId(value);
    setCustomerId(null);
    clearFieldErrors(["salesRep", "customer"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleCustomerChange = useCallback((value: number | null) => {
    setCustomerId(value);
    clearFieldErrors(["customer"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleLocationChange = useCallback((value: number | null) => {
    if (value === null) {
      setLocationId(null);
      setLines([]);
      setProductsActionError("");
      clearFieldErrors(["location", "lines"]);
      setSubmitError("");
      return;
    }

    setLocationId(value);
    setLines([]);
    setProductsActionError("");
    clearFieldErrors(["location", "lines"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const customersQuery = useQuery({
    queryKey: ["customers-by-rep", repId],
    enabled: repId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/sales-reps/${repId}/customers`);
      const result = (await response.json()) as CustomersByRepResponse & CustomersByRepLegacyResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load customers for selected sales rep.");

      if (Array.isArray(result.data)) {
        return result.data;
      }

      if (Array.isArray(result.customers)) {
        return result.customers.map((customer) => ({
          id: customer.customer_id,
          label: customer.name,
        }));
      }

      return [];
    },
  });

  const salesRepQuery = useQuery<SalesRepOptionDto[], Error>({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps");
      const result = (await response.json()) as SalesRepsResponse & SalesRepListResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load sales representatives.");
      }

      if (Array.isArray(result.data)) {
        return result.data;
      }

      if (Array.isArray(result.salesReps)) {
        return result.salesReps.map((salesRep) => ({
          id: salesRep.rep_id,
          label: salesRep.full_name,
        }));
      }

      return [];
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/locations");
      const result = (await response.json()) as InventoryLocationsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load inventory locations.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const productsQuery = useQuery<AvailableProduct[], Error>({
    queryKey: ["invoice-products", locationId],
    enabled: locationId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/inventory/${locationId}?all=true`);
      const result = (await response.json()) as { stock?: StockByLocationResponse["data"]; error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load products for selected location.");
      }

      const rows = Array.isArray(result.stock) ? result.stock : [];
      return rows
        .filter((row) => row.quantity_on_hand > 0)
        .map((row) => ({
          id: row.product_id,
          name: row.product_name,
          packSize: row.pack_size,
          sellingPrice: Number(row.selling_price),
          quantityOnHand: row.quantity_on_hand,
        }));
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: CreateInvoiceRequestDto) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as CreateInvoiceResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to save invoice.");
      if (!result.data) throw new Error("Invoice response payload is missing.");
      return result.data;
    },
  });

  const customerSelectOptions = useMemo(
    () => toCustomerSelectOptions(customersQuery.data ?? []),
    [customersQuery.data],
  );

  const repSelectOptions = useMemo(
    () => toSalesRepSelectOptions(salesRepQuery.data ?? []),
    [salesRepQuery.data],
  );

  const locationSelectOptions = useMemo(
    () => toInventoryLocationSelectOptions(locationsQuery.data ?? []),
    [locationsQuery.data],
  );

  const productSelectOptions = useMemo(
    () => toProductSelectOptions(productsQuery.data ?? []),
    [productsQuery.data],
  );

  const availableProductsById = useMemo(() => {
    const next: Record<number, AvailableProduct> = {};
    for (const product of productsQuery.data ?? []) {
      next[product.id] = product;
    }
    return next;
  }, [productsQuery.data]);

  // Sync unit prices when products change (unless manually overridden)
  useEffect(() => {
  // eslint-disable-next-line
    setLines((prev) =>
      prev.map((line) => {
        if (line.unitPriceEdited) return line;
        const selectedProductId = line.productId;
        if (typeof selectedProductId !== "number") return line;

        const currentProduct = availableProductsById[selectedProductId];
        if (!currentProduct || currentProduct.sellingPrice === line.unitPrice) return line;

        const updated = {
          ...line,
          unitPrice: currentProduct.sellingPrice,
          lineTotal: calculateLineTotal({ qty: line.qty, unitPrice: currentProduct.sellingPrice }),
        };
        return { ...updated, netLineTotal: calculateNetLineTotal(updated) };
      }),
    );
  }, [availableProductsById]);

  const invoiceTotal = useMemo(
    () => calculateInvoiceTotal(lines),
    [lines],
  );

  const invoiceSubtotal = useMemo(
    () => calculateInvoiceSubtotal(lines),
    [lines],
  );

  const invoiceDiscountTotal = useMemo(
    () => Math.max(0, invoiceSubtotal - invoiceTotal),
    [invoiceSubtotal, invoiceTotal],
  );

  /**
   * Rebuild lineTotal and netLineTotal for a line after any field change.
   */
  const recomputeLine = (line: InvoiceLine): InvoiceLine => {
    const lineTotal = calculateLineTotal(line);
    return { ...line, lineTotal, netLineTotal: calculateNetLineTotal({ ...line, lineTotal }) };
  };

  const addLine = useCallback(() => {
    const selectedProductIds = new Set(
      lines
        .map((line) => line.productId)
        .filter((productId): productId is number => typeof productId === "number"),
    );

    const firstAvailable = (productsQuery.data ?? []).find((product) => !selectedProductIds.has(product.id));
    if (!firstAvailable) {
      setProductsActionError("Select a location with available products before adding lines.");
      return;
    }

    setProductsActionError("");
    clearFieldErrors(["lines"]);
    setSubmitError("");

    setLines((prev) => {
      const nextId = nextLineIdRef.current;
      nextLineIdRef.current += 1;
      const lineTotal = firstAvailable.sellingPrice;
      const nextLine: InvoiceLine = {
        id: nextId,
        productId: firstAvailable.id,
        qty: 1,
        unitPrice: firstAvailable.sellingPrice,
        unitPriceEdited: false,
        lineTotal,
        promotionType: "NONE",
        discount: 0,
        freeQty: 0,
        netLineTotal: lineTotal,
      };
      return [...prev, nextLine];
    });
  }, [clearFieldErrors, lines, productsQuery.data]);

  const removeLine = useCallback((lineId: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  }, [clearFieldErrors]);

  const changeProduct = useCallback((lineId: number, productId: number | null) => {
    if (
      typeof productId === "number" &&
      lines.some((line) => line.id !== lineId && line.productId === productId)
    ) {
      setProductsActionError("The same product cannot be selected more than once.");
      return;
    }

    clearFieldErrors(["lines"]);
    setProductsActionError("");
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const selected = productId ? availableProductsById[productId] : undefined;
        const nextQty = selected ? Math.min(Math.max(1, line.qty), selected.quantityOnHand) : line.qty;
        const nextUnitPrice = selected ? selected.sellingPrice : line.unitPrice;
        // Reset promo when product changes
        const updated: InvoiceLine = {
          ...line,
          productId,
          qty: nextQty,
          unitPrice: nextUnitPrice,
          unitPriceEdited: false,
          promotionType: "NONE",
          discount: 0,
          freeQty: 0,
          lineTotal: 0,
          netLineTotal: 0,
        };
        return recomputeLine(updated);
      }),
    );
  // eslint-disable-next-line
  }, [availableProductsById, clearFieldErrors, lines]);

  const changeQty = useCallback((lineId: number, qty: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const selected = line.productId ? availableProductsById[line.productId] : undefined;
        const maxQty = selected ? selected.quantityOnHand - line.freeQty : Infinity;
        const boundedQty = Math.min(Math.max(1, qty), maxQty);
        // Also re-clamp freeQty in case new qty leaves no room
        const maxFreeQty = selected ? Math.max(0, selected.quantityOnHand - boundedQty) : line.freeQty;
        const nextFreeQty = Math.min(line.freeQty, maxFreeQty);
        return recomputeLine({ ...line, qty: boundedQty, freeQty: nextFreeQty });
      }),
    );
  // eslint-disable-next-line
  }, [availableProductsById, clearFieldErrors]);

  const changeUnitPrice = useCallback((lineId: number, unitPrice: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return recomputeLine({ ...line, unitPrice: Math.max(0, unitPrice), unitPriceEdited: true });
      }),
    );
  // eslint-disable-next-line
  }, [clearFieldErrors]);

  const changePromoType = useCallback((lineId: number, promoType: LinePromotionType) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        // Reset both promo values when switching type
        return recomputeLine({ ...line, promotionType: promoType, discount: 0, freeQty: 0 });
      }),
    );
  }, [clearFieldErrors]);

  const changeDiscount = useCallback((lineId: number, discount: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const nextDiscount = Math.max(0, Math.min(100, discount));
        return recomputeLine({ ...line, discount: nextDiscount });
      }),
    );
  }, [clearFieldErrors]);

  const changeFreeQty = useCallback((lineId: number, freeQty: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const selected = line.productId ? availableProductsById[line.productId] : undefined;
        const maxFreeQty = selected ? Math.max(0, selected.quantityOnHand - line.qty) : freeQty;
        const bounded = Math.max(0, Math.min(maxFreeQty, freeQty));
        return recomputeLine({ ...line, freeQty: bounded });
      }),
    );
  }, [availableProductsById, clearFieldErrors]);

  const clearProducts = useCallback(() => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines([]);
  }, [clearFieldErrors]);

  const handleValidationAndPrepare = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    setProductsActionError("");

    const activeCustomerId = customerId;
    const activeRepId = repId;
    const activeLocationId = locationId;

    const nextFieldErrors = getInvoiceFieldErrors({
      invoiceNo,
      invoiceDate,
      repId: activeRepId,
      customerId: activeCustomerId,
      locationId: activeLocationId,
      lines,
    });

    setFieldErrors(nextFieldErrors);
    const firstError = Object.values(nextFieldErrors).find(Boolean);
    if (firstError) return;
    if (activeCustomerId == null || activeRepId == null || activeLocationId == null) return;

    const payloadLines = lines.map((line) => {
      const selectedProductId = line.productId;
      if (typeof selectedProductId !== "number") {
        throw new Error("Each line must have a selected product.");
      }

      const currentProduct = availableProductsById[selectedProductId];
      const unitPrice = line.unitPriceEdited ? line.unitPrice : (currentProduct?.sellingPrice ?? line.unitPrice);
      const updated = { ...line, unitPrice };

      return {
        productId: selectedProductId,
        quantity: updated.qty,
        unitPrice,
        lineTotal: calculateLineTotal(updated),
        promotionType: updated.promotionType,
        discount: updated.discount,
        freeQuantity: updated.freeQty,
        netLineTotal: calculateNetLineTotal(recomputeLine(updated)),
      };
    });

    const uniqueProductIds = new Set(payloadLines.map((line) => line.productId));
    if (uniqueProductIds.size !== payloadLines.length) {
      setSubmitError("Each product can only be added once in an invoice.");
      setFieldErrors((prev) => ({ ...prev, lines: "Each product can only be added once." }));
      return;
    }

    setSubmitPayload({
      invoiceNo: invoiceNo.trim(),
      invoiceDate,
      customerId: activeCustomerId,
      repId: activeRepId,
      locationId: activeLocationId,
      lines: payloadLines,
      createdBy: 1,
    });
    setIsConfirmModalOpen(true);
  };

  const confirmSave = async () => {
    if (!submitPayload) return;
    try {
      const result = await createInvoiceMutation.mutateAsync(submitPayload);
      router.push(`/invoices/${result.invoiceId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save invoice.");
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <section className="space-y-5">
      <InvoicePageHeader />

      <form className="space-y-4" onSubmit={handleValidationAndPrepare}>
        <InvoiceDetailsSection
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          invoiceNoError={fieldErrors.invoiceNo}
          invoiceDateError={fieldErrors.invoiceDate}
          salesRepError={
            fieldErrors.salesRep ??
            (salesRepQuery.error instanceof Error ? salesRepQuery.error.message : undefined)
          }
          customerError={
            fieldErrors.customer ??
            (customersQuery.error instanceof Error ? customersQuery.error.message : undefined)
          }
          locationError={fieldErrors.location}
          repId={repId}
          customerId={customerId}
          locationId={locationId}
          salesRepSelectOptions={repSelectOptions}
          customerSelectOptions={customerSelectOptions}
          inventoryLocationSelectOptions={locationSelectOptions}
          salesRepLoading={salesRepQuery.isLoading}
          customersLoading={customersQuery.isLoading}
          locationsLoading={locationsQuery.isLoading}
          hasRepSelected={repId !== null}
          onInvoiceNoChange={handleInvoiceNoChange}
          onInvoiceDateChange={handleInvoiceDateChange}
          onRepChange={handleRepChange}
          onCustomerChange={handleCustomerChange}
          onLocationChange={handleLocationChange}
        />

        <InvoiceProductsSection
          lines={lines}
          locationId={locationId}
          availableProducts={productsQuery.data ?? []}
          productSelectOptions={productSelectOptions}
          productsError={productsQuery.error instanceof Error ? productsQuery.error.message : ""}
          isLoadingRelevantProducts={productsQuery.isLoading}
          fieldError={fieldErrors.lines}
          productsActionError={productsActionError}
          onChangeProduct={changeProduct}
          onChangeQty={changeQty}
          onChangeUnitPrice={changeUnitPrice}
          onChangePromoType={changePromoType}
          onChangeDiscount={changeDiscount}
          onChangeFreeQty={changeFreeQty}
          onRemoveLine={removeLine}
          onAddLine={addLine}
          onClearProducts={clearProducts}
        />

        <InvoiceTotalsSection
          subtotal={invoiceSubtotal}
          discountTotal={invoiceDiscountTotal}
          total={invoiceTotal}
          submitError={submitError}
          successMessage={successMessage}
          isSaving={createInvoiceMutation.isPending}
        />
      </form>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmSave}
        title="Confirm New Invoice"
        description={
          <>
            Are you sure you want to create invoice <strong>{invoiceNo}</strong>? 
            <br />
            double check before confirm
          </>
        }
        confirmLabel="Create Invoice"
        isLoading={createInvoiceMutation.isPending}
      />
    </section>
  );
};

export default NewInvoicePage;
