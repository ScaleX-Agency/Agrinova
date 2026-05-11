import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import GinPrintButton from "./GinPrintButton";
import DeleteGoodsIssueNoteButton from "../DeleteGoodsIssueNoteButton";

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

const GoodsIssueNoteDetailPage = async ({
  params,
}: {
  params: Promise<{ ginId: string }>;
}) => {
  const ginId = Number((await params).ginId);

  if (!Number.isInteger(ginId) || ginId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const canDeleteGin = isAdminUser(currentUser);

  const note = await prisma.goodsIssueNote.findUnique({
    where: { gin_id: ginId },
    select: {
      gin_id: true,
      gin_number: true,
      is_active: true,
      gin_date: true,
      notes: true,
      created_at: true,
      updated_at: true,
      creator: {
        select: {
          full_name: true,
        },
      },
      invoice: {
        select: {
          invoice_id: true,
          invoice_number: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      location: {
        select: {
          code: true,
          name: true,
        },
      },
      lines: {
        orderBy: { gin_line_id: "asc" },
        select: {
          gin_line_id: true,
          quantity: true,
          product: {
            select: {
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

  const totalIssuedQty = note.lines.reduce((sum: number, line) => sum + line.quantity, 0);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <BackNavigationLink
              href="/goods-issue-notes"
              label="Back to Goods Issue Notes"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[26px] leading-tight font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Goods Issue Note {note.gin_number}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eeeffe] px-2.5 py-1 text-[11px] font-medium text-[#2b2d7e]">
                <CheckCircle size={14} className="shrink-0" />
                Issued
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GinPrintButton
              ginNumber={note.gin_number}
              ginDate={note.gin_date.toISOString()}
              invoiceNo={note.invoice?.invoice_number ?? null}
              customerName={note.customer.name}
              locationCode={note.location.code}
              locationName={note.location.name}
              notes={note.notes}
              lines={note.lines.map((line) => ({
                lineId: line.gin_line_id,
                productName: line.product.product_name,
                packSize: line.product.pack_size,
                quantity: line.quantity,
              }))}
            />
            {note.invoice?.invoice_id ? (
              <Link
                href={`/invoices/${note.invoice.invoice_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              >
                <FileText size={14} />
                View Invoice
              </Link>
            ) : null}
            {canDeleteGin ? <DeleteGoodsIssueNoteButton ginId={note.gin_id} ginNumber={note.gin_number} /> : null}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Agrinova IMS</p>
              <h2 className="mt-1 text-[20px] font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Goods Issue Note
              </h2>
              <p className="mt-0.5 text-[12px] text-stone-600">{note.location.code} - {note.location.name}</p>
            </div>
            <div className="text-right text-[12px] text-stone-600">
              <p>
                <span className="font-medium text-stone-800">GIN No:</span> {note.gin_number}
              </p>
              <p>
                <span className="font-medium text-stone-800">GIN Date:</span> {formatDate(note.gin_date)}
              </p>
              <p>
                <span className="font-medium text-stone-800">Customer:</span> {note.customer.name}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-stone-200">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="bg-stone-50 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-600">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center">Qty</th>
                <th className="border-b border-stone-200 px-4 py-3 text-left">Stock Movement</th>
              </tr>
            </thead>
            <tbody>
              {note.lines.map((line) => (
                <tr key={line.gin_line_id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="border-r border-stone-200 px-4 py-3 font-medium text-stone-900">{line.product.product_name}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.product.pack_size}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">{line.quantity}</td>
                  <td className="px-4 py-3 text-stone-700">Issued</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end px-5 py-4">
          <div className="w-full max-w-[360px] rounded-xl border border-stone-200 bg-stone-50 p-4 text-[13px]">
            <div className="flex items-center justify-between text-[15px] font-semibold text-[#1a5c2e]">
              <span>Total Issued Qty</span>
              <span>{totalIssuedQty}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Linked Notes
          </h2>
        </div>
        {note.invoice?.invoice_id ? (
          <Link
            href={`/invoices/${note.invoice.invoice_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-900 transition-colors hover:bg-indigo-100"
          >
            <FileText size={13} className="text-indigo-700" />
            {note.invoice.invoice_number}
          </Link>
        ) : (
          <p className="text-[12px] text-stone-500">No linked invoice.</p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Notes
          </h2>
        </div>
        <p className="whitespace-pre-wrap text-[13px] text-stone-700">{note.notes?.trim() ? note.notes : "No notes added."}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
          Record Metadata
        </h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
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
      </section>
    </section>
  );
};

export default GoodsIssueNoteDetailPage;
