import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import DeleteRepackButton from "./DeleteRepackButton";

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

const ProductRepackDetailPage = async ({
  params,
}: {
  params: Promise<{ repackId: string }>;
}) => {
  const repackId = Number((await params).repackId);
  if (!Number.isInteger(repackId) || repackId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const canDeleteRepack = isAdminUser(currentUser);

  const repack = await prisma.productRepack.findUnique({
    where: { repack_id: repackId },
    select: {
      repack_id: true,
      repack_number: true,
      repack_date: true,
      notes: true,
      created_at: true,
      updated_at: true,
      is_active: true,
      source_quantity: true,
      target_quantity: true,
      location: {
        select: {
          code: true,
          name: true,
        },
      },
      source_product: {
        select: {
          product_code: true,
          product_name: true,
          pack_size: true,
        },
      },
      target_product: {
        select: {
          product_code: true,
          product_name: true,
          pack_size: true,
        },
      },
      creator: {
        select: {
          full_name: true,
          username: true,
        },
      },
    },
  });

  if (!repack || !repack.is_active) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <BackNavigationLink
              href="/repacking"
              label="Back to Product Repacking"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <h1 className="text-[26px] leading-tight font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
              Product Repack {repack.repack_number}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-stone-500">
              <div>
                <span className="font-semibold text-stone-700">Location:</span>{" "}
                {repack.location.code} - {repack.location.name}
              </div>
              <div>
                <span className="font-semibold text-stone-700">Repack Date:</span>{" "}
                {formatDate(repack.repack_date)}
              </div>
              <div>
                <span className="font-semibold text-stone-700">Created By:</span>{" "}
                {repack.creator.full_name}
              </div>
            </div>

            {canDeleteRepack && (
              <div>
                <DeleteRepackButton
                  repackId={repack.repack_id}
                  repackNo={repack.repack_number}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Source Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Boxes size={18} className="text-[#2b2d7e]" />
            <h2 className="text-[15px] font-semibold text-stone-900">Source (Deducted)</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Product Code</p>
              <p className="text-[14px] font-medium text-stone-900 [font-family:var(--font-jetbrains)]">
                {repack.source_product.product_code}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Product Name</p>
              <p className="text-[14px] font-medium text-stone-900">{repack.source_product.product_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Pack Size</p>
              <p className="text-[14px] font-medium text-stone-900">{repack.source_product.pack_size}</p>
            </div>
            <div className="rounded-xl bg-[#eeeffe] p-3 border border-[#c0c3f0]/30">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2b2d7e]">Repacked Quantity</p>
              <p className="text-[20px] font-bold text-[#2b2d7e] mt-1">{repack.source_quantity}</p>
            </div>
          </div>
        </div>

        {/* Target Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Boxes size={18} className="text-[#1a5c2e]" />
            <h2 className="text-[15px] font-semibold text-stone-900">Target (Produced)</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Product Code</p>
              <p className="text-[14px] font-medium text-stone-900 [font-family:var(--font-jetbrains)]">
                {repack.target_product.product_code}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Product Name</p>
              <p className="text-[14px] font-medium text-stone-900">{repack.target_product.product_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Pack Size</p>
              <p className="text-[14px] font-medium text-stone-900">{repack.target_product.pack_size}</p>
            </div>
            <div className="rounded-xl bg-[#e8f5ec] p-3 border border-[#b6d9be]/30">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1a5c2e]">Produced Quantity</p>
              <p className="text-[20px] font-bold text-[#1a5c2e] mt-1">{repack.target_quantity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log and Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-400">Notes</h3>
          <p className="text-[13.5px] text-stone-700 leading-relaxed min-h-[40px]">
            {repack.notes || <span className="text-stone-400 italic">No notes provided.</span>}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 text-[12.5px] text-stone-500">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-400 mb-1">Audit Information</h3>
          <div>
            <span className="font-semibold text-stone-700">Created:</span>{" "}
            {formatDateTime(repack.created_at)}
          </div>
          <div>
            <span className="font-semibold text-stone-700">Last Updated:</span>{" "}
            {formatDateTime(repack.updated_at)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductRepackDetailPage;
