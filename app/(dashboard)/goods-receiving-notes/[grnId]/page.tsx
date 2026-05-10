import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Package,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import GrnPrintButton from "./GrnPrintButton";
import DeleteGoodsReceivingNoteButton from "../DeleteGoodsReceivingNoteButton";

const ENTRY_TYPE_LABEL: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "Local Purchase",
  FOREIGN_IMPORT: "Foreign Import",
};

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });


  // eslint-disable-next-line
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const GoodsReceivingNoteDetailPage = async ({
  params,
}: {
  params: Promise<{ grnId: string }>;
}) => {
  const grnId = Number((await params).grnId);

  if (!Number.isInteger(grnId) || grnId <= 0) {
    notFound();
  }
  const currentUser = await getCurrentUser();
  const canDeleteGrn = isAdminUser(currentUser);

  const note = await prisma.goodsReceivingNote.findUnique({
    where: { grn_id: grnId },
    select: {
      grn_id: true,
      is_active: true,
      grn_number: true,
      grn_date: true,
      entry_type: true,
      reference_no: true,
      notes: true,
      created_at: true,
      updated_at: true,

      creator: {
        select: {
          full_name: true,
          username: true,
        },
      },
      location: {
        select: {
          code: true,
          name: true,
        },
      },
      lines: {
        orderBy: { grn_line_id: "asc" },
        select: {
          grn_line_id: true,
          quantity: true,
          product: {
            select: {
              product_code: true,
              product_name: true,
              pack_size: true,
            },
          },
        },
      },
    },
  });

  if (!note || !note.is_active) {
    notFound();
  }

   
  const totalQuantity = note.lines.reduce(
  // eslint-disable-next-line
    (sum: number, line: any) => sum + line.quantity,
    0,
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <BackNavigationLink
              href="/goods-receiving-notes"
              label="Back to Goods Receiving Notes"
              className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Inventory Document
            </p>
            <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
              Goods Receiving Note {note.grn_number}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GrnPrintButton
            grnNumber={note.grn_number}
            grnDate={note.grn_date.toISOString()}
            entryType={note.entry_type as "LOCAL_PURCHASE" | "FOREIGN_IMPORT"}
            locationCode={note.location.code}
            locationName={note.location.name}
            referenceNo={note.reference_no}
            notes={note.notes}
   
            createdBy={note.creator.full_name}
   
            createdByUsername={note.creator.username}
  // eslint-disable-next-line
            lines={note.lines.map((line: any) => ({
              lineId: line.grn_line_id,
              productCode: line.product.product_code,
              productName: line.product.product_name,
              packSize: line.product.pack_size,
              quantity: line.quantity,
            }))}
            totalQuantity={totalQuantity}
          />
          {canDeleteGrn ? (
            <DeleteGoodsReceivingNoteButton
              grnId={note.grn_id}
              grnNumber={note.grn_number}
            />
          ) : null}
        </div>
      </div>

      {/* Meta Data Section */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
          Record Metadata
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-[11px] text-stone-500">Created By</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{note.creator.full_name}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Created At</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(note.created_at)}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Last Updated</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(note.updated_at)}</p>
          </div>

        </div>
        {note.notes && (
          <div className="mt-3">
            <p className="text-[11px] text-stone-500">Notes</p>
            <p className="mt-0.5 text-[13px] text-stone-800">{note.notes}</p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                GRN Date
              </p>
              <p className="mt-1 text-[15px] font-semibold text-stone-900">
                {formatDate(note.grn_date)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-700">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Entry Type
              </p>
              <p className="mt-1 text-[15px] font-semibold text-stone-900">
                {ENTRY_TYPE_LABEL[note.entry_type as "LOCAL_PURCHASE" | "FOREIGN_IMPORT"]}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
              <MapPin size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Location
              </p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">
                {note.location.code}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {note.location.name}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-700">
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Line Count
              </p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">
                {note.lines.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Received Products
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-600 font-semibold">
              <tr>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">
                  Product
                </th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">
                  Code
                </th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">
                  Pack Size
                </th>
  {/* eslint-disable-next-line */}
                <th className="border-b border-stone-200 px-5 py-3.5 text-center">
                  Qty
  // eslint-disable-next-line
  // eslint-disable-next-line
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
  {/* eslint-disable-next-line */}
              {note.lines.map((line: any) => (
                <tr
                  key={line.grn_line_id}
                  className="transition-colors hover:bg-stone-50"
                >
                  <td className="border-r border-stone-200 px-5 py-3.5 text-left font-medium text-stone-900">
                    {line.product.product_name}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-left text-stone-700 [font-family:var(--font-jetbrains)]">
                    {line.product.product_code}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-left text-stone-700">
                    {line.product.pack_size}
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium text-stone-700">
                    {line.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            Created By
          </p>
          <div className="mt-1.5">
            <p className="text-[18px] font-semibold text-stone-900">
              {note.creator.full_name}
            </p>
            <p className="text-[11px] text-stone-500">
              {note.creator.username}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            Reference No
          </p>
          <p className="mt-1.5 text-[18px] font-semibold text-stone-900">
            {note.reference_no ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            Total Quantity
          </p>
          <p className="mt-1.5 text-[20px] font-semibold text-[#1a5c2e]">
            {totalQuantity} units
          </p>
        </div>
      </section>

      {note.notes && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Notes
          </h2>
          <p className="mt-2 text-[13px] text-stone-700 whitespace-pre-wrap">
            {note.notes}
          </p>
        </section>
      )}
    </section>
  );
};

export default GoodsReceivingNoteDetailPage;
