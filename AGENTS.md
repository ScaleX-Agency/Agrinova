# AGENTS.md — Agrinova Inventory Management System

> Drop this file into your project. This is the complete UI design system, data model, business logic, and feature spec for an AI coding agent to build the Agrinova IMS UI from scratch.

---

## 1. Project Overview

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **Product**  | Agrinova IMS — Inventory Management System         |
| **Company**  | Agrinova — Your Partner in Lifesciences            |
| **Location** | 205D, Kalapaluwawa Road, Koswatta, Battaramulla    |
| **Tel**      | 011 207 3603/4                                     |
| **Mobile**   | 0777 687 897                                       |
| **Email**    | info.agrinova@gmail.com                            |
| **Users**    | Max 4 concurrent users                             |
| **Scale**    | ~250 invoices/month                                |
| **Roles**    | Admin · Operator · Sales Representative · Customer |

---

## 2. Roles & Access

There are four roles in the system. **Only Admin and Operator have login accounts.** Sales Representatives and Customers are data entities managed within the system — they do not log in.

### 2.1 Role Definitions

| Role                     | Login  | Description                                                                                                                                               |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**                | ✅ Yes | Full system access. Can manage users, view all reports, approve returns, access commission and financial data.                                            |
| **Operator**             | ✅ Yes | Day-to-day operational access. Can manage inventory, customers, invoices, receipts, and reminders. Cannot manage user accounts or delete core records.    |
| **Sales Representative** | ❌ No  | Exists as a data entity only. Assigned to customers. Linked to invoices and commission records. Managed by Admin/Operator via the Sales Reps section.     |
| **Customer**             | ❌ No  | Exists as a data entity only. Assigned to a Sales Representative. Has invoices, receipts, outstanding balances, and reminders. Managed by Admin/Operator. |

### 2.2 Permission Matrix

| Feature                     | Admin   | Operator     |
| --------------------------- | ------- | ------------ |
| Dashboard                   | ✅ Full | ✅ Full      |
| Inventory — view            | ✅      | ✅           |
| Inventory — add/edit/delete | ✅      | ✅           |
| Products — add/edit/delete  | ✅      | ✅           |
| Stock Movements             | ✅      | ✅           |
| Invoices — create/edit      | ✅      | ✅           |
| Invoices — delete           | ✅      | ❌           |
| Receipts — create/edit      | ✅      | ✅           |
| Returns — approve           | ✅      | ❌           |
| Customers — manage          | ✅      | ✅           |
| Operators — manage          | ✅      | ❌           |
| Sales Reps — manage         | ✅      | ✅           |
| Reminders                   | ✅      | ✅           |
| Commission — view           | ✅      | ✅ Read-only |
| Commission — export         | ✅      | ❌           |
| Sales Performance           | ✅      | ✅ Read-only |
| Reports & Export            | ✅      | ✅           |
| User Accounts               | ✅ Full | ❌ No access |
| Settings — company info     | ✅      | ❌           |
| Settings — locations        | ✅      | ✅           |
| Backup / Export             | ✅      | ❌           |

### 2.3 Auth Rules

- Authentication is managed via **Clerk**. The system uses the `@clerk/nextjs` SDK.
- Login page is the only public route (`/login`). It uses a custom TanStack Query + Zod form connected to Clerk's `useSignIn`. All other routes require an authenticated session. Enforce this custom UI using `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` in `.env.local`.
- **No Sign Ups**: Users should not be able to sign up themselves, only login is possible through email and password. Ensure `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login` in `.env.local` is set to block default signups and point it back to login.
- `middleware.ts` guards all `/(dashboard)` routes and API routes (except `/api/webhooks`) — redirects to `/login` if no valid session.
- The `/operators` and `/users` pages (account management) are hidden in the sidebar and blocked at the API level for Operators.
- Session stores `userId`. The backend maps this `clerk_id` to the local PostgreSQL `USER` model where the `role_id` is verified.
- No password reset flow needed for the initial build (max 4 users, managed by Admin directly).
- **Admin Operator Generation**: The Admin creates operators from `/operators`, which makes a POST request to `/api/operators` with initial email, password, first name, and last name. This endpoint creates the Clerk user first, then inserts into the `USER` table with `role_id = 2`, `username = email`, `clerk_id = <clerk_user_id>`, and `password_hash = null`.

