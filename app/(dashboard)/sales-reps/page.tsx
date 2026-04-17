import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SalesRepsPageClient from "@/components/sales-reps/SalesRepsPageClient";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sales Reps" };

export default async function SalesRepsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <SalesRepsPageClient canEdit={isAdminUser(currentUser)} />;
}
