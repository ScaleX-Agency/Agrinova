import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CustomerDetailPageClient from "@/components/customers/CustomerDetailPageClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Customer Details" };

interface CustomerDetailPageProps {
  params: Promise<{ customerId: string }>;
}

function canManageCustomers(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { customerId } = await params;

  return (
    <CustomerDetailPageClient
      customerId={customerId}
      canEdit={canManageCustomers(currentUser.role?.role_name)}
    />
  );
}