---

## 3. Design Philosophy

**Aesthetic direction:** Clean enterprise-grade dashboard. Refined, data-dense, professional. Inspired by linear.app and Notion — flat surfaces, crisp typography, generous whitespace, subtle borders. NOT generic Bootstrap admin panels.

**Core principles:**

- Data density without clutter — show what matters, hide the rest in drawers
- Green + Navy brand colors thread through every screen (from logo)
- Role-based UI — Admin sees everything; Operator sees operational features only
- Offline-tolerant feel — avoid spinners everywhere; skeleton states preferred
- Print-ready — invoice and receipt pages must look clean when printed (`@media print`)

---

## 4. Brand & Color System

```css
:root {
  /* === PRIMARY BRAND === */
  --color-green: #1a5c2e; /* Forest Green — buttons, primary actions */
  --color-green-mid: #2d7a42; /* Mid Green — hover states */
  --color-green-light: #e8f5ec; /* Light Green — badges, row highlights */
  --color-green-border: #b6d9be; /* Green border — table accents */

  /* === SECONDARY BRAND === */
  --color-navy: #2b2d7e; /* Deep Navy — headings, sidebar */
  --color-navy-mid: #3d40a8; /* Mid Navy — hover nav items */
  --color-navy-light: #eeeffe; /* Light Navy — selected nav, badges */
  --color-navy-border: #c0c3f0; /* Navy border */

  /* === NEUTRALS === */
  --color-bg: #faf9f5; /* Warm Cream — page background */
  --color-surface: #ffffff; /* White — cards, panels */
  --color-surface-2: #f4f3ef; /* Off-white — table rows alt, inputs */
  --color-border: #e4e2db; /* Default border */
  --color-border-strong: #c8c6be; /* Stronger border — table headers */

  /* === TEXT === */
  --color-text-primary: #1a1a1a; /* Near black — headings, labels */
  --color-text-secondary: #5a6672; /* Slate — secondary text, hints */
  --color-text-muted: #9ba5ad; /* Muted — placeholders */

  /* === STATUS === */
  --color-success: #1a5c2e; /* Same as green — positive amounts */
  --color-success-bg: #e8f5ec;
  --color-warning: #854f0b;
  --color-warning-bg: #faeeda;
  --color-danger: #a32d2d;
  --color-danger-bg: #fcebeb;
  --color-info: #185fa5;
  --color-info-bg: #e6f1fb;

  /* === LAYOUT === */
  --sidebar-width: 240px;
  --topbar-height: 60px;
  --radius-sm: 6px;
  --radius-md: 9px;
  --radius-lg: 13px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

---

## 5. Typography

```css
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap");

--font-display: "Playfair Display", Georgia, serif; /* Headings */
--font-body: "DM Sans", -apple-system, sans-serif; /* Body */
--font-mono:
  "JetBrains Mono", "Fira Code", monospace; /* Invoice IDs, stock codes */
```

| Element            | Font    | Size | Weight | Color                                                |
| ------------------ | ------- | ---- | ------ | ---------------------------------------------------- |
| Page title         | Display | 24px | 700    | `--color-navy`                                       |
| Section heading    | Display | 18px | 600    | `--color-navy`                                       |
| Card label         | Body    | 11px | 500    | `--color-text-secondary` (uppercase, 1.2px tracking) |
| Card value         | Body    | 22px | 500    | `--color-text-primary`                               |
| Table header       | Body    | 12px | 500    | `--color-text-secondary` (uppercase)                 |
| Table cell         | Body    | 14px | 400    | `--color-text-primary`                               |
| Badge              | Body    | 11px | 500    | varies by status                                     |
| Invoice ID / codes | Mono    | 13px | 400    | `--color-navy`                                       |

---

## 6. Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  TOPBAR  (60px)   Logo · Search · User · Notifications│
├───────────┬──────────────────────────────────────────┤
│           │                                          │
│  SIDEBAR  │   MAIN CONTENT AREA                      │
│  (240px)  │   max-width: 1200px, padding: 32px       │
│           │                                          │
│  Nav      │   Page Header (title + actions)          │
│  Groups   │   ─────────────────────────────          │
│           │   Stat Cards Row (4 cards)               │
│           │   ─────────────────────────────          │
│           │   Primary Table / Content                │
│           │                                          │
└───────────┴──────────────────────────────────────────┘
```

