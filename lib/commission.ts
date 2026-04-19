const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const getReceiptNumber = (receiptId: number, receiptDate: Date) => {
	const year = receiptDate.getFullYear();
	const month = String(receiptDate.getMonth() + 1).padStart(2, "0");
	return `RCP-${year}${month}-${String(receiptId).padStart(3, "0")}`;
};

export const getDaysToPay = (invoiceDate: Date, receiptDate: Date) =>
	Math.floor((receiptDate.getTime() - invoiceDate.getTime()) / MS_PER_DAY);

export const getCommissionDueDate = (invoiceDate: Date, daysUntilDue: number = 65) => {
	const dueDate = new Date(invoiceDate);
	dueDate.setDate(dueDate.getDate() + daysUntilDue);
	return dueDate;
};

export const getCommissionRate = (daysToPay: number) => {
	if (daysToPay <= 0) return 0.025;
	if (daysToPay <= 65) return 0.02;
	return 0;
};

export const calculateReceiptCommission = (
	invoiceDate: Date,
	receiptDate: Date,
	totalAmount: number,
) => {
	const daysToPay = getDaysToPay(invoiceDate, receiptDate);
	const commissionRate = getCommissionRate(daysToPay);
	const commissionAmount = totalAmount * commissionRate;
	const dueDate = getCommissionDueDate(invoiceDate);

	return {
		daysToPay,
		commissionRate,
		commissionAmount,
		dueDate,
	};
};
