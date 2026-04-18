import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CustomersPageClient from "@/components/customers/CustomersPageClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Customers" };

function canManageCustomers(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

export default async function CustomersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <CustomersPageClient
      canEdit={canManageCustomers(currentUser.role?.role_name)}
    />
  );
}
