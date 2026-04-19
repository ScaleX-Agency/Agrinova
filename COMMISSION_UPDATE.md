# Commission Schema & App Update Summary

## Database Schema Changes

### Updated Commission Model

```prisma
model Commission {
  commission_id     Int               @id @default(autoincrement())
  rep_id            Int
  receipt_id        Int?              // Now optional
  invoice_id        Int               // New required field
  commission_rate   Decimal           @db.Decimal(5, 4)
  commission_amount Decimal           @db.Decimal(10, 2)
  days_to_pay       Int
  due_date          DateTime          // New: Default 30 days from receipt date
  paid_date         DateTime?         // New: When commission was paid
  status            CommissionStatus  @default(PENDING) // New: Payment status

  receipt           Receipt?          @relation(fields: [receipt_id], references: [receipt_id])
  rep               SalesRep          @relation(fields: [rep_id], references: [rep_id])
  invoice           Invoice           @relation(fields: [invoice_id], references: [invoice_id])
}

enum CommissionStatus {
  PENDING
  PAID
  OVERDUE
}
```

### Invoice Model Update

Added inverse relation: `commissions: Commission[]`

## Application Code Changes

### 1. Commission Utilities (`lib/commission.ts`)

- **New Function**: `getDueDate(receiptDate: Date, daysUntilDue = 30): Date`
  - Calculates commission due date (30 days from receipt date by default)
- **Updated Function**: `calculateReceiptCommission()`
  - Now returns `dueDate: Date` in addition to existing fields
  - Called when receipt is created

### 2. Commission DTOs (`types/api.ts`)

- **CommissionReceiptDetailDto**:
  - Added: `commissionId`, `dueDate`, `paidDate`, `status`
  - Made nullable: `receiptId`, `receiptNo`, `receiptDate`
  - Removed: `invoiceAmount` (use invoice total instead)

- **ReceiptCommissionDetailDto**: Same updates as above

### 3. Receipt API (`app/api/receipts/route.ts`)

Commission creation now includes all new fields:

```typescript
const createdCommission = await tx.commission.create({
  data: {
    rep_id: invoice.rep_id,
    invoice_id: invoice.invoice_id, // NEW
    receipt_id: receipt.receipt_id,
    commission_rate: commission.commissionRate,
    commission_amount: commission.commissionAmount,
    days_to_pay: commission.daysToPay,
    due_date: commission.dueDate, // NEW
    paid_date: null, // NEW
    status: "PENDING", // NEW
  },
  // ...
});
```

### 4. Commission Summary API (`app/api/commission/route.ts`)

- Fetches new fields: `due_date`, `paid_date`, `status`
- Queries invoice and rep directly (instead of through receipt)
- Handles optional `receipt_id`

### 5. Commission Detail API (`app/api/commission/[commissionId]/route.ts`)

- Updated WHERE clause to filter by `rep_id` and `due_date`
- Fetches new payment tracking fields
- Updated mapping to generate receipt info from optional receipt relation
- Sorts by `due_date DESC`

### 6. Commission Update API (`app/api/commission/[commissionId]/update/route.ts`)

**New PATCH endpoint** to mark commissions as paid:

```typescript
PATCH /api/commission/{commissionId}/update

Request Body:
{
  status: "PENDING" | "PAID" | "OVERDUE",
  paidDate?: "2026-04-19T10:30:00.000Z"  // ISO string, required if status === "PAID"
}

Response:
{
  commissionId: number,
  status: string,
  paidDate: string | null,
  dueDate: string,
  commissionAmount: number
}
```

## Features Enabled

1. **Commission Lifecycle Tracking**
   - Automatic due date calculation on receipt creation
   - Manual status updates (PENDING → PAID or OVERDUE)
   - Record when commission was actually paid

2. **Payment Status Visibility**
   - UI can filter by status (PENDING, PAID, OVERDUE)
   - Dashboard can flag overdue commissions

3. **Direct Invoice Link**
   - Commission now has `invoice_id` foreign key
   - Can query commissions by invoice without going through receipt

## Migration Required

The Prisma schema has been updated. You need to apply this migration to your database:

```sql
ALTER TABLE "COMMISSION"
ADD COLUMN "invoice_id" INTEGER NOT NULL,
ADD COLUMN "due_date" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '30 days',
ADD COLUMN "paid_date" TIMESTAMP(3),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "receipt_id" DROP NOT NULL;

CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');
ALTER TABLE "COMMISSION" ALTER COLUMN "status" TYPE "CommissionStatus" USING ("status"::"CommissionStatus");

ALTER TABLE "COMMISSION" ADD CONSTRAINT "COMMISSION_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "INVOICE"("invoice_id");
```

## Type Safety Status

✅ All modified files pass TypeScript validation

- `lib/commission.ts`
- `types/api.ts`
- `app/api/receipts/route.ts`
- `app/api/commission/route.ts`
- `app/api/commission/[commissionId]/route.ts`
- `app/api/commission/[commissionId]/update/route.ts`

## Next Steps (UI Implementation)

1. Update commission list tables to show `status` badges
2. Display `due_date` and `paidDate` in commission views
3. Add "Mark as Paid" button with date picker
4. Add status filtering/sorting options
5. Add visual indicators for overdue commissions
