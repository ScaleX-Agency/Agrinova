import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OperatorDetailPageClient from "@/components/operators/OperatorDetailPageClient";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Operator Details" };

interface OperatorDetailPageProps {
  params: Promise<{ operatorId: string }>;
}

export default async function OperatorDetailPage({
  params,
}: OperatorDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isAdminUser(currentUser)) {
    redirect("/dashboard");
  }

  const { operatorId } = await params;

  return <OperatorDetailPageClient operatorId={operatorId} />;
}
