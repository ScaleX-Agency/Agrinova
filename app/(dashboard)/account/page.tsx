import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountPageClient from "@/components/account/AccountPageClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <AccountPageClient />;
}
