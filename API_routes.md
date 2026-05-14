app/
└── api/
│
├── auth/
│ ├── login/
│ │ └── route.ts # POST - login (admin & operator only)
│ └── logout/
│ └── route.ts # POST - logout / clear session
│
├── users/
│ ├── route.ts # GET - list users | POST - create user
│ └── [userId]/
│ └── route.ts # GET | PATCH | DELETE - single user
│
├── operators/
│ ├── route.ts # GET - list operators | POST - create operator
│ └── [operatorId]/
│ └── route.ts # GET | PATCH | DELETE - single operator
│
├── sales-reps/
│ ├── route.ts # GET - list reps | POST - create rep (Admin only)
│ └── [repId]/
│ ├── route.ts # GET - single rep | PATCH/DELETE - Admin only
│ ├── customers/
│ │ └── route.ts # GET - all customers under this rep
│ ├── invoices/
│ │ └── route.ts # GET - all invoices under this rep
│ └── commission/
│ └── route.ts # GET - commission summary for this rep
│
├── customers/
│ ├── route.ts # GET - list customers | POST - create
│ └── [customerId]/
│ ├── route.ts # GET | PATCH | DELETE - single customer
│ ├── invoices/
│ │ └── route.ts # GET - invoices for this customer
│ ├── balance/
│ │ └── route.ts # GET - outstanding balance
│ └── reminders/
│ └── route.ts # GET - reminders for this customer
│
├── inventory/
│ ├── route.ts # GET - stock overview all locations
│ └── [locationId]/
│ ├── route.ts # GET - stock for this location
│
├── products/
│ ├── route.ts # GET - list products | POST - create
│ └── [productId]/
│ └── route.ts # GET | PATCH | DELETE - single product
│
├── stock/
│ ├── route.ts # GET - all stock entries
│ └── [stockId]/
│ └── route.ts # GET | PATCH - single stock entry
│
│ └── [movementId]/
│ └── route.ts # GET - single movement detail
│
├── invoices/
│ ├── route.ts # GET - list invoices | POST - create invoice
│ └── [invoiceId]/
│ ├── route.ts # GET | PATCH | DELETE - single invoice
│ ├── lines/
│ │ ├── route.ts # GET - line items | POST - add line
│ │ └── [lineId]/
│ │ └── route.ts # PATCH | DELETE - single line item
│ ├── receipts/
│ │ └── route.ts # GET - receipts for this invoice
│ └── print/
│ └── route.ts # GET - returns print-ready invoice data
│
├── receipts/
│ ├── route.ts # GET - list receipts | POST - record receipt
│ └── [receiptId]/
│ ├── route.ts # GET | PATCH - single receipt
│ └── commission/
│ └── route.ts # GET - commission entry for this receipt
│
├── commission/
│ ├── route.ts # GET - all commission records
│ └── [commissionId]/
│ └── route.ts # GET - single commission record
│
└── reminders/
├── route.ts # GET - all reminders | POST - create reminder
└── [reminderId]/
└── route.ts # GET | PATCH | DELETE - single reminder
