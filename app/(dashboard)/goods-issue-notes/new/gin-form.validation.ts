import { z } from "zod";
import type { GinFieldErrors, GinLine } from "./gin-form.types";

type GinValidationInput = {
  ginNumber: string;
  ginDate: string;
  invoiceId: number | null;
  locationId: number | null;
  preparedBy: string;
  receivedBy: string;
  lines: GinLine[];
};

const ginLineSchema = z.object({
  productId: z.number({ error: "Select a product." }).int().positive(),
  quantity: z.number({ error: "Enter a quantity." }).int().min(1, "Quantity must be at least 1."),
});

const ginValidationSchema = z.object({
  ginNumber: z.string().trim().min(1, "Enter a note number."),
  ginDate: z.string().min(1, "Select a date."),
  invoiceId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select an invoice.",
  }),
  locationId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select an inventory location.",
  }),
  preparedBy: z.string().trim().min(1, "Prepared by is required."),
  receivedBy: z.string().trim().min(1, "Received by is required."),
  lines: z.array(ginLineSchema).min(1, "Add at least one valid product line."),
});

const toFieldErrors = (issues: z.ZodIssue[]): GinFieldErrors => {
  const errors: GinFieldErrors = {};

  for (const issue of issues) {
    const [rootKey] = issue.path;

    if (rootKey === "ginNumber" && !errors.ginNumber) errors.ginNumber = issue.message;
    else if (rootKey === "ginDate" && !errors.ginDate) errors.ginDate = issue.message;
    else if (rootKey === "invoiceId" && !errors.invoice) errors.invoice = issue.message;
    else if (rootKey === "locationId" && !errors.location) errors.location = issue.message;
    else if (rootKey === "preparedBy" && !errors.preparedBy) errors.preparedBy = issue.message;
    else if (rootKey === "receivedBy" && !errors.receivedBy) errors.receivedBy = issue.message;
    else if (rootKey === "lines" && !errors.lines) {
      errors.lines = issue.message;
    }
  }

  return errors;
};

export const getGoodsIssueNoteFieldErrors = (input: GinValidationInput): GinFieldErrors => {
  const result = ginValidationSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error.issues);
};

export const getFirstGoodsIssueNoteFieldError = (errors: GinFieldErrors) => {
  const orderedKeys: (keyof GinFieldErrors)[] = [
    "ginNumber",
    "ginDate",
    "invoice",
    "location",
    "parties",
    "lines",
  ];

  for (const key of orderedKeys) {
    if (errors[key]) return errors[key] ?? "";
  }

  return "";
};