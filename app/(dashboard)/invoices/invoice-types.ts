export type InvoiceStatus = "Paid" | "Partial" | "Unpaid";

export interface InvoiceRow {
	invoiceNo: string;
	date: string;
	customer: string;
	salesRep: string;
	inventoryLocation?: string;
	amount: number;
	status: InvoiceStatus;
}
