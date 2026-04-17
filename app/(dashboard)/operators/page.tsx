import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OperatorsPageClient from "@/components/operators/OperatorsPageClient";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Operators" };

export default async function OperatorsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isAdminUser(currentUser)) {
    redirect("/dashboard");
  }

  return <OperatorsPageClient />;
}
