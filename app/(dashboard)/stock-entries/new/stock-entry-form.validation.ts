import { z } from "zod";
import type { StockEntryFieldErrors, StockEntryLine } from "./stock-entry-form.types";

type StockEntryValidationInput = {
  date: string;
  locationId: number | null;
  lines: StockEntryLine[];
};

const stockEntryLineSchema = z.object({
  productId: z.number({ error: "Select a product." }).int().positive(),
  qty: z.number({ error: "Enter a quantity." }).int().min(1, "Quantity must be at least 1."),
});

const stockEntryValidationSchema = z.object({
  date: z.string().min(1, "Select a date."),
  locationId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select an inventory location.",
  }),
  lines: z.array(stockEntryLineSchema).min(1, "Add at least one product."),
});

const toFieldErrors = (issues: z.ZodIssue[]): StockEntryFieldErrors => {
  const errors: StockEntryFieldErrors = {};

  for (const issue of issues) {
    const [rootKey] = issue.path;

    if (rootKey === "date" && !errors.date) errors.date = issue.message;
    else if (rootKey === "locationId" && !errors.location) errors.location = issue.message;
    else if (rootKey === "lines" && !errors.lines) {
      errors.lines = issue.message;
    }
  }

  return errors;
};

export const getStockEntryFieldErrors = (input: StockEntryValidationInput): StockEntryFieldErrors => {
  const result = stockEntryValidationSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error.issues);
};

export const getFirstStockEntryFieldError = (errors: StockEntryFieldErrors) => {
  const orderedKeys: (keyof StockEntryFieldErrors)[] = [
    "date",
    "location",
    "lines",
  ];

  for (const key of orderedKeys) {
    if (errors[key]) return errors[key] ?? "";
  }

  return "";
};
