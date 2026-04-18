"use client";

import { useSignIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

const identifierSchema = z.object({
  identifier: z.string().trim().min(1, "Email is required"),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const verificationSchema = z.object({
  code: z.string().trim().min(1, "Verification code is required"),
});

type IdentifierFormValues = z.infer<typeof identifierSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;
type FirstFactorOption = { strategy: string; safeIdentifier?: string };
type SecondFactorOption = {
  strategy: string;
  safeIdentifier?: string;
};
type ClerkMethodResult = { error: unknown | null };
type IdentifierResult =
  | { status: "complete" }
  | { status: "needs_password"; safeIdentifier: string }
  | { status: "needs_second_factor"; safeIdentifier: string };
type PasswordResult =
  | { status: "complete" }
  | { status: "needs_second_factor"; safeIdentifier: string };

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const firstError = (
      error as { errors: Array<{ longMessage?: string; message?: string }> }
    ).errors[0];
    if (firstError?.longMessage || firstError?.message) {
      return (
        firstError.longMessage ?? firstError.message ?? "Authentication failed"
      );
    }
  }

  if (error instanceof Error) return error.message;
  return "Authentication failed";
}

function throwIfClerkError(result: ClerkMethodResult) {
  if (result.error) {
    throw result.error;
  }
}

function listFactorStrategies(
  factors: ReadonlyArray<{ strategy: string }> | null | undefined,
): string {
  return factors?.map((factor) => factor.strategy).join(", ") ?? "none";
}

function getEmailCodeSecondFactor(
  factors: ReadonlyArray<SecondFactorOption> | null | undefined,
): SecondFactorOption | undefined {
  return factors?.find((factor) => factor.strategy === "email_code");
}

function getIdentifierHint(
  factors: ReadonlyArray<FirstFactorOption> | null | undefined,
  fallbackIdentifier: string,
): string {
  const firstWithHint = factors?.find((factor) => !!factor.safeIdentifier);
  return firstWithHint?.safeIdentifier ?? fallbackIdentifier;
}

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");
  const [step, setStep] = useState<"identifier" | "password" | "second_factor">("identifier");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [safeIdentifier, setSafeIdentifier] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");

  const identifierForm = useForm<IdentifierFormValues>({
    resolver: zodResolver(identifierSchema),
    defaultValues: {
      identifier: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const activateSession = async () => {
    const createdSessionId = signIn?.createdSessionId;
    if (!createdSessionId) {
      throw new Error("Sign in succeeded but no session was created.");
    }
    await setActive({ session: createdSessionId });
  };

  const resetSignIn = async () => {
    if (!signIn) return;
    const resetResult = await signIn.reset();
    throwIfClerkError(resetResult);
  };

  const identifierMutation = useMutation({
    mutationFn: async (
      values: IdentifierFormValues,
    ): Promise<IdentifierResult> => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      await resetSignIn();

      const response = await signIn.create({
        identifier: values.identifier.trim(),
      });
      throwIfClerkError(response);
      const status = signIn.status;

      if (status === "complete") {
        await activateSession();
        return { status: "complete" };
      }

      if (status === "needs_first_factor") {
        const firstFactors =
          signIn.supportedFirstFactors as ReadonlyArray<FirstFactorOption>;
        const hasPasswordFactor = !!firstFactors?.some(
          (factor) => factor.strategy === "password",
        );

        if (!hasPasswordFactor) {
          throw new Error(
            `Password first-factor is not available. Supported factors: ${listFactorStrategies(firstFactors)}`,
          );
        }

        return {
          status: "needs_password",
          safeIdentifier: getIdentifierHint(
            firstFactors,
            values.identifier.trim(),
          ),
        };
      }

      if (status === "needs_second_factor") {
        const secondFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;
        const emailCodeFactor = getEmailCodeSecondFactor(secondFactors);

        if (!emailCodeFactor) {
          throw new Error(
            `Second-factor verification is required, but email code is not available. Supported factors: ${listFactorStrategies(secondFactors)}`,
          );
        }

        const sendCodeResult = await signIn.mfa.sendEmailCode();
        throwIfClerkError(sendCodeResult);

        return {
          status: "needs_second_factor",
          safeIdentifier:
            emailCodeFactor.safeIdentifier ?? values.identifier.trim(),
        };
      }

      throw new Error(
        `Incomplete sign in. Clerk requires: ${status ?? "unknown"} (First factors: ${listFactorStrategies(
          signIn.supportedFirstFactors as ReadonlyArray<FirstFactorOption>,
        )}; Second factors: ${listFactorStrategies(signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>)})`,
      );
    },
    onSuccess: (result) => {
      if (result.status === "complete") {
        router.push("/");
        return;
      }

      if (result.status === "needs_password") {
        setStep("password");
        setSafeIdentifier(result.safeIdentifier);
        setVerificationNotice("");
        passwordForm.reset();
        return;
      }

      setStep("second_factor");
      setSafeIdentifier(result.safeIdentifier);
      setVerificationNotice("A verification code was sent to your email.");
      verificationForm.reset();
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues): Promise<PasswordResult> => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      const response = await signIn.password({
        password: values.password,
      });
      throwIfClerkError(response);
      const status = signIn.status;

      if (status === "complete") {
        await activateSession();
        return { status: "complete" };
      }

      if (status === "needs_second_factor") {
        const secondFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;
        const emailCodeFactor = getEmailCodeSecondFactor(secondFactors);

        if (!emailCodeFactor) {
          throw new Error(
            `Second-factor verification is required, but email code is not available. Supported factors: ${listFactorStrategies(secondFactors)}`,
          );
        }

        const sendCodeResult = await signIn.mfa.sendEmailCode();
        throwIfClerkError(sendCodeResult);

        return {
          status: "needs_second_factor",
          safeIdentifier:
            emailCodeFactor.safeIdentifier || safeIdentifier || identifierValue,
        };
      }

      throw new Error(
        `Password step did not complete. Clerk status: ${status ?? "unknown"}`,
      );
    },
    onSuccess: (result) => {
      if (result.status === "complete") {
        router.push("/");
        return;
      }

      setStep("second_factor");
      setSafeIdentifier(result.safeIdentifier);
      setVerificationNotice("A verification code was sent to your email.");
      verificationForm.reset();
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const verifySecondFactorMutation = useMutation({
    mutationFn: async (values: VerificationFormValues) => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      const response = await signIn.mfa.verifyEmailCode({
        code: values.code.trim(),
      });
      throwIfClerkError(response);

      if (signIn.status !== "complete") {
        throw new Error("Verification code is invalid or expired.");
      }

      await activateSession();
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      const response = await signIn.mfa.sendEmailCode();
      throwIfClerkError(response);
    },
    onSuccess: () => {
      setGlobalError("");
      setVerificationNotice("A new verification code has been sent.");
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const onSubmitIdentifier = (values: IdentifierFormValues) => {
    setGlobalError("");
    setVerificationNotice("");
    setIdentifierValue(values.identifier.trim());
    if (!signIn) {
      setGlobalError(
        "Clerk is not loaded yet. Please wait or refresh the page.",
      );
      return;
    }
    identifierMutation.mutate(values);
  };

  const onSubmitPassword = (values: PasswordFormValues) => {
    setGlobalError("");
    setVerificationNotice("");
    passwordMutation.mutate(values);
  };

  const onSubmitVerification = (values: VerificationFormValues) => {
    setGlobalError("");
    verifySecondFactorMutation.mutate(values);
  };

  const goBackToIdentifier = async () => {
    try {
      await resetSignIn();
      setStep("identifier");
      setGlobalError("");
      setVerificationNotice("");
      setSafeIdentifier("");
      setIdentifierValue("");
      passwordForm.reset();
      verificationForm.reset();
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-navy)",
            }}
          >
            Agrinova IMS
          </h1>
          <p
            style={{ color: "var(--color-text-secondary)" }}
            className="text-sm"
          >
            {step === "identifier" && "Sign in to continue"}
            {step === "password" && "Enter your password"}
            {step === "second_factor" && "Verify your email code"}
          </p>
        </div>

        {globalError && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              border: "1px solid var(--color-danger)",
            }}
          >
            {globalError}
          </div>
        )}

        {step === "identifier" ? (
          <form
            onSubmit={identifierForm.handleSubmit(onSubmitIdentifier)}
            className="space-y-4"
          >
            <div className="form-group">
              <label
                className="form-label"
                style={{ color: "var(--color-text-primary)" }}
              >
                Email
              </label>
              <input
                {...identifierForm.register("identifier")}
                className="form-input w-full p-2 rounded-md"
                style={{
                  border: "1.5px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="you@example.com"
              />
              {identifierForm.formState.errors.identifier && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-danger)" }}
                >
                  {identifierForm.formState.errors.identifier.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={
                identifierMutation.isPending ||
                fetchStatus === "fetching" ||
                !signIn
              }
              className="w-full mt-6 py-2.5 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  identifierMutation.isPending ||
                  fetchStatus === "fetching" ||
                  !signIn
                    ? "var(--color-green-mid)"
                    : "var(--color-green)",
                color: "white",
                fontWeight: 500,
              }}
            >
              {identifierMutation.isPending
                ? "Continuing..."
                : fetchStatus === "fetching" || !signIn
                  ? "Loading..."
                  : "Continue"}
            </button>
          </form>
        ) : step === "password" ? (
          <form
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            className="space-y-4"
          >
            <div
              className="mb-2 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--color-surface-2)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {safeIdentifier || identifierValue}
            </div>
            <div className="form-group">
              <label
                className="form-label"
                style={{ color: "var(--color-text-primary)" }}
              >
                Password
              </label>
              <input
                {...passwordForm.register("password")}
                type="password"
                className="form-input w-full p-2 rounded-md"
                style={{
                  border: "1.5px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text-primary)",
                }}
              />
              {passwordForm.formState.errors.password && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-danger)" }}
                >
                  {passwordForm.formState.errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={
                passwordMutation.isPending ||
                fetchStatus === "fetching" ||
                !signIn
              }
              className="w-full mt-6 py-2.5 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  passwordMutation.isPending ||
                  fetchStatus === "fetching" ||
                  !signIn
                    ? "var(--color-green-mid)"
                    : "var(--color-green)",
                color: "white",
                fontWeight: 500,
              }}
            >
              {passwordMutation.isPending
                ? "Verifying..."
                : fetchStatus === "fetching" || !signIn
                  ? "Loading..."
                  : "Continue"}
            </button>

            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={goBackToIdentifier}
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Use a different email
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={verificationForm.handleSubmit(onSubmitVerification)}
            className="space-y-4"
          >
            {verificationNotice && (
              <div
                className="mb-2 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--color-info-bg)",
                  color: "var(--color-info)",
                  border: "1px solid var(--color-info)",
                }}
              >
                {verificationNotice}
                {safeIdentifier ? ` (${safeIdentifier})` : ""}
              </div>
            )}

            <div className="form-group">
              <label
                className="form-label"
                style={{ color: "var(--color-text-primary)" }}
              >
                Verification Code
              </label>
              <input
                {...verificationForm.register("code")}
                className="form-input w-full p-2 rounded-md"
                style={{
                  border: "1.5px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Enter the code from your email"
              />
              {verificationForm.formState.errors.code && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-danger)" }}
                >
                  {verificationForm.formState.errors.code.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={verifySecondFactorMutation.isPending || !signIn}
              className="w-full mt-6 py-2.5 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  verifySecondFactorMutation.isPending || !signIn
                    ? "var(--color-green-mid)"
                    : "var(--color-green)",
                color: "white",
                fontWeight: 500,
              }}
            >
              {verifySecondFactorMutation.isPending
                ? "Verifying..."
                : "Verify code"}
            </button>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={goBackToIdentifier}
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={() => {
                  setGlobalError("");
                  resendCodeMutation.mutate();
                }}
                disabled={resendCodeMutation.isPending || !signIn}
                className="text-sm"
                style={{ color: "var(--color-navy)" }}
              >
                {resendCodeMutation.isPending ? "Sending..." : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
