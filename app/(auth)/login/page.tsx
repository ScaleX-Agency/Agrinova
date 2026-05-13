"use client";

import { useSignIn } from "@clerk/nextjs";
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
  | { status: "verification"; safeIdentifier: string };
type PasswordResult =
  | { status: "complete" }
  | { status: "verification"; safeIdentifier: string };

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

function getIdentifierHint(
  factors: ReadonlyArray<FirstFactorOption> | null | undefined,
  fallbackIdentifier: string,
): string {
  const firstWithHint = factors?.find((factor) => !!factor.safeIdentifier);
  return firstWithHint?.safeIdentifier ?? fallbackIdentifier;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logClerkState(label: string, signIn: any, extra?: unknown) {
  console.group(`[Clerk Debug] ${label}`);

  console.log("status:", signIn?.status);
  console.log("createdSessionId:", signIn?.createdSessionId);

  console.log(
    "supportedFirstFactors:",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signIn?.supportedFirstFactors?.map((factor: any) => ({
      strategy: factor.strategy,
      safeIdentifier: factor.safeIdentifier,
      emailAddressId: factor.emailAddressId,
      phoneNumberId: factor.phoneNumberId,
    })),
  );

  console.log(
    "supportedSecondFactors:",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signIn?.supportedSecondFactors?.map((factor: any) => ({
      strategy: factor.strategy,
      safeIdentifier: factor.safeIdentifier,
      emailAddressId: factor.emailAddressId,
      phoneNumberId: factor.phoneNumberId,
    })),
  );

  console.log("has emailCode:", !!signIn?.emailCode);
  console.log("has mfa:", !!signIn?.mfa);
  console.log("mfa keys:", signIn?.mfa ? Object.keys(signIn.mfa) : []);
  console.log(
    "emailCode keys:",
    signIn?.emailCode ? Object.keys(signIn.emailCode) : [],
  );

  if (extra) {
    console.log("extra:", extra);
  }

  console.groupEnd();
}

function logClerkError(label: string, error: unknown) {
  console.group(`[Clerk Error] ${label}`);

  console.error(error);

  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((error as any).errors)
  ) {
    console.table(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).errors.map((err: any) => ({
        code: err.code,
        message: err.message,
        longMessage: err.longMessage,
        meta: JSON.stringify(err.meta ?? {}),
      })),
    );
  }

  console.groupEnd();
}

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");
  const [step, setStep] = useState<"identifier" | "password" | "verification">(
    "identifier",
  );
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
    if (!signIn) {
      throw new Error("Clerk sign in resource missing");
    }

    logClerkState("Before activateSession()", signIn);

    if (signIn.status !== "complete") {
      throw new Error(
        `Cannot activate session because sign-in is not complete. Current Clerk status: ${signIn.status}`,
      );
    }

    if (typeof signIn.finalize === "function") {
      const finalizeResult = await signIn.finalize({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate: ({ session, decorateUrl }: any) => {
          if (session?.currentTask) {
            console.log(
              "[Clerk Debug] session currentTask:",
              session.currentTask,
            );
            return;
          }

          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });

      logClerkState("After activateSession()", signIn, finalizeResult);
      return;
    }

    throw new Error("signIn.finalize() is not available.");
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
        const emailCodeFactor = firstFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        // If no password factor exists but email code does, try email code.
        if (!hasPasswordFactor && emailCodeFactor) {
          const prepareResult = await signIn.emailCode.sendCode({
            emailAddressId: (emailCodeFactor as { emailAddressId?: string })
              .emailAddressId,
          });
          throwIfClerkError(prepareResult);

          return {
            status: "verification",
            safeIdentifier:
              emailCodeFactor.safeIdentifier ?? values.identifier.trim(),
          };
        }

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
        logClerkState(
          "needs_second_factor detected in identifierMutation",
          signIn,
        );
        const secondFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;

        const strategies =
          secondFactors?.map((factor) => factor.strategy) ?? [];
        console.log("[Clerk Debug] second factor strategies:", strategies);

        if (strategies.includes("phone_code") && signIn.mfa?.sendPhoneCode) {
          logClerkState("Before sending second factor code (phone)", signIn);
          const sendCodeResult = await signIn.mfa.sendPhoneCode();
          throwIfClerkError(sendCodeResult);
          const phoneCodeFactor = secondFactors?.find(
            (f) => f.strategy === "phone_code",
          );
          return {
            status: "verification",
            safeIdentifier:
              phoneCodeFactor?.safeIdentifier ?? values.identifier.trim(),
          };
        } else if (
          strategies.includes("email_code") &&
          signIn.mfa?.sendEmailCode
        ) {
          const emailCodeFactor = secondFactors?.find(
            (f) => f.strategy === "email_code",
          );

          logClerkState(
            "Before sending second factor code using MFA email",
            signIn,
            {
              safeIdentifier: emailCodeFactor?.safeIdentifier,
            },
          );

          const sendCodeResult = await signIn.mfa.sendEmailCode();
          throwIfClerkError(sendCodeResult);

          return {
            status: "verification",
            safeIdentifier:
              emailCodeFactor?.safeIdentifier || values.identifier.trim(),
          };
        }

        throw new Error(
          `Second-factor verification is required, but a suitable code strategy is not available. Supported factors: ${listFactorStrategies(secondFactors)}`,
        );
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

      setStep("verification");
      setSafeIdentifier(result.safeIdentifier);
      setVerificationNotice("A verification code was sent.");
      verificationForm.reset();
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues): Promise<PasswordResult> => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      logClerkState("Before password()", signIn);

      let response;
      try {
        response = await signIn.password({
          password: values.password,
        });
        logClerkState("After password()", signIn, response);
        throwIfClerkError(response);
      } catch (error) {
        logClerkError("password() failed", error);
        throw error;
      }

      const status = signIn.status;

      if (status === "complete") {
        await activateSession();
        return { status: "complete" };
      }

      if (status === "needs_second_factor") {
        logClerkState(
          "needs_second_factor detected in passwordMutation",
          signIn,
        );
        const secondFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;

        const strategies =
          secondFactors?.map((factor) => factor.strategy) ?? [];
        console.log("[Clerk Debug] second factor strategies:", strategies);

        if (strategies.includes("phone_code") && signIn.mfa?.sendPhoneCode) {
          logClerkState("Before sending second factor code (phone)", signIn);
          const sendCodeResult = await signIn.mfa.sendPhoneCode();
          throwIfClerkError(sendCodeResult);
          const phoneCodeFactor = secondFactors?.find(
            (f) => f.strategy === "phone_code",
          );
          return {
            status: "verification",
            safeIdentifier:
              phoneCodeFactor?.safeIdentifier ||
              safeIdentifier ||
              identifierValue,
          };
        } else if (
          strategies.includes("email_code") &&
          signIn.mfa?.sendEmailCode
        ) {
          const emailCodeFactor = secondFactors?.find(
            (f) => f.strategy === "email_code",
          );

          logClerkState(
            "Before sending second factor code using MFA email",
            signIn,
            {
              safeIdentifier: emailCodeFactor?.safeIdentifier,
            },
          );

          const sendCodeResult = await signIn.mfa.sendEmailCode();
          throwIfClerkError(sendCodeResult);

          return {
            status: "verification",
            safeIdentifier:
              emailCodeFactor?.safeIdentifier ||
              safeIdentifier ||
              identifierValue,
          };
        } else if (strategies.includes("totp")) {
          return {
            status: "verification",
            safeIdentifier: safeIdentifier || identifierValue,
          };
        }

        throw new Error(
          `Second-factor verification is required, but a suitable code strategy is not available. Supported factors: ${listFactorStrategies(secondFactors)}`,
        );
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

      setStep("verification");
      setSafeIdentifier(result.safeIdentifier);
      setVerificationNotice("A verification code was sent.");
      verificationForm.reset();
    },
    onError: (error) => {
      setGlobalError(getErrorMessage(error));
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async (values: VerificationFormValues) => {
      if (!signIn) throw new Error("Clerk sign in resource missing");

      let response;
      if (signIn.status === "needs_first_factor") {
        response = await signIn.emailCode.verifyCode({
          code: values.code.trim(),
        });
      } else if (signIn.status === "needs_second_factor") {
        logClerkState("Before verifying second factor code", signIn, {
          codeLength: values.code.trim().length,
        });

        // Attempt phone code first if active, otherwise fallback to email
        const activeFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;
        const hasPhoneCode = activeFactors?.some(
          (f) => f.strategy === "phone_code",
        );
        const hasEmailCode = activeFactors?.some(
          (f) => f.strategy === "email_code",
        );
        const hasTotp = activeFactors?.some((f) => f.strategy === "totp");

        if (hasPhoneCode && signIn.mfa?.verifyPhoneCode) {
          response = await signIn.mfa.verifyPhoneCode({
            code: values.code.trim(),
          });
        } else if (hasEmailCode && signIn.mfa?.verifyEmailCode) {
          response = await signIn.mfa.verifyEmailCode({
            code: values.code.trim(),
          });
        } else if (hasTotp && signIn.mfa?.verifyTOTP) {
          response = await signIn.mfa.verifyTOTP({ code: values.code.trim() });
        } else {
          throw new Error("No suitable second factor available to verify.");
        }
      } else {
        throw new Error("Invalid sign in state for verification.");
      }

      throwIfClerkError(response);

      logClerkState("After verification before reload", signIn, response);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (signIn as any).reload === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (signIn as any).reload();
      }

      logClerkState("After verification after reload", signIn, response);

      // We should check the response status rather than signIn.status,
      // as signIn might be stale inside this mutation closure until a re-render.
      // TypeScript warns because signIn.status inside this block is inferred as
      // "needs_first_factor" | "needs_second_factor".
      if (
        response &&
        "status" in response &&
        response.status === "needs_client_trust"
      ) {
        throw new Error(
          "This sign-in requires client trust verification. Disable Client Trust in Clerk Dashboard for now, or implement the Client Trust custom flow.",
        );
      }

      if (response && "status" in response && response.status !== "complete") {
        throw new Error(
          `Verification succeeded, but sign-in is still not complete after reload. Current Clerk status: ${response.status}`,
        );
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

      if (signIn.status === "needs_first_factor") {
        const firstFactors =
          signIn.supportedFirstFactors as ReadonlyArray<FirstFactorOption>;
        const emailCodeFactor = firstFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (!emailCodeFactor) throw new Error("Email code not available.");

        const response = await signIn.emailCode.sendCode({
          emailAddressId: (emailCodeFactor as { emailAddressId?: string })
            .emailAddressId,
        });
        throwIfClerkError(response);
      } else if (signIn.status === "needs_second_factor") {
        const secondFactors =
          signIn.supportedSecondFactors as ReadonlyArray<SecondFactorOption>;
        const strategies = secondFactors?.map((f) => f.strategy) ?? [];

        if (strategies.includes("phone_code") && signIn.mfa?.sendPhoneCode) {
          const response = await signIn.mfa.sendPhoneCode();
          throwIfClerkError(response);
        } else if (
          strategies.includes("email_code") &&
          signIn.mfa?.sendEmailCode
        ) {
          const response = await signIn.mfa.sendEmailCode();
          throwIfClerkError(response);
        } else {
          throw new Error("No suitable second factor code to resend.");
        }
      } else {
        throw new Error("Cannot resend code in current state.");
      }
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
    verificationMutation.mutate(values);
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
            {step === "verification" && "Verify your code"}
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
              disabled={verificationMutation.isPending || !signIn}
              className="w-full mt-6 py-2.5 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  verificationMutation.isPending || !signIn
                    ? "var(--color-green-mid)"
                    : "var(--color-green)",
                color: "white",
                fontWeight: 500,
              }}
            >
              {verificationMutation.isPending ? "Verifying..." : "Verify code"}
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
