"use client";

import { useSignIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      if (!signIn) throw new Error("Clerk sign in resource missing");
      
      const response = await signIn.create({
        identifier: values.username,
        password: values.password,
      });

      if (response?.error) {
         const err = response.error as any;
         throw new Error(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Authentication failed");
      }

      // If we made it here, the API call succeeded and response.error is null.
      // Now we check the reactive signIn object's status.
      if (signIn.status === "complete") {
        await setActive({ session: signIn.createdSessionId });
        return response;
      } else {
        const requiredFactors = signIn.supportedSecondFactors?.map((f: any) => f.strategy).join(', ');
        throw new Error(`Incomplete sign in. Clerk requires: ${signIn.status} (Factors: ${requiredFactors})`);
      }
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error: any) => {
      setGlobalError(error.errors?.[0]?.message || error.message || "Invalid styling or credentials.");
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setGlobalError("");
    if (!signIn) {
      setGlobalError("Clerk is not loaded yet. Please wait or refresh the page.");
      return;
    }
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div 
        className="w-full max-w-md p-8 rounded-2xl" 
        style={{ 
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div className="text-center mb-8">
          <h1 
            className="text-2xl font-bold mb-2" 
            style={{ 
              fontFamily: 'var(--font-display)', 
              color: 'var(--color-navy)' 
            }}
          >
            Agrinova IMS
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm">
            Sign in to continue
          </p>
        </div>

        {globalError && (
          <div 
            className="mb-4 p-3 rounded-lg text-sm" 
            style={{ 
              backgroundColor: 'var(--color-danger-bg)', 
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger)' 
            }}
          >
            {globalError}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Username</label>
            <input
              {...form.register("username")}
              className="form-input w-full p-2 rounded-md"
              style={{
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Enter your username"
            />
            {form.formState.errors.username && (
              <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                {form.formState.errors.username.message}
              </span>
            )}
          </div>

          <div className="form-group mt-4">
            <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Password</label>
            <input
              {...form.register("password")}
              type="password"
              className="form-input w-full p-2 rounded-md"
              style={{
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="••••••••"
            />
            {form.formState.errors.password && (
              <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                {form.formState.errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending || fetchStatus === "fetching" || !signIn}
            className="w-full mt-6 py-2.5 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: (loginMutation.isPending || fetchStatus === "fetching" || !signIn) ? 'var(--color-green-mid)' : 'var(--color-green)',
              color: 'white',
              fontWeight: 500
            }}
          >
            {loginMutation.isPending ? "Signing in..." : ((fetchStatus === "fetching" || !signIn) ? "Loading..." : "Sign in")}
          </button>
        </form>
      </div>
    </div>
  );
}
