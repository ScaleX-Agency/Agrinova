"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
  GoodsIssueNotesResponse,
  InventoryLocationsResponse,
  InvoiceDetailResponse,
  StockByLocationResponse,
} from "@/types/api";
import type { GinFieldErrors, GinLine, ProductOption } from "./gin-form.types";
import {
  clamp,
  getLineAvailableQuantity,
  getTodayDateInputValue,
  hasValidLineItems,
  normalizeGinLines,
  toLocationSelectOptions,
} from "./gin-form.utils";
import { getFirstGoodsIssueNoteFieldError, getGoodsIssueNoteFieldErrors } from "./gin-form.validation";
import GinDetailsSection from "./GinDetailsSection";
import GinProductsSection from "./GinProductsSection";
import GinSubmitSection from "./GinSubmitSection";

const parsePositiveInt = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getNextGinNumber = (notes: GoodsIssueNotesResponse["data"], dateValue: string) => {
  const current = new Date(dateValue);
  if (Number.isNaN(current.getTime())) return "";

  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const prefix = `GIN-${year}${month}-`;

  const latestSequence = (notes ?? [])
    .map((note) => note.ginNumber)
    .filter((ginNumber) => ginNumber.startsWith(prefix))
    .map((ginNumber) => Number(ginNumber.split("-").at(-1)))
    .filter((sequence) => Number.isFinite(sequence))
    .reduce((max, sequence) => Math.max(max, sequence), 0);

  return `${prefix}${String(latestSequence + 1).padStart(3, "0")}`;
};

const getQuantityByProduct = (lines: { productId: number; quantity: number }[]) => {
  const next: Record<number, number> = {};
  for (const line of lines) {
    next[line.productId] = (next[line.productId] ?? 0) + line.quantity;
  }
  return next;
};

const NewGoodsIssueNotePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvoiceId = useMemo(() => parsePositiveInt(searchParams.get("invoiceId")), [searchParams]);

  const [ginNumber, setGinNumber] = useState("");
  const [ginDate, setGinDate] = useState(getTodayDateInputValue);
  const [invoiceId, setInvoiceId] = useState<number | null>(initialInvoiceId);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [preparedBy, setPreparedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [lines, setLines] = useState<GinLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<GinFieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const initializedInvoiceIdRef = useRef<number | null>(null);
  const maxDefaultAppliedInvoiceIdRef = useRef<number | null>(null);

  useEffect(() => {
    setInvoiceId(initialInvoiceId);
  }, [initialInvoiceId]);

  const notesQuery = useQuery<GoodsIssueNotesResponse["data"], Error>({
    queryKey: ["goods-issue-notes"],
    queryFn: async () => {
      const response = await fetch("/api/goods-issue-notes");
      const result = (await response.json()) as GoodsIssueNotesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load goods issue notes.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoice-options"],
    queryFn: async () => {
      const response = await fetch("/api/invoices?issuableOnly=true");
      const result = (await response.json()) as { data?: { id: number; invoiceNo: string; customerName: string; repName: string }[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const invoiceDetailQuery = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    enabled: invoiceId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = (await response.json()) as InvoiceDetailResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoice details.");
      return result.data;
    },
  });

  const relatedInvoiceGinsQuery = useQuery<GoodsIssueNotesResponse["data"], Error>({
    queryKey: ["invoice-gins", invoiceId],
    enabled: invoiceId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/goods-issue-notes?invoiceId=${invoiceId}&includeLines=true`);
      const result = (await response.json()) as GoodsIssueNotesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load related goods issue notes.");
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

  const locationProductsQuery = useQuery<StockByLocationResponse["data"], Error>({
    queryKey: ["gin-products", locationId],
    enabled: locationId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/inventory/${locationId}`);
      const result = (await response.json()) as StockByLocationResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load products for selected location.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateGoodsIssueNoteRequestDto) => {
      const response = await fetch("/api/goods-issue-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as CreateGoodsIssueNoteResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to save goods issue note.");
      if (!result.data) throw new Error("Goods issue note response payload is missing.");
      return result.data;
    },
  });

  const invoiceOptions = useMemo(
    () => (invoicesQuery.data ?? []).map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNo} • ${invoice.customerName} • ${invoice.repName}` })),
    [invoicesQuery.data],
  );

  const locationOptions = useMemo(
    () => toLocationSelectOptions(locationsQuery.data ?? []),
    [locationsQuery.data],
  );

  const invoiceQtyByProduct = useMemo(
    () => getQuantityByProduct(invoiceDetailQuery.data?.lines ?? []),
    [invoiceDetailQuery.data],
  );

  const savedIssuedQtyByProduct = useMemo(() => {
    const savedLines = (relatedInvoiceGinsQuery.data ?? []).flatMap((note) => note.lines ?? []);
    return getQuantityByProduct(savedLines);
  }, [relatedInvoiceGinsQuery.data]);

  const remainingInvoiceQtyByProduct = useMemo(() => {
    const next: Record<number, number> = {};
    for (const [productIdText, invoiceQty] of Object.entries(invoiceQtyByProduct)) {
      const productId = Number(productIdText);
      const alreadyIssued = savedIssuedQtyByProduct[productId] ?? 0;
      next[productId] = Math.max(0, invoiceQty - alreadyIssued);
    }
    return next;
  }, [invoiceQtyByProduct, savedIssuedQtyByProduct]);

  const productStockById = useMemo(() => {
    const next: Record<number, number> = {};
    for (const row of locationProductsQuery.data ?? []) {
      next[row.product_id] = row.quantity_on_hand;
    }
    return next;
  }, [locationProductsQuery.data]);

  const productOptions = useMemo<ProductOption[]>(
    () =>
      (locationProductsQuery.data ?? []).map((row) => {
        const remainingInvoiceQty = remainingInvoiceQtyByProduct[row.product_id] ?? 0;
        const availableQty = Math.min(row.quantity_on_hand, remainingInvoiceQty);

        return {
          id: row.product_id,
          label: `${row.product_name} [${row.pack_size}]`,
          stock: row.quantity_on_hand,
          description: `Stock: ${row.quantity_on_hand} • Invoice left: ${remainingInvoiceQty}`,
          searchText: `${row.product_name} ${row.pack_size}`,
          disabled: availableQty <= 0,
        };
      }),
    [locationProductsQuery.data, remainingInvoiceQtyByProduct],
  );

  const getCalculatedMaxQtyForProduct = useCallback((productId: number) => {
    const stockQty = productStockById[productId] ?? 0;
    const remainingInvoiceQty = remainingInvoiceQtyByProduct[productId] ?? 0;
    return Math.max(0, Math.min(stockQty, remainingInvoiceQty));
  }, [productStockById, remainingInvoiceQtyByProduct]);

  const invoiceCustomerName = invoiceDetailQuery.data?.customerName ?? "";
  const invoiceRepName = invoiceDetailQuery.data?.repName ?? "";

  useEffect(() => {
    if (notesQuery.data) {
      setGinNumber((current) => current || getNextGinNumber(notesQuery.data, ginDate));
    }
  }, [ginDate, notesQuery.data]);

  useEffect(() => {
    if (!invoiceDetailQuery.data || invoiceId === null) return;
    if (initializedInvoiceIdRef.current === invoiceId) return;

    setGinDate(invoiceDetailQuery.data.invoiceDate.slice(0, 10));
    setLocationId(invoiceDetailQuery.data.locationId);
    const initialLines = normalizeGinLines(
      invoiceDetailQuery.data.lines
        .map((line, index) => ({
          id: index + 1,
          productId: line.productId,
          quantity: getCalculatedMaxQtyForProduct(line.productId),
        }))
        .filter((line) => line.quantity >= 0),
      productStockById,
      remainingInvoiceQtyByProduct,
    );
    setLines(initialLines);
    initializedInvoiceIdRef.current = invoiceId;
  }, [invoiceDetailQuery.data, invoiceId, productStockById, remainingInvoiceQtyByProduct, getCalculatedMaxQtyForProduct]);

  useEffect(() => {
    if (!invoiceDetailQuery.data || invoiceId === null) return;
    if (initializedInvoiceIdRef.current !== invoiceId) return;

    setLines((prev) => normalizeGinLines(prev, productStockById, remainingInvoiceQtyByProduct));
  }, [invoiceDetailQuery.data, invoiceId, productStockById, remainingInvoiceQtyByProduct]);

  useEffect(() => {
    if (invoiceId === null) return;
    if (!invoiceDetailQuery.data) return;
    if (initializedInvoiceIdRef.current !== invoiceId) return;
    if (!locationProductsQuery.data || locationProductsQuery.data.length === 0) return;
    if (maxDefaultAppliedInvoiceIdRef.current === invoiceId) return;

    setLines((prev) => {
      const withMaxDefaults = prev.map((line) => {
        if (typeof line.productId !== "number") return line;
        const maxQty = getLineAvailableQuantity(line.id, line.productId, prev, productStockById, remainingInvoiceQtyByProduct);
        return {
          ...line,
          quantity: maxQty ?? 0,
        };
      });

      return normalizeGinLines(withMaxDefaults, productStockById, remainingInvoiceQtyByProduct);
    });

    maxDefaultAppliedInvoiceIdRef.current = invoiceId;
  }, [
    invoiceDetailQuery.data,
    invoiceId,
    locationProductsQuery.data,
    productStockById,
    remainingInvoiceQtyByProduct,
  ]);

  useEffect(() => {
    if (invoiceId !== null) return;
    initializedInvoiceIdRef.current = null;
    maxDefaultAppliedInvoiceIdRef.current = null;
    setLocationId(null);
    setLines([]);
  }, [invoiceId]);

  const clearFieldErrors = useCallback((keys: (keyof GinFieldErrors)[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  }, []);

  const handleInvoiceChange = useCallback((value: number | null) => {
    initializedInvoiceIdRef.current = null;
    maxDefaultAppliedInvoiceIdRef.current = null;
    setInvoiceId(value);
    clearFieldErrors(["invoice", "lines"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleLocationChange = useCallback((value: number | null) => {
    setLocationId(value);
    clearFieldErrors(["location", "lines"]);
    setSubmitError("");
  }, [clearFieldErrors]);

  const handleUpdateLine = useCallback((lineId: number, key: "productId" | "quantity", value: number | null) => {
    setLines((prev) => {
      const updated = prev.map((line) => {
        if (line.id !== lineId) return line;

        if (key === "productId") {
          const nextMax = getLineAvailableQuantity(lineId, value, prev, productStockById, remainingInvoiceQtyByProduct);
          return {
            ...line,
            productId: value,
            quantity: typeof value === "number" ? (nextMax ?? 0) : 0,
          };
        }

        const max = getLineAvailableQuantity(lineId, line.productId, prev, productStockById, remainingInvoiceQtyByProduct);
        const nextQuantity = clamp(typeof value === "number" ? value : line.quantity, 0, max);
        return { ...line, quantity: nextQuantity };
      });

      return normalizeGinLines(updated, productStockById, remainingInvoiceQtyByProduct);
    });
    clearFieldErrors(["lines"]);
    setSubmitError("");
  }, [clearFieldErrors, productStockById, remainingInvoiceQtyByProduct]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const nextFieldErrors = getGoodsIssueNoteFieldErrors({
      ginNumber,
      ginDate,
      invoiceId,
      locationId,
      preparedBy,
      receivedBy,
      lines,
    });

    setFieldErrors(nextFieldErrors);
    const firstError = getFirstGoodsIssueNoteFieldError(nextFieldErrors);
    if (firstError) return;
    if (invoiceId == null || locationId == null) return;
    if (!hasValidLineItems(lines)) return;

    const payloadLines = lines
      .filter((line) => typeof line.productId === "number" && line.quantity > 0)
      .map((line) => ({
        productId: line.productId as number,
        quantity: line.quantity,
      }));

    if (payloadLines.length === 0) {
      setSubmitError("Enter quantity for at least one product before saving.");
      return;
    }

    const payload: CreateGoodsIssueNoteRequestDto = {
      ginNumber: ginNumber.trim(),
      ginDate,
      invoiceId,
      locationId,
      preparedBy: preparedBy.trim(),
      receivedBy: receivedBy.trim(),
      createdBy: 1,
      lines: payloadLines,
    };

    try {
      const result = await saveMutation.mutateAsync(payload);
      setSuccessMessage(`Goods Issue Note saved successfully (ID: ${result.ginId}).`);
      router.push(`/invoices/${invoiceId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save goods issue note.");
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Operations</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Goods Issue Note
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <FileText size={14} />
            New Invoice
          </Link>
          <Link
            href="/goods-issue-notes"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={14} />
            Back to Goods Issue Notes
          </Link>
        </div>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <GinDetailsSection
          ginNumber={ginNumber}
          ginDate={ginDate}
          invoiceId={invoiceId}
          invoiceCustomerName={invoiceCustomerName}
          invoiceRepName={invoiceRepName}
          locationId={locationId}
          preparedBy={preparedBy}
          receivedBy={receivedBy}
          ginNumberError={fieldErrors.ginNumber}
          ginDateError={fieldErrors.ginDate}
          invoiceError={fieldErrors.invoice}
          locationError={fieldErrors.location}
          preparedByError={fieldErrors.preparedBy}
          receivedByError={fieldErrors.receivedBy}
          invoiceOptions={invoiceOptions}
          locationOptions={locationOptions}
          invoicesLoading={invoicesQuery.isLoading}
          locationsLoading={locationsQuery.isLoading}
          onGinNumberChange={setGinNumber}
          onGinDateChange={setGinDate}
          onInvoiceChange={handleInvoiceChange}
          onLocationChange={handleLocationChange}
          onPreparedByChange={setPreparedBy}
          onReceivedByChange={setReceivedBy}
        />

        <GinProductsSection
          lines={lines}
          locationId={locationId}
          productOptions={productOptions}
          productStockById={productStockById}
          invoiceQtyByProduct={invoiceQtyByProduct}
          issuedQtyByProduct={savedIssuedQtyByProduct}
          remainingInvoiceQtyByProduct={remainingInvoiceQtyByProduct}
          isProductsLoading={locationProductsQuery.isLoading}
          productsError={locationProductsQuery.error instanceof Error ? locationProductsQuery.error.message : ""}
          onUpdateLine={handleUpdateLine}
        />

        <GinSubmitSection
          submitError={submitError}
          successMessage={successMessage}
          isSaving={saveMutation.isPending}
        />
      </form>
    </section>
  );
};

export default NewGoodsIssueNotePage;
