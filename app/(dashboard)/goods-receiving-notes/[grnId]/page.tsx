import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
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

  const totalQuantity = note.lines.reduce((sum: number, line) => sum + line.quantity, 0);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <BackNavigationLink
              href="/goods-receiving-notes"
              label="Back to Goods Receiving Notes"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <h1 className="text-[26px] leading-tight font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
              Goods Receiving Note {note.grn_number}
            </h1>
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
              lines={note.lines.map((line) => ({
                lineId: line.grn_line_id,
                productCode: line.product.product_code,
                productName: line.product.product_name,
                packSize: line.product.pack_size,
                quantity: line.quantity,
              }))}
              totalQuantity={totalQuantity}
            />
            {canDeleteGrn ? (
              <DeleteGoodsReceivingNoteButton grnId={note.grn_id} grnNumber={note.grn_number} />
            ) : null}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Agrinova IMS</p>
              <h2 className="mt-1 text-[20px] font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Goods Receiving Note
              </h2>
              <p className="mt-0.5 text-[12px] text-stone-600">{note.location.code} - {note.location.name}</p>
            </div>
            <div className="text-right text-[12px] text-stone-600">
              <p>
                <span className="font-medium text-stone-800">GRN No:</span> {note.grn_number}
              </p>
              <p>
                <span className="font-medium text-stone-800">GRN Date:</span> {formatDate(note.grn_date)}
              </p>
              <p>
                <span className="font-medium text-stone-800">Entry Type:</span>{" "}
                {ENTRY_TYPE_LABEL[note.entry_type as "LOCAL_PURCHASE" | "FOREIGN_IMPORT"]}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-stone-200">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[20%]" />
              <col className="w-[24%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-stone-50 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-600">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Code</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Pack Size</th>
                <th className="border-b border-stone-200 px-4 py-3 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              {note.lines.map((line) => (
                <tr key={line.grn_line_id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="border-r border-stone-200 px-4 py-3 font-medium text-stone-900">{line.product.product_name}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-stone-700 [font-family:var(--font-jetbrains)]">
                    {line.product.product_code}
                  </td>
                  <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.product.pack_size}</td>
                  <td className="px-4 py-3 text-center text-stone-700">{line.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end px-5 py-4">
          <div className="w-full max-w-[360px] space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-[13px]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-stone-700">
              <span>reference no</span>
              <span>{note.reference_no?.trim() ? note.reference_no : "-"}</span>
            </div>
            <div className="flex items-center justify-between text-[15px] font-semibold text-[#1a5c2e]">
              <span>total quantity</span>
              <span>{totalQuantity}</span>
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
            <p className="text-[11px] text-stone-500">{note.creator.username}</p>
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

export default GoodsReceivingNoteDetailPage;
