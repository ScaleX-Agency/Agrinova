import { auth } from "@/lib/clerk-server-mock";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    include: { role: true },
  });

  return user;
}

export function isAdminUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.role?.role_name?.toLowerCase() === "admin";
}

export function isAdminOrOperatorUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  const role = user?.role?.role_name?.toLowerCase();
  return role === "admin" || role === "operator";
}
