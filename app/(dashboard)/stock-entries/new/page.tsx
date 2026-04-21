"use client";

  // eslint-disable-next-line
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  // eslint-disable-next-line
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { CreateStockEntryDto } from "@/types/inventory";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import StockEntryDetailsSection from "./StockEntryDetailsSection";
import StockEntryProductsSection from "./StockEntryProductsSection";
   
import StockEntrySubmitSection from "./StockEntrySubmitSection";
  // eslint-disable-next-line
import { getTodayDateInputValue, hasValidLineItems, normalizeStockEntryLines, toLocationSelectOptions } from "./stock-entry-form.utils";
import { getStockEntryFieldErrors, getFirstStockEntryFieldError } from "./stock-entry-form.validation";
import type { StockEntryFieldErrors, StockEntryLine, ProductOption } from "./stock-entry-form.types";
import type { InventoryLocationsResponse } from "@/types/api";

const getNextGrnNumber = (dateValue: string) => {
  const current = new Date(dateValue);
  if (Number.isNaN(current.getTime())) return "";

  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  return `GRN-${year}${month}`;
};

const NewStockEntryPage = () => {
  const router = useRouter();

  const [entryType, setEntryType] = useState<"LOCAL_PURCHASE" | "FOREIGN_IMPORT">("LOCAL_PURCHASE");
  const [date, setDate] = useState(getTodayDateInputValue);
  const [grnNumber, setGrnNumber] = useState(getNextGrnNumber(getTodayDateInputValue));
  const [reference, setReference] = useState("");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<StockEntryLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<StockEntryFieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const locationsQuery = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      const result = (await response.json()) as InventoryLocationsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load inventory locations.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products-for-stock-entry"],
   
    queryFn: async () => {
   
      const response = await fetch("/api/products?page=1&pageSize=500");
  // eslint-disable-next-line
      const result = (await response.json()) as { products?: any[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to load products.");
      return Array.isArray(result.products) ? result.products : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateStockEntryDto) => {
      const response = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
   
        body: JSON.stringify(payload),
   
      });
   

  // eslint-disable-next-line
      const result = (await response.json()) as { error?: string; data?: any };
      if (!response.ok) throw new Error(result.error ?? "Failed to save stock entry.");
      return result.data;
    },
  });

  // Set default location to first available
  useEffect(() => {
    if (locationsQuery.data && locationsQuery.data.length > 0 && !locationId) {
      setLocationId(locationsQuery.data[0].id);
    }
  }, [locationsQuery.data, locationId]);

  // Update GRN number when date changes
  useEffect(() => {
    setGrnNumber(getNextGrnNumber(date));
  }, [date]);

  const locationOptions = useMemo(() => toLocationSelectOptions(locationsQuery.data ?? []), [locationsQuery.data]);

  const productOptions = useMemo<ProductOption[]>(
    () =>
      (productsQuery.data ?? []).map((product) => ({
        id: product.product_id,
        label: `${product.product_code} - ${product.product_name} [${product.pack_size}]`,
        searchText: `${product.product_code} ${product.product_name} ${product.pack_size}`,
      })),
    [productsQuery.data],
  );

  const handleAddLine = useCallback(() => {
    setLines((prev) => {
      const selectedIds = new Set(
        prev
          .map((line) => line.productId)
          .filter((productId): productId is number => typeof productId === "number"),
      );

      const nextProductId =
        productOptions.find((option) => !selectedIds.has(option.id))?.id ??
        productOptions[0]?.id ??
        null;

      return [...prev, { id: Date.now(), productId: nextProductId, qty: 1 }];
    });
  }, [productOptions]);

  const handleRemoveLine = useCallback((lineId: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== lineId) : prev));
  }, []);

  const handleChangeProduct = useCallback((lineId: number, productId: number | null) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, productId: productId ?? null } : line)),
    );
  }, []);

  const handleChangeQty = useCallback((lineId: number, qty: number) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, qty: Math.max(1, qty) } : line)),
    );
  }, []);

  const handleSave = async () => {
    setFieldErrors({});
    setSubmitError("");

    const normalizedLines = normalizeStockEntryLines(lines);
    const errors = getStockEntryFieldErrors({
      date,
      locationId,
      lines: normalizedLines,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError(getFirstStockEntryFieldError(errors));
      return;
    }

    const payload: CreateStockEntryDto = {
      entry_type: entryType,
      date,
      location_id: locationId!,
      reference_no: reference.trim() || null,
      notes: notes.trim() || null,
      grn_number: grnNumber || null,
      items: normalizedLines.map((line) => ({
        product_id: line.productId!,
        quantity: line.qty,
        unit_price: 0,
      })),
    };

    try {
      await saveMutation.mutateAsync(payload);
      router.push("/goods-receiving-notes");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save stock entry.");
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3">
        <div>
          <BackNavigationLink
            href="/goods-receiving-notes"
            label="Back to Goods Receiving Notes"
            className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700"
          />
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
            Inventory
          </p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] font-semibold">
            New Stock Entry
          </h1>
          <p className="text-[13px] text-stone-500">
            Record a new stock receipt from local purchase or foreign import.
          </p>
        </div>
      </header>

      <StockEntryDetailsSection
        entryType={entryType}
        date={date}
        grnNumber={grnNumber}
        reference={reference}
        locationId={locationId}
        locationOptions={locationOptions}
        dateError={fieldErrors.date}
        locationError={fieldErrors.location}
        locationsLoading={locationsQuery.isLoading}
        onEntryTypeChange={setEntryType}
        onDateChange={setDate}
        onGrnNumberChange={setGrnNumber}
        onReferenceChange={setReference}
        onLocationChange={setLocationId}
      />

      <StockEntryProductsSection
        lines={lines}
        locationId={locationId}
        productOptions={productOptions}
        isProductsLoading={productsQuery.isLoading}
        fieldError={fieldErrors.lines}
        onAddLine={handleAddLine}
        onRemoveLine={handleRemoveLine}
        onChangeProduct={handleChangeProduct}
        onChangeQty={handleChangeQty}
      />

      <StockEntrySubmitSection
        notes={notes}
        isSaving={saveMutation.isPending}
        submitError={submitError}
        onNotesChange={setNotes}
        onSave={handleSave}
        onCancel={() => router.push("/goods-receiving-notes")}
      />
    </section>
  );
};

export default NewStockEntryPage;