### Sidebar Navigation Groups

```
AGRINOVA  [logo]
─────────────────
  Dashboard

INVENTORY
  Stock Overview
  Products
  New Stock Entry
  Stock Movements

SALES
  Invoices
  Receipts
  Goods Issue Notes

CUSTOMERS
  Customer List
  Outstanding Balances
  Reminders

OPERATORS
  Operator List

SALES REPS
  Rep List
  Commission Calculator
  Sales Performance

REPORTS
  Monthly Report
  Export

─────────────────
  Settings          (Admin only)
  User Accounts     (Admin only — hidden for Operator)
  [User Avatar + Name + Role badge]
```

**Active nav item:** `background: --color-navy-light`, left border `3px solid --color-navy`, text `--color-navy`, weight 500.

**Role-conditional nav:** The `Operators`, `Settings` (company info, backup), and `User Accounts` items are hidden from the sidebar entirely when the logged-in role is `operator`. This is enforced both in the UI (`Sidebar.tsx`) and at the API level.

---

## 7. Components

### 7.1 Stat Card

```html
<div class="stat-card">
  <span class="stat-label">Total Stock Items</span>
  <span class="stat-value">1,284</span>
  <span class="stat-delta positive">+12 this week</span>
</div>
```

```css
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-secondary);
}
.stat-value {
  font-size: 28px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: var(--font-display);
}
.stat-delta.positive {
  font-size: 12px;
  color: var(--color-success);
}
.stat-delta.negative {
  font-size: 12px;
  color: var(--color-danger);
}
```

### 7.2 Data Table

```css
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-family: var(--font-body);
}
thead th {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-secondary);
  border-bottom: 1.5px solid var(--color-border-strong);
  padding: 10px 14px;
  text-align: left;
  background: var(--color-surface);
  position: sticky;
  top: 0;
}
tbody tr {
  border-bottom: 1px solid var(--color-border);
}
tbody tr:hover {
  background: var(--color-surface-2);
}
tbody td {
  padding: 12px 14px;
  color: var(--color-text-primary);
}
tbody tr:nth-child(even) {
  background: var(--color-bg);
}
```

### 7.3 Badge / Status Pill

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
}
.badge-green {
  background: var(--color-green-light);
  color: var(--color-green);
}
.badge-navy {
  background: var(--color-navy-light);
  color: var(--color-navy);
}
.badge-warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.badge-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.badge-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
```

| Status           | Badge Variant  |
| ---------------- | -------------- |
| In Stock         | `badge-green`  |
| Low Stock        | `badge-warn`   |
| Out of Stock     | `badge-danger` |
| Issued           | `badge-navy`   |
| Returned         | `badge-info`   |
| Pending Approval | `badge-warn`   |
| Paid             | `badge-green`  |
| Partial          | `badge-warn`   |
| Unpaid           | `badge-danger` |
| Overdue          | `badge-danger` |

### 7.4 Buttons

```css
.btn-primary {
  background: var(--color-green);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover {
  background: var(--color-green-mid);
}

.btn-secondary {
  background: transparent;
  color: var(--color-navy);
  border: 1.5px solid var(--color-navy-border);
  padding: 9px 18px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger); /* same padding as primary */
}
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}
.btn-ghost:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
```

### 7.5 Form Fields

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.form-input {
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-family: var(--font-body);
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  transition: border-color 0.15s;
}
.form-input:focus {
  outline: none;
  border-color: var(--color-green);
}
.form-input::placeholder {
  color: var(--color-text-muted);
}
```

### 7.6 Modal / Drawer

