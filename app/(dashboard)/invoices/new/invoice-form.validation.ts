import { z } from "zod";
import type { FieldErrors, InvoiceLine } from "./invoice-form.types";

type FieldValidationInput = {
  invoiceNo: string;
  invoiceDate: string;
  repId: number | null;
  customerId: number | null;
  locationId: number | null;
  lines: InvoiceLine[];
};

export const invoiceLineSchema = z.object({
  productId: z.number({ error: "Select a product." }).int().positive(),
  qty: z.number({ error: "Enter a quantity." }).int().min(1, "Quantity must be at least 1."),
  unitPrice: z.number({ error: "Enter a unit price." }).min(0, "Unit price must be 0 or greater."),
  discount: z
    .number({ error: "Enter a discount." })
    .min(0, "Discount must be 0 or greater.")
    .max(100, "Discount must be 100 or less."),
  lineTotal: z.number({ error: "Enter a line total." }).min(0, "Line total must be 0 or greater."),
});

const invoiceValidationSchema = z.object({
  invoiceNo: z.string().trim().min(1, "Enter an invoice number."),
  invoiceDate: z.string().min(1, "Select an invoice date."),
  repId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select a sales rep.",
  }),
  customerId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select a customer.",
  }),
  locationId: z.number().int().positive().nullable().refine((value) => value !== null, {
    message: "Select an inventory location.",
  }),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one valid line item."),
});

const toFieldErrors = (issues: z.ZodIssue[]): FieldErrors => {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const [rootKey] = issue.path;

    if (rootKey === "invoiceNo" && !errors.invoiceNo) errors.invoiceNo = issue.message;
    else if (rootKey === "invoiceDate" && !errors.invoiceDate) errors.invoiceDate = issue.message;
    else if (rootKey === "repId" && !errors.salesRep) errors.salesRep = issue.message;
    else if (rootKey === "customerId" && !errors.customer) errors.customer = issue.message;
    else if (rootKey === "locationId" && !errors.location) errors.location = issue.message;
    else if (rootKey === "lines" && !errors.lines) errors.lines = issue.message;
  }

  return errors;
};

export const getInvoiceFieldErrors = (input: FieldValidationInput): FieldErrors => {
  const result = invoiceValidationSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error.issues);
};
