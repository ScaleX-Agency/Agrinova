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
import type { AvailableProduct, FieldErrors, InvoiceLine } from "./invoice-form.types";
import {
  calculateInvoiceTotal,
  calculateLineTotal,
  getTodayDateInputValue,
  toCustomerSelectOptions,
  toInventoryLocationSelectOptions,
  toSalesRepSelectOptions,
  toProductSelectOptions,
  calculateInvoiceSubtotal,
} from "./invoice-form.utils";
import { getInvoiceFieldErrors } from "./invoice-form.validation";

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
      const result = (await response.json()) as CustomersByRepResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load customers for selected sales rep.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const salesRepQuery = useQuery<SalesRepOptionDto[], Error>({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps");
      const result = (await response.json()) as SalesRepsResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load sales representatives.");
      }
      return Array.isArray(result.data) ? result.data : [];
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
      const response = await fetch(`/api/inventory/${locationId}`);
      const result = (await response.json()) as StockByLocationResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load products for selected location.");
      }

      const rows = Array.isArray(result.data) ? result.data : [];
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

  useEffect(() => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.unitPriceEdited) return line;
        const selectedProductId = line.productId;
        if (typeof selectedProductId !== "number") return line;

        const currentProduct = availableProductsById[selectedProductId];
        if (!currentProduct || currentProduct.sellingPrice === line.unitPrice) return line;

        const updated = { ...line, unitPrice: currentProduct.sellingPrice };
        return { ...updated, lineTotal: calculateLineTotal(updated) };
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

  const addLine = useCallback(() => {
    const first = productsQuery.data?.[0];
    if (!first) {
      setProductsActionError("Select a location with available products before adding lines.");
      return;
    }

    setProductsActionError("");
    clearFieldErrors(["lines"]);
    setSubmitError("");

    setLines((prev) => {
      const nextId = nextLineIdRef.current;
      nextLineIdRef.current += 1;
      const nextLine: InvoiceLine = {
        id: nextId,
        productId: first.id,
        qty: 1,
        unitPrice: first.sellingPrice,
        unitPriceEdited: false,
        discount: 0,
        lineTotal: first.sellingPrice,
      };
      return [...prev, nextLine];
    });
  }, [clearFieldErrors, productsQuery.data]);

  const removeLine = useCallback((lineId: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  }, [clearFieldErrors]);

  const changeProduct = useCallback((lineId: number, productId: number | null) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const selected = productId ? availableProductsById[productId] : undefined;
        const nextQty = selected ? Math.min(Math.max(1, line.qty), selected.quantityOnHand) : line.qty;
        const nextUnitPrice = selected ? selected.sellingPrice : line.unitPrice;
        const updated: InvoiceLine = {
          ...line,
          productId,
          qty: nextQty,
          unitPrice: nextUnitPrice,
          unitPriceEdited: false,
        };
        return {
          ...updated,
          lineTotal: calculateLineTotal(updated),
        };
      }),
    );
  }, [availableProductsById, clearFieldErrors]);

  const changeQty = useCallback((lineId: number, qty: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const selected = line.productId ? availableProductsById[line.productId] : undefined;
        const boundedQty = selected ? Math.min(Math.max(1, qty), selected.quantityOnHand) : Math.max(1, qty);
        const updated = { ...line, qty: boundedQty };
        return { ...updated, lineTotal: calculateLineTotal(updated) };
      }),
    );
  }, [availableProductsById, clearFieldErrors]);

  const changeUnitPrice = useCallback((lineId: number, unitPrice: number) => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const updated = { ...line, unitPrice: Math.max(0, unitPrice), unitPriceEdited: true };
        return { ...updated, lineTotal: calculateLineTotal(updated) };
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
        const updated = { ...line, discount: nextDiscount };
        return { ...updated, lineTotal: calculateLineTotal(updated) };
      }),
    );
  }, [clearFieldErrors]);

  const clearProducts = useCallback(() => {
    clearFieldErrors(["lines"]);
    setSubmitError("");
    setLines([]);
  }, [clearFieldErrors]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      const normalizedLine = {
        ...line,
        unitPrice,
      };

      return {
        productId: selectedProductId,
        quantity: line.qty,
        unitPrice,
        discount: line.discount,
        lineTotal: calculateLineTotal(normalizedLine),
      };
    });

    try {
      const result = await createInvoiceMutation.mutateAsync({
        invoiceNo: invoiceNo.trim(),
        invoiceDate,
        customerId: activeCustomerId,
        repId: activeRepId,
        locationId: activeLocationId,
        lines: payloadLines,
        createdBy: 1,
      });

      router.push(`/invoices/${result.invoiceId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save invoice.");
    }
  };

  return (
    <section className="space-y-5">
      <InvoicePageHeader />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <InvoiceDetailsSection
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          invoiceNoError={fieldErrors.invoiceNo}
          invoiceDateError={fieldErrors.invoiceDate}
          salesRepError={fieldErrors.salesRep}
          customerError={fieldErrors.customer}
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
          onChangeDiscount={changeDiscount}
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
    </section>
  );
};

export default NewInvoicePage;