- Modals: centered, `max-width: 560px`, white surface, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`, backdrop `rgba(0,0,0,0.35)`
- Right Drawer: `width: 420px`, slides in from right, used for viewing/editing records
- Always include: title row + close button (×), footer with Cancel + Primary action buttons

### 7.7 Invoice / Receipt Print Layout

```css
@media print {
  .sidebar,
  .topbar,
  .no-print {
    display: none !important;
  }
  .print-page {
    width: 210mm;
    padding: 16mm 14mm;
    font-family: "DM Sans", sans-serif;
    font-size: 12pt;
  }
  .invoice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24pt;
  }
  .invoice-logo img {
    width: 120px;
  }
  .invoice-table th {
    background: var(--color-navy);
    color: white;
  }
  .invoice-total {
    font-weight: 700;
    font-size: 14pt;
    color: var(--color-green);
  }
}
```

---

## 8. Pages & Screen Specs

### 8.1 Dashboard

**Stat cards row (4 cards):**

- Total Products
- Total Stock Value (LKR)
- Outstanding Receivables (LKR)
- Invoices This Month

**Charts section (2 columns):**

- Left: Bar chart — Monthly invoice count (12 months)
- Right: Donut — Stock by inventory location (IGRN 1–4)

**Bottom section:**

- Recent invoices table (last 10) — columns: Invoice #, Customer, Sales Rep, Date, Amount, Status
- Low stock alerts list — products below reorder threshold

---

### 8.2 Stock Overview

**Filter bar:** Inventory Location dropdown (All · IGRN 1–4) + Search input + Export button

**Table columns:**

| Column        | Type      | Notes                                    |
| ------------- | --------- | ---------------------------------------- |
| Product ID    | mono text | e.g. `PRD-0042`                          |
| Product Name  | text      |                                          |
| Pack Size     | text      |                                          |
| Location      | badge     | IGRN 1 / 2 / 3 / 4                       |
| Current Stock | number    | highlight red if below reorder threshold |
| Last Updated  | date      | `DD MMM YYYY` format                     |
| Actions       | buttons   | Issue · Return · Adjust                  |

---

### 8.3 Products

**Actions:** Add Product button (top right) → opens modal

**Product modal fields:**

- Product ID (auto-generated, read-only, mono font)
- Product Name \*
- Pack Size \*
- Category
- Inventory Location \* (dropdown: IGRN 1–4)
- Initial Stock Count
- Reorder Threshold

---

### 8.4 New Stock Entry

**Form fields:**

- Entry Type: `Local Purchase` | `Foreign Import` (toggle/radio)
- Date \*
- Reference No.
- Inventory Location \*
- Products table (add rows): Product · Pack Size · Qty Received · Unit Price
- Notes
- Submit → creates a `STOCK_MOVEMENT` record of type `purchase`, updates `quantity_on_hand` for selected location (`+qty`)

---

### 8.5 Stock Movements

**Table columns:** Date · Type (Issue / Return / Purchase / Adjustment) · Product · Location · Qty Change · Reference · Created By

**Type badges:** Issue → `badge-navy` · Return → `badge-info` · Purchase → `badge-green` · Adjustment → `badge-warn`

---

### 8.6 Invoices

**Invoice list table:** Invoice # · Date · Customer · Sales Rep · Amount (LKR) · Status (Paid / Partial / Unpaid)

**Create invoice flow:**

1. Select Customer
2. Select Sales Rep (dropdown from `SALES_REP` table)
3. Add products (table: Product · Qty · Unit Price · Line Total)
4. Auto-calculate: Subtotal → Total
5. Save → generates `INV-YYYYMM-NNN` number
6. Print → original kept by Agrinova, copy for customer

**Invoice Number format:** `INV-YYYYMM-NNN` e.g. `INV-202604-001`

**Note:** The original invoice is retained by Agrinova. The customer receives a printed copy only.

---

### 8.7 Receipts

**Receipt list table:** Receipt # · Date · Invoice Ref · Customer · Sales Rep · Amount (LKR) · Payment Method

**Create receipt:**

- Select Invoice (dropdown, searchable, shows customer name + invoice #)
- Cash Received Date \*
- Amount Received
- Payment Method: Cash · Bank Transfer · Cheque
- Notes
- Save → triggers commission calculation automatically

**Receipt Number format:** `RCP-YYYYMM-NNN`

---

### 8.8 Goods Issue Notes

**Table:** GIN # · Date · Products (count) · Issued To · Issued By · Status

Recorded after physical issue. Fields: Date · Products table · Issued To (Customer name) · Issued By (Sales Rep) · Notes

---

### 8.9 Customer List

**Table columns:** Customer ID · Name · Phone · Sales Rep · Outstanding (LKR) · Last Payment Date

**Outstanding amount color rules:**

- LKR 0: green text
- LKR 1 – 50,000: default text
- LKR 50,001 – 150,000: warning orange
- LKR 150,001+: danger red

**Customer detail drawer:** full profile + invoice history + payment history + outstanding balance summary

---

### 8.10 Outstanding Balances

**Table:** Customer · Sales Rep · Oldest Invoice Date · Days Outstanding · Total Outstanding (LKR)

**Filter:** Sales Rep dropdown · Days overdue range (0–30 / 31–65 / 65+)

**Row color coding:**

- 0–30 days: default
- 31–65 days: `--color-warning-bg` row
- 65+ days: `--color-danger-bg` row

---

### 8.11 Reminders

Auto-generated list based on outstanding amounts. Fields per reminder:

- Customer name + phone
- Outstanding amount (LKR)
- Oldest invoice date
- Days outstanding
- Assigned sales rep name

Actions: Mark as contacted · Send reminder (WhatsApp deep link / SMS link)

---

### 8.12 Operators (Admin only)

**Sidebar placement:** `Operators` appears above `Sales Reps`.

**Operators list table:** Operator ID · Full Name · Email (username) · Clerk ID · Actions

**Operator detail screen:** clicking an operator opens `/operators/[operatorId]` with:
- profile summary
- edit option (first name, last name, optional password reset)
- remove option (deletes from Clerk + local DB)

**Create operator flow:**
1. Admin opens `/operators`
2. Clicks **New Operator**
3. Enters initial email, password, first name, last name
4. Submit creates Clerk user
5. Then creates local `USER` row with:
   - `role_id = 2` (operator)
   - `username = email`
   - `clerk_id = created Clerk user id`
   - `password_hash = null`

---

### 8.13 Sales Reps

**Rep list table:** Rep ID · Name · Phone · Assigned Customers (count) · Active Invoices (count) · Total Commission (LKR, current month)

**Rep detail drawer:** full profile + assigned customer list + invoice history + commission history

**Add/edit rep form fields:**

- Full Name \*
- Phone \*
- Email

---

### 8.14 Commission Calculator

**Commission logic (implement exactly):**

```
days = RECEIPT_DATE - INVOICE_DATE

