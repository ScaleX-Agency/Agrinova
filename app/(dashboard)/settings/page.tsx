import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import SettingsPageClient from "@/components/settings/SettingsPageClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isAdminUser(currentUser)) {
    redirect("/dashboard");
  }

  return <SettingsPageClient />;
}
