import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SalesRepDetailPageClient from "@/components/sales-reps/SalesRepDetailPageClient";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sales Rep Details" };

interface SalesRepDetailPageProps {
  params: Promise<{ repId: string }>;
}

export default async function SalesRepDetailPage({
  params,
}: SalesRepDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { repId } = await params;

  return (
    <SalesRepDetailPageClient
      repId={repId}
      canEdit={isAdminUser(currentUser)}
    />
  );
}