if days <= 0:
    commission_rate = 2.5%
elif 0 < days <= 65:
    commission_rate = 2.0%
else:
    commission_rate = 0%

commission_amount = invoice_total × commission_rate
```

> Note: `days` = the difference between when cash was collected (receipt date) and when the invoice was issued (invoice date). A negative or zero value means payment was collected on or before the invoice date.

**UI: Month selector → table per sales rep:**

| Sales Rep | Invoices | Total Sales (LKR) | Cash Collected (LKR) | Avg Days | Commission Rate | Commission (LKR) |
| --------- | -------- | ----------------- | -------------------- | -------- | --------------- | ---------------- |

**Footer row:** Grand total commission for the month.

**Export:** Print-ready page + Excel export button (Admin only).

---

### 8.15 Sales Performance

**Per sales rep, per month:**

- Total invoices issued
- Total value (LKR)
- Total collected (LKR)
- Collection rate (%)
- Top customers by value

**Chart:** Line chart — monthly sales per rep (multi-line, one color per rep, using Recharts)

---

### 8.16 User Accounts (Admin only)

**Table:** User ID · Name · Username · Role (Admin / Operator) · Last Login · Actions

**Add/edit user modal fields:**

- Full Name \*
- Username \*
- Role \* (Admin / Operator only — Sales Rep and Customer are not login roles)
- Password (set on create; reset option on edit)

> This page is not visible to Operators. Route is blocked in `middleware.ts` for the `operator` role.

---

### 8.17 Settings (Admin only)

- **Company Info:** Name, address, logo, contact (used on invoices and receipts)
- **Inventory Locations:** Manage IGRN 1–4 names and details
- **Backup:** Export full data as JSON / CSV

---

## 9. Data Model

```
ROLE              id, role_name  ('admin' | 'operator' | 'sales_rep' | 'customer')

