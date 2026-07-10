import React from "react";

export function ClerkProvider({ children }: { children: React.ReactNode; publishableKey?: string }) {
  return <>{children}</>;
}

export function useUser() {
  return {
    isLoaded: true,
    user: {
      id: "mock_admin_clerk_id",
      firstName: "Admin",
      lastName: "User",
      fullName: "Admin User",
      username: "admin",
      emailAddresses: [{ emailAddress: "admin@agrinova.com" }],
    },
  };
}

export function useClerk() {
  return {
    signOut: async (options?: { redirectUrl?: string }) => {
      window.location.href = options?.redirectUrl || "/login";
    },
  };
}

export function useSignIn() {
  return {
    isLoaded: true,
    signIn: {
      status: "complete",
      create: async () => ({ status: "complete" }),
      firstFactorImage: null,
    },
  };
}