USER              id, clerk_id(String?, unique), role_id(FK→ROLE), full_name, username, password_hash
                  — only admin and operator rows exist here
                  — operator accounts created from `/operators` use `role_id=2`, `username=email`, `password_hash=null`

SALES_REP         id, full_name, phone, email
                  — no login credentials; linked to customers and invoices

CUSTOMER          id, assigned_rep_id(FK→SALES_REP), name, address, phone,
                  outstanding_balance

INVENTORY_LOCATION id, code (IGRN1–4), name

PRODUCT           id, product_name, pack_size, category, reorder_threshold

STOCK             id, product_id(FK), location_id(FK), quantity_on_hand

STOCK_MOVEMENT    id, stock_id(FK), created_by(FK→USER), movement_type
                  ('issue'|'return'|'purchase'|'adjustment'), quantity,
                  movement_date, reference_no, notes

INVOICE           id, invoice_no, invoice_date, customer_id(FK→CUSTOMER),
                  rep_id(FK→SALES_REP), created_by(FK→USER),
                  total_amount, status ('paid'|'partial'|'unpaid')

INVOICE_LINE      id, invoice_id(FK), product_id(FK), quantity,
                  unit_price, line_total

RECEIPT           id, receipt_no, invoice_id(FK), collected_by(FK→USER),
                  receipt_date, amount_received, payment_method
                  ('cash'|'bank_transfer'|'cheque'), notes

COMMISSION        id, rep_id(FK→SALES_REP), receipt_id(FK→RECEIPT),
                  days_to_pay, commission_rate, commission_amount

GIN               id, gin_no, gin_date, issued_to(FK→CUSTOMER),
                  issued_by(FK→SALES_REP), created_by(FK→USER), notes

GIN_LINE          id, gin_id(FK), product_id(FK), quantity

REMINDER          id, customer_id(FK→CUSTOMER), triggered_by(FK→USER),
                  reminder_date, message, status ('pending'|'contacted')
```

---

## 10. Inventory Locations Reference

| Code   | Name                | Location     |
| ------ | ------------------- | ------------ |
| IGRN 1 | Head Office         | Battaramulla |
| IGRN 2 | Kuliyapitiya Branch | Kuliyapitiya |
| IGRN 3 | Nuwara Eliya Branch | Nuwara Eliya |
| IGRN 4 | Peradeniya Branch   | Peradeniya   |

---

## 11. Key UX Rules

1. **Sticky table headers** — all data tables: `position: sticky; top: 0` on `<thead>`
2. **Empty states** — every table must have an illustrated empty state with a call-to-action button
3. **Confirmation dialogs** — all delete/destructive actions require a modal confirmation
4. **Toast notifications** — success/error feedback as floating toasts (top-right, 3s auto-dismiss)
5. **Loading skeletons** — animated skeleton rows instead of spinners for table loading
6. **Keyboard shortcuts** — `N` for new record, `Escape` to close modals
7. **Date format** — always `DD MMM YYYY` (e.g. `09 Apr 2026`)
8. **Currency format** — always `LKR #,###,###.00`
9. **Print invoices** — `window.print()` button, hides sidebar/topbar via `@media print`
10. **Returns** — only Admin can approve returns; show `Pending Approval` badge until approved
11. **Role-gated UI** — buttons for restricted actions (delete invoice, approve return, export commission) are hidden entirely for Operator, not just disabled
12. **Number formats** — Invoice IDs, Product IDs, Receipt IDs use monospace font (`--font-mono`)

---

## 12. Responsive Behavior

- **Desktop (≥1280px):** Full sidebar + full table columns
- **Tablet (768–1279px):** Sidebar collapses to icon-only (48px), table hides less important columns
- **Mobile (<768px):** Sidebar hidden, hamburger menu, cards stack vertically, tables scroll horizontally

---

## 13. Tech Stack

| Layer       | Choice                                          |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 14 (App Router)                         |
| Language    | TypeScript                                      |
| Styling     | Tailwind CSS (custom config using above tokens) |
| Charts      | Recharts                                        |
| Tables      | TanStack Table                                  |
| Forms       | React Hook Form + Zod                           |
| State       | Zustand + TanStack React Query (for mutations)  |
| Auth        | Clerk (`@clerk/nextjs`)                         |
| Database    | Supabase (Postgres)                             |
| ORM         | Prisma                                          |
| PDF / Print | react-to-print                                  |
| Export      | SheetJS (xlsx)                                  |

---

## 14. File Structure Reference

```
agrinova/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # sidebar + topbar, role-aware
│   │   ├── dashboard/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── inventory/[locationId]/page.tsx
│   │   ├── products/page.tsx
│   │   ├── stock-movements/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── customers/[customerId]/page.tsx
│   │   ├── operators/page.tsx              # admin only
│   │   ├── operators/[operatorId]/page.tsx # admin only
│   │   ├── sales-reps/page.tsx
│   │   ├── sales-reps/[repId]/page.tsx
│   │   ├── sales-reps/[repId]/commission/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── invoices/[invoiceId]/page.tsx
│   │   ├── invoices/[invoiceId]/print/page.tsx
│   │   ├── receipts/page.tsx
│   │   ├── receipts/[receiptId]/page.tsx
│   │   ├── commission/page.tsx
│   │   ├── reminders/page.tsx
│   │   ├── users/page.tsx              # admin only
│   │   └── settings/page.tsx           # admin only
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── users/route.ts
│       ├── users/[userId]/route.ts
│       ├── operators/route.ts
│       ├── operators/[operatorId]/route.ts
│       ├── sales-reps/route.ts
│       ├── sales-reps/[repId]/route.ts
│       ├── sales-reps/[repId]/customers/route.ts
│       ├── sales-reps/[repId]/commission/route.ts
│       ├── customers/route.ts
│       ├── customers/[customerId]/route.ts
│       ├── customers/[customerId]/balance/route.ts
│       ├── customers/[customerId]/reminders/route.ts
│       ├── inventory/route.ts
│       ├── inventory/[locationId]/route.ts
│       ├── inventory/[locationId]/movements/route.ts
│       ├── products/route.ts
│       ├── products/[productId]/route.ts
│       ├── stock-movements/route.ts
│       ├── stock-movements/[movementId]/route.ts
│       ├── invoices/route.ts
│       ├── invoices/[invoiceId]/route.ts
│       ├── invoices/[invoiceId]/lines/route.ts
│       ├── invoices/[invoiceId]/print/route.ts
│       ├── receipts/route.ts
│       ├── receipts/[receiptId]/route.ts
│       ├── receipts/[receiptId]/commission/route.ts
│       ├── commission/route.ts
│       └── reminders/route.ts
├── components/
│   ├── ui/                             # Button, Input, Modal, Table, Badge, Card
│   ├── layout/                         # Sidebar, Topbar, PageHeader
│   ├── inventory/
│   ├── operators/
│   ├── sales-reps/
│   ├── customers/
│   ├── invoices/
│   ├── receipts/
│   ├── commission/
│   └── reminders/
├── lib/
│   ├── db.ts                           # Prisma client
│   ├── auth.ts                         # NextAuth config, session helpers
│   ├── commission.ts                   # Commission formula (isolated + testable)
│   └── utils.ts
├── hooks/
├── types/index.ts
├── prisma/schema.prisma
├── middleware.ts                       # Route protection + role enforcement
├── public/agrinova-logo.jpeg
├── next.config.ts
└── tsconfig.json
```

---

## 15. Asset Reference

| Asset                | Usage                          | Size         |
| -------------------- | ------------------------------ | ------------ |
| `agrinova-logo.jpeg` | Topbar                         | 32px height  |
| `agrinova-logo.jpeg` | Login page                     | 120px height |
| `agrinova-logo.jpeg` | Invoice / Receipt print header | 80px height  |

- **Primary color from logo:** `#1a5c2e` (Forest Green)
- **Secondary color from logo:** `#2b2d7e` (Deep Navy)
- **Tagline:** _"Your Partner in Lifesciences"_
- **Address:** 205D, Kalapaluwawa Road, Koswatta, Battaramulla
- **Tel:** 011 207 3603/4 · **Mob:** 0777 687 897
- **Email:** info.agrinova@gmail.com

---

_Agrinova IMS · AGENTS.md v1.2 · April 2026_
